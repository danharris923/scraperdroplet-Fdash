"""
app.py -- Simplified Deal Viewer API.
Queries ONLY retailer_products table from Supabase, normalizes into a unified
Product format, and serves everything over a clean REST API.

Endpoints:
  GET /api/health            -- Health check + DB connection test
  GET /api/filters           -- Store list with counts (5-min cache)
  GET /api/stats             -- Active product count (60s cache)
  GET /api/products          -- Paginated product query with filters
  GET /api/product/<id>      -- Single product detail with price history
  GET /api/product/<id>/history -- Full price history + computed stats
"""

import json
import os
import re
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from config import (
    get_supabase,
    FLASK_PORT, FLASK_DEBUG,
    cache,
    log_success, log_warning, log_error, log_info, log_debug, log_timing,
    timed,
)

# ──────────────────────────────────────────────
# Flask app setup
# ──────────────────────────────────────────────
app = Flask(__name__, static_folder=None)
CORS(app)

# Path to frontend files (served statically in local dev only -- Vercel serves from public/)
if not os.getenv("VERCEL"):
    FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")


# ──────────────────────────────────────────────
# Request / response logging hooks
# ──────────────────────────────────────────────
@app.before_request
def before_request_log():
    """Log every incoming request with method, path, and query params."""
    request._start_time = time.time()
    params = dict(request.args)
    param_str = f" | params={params}" if params else ""
    log_info(f"<< {request.method} {request.path}{param_str}")


@app.after_request
def after_request_log(response):
    """Log response status and timing."""
    start = getattr(request, "_start_time", time.time())
    elapsed = (time.time() - start) * 1000
    status = response.status_code
    if status < 400:
        log_success(f">> {status} {request.path} ({elapsed:.0f}ms)")
    else:
        log_warning(f">> {status} {request.path} ({elapsed:.0f}ms)")
    return response


# ══════════════════════════════════════════════
# NORMALIZATION
# ══════════════════════════════════════════════

# ── Amazon title cleaning ──
# The scraper often captures deal badge text as the title instead of the real product name.
# Examples: "75% offLimited-time deal", "60% offLightning Deal", "Limited-time deal"
_BADGE_PREFIXES = re.compile(r"^\d+%\s*off", re.IGNORECASE)
_BADGE_SUFFIXES = re.compile(
    r"(Limited[- ]time deal|Lightning Deal|Best Seller|Prime Early Access|Deal of the Day|"
    r"Climate Pledge Friendly|Amazon'?s?\s*Choice|Sponsored|Top Deal|Overall Pick|"
    r"Ends in\d+:\d+:\d+)$",
    re.IGNORECASE,
)
_JUNK_TITLE = re.compile(
    r"^(\d+%\s*off)?\s*(Limited[- ]time deal|Lightning Deal|Deal of the Day|Top Deal|"
    r"Best Seller|Sponsored|Overall Pick|Ends in\d+:\d+:\d+)\s*$",
    re.IGNORECASE,
)


def _clean_title(raw_title, row):
    """
    Clean up Amazon deal badge text that the scraper captures as titles.
    Strips "75% offLimited-time deal" prefixes/suffixes, falls back to brand/ASIN/URL.
    """
    title = (raw_title or "").strip()

    # Entire title is badge text -- build a fallback
    if not title or _JUNK_TITLE.match(title):
        return _fallback_title(row)

    # Strip badge prefix: "75% offSome Real Product" -> "Some Real Product"
    cleaned = _BADGE_PREFIXES.sub("", title).strip()
    # Strip timer text: "Ends in01:37:10" anywhere
    cleaned = re.sub(r"Ends in\d+:\d+:\d+", "", cleaned).strip()
    # Strip badge suffix: "Real Product Limited-time deal" -> "Real Product"
    cleaned = _BADGE_SUFFIXES.sub("", cleaned).strip()

    if len(cleaned) < 3:
        return _fallback_title(row)

    return cleaned


def _fallback_title(row):
    """Build a display title when the real title is missing or junk.
    Amazon titles are almost always junk (badge text). Show 'Amazon Deal (ASIN)' so
    users can identify the product from the image + ASIN."""
    brand = row.get("brand")
    url = row.get("affiliate_url") or ""
    asin = row.get("asin") or ""

    # Try extracting ASIN from URL if not in dedicated field
    if not asin:
        m = re.search(r"/dp/([A-Z0-9]{10})", url)
        if m:
            asin = m.group(1)

    if asin:
        prefix = brand if brand and brand.strip() else "Amazon Deal"
        return f"{prefix} ({asin})"

    if brand and brand.strip():
        return brand.strip()

    return f"Deal #{row.get('id', '?')}"


def _calc_discount(current, original, stored_discount):
    """Calculate discount percent -- use stored value, or compute from prices if missing."""
    if stored_discount is not None and stored_discount > 0:
        return stored_discount
    try:
        cur = float(current) if current else 0
        orig = float(original) if original else 0
        if orig > 0 and cur > 0 and cur < orig:
            return round(((orig - cur) / orig) * 100, 1)
    except (ValueError, TypeError):
        pass
    return stored_discount or 0


# Hostname -> (display_name, source_key) mapping for retailer_products
_HOST_SOURCE_MAP = {
    "amazon":         ("Amazon",           "amazon_ca"),
    "leons":          ("Leon's",           "leons"),
    "thebrick":       ("The Brick",        "the_brick"),
    "frankandoak":    ("Frank & Oak",      "frank_and_oak"),
    "reebok":         ("Reebok",           "reebok_ca"),
    "mastermindtoys": ("Mastermind Toys",  "mastermind_toys"),
    "cabelas":        ("Cabela's",         "cabelas_ca"),
}

# Source key -> affiliate_url ILIKE pattern (for DB-level filtering)
# Patterns must match the DOMAIN only (not product slugs in URLs)
_SOURCE_URL_PATTERN = {
    "amazon_ca":       "*amazon.ca*",
    "leons":           "*leons.ca*",
    "the_brick":       "*thebrick.com*",
    "frank_and_oak":   "*frankandoak.com*",
    "reebok_ca":       "*reebok.ca*",
    "mastermind_toys": "*mastermindtoys.com*",
    "cabelas_ca":      "*cabelas.ca*",
}


def normalize_retailer(row):
    """Normalize a row from retailer_products into a unified product dict."""
    images = row.get("images") or []
    thumbnail = row.get("thumbnail_url", "")
    image_url = images[0] if images else (thumbnail if thumbnail and "LogoMobile" not in thumbnail else None)

    # Derive store/source from retailer_sku or affiliate_url
    store = "Unknown"
    source = "flipp"  # default -- Flipp flyer data

    sku = row.get("retailer_sku") or ""
    if "_" in sku:
        store = sku.split("_")[0]
        store_lower = store.lower()
        if "amazon" in store_lower:
            source = "amazon_ca"
        elif "leons" in store_lower:
            source = "leons"
    elif row.get("affiliate_url"):
        try:
            parsed = urlparse(row["affiliate_url"])
            hostname = parsed.hostname.replace("www.", "") if parsed.hostname else ""
            matched = False
            for key, (s_name, s_source) in _HOST_SOURCE_MAP.items():
                if key in hostname:
                    store, source = s_name, s_source
                    matched = True
                    break
            if not matched:
                domain = hostname.split(".")[0]
                store = domain.capitalize()
                source = "flipp"
        except Exception:
            pass

    cur = row.get("current_price")
    orig = row.get("original_price")
    return {
        "id": f"retailer_{row['id']}",
        "title": _clean_title(row.get("title"), row),
        "brand": row.get("brand"),
        "store": store,
        "source": source,
        "image_url": image_url,
        "current_price": cur,
        "original_price": orig,
        "discount_percent": _calc_discount(cur, orig, row.get("sale_percentage") or row.get("discount_percent")),
        "category": row.get("retailer_category"),
        "affiliate_url": row.get("affiliate_url") or row.get("retailer_url") or "#",
        "is_active": row.get("is_active", True),
        "first_seen_at": row.get("first_seen_at"),
        "last_seen_at": row.get("last_seen_at") or row.get("first_seen_at"),
    }


def normalize_keepa(row):
    """Normalize a row from keepa_deals into a unified product dict.
    Keepa deals are Amazon.ca products tracked by Keepa API with rich metadata
    (ASIN, sales rank, rating, review count, monthly_sold, deal_score, etc.)."""
    # Parse extra_images JSON string if present
    extra_imgs = row.get("extra_images") or "[]"
    if isinstance(extra_imgs, str):
        try:
            extra_imgs = json.loads(extra_imgs)
        except (json.JSONDecodeError, TypeError):
            extra_imgs = []

    image_url = row.get("main_image_url") or (extra_imgs[0] if extra_imgs else None)

    cur = row.get("current_price")
    orig = row.get("original_price")
    return {
        "id": f"keepa_{row['id']}",
        "title": row.get("title") or f"Amazon Deal ({row.get('asin', '?')})",
        "brand": row.get("brand"),
        "store": "Amazon",
        "source": "keepa",
        "image_url": image_url,
        "current_price": cur,
        "original_price": orig,
        "discount_percent": _calc_discount(cur, orig, row.get("discount_percent")),
        "category": row.get("category"),
        "affiliate_url": row.get("affiliate_url") or "#",
        "is_active": row.get("status") not in ("expired", "rejected"),
        "first_seen_at": row.get("discovered_at") or row.get("created_at"),
        "last_seen_at": row.get("price_checked_at") or row.get("updated_at"),
        # Keepa-specific extras (useful for display)
        "asin": row.get("asin"),
        "rating": row.get("rating"),
        "review_count": row.get("review_count"),
        "monthly_sold": row.get("monthly_sold"),
        "deal_score": row.get("deal_score"),
        "is_lowest": row.get("is_lowest", False),
        "has_coupon": row.get("has_coupon", False),
    }


# ══════════════════════════════════════════════
# FRONTEND STATIC FILE SERVING
# Only registered for local dev -- on Vercel, static files are served from public/
# ══════════════════════════════════════════════

if not os.getenv("VERCEL"):
    @app.route("/")
    def serve_index():
        return send_from_directory(FRONTEND_DIR, "index.html")

    @app.route("/images/<path:filename>")
    def serve_images(filename):
        return send_from_directory(os.path.join(FRONTEND_DIR, "images"), filename)


# ══════════════════════════════════════════════
# API ENDPOINTS
# ══════════════════════════════════════════════

# ── GET /api/health ──────────────────────────
@app.route("/api/health")
@timed("GET /api/health")
def health():
    """Health check -- verifies Supabase connection is alive. Counts both tables."""
    try:
        sb = get_supabase()
        # Count active retailer products
        r_result = sb.table("retailer_products").select("id", count="exact").eq("is_active", True).not_contains("extra_data", {"source": "cocopricetracker.ca"}).limit(1).execute()
        retailer_count = r_result.count or 0

        # Count keepa deals (not expired/rejected)
        k_result = sb.table("keepa_deals").select("id", count="exact").neq("status", "expired").neq("status", "rejected").limit(0).execute()
        keepa_count = k_result.count or 0

        return jsonify({
            "status": "ok",
            "database": "connected",
            "active_products": retailer_count + keepa_count,
            "retailer_products": retailer_count,
            "keepa_deals": keepa_count,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        log_error(f"Health check failed: {e}")
        return jsonify({"status": "error", "database": "disconnected", "error": str(e)}), 500


# ── GET /api/filters ─────────────────────────
@app.route("/api/filters")
@timed("GET /api/filters")
def get_filters():
    """
    Store list with product counts from retailer_products + keepa_deals.
    Counts each store by affiliate_url hostname pattern, plus keepa_deals as its own source.
    Cached for 5 minutes.
    """
    cached = cache.get("filters")
    if cached:
        return jsonify(cached)

    sb = get_supabase()

    # Count per store by affiliate_url hostname pattern (retailer_products)
    _STORE_URL_PATTERNS = {
        "amazon_ca":       ("Amazon",          "%amazon.ca%"),
        "leons":           ("Leon's",          "%leons.ca%"),
        "the_brick":       ("The Brick",       "%thebrick.com%"),
        "frank_and_oak":   ("Frank & Oak",     "%frankandoak.com%"),
        "reebok_ca":       ("Reebok",          "%reebok.ca%"),
        "mastermind_toys": ("Mastermind Toys",  "%mastermindtoys.com%"),
        "cabelas_ca":      ("Cabela's",        "%cabelas.ca%"),
    }

    stores = []
    retailer_active = 0
    recognized_total = 0

    # Get total active retailer count (excluding CocoPriceTracker)
    try:
        result = sb.table("retailer_products").select("id", count="exact").eq("is_active", True).not_contains("extra_data", {"source": "cocopricetracker.ca"}).limit(0).execute()
        retailer_active = result.count or 0
    except Exception as e:
        log_warning(f"Retailer total count failed: {e}")

    # Count each retailer store
    for source_key, (label, url_pattern) in _STORE_URL_PATTERNS.items():
        try:
            result = sb.table("retailer_products").select("id", count="exact").eq("is_active", True).not_contains("extra_data", {"source": "cocopricetracker.ca"}).ilike("affiliate_url", url_pattern).limit(0).execute()
            count = result.count or 0
            if count > 0:
                stores.append({"value": source_key, "label": label, "count": count})
                recognized_total += count
        except Exception as e:
            log_warning(f"Count failed for {source_key}: {e}")

    # "Other" = unrecognized retailer stores (Flipp flyer data, etc.)
    other_count = max(0, retailer_active - recognized_total)
    if other_count > 0:
        stores.append({"value": "flipp", "label": "Other", "count": other_count})

    # Count keepa_deals (not expired/rejected) -- separate Amazon.ca source via Keepa API
    keepa_count = 0
    try:
        k_result = sb.table("keepa_deals").select("id", count="exact").neq("status", "expired").neq("status", "rejected").limit(0).execute()
        keepa_count = k_result.count or 0
        if keepa_count > 0:
            stores.append({"value": "keepa", "label": "Keepa (Amazon.ca)", "count": keepa_count})
    except Exception as e:
        log_warning(f"Keepa count failed: {e}")

    total_active = retailer_active + keepa_count

    # Find most recent scrape time across both tables
    last_scraped = None
    try:
        result = sb.table("retailer_products").select("last_seen_at").eq("is_active", True).not_contains("extra_data", {"source": "cocopricetracker.ca"}).order("last_seen_at", desc=True).limit(1).execute()
        if result.data:
            last_scraped = result.data[0].get("last_seen_at")
    except Exception:
        pass
    # Check if keepa has a more recent timestamp
    try:
        k_result = sb.table("keepa_deals").select("price_checked_at").order("price_checked_at", desc=True).limit(1).execute()
        if k_result.data:
            keepa_last = k_result.data[0].get("price_checked_at")
            if keepa_last and (not last_scraped or keepa_last > last_scraped):
                last_scraped = keepa_last
    except Exception:
        pass

    response_data = {
        "stores": stores,
        "total_active": total_active,
        "last_scraped": last_scraped,
    }

    cache.set("filters", response_data, ttl_seconds=300)
    log_success(f"Filters: {len(stores)} stores, {total_active:,} active products (retailer={retailer_active}, keepa={keepa_count})")
    return jsonify(response_data)


# ── GET /api/stats ───────────────────────────
@app.route("/api/stats")
@timed("GET /api/stats")
def get_stats():
    """Active product count from retailer_products + keepa_deals. Cached for 60 seconds."""
    cached = cache.get("stats")
    if cached:
        return jsonify(cached)

    sb = get_supabase()
    retailer_total = 0
    retailer_on_sale = 0
    keepa_total = 0
    keepa_on_sale = 0

    # Retailer products counts
    try:
        result = sb.table("retailer_products").select("id", count="exact").eq("is_active", True).not_contains("extra_data", {"source": "cocopricetracker.ca"}).limit(0).execute()
        retailer_total = result.count or 0
    except Exception as e:
        log_warning(f"Stats retailer total failed: {e}")

    try:
        result = sb.table("retailer_products").select("id", count="exact").eq("is_active", True).not_contains("extra_data", {"source": "cocopricetracker.ca"}).gt("sale_percentage", 0).limit(0).execute()
        retailer_on_sale = result.count or 0
    except Exception as e:
        log_warning(f"Stats retailer on_sale failed: {e}")

    # Keepa deals counts
    try:
        k_result = sb.table("keepa_deals").select("id", count="exact").neq("status", "expired").neq("status", "rejected").limit(0).execute()
        keepa_total = k_result.count or 0
    except Exception as e:
        log_warning(f"Stats keepa total failed: {e}")

    try:
        k_result = sb.table("keepa_deals").select("id", count="exact").neq("status", "expired").neq("status", "rejected").gt("discount_percent", 0).limit(0).execute()
        keepa_on_sale = k_result.count or 0
    except Exception as e:
        log_warning(f"Stats keepa on_sale failed: {e}")

    total = retailer_total + keepa_total
    on_sale = retailer_on_sale + keepa_on_sale

    response_data = {
        "total_active": total,
        "on_sale": on_sale,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    cache.set("stats", response_data, ttl_seconds=60)
    log_success(f"Stats: {total:,} active (retailer={retailer_total}, keepa={keepa_total}), {on_sale:,} on sale")
    return jsonify(response_data)


# ── GET /api/products ────────────────────────
@app.route("/api/products")
@timed("GET /api/products")
def get_products():
    """
    Paginated product query from retailer_products + keepa_deals.
    Keepa_deals is small (~150 rows) so we fetch all matching rows and merge
    with the paginated retailer_products results for a unified sorted view.
    Filters: sources, search, min_discount, min_price, max_price, days, sort_by, sort_order, page, per_page.
    """
    sb = get_supabase()
    start_time = time.time()

    # ── Parse filter params ──
    sources = [s for s in request.args.get("sources", "").split(",") if s]
    search = request.args.get("search", "").strip()
    min_discount = _parse_int(request.args.get("min_discount"))
    min_price = _parse_float(request.args.get("min_price"))
    max_price = _parse_float(request.args.get("max_price"))
    days = _parse_int(request.args.get("days"))
    date_from = request.args.get("date_from")

    sort_by = request.args.get("sort_by", "last_seen_at")
    sort_order = request.args.get("sort_order", "desc")
    ascending = sort_order == "asc"

    page = max(1, _parse_int(request.args.get("page")) or 1)
    per_page = min(100, max(1, _parse_int(request.args.get("per_page")) or 24))

    # Convert "days" shortcut to date_from
    if days and not date_from:
        date_from = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")

    log_debug(f"Filters: sources={sources}, search='{search}', min_discount={min_discount}, "
              f"price={min_price}-{max_price}, days={days}, sort={sort_by}/{sort_order}, page={page}")

    # Determine which tables to query based on source filter
    # If user selected specific sources, only query relevant tables
    want_retailer = True
    want_keepa = True
    if sources:
        retailer_sources = [s for s in sources if s != "keepa"]
        want_retailer = bool(retailer_sources) or "flipp" in sources
        want_keepa = "keepa" in sources
        # If only keepa selected, skip retailer entirely
        if not retailer_sources and "keepa" in sources:
            want_retailer = False

    retailer_rows = []
    retailer_count = 0
    keepa_rows = []
    keepa_count = 0

    # ── Query retailer_products (DB-level filtering + pagination) ──
    if want_retailer:
        try:
            query = sb.table("retailer_products").select("*", count="exact") \
                .eq("is_active", True) \
                .not_contains("extra_data", {"source": "cocopricetracker.ca"})

            # DB-level source filtering via affiliate_url patterns
            if sources:
                url_patterns = [_SOURCE_URL_PATTERN[s] for s in sources if s in _SOURCE_URL_PATTERN]
                if len(url_patterns) == 1:
                    query = query.ilike("affiliate_url", url_patterns[0])
                elif url_patterns:
                    or_conditions = [f"affiliate_url.ilike.{p}" for p in url_patterns]
                    query = query.or_(or_conditions)

            if search:
                query = query.ilike("title", f"%{search}%")
            if max_price is not None:
                query = query.lte("current_price", max_price)
            if min_price is not None:
                query = query.gte("current_price", min_price)
            if min_discount is not None:
                query = query.gte("sale_percentage", min_discount)
            if date_from:
                query = query.gte("first_seen_at", date_from)

            # DB-level sort for retailer
            order_col = "first_seen_at" if sort_by == "first_seen_at" else "last_seen_at"
            if sort_by == "current_price":
                order_col = "current_price"
            elif sort_by == "discount_percent":
                order_col = "sale_percentage"
            query = query.order(order_col, desc=not ascending)

            # DB-level pagination -- fetch extra rows to account for keepa merging
            db_offset = max(0, (page - 1) * per_page)
            result = query.offset(db_offset).limit(per_page).execute()
            retailer_rows = result.data or []
            retailer_count = result.count or len(retailer_rows)
            log_debug(f"  retailer_products: {len(retailer_rows)} rows (total={retailer_count})")

        except Exception as e:
            log_error(f"Retailer query failed: {e}")
            return jsonify({"error": str(e)}), 500

    # ── Query keepa_deals (small table, fetch all matching rows) ──
    if want_keepa:
        try:
            kq = sb.table("keepa_deals").select("*", count="exact") \
                .neq("status", "expired").neq("status", "rejected")

            if search:
                kq = kq.ilike("title", f"%{search}%")
            if max_price is not None:
                kq = kq.lte("current_price", max_price)
            if min_price is not None:
                kq = kq.gte("current_price", min_price)
            if min_discount is not None:
                kq = kq.gte("discount_percent", min_discount)
            if date_from:
                kq = kq.gte("discovered_at", date_from)

            # Sort keepa the same way
            keepa_order_col = "discovered_at" if sort_by == "first_seen_at" else "price_checked_at"
            if sort_by == "current_price":
                keepa_order_col = "current_price"
            elif sort_by == "discount_percent":
                keepa_order_col = "discount_percent"
            kq = kq.order(keepa_order_col, desc=not ascending)

            # Fetch all keepa rows (small table, typically <500 rows)
            k_result = kq.limit(500).execute()
            keepa_rows = k_result.data or []
            keepa_count = k_result.count or len(keepa_rows)
            log_debug(f"  keepa_deals: {len(keepa_rows)} rows (total={keepa_count})")

        except Exception as e:
            log_warning(f"Keepa query failed (non-fatal): {e}")

    # ── Normalize all rows ──
    products = [normalize_retailer(row) for row in retailer_rows]
    products += [normalize_keepa(row) for row in keepa_rows]

    # ── Sort the merged results ──
    # Map sort_by to the normalized field name
    sort_key_map = {
        "last_seen_at": "last_seen_at",
        "first_seen_at": "first_seen_at",
        "current_price": "current_price",
        "discount_percent": "discount_percent",
    }
    sort_field = sort_key_map.get(sort_by, "last_seen_at")

    def _sort_val(p):
        """Extract sortable value, handling None gracefully."""
        v = p.get(sort_field)
        if v is None:
            return "" if isinstance(sort_field, str) and "at" in sort_field else 0
        return v

    products.sort(key=_sort_val, reverse=not ascending)

    # ── Pagination for keepa-only requests (retailer already paginated at DB level) ──
    # When both tables are queried, retailer is already paginated; keepa rows get
    # merged in and the sort re-orders them. We take per_page items from the merged list.
    if want_keepa and not want_retailer:
        # Keepa-only: paginate in memory since we fetched all rows
        offset = (page - 1) * per_page
        products = products[offset:offset + per_page]
    else:
        # Mixed: take at most per_page from the merged+sorted results
        products = products[:per_page]

    total = retailer_count + keepa_count

    query_time = (time.time() - start_time) * 1000
    log_success(f"Products: {total} total (retailer={retailer_count}, keepa={keepa_count}), "
                f"returning {len(products)} (page {page}), {query_time:.0f}ms")

    return jsonify({
        "products": products,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": max(1, (total + per_page - 1) // per_page),
        "query_time_ms": round(query_time),
    })


# ── GET /api/product/<id> ────────────────────
@app.route("/api/product/<product_id>")
@timed("GET /api/product/<id>")
def get_product(product_id):
    """Single product detail with price history. Routes to keepa_deals or retailer_products by ID prefix."""
    sb = get_supabase()

    # Route to the correct table based on ID prefix
    if product_id.startswith("keepa_"):
        # ── Keepa deal lookup ──
        actual_id = product_id.replace("keepa_", "", 1)
        try:
            result = sb.table("keepa_deals").select("*").eq("id", actual_id).limit(1).execute()
        except Exception as e:
            log_error(f"Keepa product lookup failed: {e}")
            return jsonify({"error": str(e)}), 500

        if not result.data:
            return jsonify({"error": "Product not found"}), 404

        data = result.data[0]
        product = normalize_keepa(data)

        # Keepa doesn't have a separate price_history table yet -- synthesize from current data
        history = _build_keepa_price_history(data)
        product["price_history"] = history
        product["description"] = None  # keepa_deals has no description column
        return jsonify(product)

    else:
        # ── Retailer product lookup (original path) ──
        actual_id = product_id.replace("retailer_", "")

        try:
            result = sb.table("retailer_products").select("*").eq("id", actual_id).limit(1).execute()
        except Exception as e:
            log_error(f"Product lookup failed: {e}")
            return jsonify({"error": str(e)}), 500

        if not result.data:
            return jsonify({"error": "Product not found"}), 404

        data = result.data[0]

        # Get price history from price_history table
        history = []
        try:
            h_result = sb.table("price_history").select(
                "price, original_price, scraped_at, is_on_sale"
            ).eq("retailer_product_id", actual_id).order("scraped_at").execute()
            history = [
                {"price": h["price"], "original_price": h.get("original_price"),
                 "scraped_at": h["scraped_at"], "is_on_sale": h.get("is_on_sale", False)}
                for h in (h_result.data or [])
            ]
        except Exception:
            pass

        # If no history rows, synthesize from current product data
        if not history:
            history = _build_price_history(data)

        product = normalize_retailer(data)
        product["price_history"] = history
        product["description"] = data.get("description")
        return jsonify(product)


# ── GET /api/product/<id>/history ────────────
@app.route("/api/product/<product_id>/history")
@timed("GET /api/product/<id>/history")
def get_product_history(product_id):
    """Full price history for a product with computed stats. Routes by ID prefix."""
    sb = get_supabase()
    history = []

    if product_id.startswith("keepa_"):
        # ── Keepa deal history (synthesized from current data) ──
        actual_id = product_id.replace("keepa_", "", 1)
        try:
            result = sb.table("keepa_deals").select("*").eq("id", actual_id).limit(1).execute()
            if result.data:
                history = _build_keepa_price_history(result.data[0])
        except Exception as e:
            log_warning(f"Keepa history lookup failed for {product_id}: {e}")
    else:
        # ── Retailer product history (from price_history table) ──
        actual_id = product_id.replace("retailer_", "")
        try:
            h_result = sb.table("price_history").select(
                "price, original_price, scraped_at, is_on_sale"
            ).eq("retailer_product_id", actual_id).order("scraped_at").execute()
            history = h_result.data or []
        except Exception as e:
            log_warning(f"History lookup failed for {product_id}: {e}")

        # If no history, synthesize from product data
        if not history:
            try:
                result = sb.table("retailer_products").select("*").eq("id", actual_id).limit(1).execute()
                if result.data:
                    history = _build_price_history(result.data[0])
            except Exception:
                pass

    return jsonify(_compute_history_stats(history))


# ══════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════

def _build_keepa_price_history(data):
    """Build a synthetic price history from a keepa_deals row.
    Uses discovered_at as the first data point and price_checked_at as the latest."""
    current = data.get("current_price")
    original = data.get("original_price")
    first_seen = data.get("discovered_at") or data.get("created_at") or datetime.now(timezone.utc).isoformat()
    last_checked = data.get("price_checked_at") or data.get("updated_at") or datetime.now(timezone.utc).isoformat()

    if original and current and original > current:
        return [
            {"price": original, "original_price": original, "scraped_at": first_seen, "is_on_sale": False},
            {"price": current, "original_price": original, "scraped_at": last_checked, "is_on_sale": True},
        ]
    else:
        return [{
            "price": current,
            "original_price": original,
            "scraped_at": first_seen,
            "is_on_sale": bool(data.get("discount_percent") or 0),
        }]


def _build_price_history(data):
    """Build a synthetic price history from a single product row."""
    current = data.get("current_price")
    original = data.get("original_price")
    first_seen = data.get("first_seen_at") or data.get("created_at") or datetime.now(timezone.utc).isoformat()

    if original and current and original > current:
        return [
            {"price": original, "original_price": original, "scraped_at": first_seen, "is_on_sale": False},
            {"price": current, "original_price": original,
             "scraped_at": data.get("last_seen_at") or data.get("updated_at") or datetime.now(timezone.utc).isoformat(),
             "is_on_sale": True},
        ]
    else:
        return [{
            "price": current,
            "original_price": original,
            "scraped_at": first_seen,
            "is_on_sale": bool(data.get("sale_percentage") or 0),
        }]


def _compute_history_stats(history_rows):
    """Compute summary stats from price history rows."""
    if not history_rows:
        return {"history": [], "stats": None}

    prices = [h["price"] for h in history_rows if h.get("price") is not None]
    if not prices:
        return {"history": history_rows, "stats": None}

    lowest = min(prices)
    highest = max(prices)
    avg_price = sum(prices) / len(prices)
    first_price = prices[0]
    last_price = prices[-1]
    change_pct = ((last_price - first_price) / first_price * 100) if first_price > 0 else 0

    return {
        "history": history_rows,
        "stats": {
            "lowest_price": round(lowest, 2),
            "highest_price": round(highest, 2),
            "avg_price": round(avg_price, 2),
            "total_data_points": len(prices),
            "price_change_pct": round(change_pct, 1),
            "first_recorded": history_rows[0].get("scraped_at"),
            "last_recorded": history_rows[-1].get("scraped_at"),
        },
    }


def _parse_int(value):
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _parse_float(value):
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


# ══════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════

if __name__ == "__main__":
    print()
    log_info("=" * 60)
    log_info("  Deal Viewer API Server (Simplified)")
    log_info(f"  Port: {FLASK_PORT}")
    log_info(f"  Debug: {FLASK_DEBUG}")
    log_info(f"  Frontend: {FRONTEND_DIR}")
    log_info("=" * 60)
    print()

    try:
        get_supabase()
        log_success("Database connection verified")
    except Exception as e:
        log_error(f"Database connection failed: {e}")

    app.run(host="0.0.0.0", port=FLASK_PORT, debug=FLASK_DEBUG)
