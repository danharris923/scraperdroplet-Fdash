"""
app.py — Flask API server for the Deal Viewer.
Queries 12+ Supabase tables, normalizes into a unified Product format,
and serves everything over a clean REST API.

Endpoints:
  GET /api/health       — Health check + DB connection test
  GET /api/filters      — Dynamic filter options with counts (5-min cache)
  GET /api/stats        — Dashboard summary stats (60s cache)
  GET /api/products     — Multi-table paginated product query with all filters
  GET /api/product/<id> — Single product detail with price history
  GET /api/product/<id>/history — Full price history + computed stats
  GET /api/price-tracker — Price drops feed, most tracked, biggest drops
  GET /api/scrapers     — Proxy to droplet API for scraper statuses
"""

import os
import time
import traceback
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

import requests
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from config import (
    get_supabase, DEAL_TABLES, SOURCE_LABELS,
    DROPLET_API_URL, FLASK_PORT, FLASK_DEBUG,
    cache,
    log_success, log_warning, log_error, log_info, log_debug, log_timing,
    timed,
)

# ──────────────────────────────────────────────
# Flask app setup
# ──────────────────────────────────────────────
app = Flask(__name__, static_folder=None)
CORS(app)  # Allow all origins for local dev

# Path to frontend files (served statically in local dev only — Vercel serves from public/)
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
# NORMALIZATION FUNCTIONS
# Port of route.ts lines 206-348 — converts each table's
# schema into a unified Product dict.
# ══════════════════════════════════════════════

def normalize_deal(row, table_name, table_source):
    """Normalize a row from any deals table (deals, amazon_ca_deals, etc.)."""
    source = row.get("source") or table_source or table_name.replace("_deals", "")
    return {
        "id": f"{table_name}_{row['id']}",
        "title": row.get("title") or row.get("name") or "",
        "brand": row.get("brand"),
        "store": row.get("store") or row.get("store_name") or table_source or "Unknown",
        "source": source,
        "image_url": row.get("image_blob_url") or row.get("image_url") or row.get("thumbnail_url"),
        "current_price": row.get("current_price") or row.get("price"),
        "original_price": row.get("original_price"),
        "discount_percent": row.get("discount_percent"),
        "category": row.get("category"),
        "region": row.get("region"),
        "affiliate_url": row.get("affiliate_url") or row.get("url") or row.get("product_url") or "#",
        "is_active": row.get("is_active", True),
        "first_seen_at": row.get("date_added") or row.get("created_at") or row.get("created_date") or row.get("first_seen_at"),
        "last_seen_at": row.get("date_updated") or row.get("updated_at") or row.get("last_seen_at") or row.get("created_at") or row.get("created_date"),
    }


def normalize_retailer(row):
    """Normalize a row from retailer_products (excluding CocoPriceTracker)."""
    images = row.get("images") or []
    thumbnail = row.get("thumbnail_url", "")
    # Use first image, fallback to thumbnail if it's not a logo
    image_url = images[0] if images else (thumbnail if thumbnail and "LogoMobile" not in thumbnail else None)

    # Derive store/source from retailer_sku or affiliate_url
    store = "Unknown"
    source = "Flipp"

    sku = row.get("retailer_sku") or ""
    if "_" in sku:
        store = sku.split("_")[0]
    elif row.get("affiliate_url"):
        try:
            parsed = urlparse(row["affiliate_url"])
            hostname = parsed.hostname.replace("www.", "") if parsed.hostname else ""
            if "amazon" in hostname:
                store, source = "Amazon", "Amazon"
            elif "leons" in hostname:
                store, source = "Leons", "Leons"
            else:
                domain = hostname.split(".")[0]
                store = domain.capitalize()
                source = store
        except Exception:
            pass

    return {
        "id": f"retailer_{row['id']}",
        "title": row.get("title") or "",
        "brand": row.get("brand"),
        "store": store,
        "source": source,
        "image_url": image_url,
        "current_price": row.get("current_price"),
        "original_price": row.get("original_price"),
        "discount_percent": row.get("sale_percentage") or row.get("discount_percent"),
        "category": row.get("retailer_category"),
        "region": row.get("region"),
        "affiliate_url": row.get("affiliate_url") or row.get("retailer_url") or "#",
        "is_active": row.get("is_active", True),
        "first_seen_at": row.get("first_seen_at"),
        "last_seen_at": row.get("last_seen_at") or row.get("first_seen_at"),
    }


def normalize_costco_photo(row):
    """Normalize a row from costco_user_photos (CocoWest / WarehouseRunner)."""
    is_usa = row.get("source") == "warehouse_runner"
    name = row.get("name") or ""
    sku = row.get("sku") or name
    return {
        "id": f"costco_photo_{row['id']}",
        "title": name,
        "brand": None,
        "store": "Costco",
        "source": row.get("source") or "cocowest",
        "image_url": row.get("processed_url") or row.get("original_url"),
        "current_price": row.get("price"),
        "original_price": row.get("original_price"),
        "discount_percent": row.get("discount_percent"),
        "category": None,
        "region": row.get("region") or ("USA" if is_usa else "Canada"),
        "affiliate_url": (
            f"https://www.costco.com/CatalogSearch?keyword={sku}"
            if is_usa else
            f"https://www.costco.ca/CatalogSearch?keyword={sku}"
        ),
        "is_active": True,
        "first_seen_at": row.get("scraped_at") or row.get("created_at"),
        "last_seen_at": row.get("updated_at") or row.get("scraped_at"),
    }


def normalize_cocoprice(row, sku_image_map=None):
    """Normalize a CocoPriceTracker row (from retailer_products with extra_data.source)."""
    extra = row.get("extra_data") or {}
    region_key = extra.get("region", "west")
    region_display = "Costco West" if region_key == "west" else "Costco East" if region_key == "east" else "Canada"

    # Try to find image from costco_user_photos by SKU
    sku = row.get("retailer_sku") or ""
    image_url = (sku_image_map or {}).get(sku)

    return {
        "id": f"cocoprice_{row['id']}",
        "title": row.get("title") or "",
        "brand": row.get("brand"),
        "store": "Costco",
        "source": "cocopricetracker",
        "image_url": image_url,
        "current_price": row.get("current_price"),
        "original_price": row.get("original_price"),
        "discount_percent": row.get("sale_percentage") or row.get("discount_percent"),
        "category": row.get("retailer_category"),
        "region": region_display,
        "affiliate_url": row.get("retailer_url") or f"https://www.costco.ca/CatalogSearch?keyword={sku or row.get('title', '')}",
        "is_active": row.get("is_active", True),
        "first_seen_at": row.get("first_seen_at"),
        "last_seen_at": row.get("last_seen_at") or row.get("first_seen_at"),
    }


# ══════════════════════════════════════════════
# FRONTEND STATIC FILE SERVING
# Serve index.html, CSS, and JS files from the frontend/ directory.
# Only registered for local dev — on Vercel, static files are served from public/ by the CDN.
# ══════════════════════════════════════════════

if not os.getenv("VERCEL"):
    @app.route("/")
    def serve_index():
        """Serve the main frontend page."""
        return send_from_directory(FRONTEND_DIR, "index.html")

    @app.route("/css/<path:filename>")
    def serve_css(filename):
        return send_from_directory(os.path.join(FRONTEND_DIR, "css"), filename)

    @app.route("/js/<path:filename>")
    def serve_js(filename):
        return send_from_directory(os.path.join(FRONTEND_DIR, "js"), filename)


# ══════════════════════════════════════════════
# API ENDPOINTS
# ══════════════════════════════════════════════

# ── GET /api/health ──────────────────────────
@app.route("/api/health")
@timed("GET /api/health")
def health():
    """Health check — verifies Supabase connection is alive."""
    try:
        sb = get_supabase()
        # Quick query to test connection
        result = sb.table("deals").select("id", count="exact").limit(1).execute()
        return jsonify({
            "status": "ok",
            "database": "connected",
            "deals_count": result.count,
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
    Dynamic filter options with counts.
    Returns sources (by category), stores, regions, brands, categories,
    and price/discount/date ranges.
    Cached for 5 minutes.
    """
    cached = cache.get("filters")
    if cached:
        return jsonify(cached)

    sb = get_supabase()

    # ── Count each source table ──
    counts = {}

    # Deal tables
    for table in DEAL_TABLES:
        try:
            result = sb.table(table["name"]).select("id", count="exact").limit(0).execute()
            counts[table["name"]] = result.count or 0
        except Exception as e:
            log_warning(f"Count failed for {table['name']}: {e}")
            counts[table["name"]] = 0

    # Retailer products (excluding CocoPriceTracker)
    try:
        result = sb.table("retailer_products").select("id", count="exact").not_contains("extra_data", {"source": "cocopricetracker.ca"}).limit(0).execute()
        counts["retailer_products"] = result.count or 0
    except Exception as e:
        log_warning(f"Count failed for retailer_products: {e}")
        counts["retailer_products"] = 0

    # Costco user photos — by source
    for costco_source in ["cocowest", "warehouse_runner"]:
        try:
            result = sb.table("costco_user_photos").select("id", count="exact").eq("source", costco_source).limit(0).execute()
            counts[costco_source] = result.count or 0
        except Exception as e:
            log_warning(f"Count failed for costco_user_photos/{costco_source}: {e}")
            counts[costco_source] = 0

    # CocoPriceTracker
    try:
        result = sb.table("retailer_products").select("id", count="exact").contains("extra_data", {"source": "cocopricetracker.ca"}).limit(0).execute()
        counts["cocopricetracker"] = result.count or 0
    except Exception as e:
        log_warning(f"Count failed for cocopricetracker: {e}")
        counts["cocopricetracker"] = 0

    # ── Build sources by category ──
    sources_by_category = {
        "aggregators": [],
        "retailers": [],
        "costcoTrackers": [],
    }

    # Aggregators
    if counts.get("deals", 0) > 0:
        sources_by_category["aggregators"].append({"value": "rfd", "label": "RedFlagDeals", "count": counts["deals"]})

    # Retailers
    retailer_sources = [
        ("retailer_products", "amazon", "Amazon (Keepa)"),
        ("amazon_ca_deals",   "amazon_ca", "Amazon CA"),
        ("cabelas_ca_deals",  "cabelas_ca", "Cabela's"),
        ("frank_and_oak_deals", "frank_and_oak", "Frank And Oak"),
        ("leons_deals",       "leons", "Leon's"),
        ("mastermind_toys_deals", "mastermind_toys", "Mastermind Toys"),
        ("reebok_ca_deals",   "reebok_ca", "Reebok CA"),
        ("the_brick_deals",   "the_brick", "The Brick"),
        ("yepsavings_deals",  "yepsavings", "YepSavings"),
    ]
    for table_key, value, label in retailer_sources:
        c = counts.get(table_key, 0)
        if c > 0:
            sources_by_category["retailers"].append({"value": value, "label": label, "count": c})

    # Costco trackers
    sources_by_category["costcoTrackers"].append({"value": "cocowest", "label": "CocoWest (Canada)", "count": counts.get("cocowest", 0)})
    sources_by_category["costcoTrackers"].append({"value": "warehouse_runner", "label": "WarehouseRunner (USA)", "count": counts.get("warehouse_runner", 0)})
    sources_by_category["costcoTrackers"].append({"value": "cocopricetracker", "label": "CocoPriceTracker", "count": counts.get("cocopricetracker", 0)})

    # Flat sources list with counts in label
    all_sources = []
    for cat in ["aggregators", "retailers", "costcoTrackers"]:
        for s in sources_by_category[cat]:
            all_sources.append({"value": s["value"], "label": f"{s['label']} ({s['count']:,})", "count": s["count"]})

    # ── Stores from deals table ──
    stores = []
    try:
        result = sb.table("deals").select("store").limit(1000).execute()
        store_set = sorted(set(r["store"] for r in (result.data or []) if r.get("store")))
        stores = [{"value": s, "label": s} for s in store_set]
    except Exception as e:
        log_warning(f"Failed to fetch stores: {e}")

    # ── Regions from costco_user_photos ──
    regions = []
    try:
        result = sb.table("costco_user_photos").select("region").limit(100).execute()
        region_set = set()
        for r in (result.data or []):
            if r.get("region"):
                for part in r["region"].split("/"):
                    region_set.add(part.strip())
        regions = [{"value": r, "label": r} for r in sorted(region_set)]
    except Exception as e:
        log_warning(f"Failed to fetch regions: {e}")

    # ── Brands (from retailer_products — top 50 by frequency) ──
    brands = []
    try:
        result = sb.table("retailer_products").select("brand").not_is("brand", "null").limit(2000).execute()
        brand_counts = {}
        for r in (result.data or []):
            b = r.get("brand")
            if b:
                brand_counts[b] = brand_counts.get(b, 0) + 1
        # Sort by count descending, take top 50
        top_brands = sorted(brand_counts.items(), key=lambda x: -x[1])[:50]
        brands = [{"value": b, "label": f"{b} ({c})", "count": c} for b, c in top_brands]
    except Exception as e:
        log_warning(f"Failed to fetch brands: {e}")

    # ── Categories (from retailer_products — top 30) ──
    categories = []
    try:
        result = sb.table("retailer_products").select("retailer_category").not_is("retailer_category", "null").limit(2000).execute()
        cat_counts = {}
        for r in (result.data or []):
            c = r.get("retailer_category")
            if c:
                cat_counts[c] = cat_counts.get(c, 0) + 1
        top_cats = sorted(cat_counts.items(), key=lambda x: -x[1])[:30]
        categories = [{"value": c, "label": f"{c} ({ct})", "count": ct} for c, ct in top_cats]
    except Exception as e:
        log_warning(f"Failed to fetch categories: {e}")

    # ── Grand total ──
    costco_total = counts.get("cocowest", 0) + counts.get("warehouse_runner", 0) + counts.get("cocopricetracker", 0)
    grand_total = sum(counts.get(t["name"], 0) for t in DEAL_TABLES) + counts.get("retailer_products", 0) + costco_total

    response_data = {
        "sources": all_sources,
        "sourcesByCategory": {
            cat: [{"value": s["value"], "label": f"{s['label']} ({s['count']:,})", "count": s["count"]} for s in items]
            for cat, items in sources_by_category.items()
        },
        "stores": stores,
        "regions": regions,
        "brands": brands,
        "categories": categories,
        "counts": {
            "sources": len(all_sources),
            "stores": len(stores),
            "regions": len(regions),
            "brands": len(brands),
            "categories": len(categories),
            "totalProducts": grand_total,
            "byCategory": {
                "aggregators": sum(s["count"] for s in sources_by_category["aggregators"]),
                "retailers": sum(s["count"] for s in sources_by_category["retailers"]),
                "costcoTrackers": costco_total,
            },
        },
    }

    cache.set("filters", response_data, ttl_seconds=300)  # 5 min cache
    log_success(f"Filters loaded: {len(all_sources)} sources, {len(stores)} stores, {len(brands)} brands, {grand_total:,} total products")
    return jsonify(response_data)


# ── GET /api/stats ───────────────────────────
@app.route("/api/stats")
@timed("GET /api/stats")
def get_stats():
    """
    Dashboard summary stats: total products, store count, today's adds, on-sale count.
    Cached for 60 seconds.
    """
    cached = cache.get("stats")
    if cached:
        return jsonify(cached)

    sb = get_supabase()
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

    total = 0
    today_count = 0
    store_set = set()

    # Count across deal tables
    for table in DEAL_TABLES:
        date_col = table.get("date_col", "created_at")
        store_col = table.get("store_col", "store")
        try:
            # Total count
            result = sb.table(table["name"]).select("id", count="exact").limit(0).execute()
            total += result.count or 0

            # Today's count
            result_today = sb.table(table["name"]).select("id", count="exact").gte(date_col, today_start).limit(0).execute()
            today_count += result_today.count or 0

            # Stores
            store_result = sb.table(table["name"]).select(store_col).limit(500).execute()
            for r in (store_result.data or []):
                val = r.get(store_col)
                if val:
                    store_set.add(val)
        except Exception as e:
            log_warning(f"Stats error for {table['name']}: {e}")

    # Retailer products
    try:
        result = sb.table("retailer_products").select("id", count="exact").limit(0).execute()
        total += result.count or 0
    except Exception:
        pass

    # Costco photos
    try:
        result = sb.table("costco_user_photos").select("id", count="exact").limit(0).execute()
        total += result.count or 0
        store_set.add("Costco")
    except Exception:
        pass

    # On-sale count (products where discount > 0 across main tables)
    on_sale = 0
    try:
        result = sb.table("deals").select("id", count="exact").gt("discount_percent", 0).limit(0).execute()
        on_sale += result.count or 0
    except Exception:
        pass
    try:
        result = sb.table("retailer_products").select("id", count="exact").gt("sale_percentage", 0).limit(0).execute()
        on_sale += result.count or 0
    except Exception:
        pass

    response_data = {
        "total_products": total,
        "total_stores": len(store_set),
        "added_today": today_count,
        "on_sale": on_sale,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    cache.set("stats", response_data, ttl_seconds=60)
    log_success(f"Stats: {total:,} products, {len(store_set)} stores, {today_count} today, {on_sale:,} on sale")
    return jsonify(response_data)


# ── GET /api/products ────────────────────────
@app.route("/api/products")
@timed("GET /api/products")
def get_products():
    """
    Multi-table paginated product query with ALL filters.
    Fetches up to 500 rows per table, normalizes, sorts in Python, paginates.

    Query params:
      sources, stores, regions, brands, categories — comma-separated lists
      search — text search (ILIKE on title)
      min_discount, max_discount — discount percent range
      min_price, max_price — price range
      date_from, date_to — ISO date strings for date range
      days — shortcut for date_from (e.g. days=7 → last 7 days)
      on_sale_only — "true" to only show items with discount > 0
      has_price_drop — "true" to only show current_price < original_price
      active_only — "true" to only show is_active=true
      sort_by — "last_seen_at" (default), "discount_percent", "current_price", "first_seen_at"
      sort_order — "desc" (default) or "asc"
      page — page number (default 1)
      per_page — items per page (default 24)
    """
    sb = get_supabase()
    start_time = time.time()

    # ── Parse all filter params ──
    sources = [s for s in request.args.get("sources", "").split(",") if s]
    stores_filter = [s for s in request.args.get("stores", "").split(",") if s]
    regions_filter = [s for s in request.args.get("regions", "").split(",") if s]
    brands_filter = [s for s in request.args.get("brands", "").split(",") if s]
    categories_filter = [s for s in request.args.get("categories", "").split(",") if s]
    search = request.args.get("search", "").strip()

    min_discount = _parse_int(request.args.get("min_discount"))
    max_discount = _parse_int(request.args.get("max_discount"))
    min_price = _parse_float(request.args.get("min_price"))
    max_price = _parse_float(request.args.get("max_price"))

    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    days = _parse_int(request.args.get("days"))

    on_sale_only = request.args.get("on_sale_only", "").lower() == "true"
    has_price_drop = request.args.get("has_price_drop", "").lower() == "true"
    active_only = request.args.get("active_only", "").lower() == "true"

    sort_by = request.args.get("sort_by", "last_seen_at")
    sort_order = request.args.get("sort_order", "desc")
    ascending = sort_order == "asc"

    page = max(1, _parse_int(request.args.get("page")) or 1)
    per_page = min(100, max(1, _parse_int(request.args.get("per_page")) or 24))

    # Convert "days" shortcut to date_from
    if days and not date_from:
        date_from = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")

    # Fetch limit per table — enough to fill pagination after filtering
    fetch_limit = min(page * per_page + per_page, 500)

    log_debug(f"Filters: sources={sources}, search='{search}', discount={min_discount}-{max_discount}, "
              f"price={min_price}-{max_price}, dates={date_from} to {date_to}, "
              f"on_sale={on_sale_only}, drop={has_price_drop}, sort={sort_by}/{sort_order}, page={page}")

    all_products = []

    # ── Query deal tables ──
    for table in DEAL_TABLES:
        # Skip if source filter excludes this table
        if sources:
            if table["source"] and table["source"] not in sources:
                continue
            # For main deals table, check if any source matches
            if table["name"] == "deals":
                deal_sources = [s for s in sources if s.lower() in ("rfd", "flipp", "amazon", "costco", "deals")]
                if not deal_sources and not any("deal" in s.lower() for s in sources):
                    continue

        try:
            date_col = table.get("date_col", "created_at")
            store_col = table.get("store_col", "store")

            query = sb.table(table["name"]).select("*")
            if search:
                query = query.ilike("title", f"%{search}%")
            if stores_filter:
                query = query.in_(store_col, stores_filter)
            if min_discount is not None:
                query = query.gte("discount_percent", min_discount)
            if max_discount is not None:
                query = query.lte("discount_percent", max_discount)
            if max_price is not None:
                query = query.lte("current_price", max_price)
            if min_price is not None:
                query = query.gte("current_price", min_price)
            if date_from:
                query = query.gte(date_col, date_from)
            if date_to:
                query = query.lte(date_col, date_to)
            if on_sale_only:
                query = query.gt("discount_percent", 0)

            result = query.order(date_col, desc=not ascending).limit(fetch_limit).execute()

            for row in (result.data or []):
                all_products.append(normalize_deal(row, table["name"], table["source"]))

            log_debug(f"  {table['name']}: {len(result.data or [])} rows")
        except Exception as e:
            log_warning(f"Query failed for {table['name']}: {e}")

    # ── Query retailer_products (excluding CocoPriceTracker) ──
    include_retailer = not sources or any(s.lower() in ("amazon", "leons", "retailer", "flipp") for s in sources)
    if include_retailer:
        try:
            query = sb.table("retailer_products").select("*").not_contains("extra_data", {"source": "cocopricetracker.ca"})
            if search:
                query = query.ilike("title", f"%{search}%")
            if regions_filter:
                query = query.in_("region", regions_filter)
            if brands_filter:
                query = query.in_("brand", brands_filter)
            if categories_filter:
                query = query.in_("retailer_category", categories_filter)
            if min_discount is not None:
                query = query.gte("sale_percentage", min_discount)
            if max_discount is not None:
                query = query.lte("sale_percentage", max_discount)
            if max_price is not None:
                query = query.lte("current_price", max_price)
            if min_price is not None:
                query = query.gte("current_price", min_price)
            if date_from:
                query = query.gte("first_seen_at", date_from)
            if date_to:
                query = query.lte("first_seen_at", date_to)
            if on_sale_only:
                query = query.gt("sale_percentage", 0)

            result = query.order("first_seen_at", desc=not ascending).limit(fetch_limit).execute()

            for row in (result.data or []):
                all_products.append(normalize_retailer(row))

            log_debug(f"  retailer_products: {len(result.data or [])} rows")
        except Exception as e:
            log_warning(f"Query failed for retailer_products: {e}")

    # ── Query costco_user_photos ──
    include_costco = not sources or any(s.lower() in ("cocowest", "warehouse_runner") for s in sources)
    if include_costco:
        try:
            query = sb.table("costco_user_photos").select("*")

            # Filter by specific costco source if requested
            costco_sources = [s for s in sources if s.lower() in ("cocowest", "warehouse_runner")]
            if costco_sources:
                query = query.in_("source", costco_sources)

            if search:
                query = query.ilike("name", f"%{search}%")
            if regions_filter:
                query = query.ilike("region", f"%{regions_filter[0]}%")
            if min_discount is not None:
                query = query.gte("discount_percent", min_discount)
            if max_discount is not None:
                query = query.lte("discount_percent", max_discount)
            if max_price is not None:
                query = query.lte("price", max_price)
            if min_price is not None:
                query = query.gte("price", min_price)
            if date_from:
                query = query.gte("scraped_at", date_from)
            if date_to:
                query = query.lte("scraped_at", date_to)
            if on_sale_only:
                query = query.gt("discount_percent", 0)

            result = query.order("scraped_at", desc=not ascending).limit(fetch_limit).execute()

            for row in (result.data or []):
                all_products.append(normalize_costco_photo(row))

            log_debug(f"  costco_user_photos: {len(result.data or [])} rows")
        except Exception as e:
            log_warning(f"Query failed for costco_user_photos: {e}")

    # ── Query CocoPriceTracker (retailer_products with extra_data.source) ──
    include_cocoprice = not sources or "cocopricetracker" in [s.lower() for s in sources]
    if include_cocoprice:
        try:
            query = sb.table("retailer_products").select("*").contains("extra_data", {"source": "cocopricetracker.ca"})
            if search:
                query = query.ilike("title", f"%{search}%")
            if min_discount is not None:
                query = query.gte("sale_percentage", min_discount)
            if max_discount is not None:
                query = query.lte("sale_percentage", max_discount)
            if max_price is not None:
                query = query.lte("current_price", max_price)
            if min_price is not None:
                query = query.gte("current_price", min_price)
            if date_from:
                query = query.gte("first_seen_at", date_from)
            if date_to:
                query = query.lte("first_seen_at", date_to)
            if on_sale_only:
                query = query.gt("sale_percentage", 0)

            result = query.order("updated_at", desc=not ascending).limit(fetch_limit).execute()

            # Build SKU → image map from costco_user_photos
            cocoprice_data = result.data or []
            sku_image_map = {}
            if cocoprice_data:
                skus = [r.get("retailer_sku") for r in cocoprice_data if r.get("retailer_sku")]
                if skus:
                    try:
                        photo_result = sb.table("costco_user_photos").select("sku, original_url, processed_url").in_("sku", skus).execute()
                        for p in (photo_result.data or []):
                            if p.get("sku") and p["sku"] not in sku_image_map:
                                sku_image_map[p["sku"]] = p.get("processed_url") or p.get("original_url")
                    except Exception:
                        pass

            for row in cocoprice_data:
                all_products.append(normalize_cocoprice(row, sku_image_map))

            log_debug(f"  cocopricetracker: {len(cocoprice_data)} rows")
        except Exception as e:
            log_warning(f"Query failed for cocopricetracker: {e}")

    # ── Post-fetch filtering (filters that can't be pushed to Supabase) ──
    if has_price_drop:
        all_products = [
            p for p in all_products
            if p.get("current_price") and p.get("original_price")
            and p["current_price"] < p["original_price"]
        ]

    if active_only:
        all_products = [p for p in all_products if p.get("is_active", True)]

    if brands_filter and not include_retailer:
        # Brand filter already applied to retailer query, but apply to deals too
        all_products = [p for p in all_products if p.get("brand") in brands_filter or not p.get("brand")]

    if categories_filter and not include_retailer:
        all_products = [p for p in all_products if p.get("category") in categories_filter or not p.get("category")]

    # ── Sort combined results ──
    if sort_by == "discount_percent":
        all_products.sort(key=lambda p: p.get("discount_percent") or 0, reverse=not ascending)
    elif sort_by == "current_price":
        all_products.sort(key=lambda p: p.get("current_price") or 0, reverse=not ascending)
    elif sort_by == "first_seen_at":
        all_products.sort(key=lambda p: p.get("first_seen_at") or "", reverse=not ascending)
    else:
        # Default: sort by last_seen_at
        all_products.sort(key=lambda p: p.get("last_seen_at") or "", reverse=not ascending)

    # ── Paginate ──
    total = len(all_products)
    offset = (page - 1) * per_page
    paginated = all_products[offset:offset + per_page]

    query_time = (time.time() - start_time) * 1000

    # Build applied_filters summary for the response
    applied = {}
    if sources:
        applied["sources"] = sources
    if stores_filter:
        applied["stores"] = stores_filter
    if regions_filter:
        applied["regions"] = regions_filter
    if brands_filter:
        applied["brands"] = brands_filter
    if categories_filter:
        applied["categories"] = categories_filter
    if search:
        applied["search"] = search
    if min_discount is not None:
        applied["min_discount"] = min_discount
    if max_discount is not None:
        applied["max_discount"] = max_discount
    if min_price is not None:
        applied["min_price"] = min_price
    if max_price is not None:
        applied["max_price"] = max_price
    if date_from:
        applied["date_from"] = date_from
    if date_to:
        applied["date_to"] = date_to
    if on_sale_only:
        applied["on_sale_only"] = True
    if has_price_drop:
        applied["has_price_drop"] = True
    if active_only:
        applied["active_only"] = True

    log_success(f"Products: {total} total, returning {len(paginated)} (page {page}), {query_time:.0f}ms")

    return jsonify({
        "products": paginated,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
        "applied_filters": applied,
        "query_time_ms": round(query_time),
    })


# ── GET /api/product/<id> ────────────────────
@app.route("/api/product/<product_id>")
@timed("GET /api/product/<id>")
def get_product(product_id):
    """
    Single product detail with price history.
    ID prefix routing: retailer_, costco_photo_, cocoprice_, {deal_table}_.
    """
    sb = get_supabase()

    if product_id.startswith("costco_photo_"):
        return _get_costco_photo_detail(sb, product_id.replace("costco_photo_", ""))
    elif product_id.startswith("cocoprice_"):
        return _get_cocoprice_detail(sb, product_id.replace("cocoprice_", ""))
    elif product_id.startswith("retailer_"):
        return _get_retailer_detail(sb, product_id.replace("retailer_", ""))
    else:
        # Check deal tables by prefix
        for table in DEAL_TABLES:
            prefix = f"{table['name']}_"
            if product_id.startswith(prefix):
                actual_id = product_id[len(prefix):]
                return _get_deal_detail(sb, table["name"], actual_id)
        # Fallback: assume it's from the main deals table
        actual_id = product_id.replace("deal_", "")
        return _get_deal_detail(sb, "deals", actual_id)


def _build_price_history(data, price_key="current_price", first_seen_key="first_seen_at", last_seen_key="last_seen_at", discount_key="discount_percent"):
    """Build a synthetic price history from a single product row (when no history table data exists)."""
    current = data.get(price_key) or data.get("price")
    original = data.get("original_price")
    first_seen = data.get(first_seen_key) or data.get("created_at") or datetime.now(timezone.utc).isoformat()

    if original and current and original > current:
        return [
            {"price": original, "original_price": original, "scraped_at": first_seen, "is_on_sale": False},
            {"price": current, "original_price": original,
             "scraped_at": data.get(last_seen_key) or data.get("updated_at") or datetime.now(timezone.utc).isoformat(),
             "is_on_sale": True},
        ]
    else:
        return [{
            "price": current,
            "original_price": original,
            "scraped_at": first_seen,
            "is_on_sale": bool(data.get(discount_key) or 0),
        }]


def _get_deal_detail(sb, table_name, actual_id):
    """Fetch detail for a deal table product."""
    result = sb.table(table_name).select("*").eq("id", actual_id).limit(1).execute()
    if not result.data:
        return jsonify({"error": "Product not found"}), 404
    data = result.data[0]

    # Get price history from deal_price_history
    history = []
    try:
        h_result = sb.table("deal_price_history").select("price, original_price, scraped_at, is_on_sale").eq("deal_id", actual_id).order("scraped_at").execute()
        history = [{"price": h["price"], "original_price": h.get("original_price"), "scraped_at": h["scraped_at"], "is_on_sale": h.get("is_on_sale", False)} for h in (h_result.data or [])]
    except Exception:
        pass

    if not history:
        history = _build_price_history(data, price_key="current_price", first_seen_key="date_added", last_seen_key="date_updated")

    source_val = data.get("source") or (table_name.replace("_deals", "") if table_name != "deals" else "deals")
    product = normalize_deal(data, table_name, source_val)
    product["price_history"] = history
    product["description"] = data.get("description")
    return jsonify(product)


def _get_retailer_detail(sb, actual_id):
    """Fetch detail for a retailer_products product."""
    result = sb.table("retailer_products").select("*").eq("id", actual_id).limit(1).execute()
    if not result.data:
        return jsonify({"error": "Product not found"}), 404
    data = result.data[0]

    # Get price history from price_history table
    history = []
    try:
        h_result = sb.table("price_history").select("price, original_price, scraped_at, is_on_sale").eq("retailer_product_id", actual_id).order("scraped_at").execute()
        history = [{"price": h["price"], "original_price": h.get("original_price"), "scraped_at": h["scraped_at"], "is_on_sale": h.get("is_on_sale", False)} for h in (h_result.data or [])]
    except Exception:
        pass

    if not history:
        history = _build_price_history(data)

    product = normalize_retailer(data)
    product["price_history"] = history
    product["description"] = data.get("description")
    return jsonify(product)


def _get_costco_photo_detail(sb, actual_id):
    """Fetch detail for a costco_user_photos product."""
    result = sb.table("costco_user_photos").select("*").eq("id", actual_id).limit(1).execute()
    if not result.data:
        return jsonify({"error": "Product not found"}), 404
    data = result.data[0]

    # Costco photos don't have a dedicated history table — synthesize from price data
    history = _build_price_history(data, price_key="price", first_seen_key="scraped_at", last_seen_key="updated_at")

    product = normalize_costco_photo(data)
    product["price_history"] = history
    product["description"] = f"SKU: {data['sku']}" if data.get("sku") else None
    return jsonify(product)


def _get_cocoprice_detail(sb, actual_id):
    """Fetch detail for a CocoPriceTracker product (in retailer_products)."""
    result = sb.table("retailer_products").select("*").eq("id", actual_id).limit(1).execute()
    if not result.data:
        return jsonify({"error": "Product not found"}), 404
    data = result.data[0]

    # Get price history from price_history table
    history = []
    try:
        h_result = sb.table("price_history").select("price, original_price, scraped_at, is_on_sale").eq("retailer_product_id", actual_id).order("scraped_at").execute()
        history = [{"price": h["price"], "original_price": h.get("original_price"), "scraped_at": h["scraped_at"], "is_on_sale": h.get("is_on_sale", False)} for h in (h_result.data or [])]
    except Exception:
        pass

    if not history:
        history = _build_price_history(data)

    product = normalize_cocoprice(data)
    product["price_history"] = history
    product["description"] = f"SKU: {data.get('retailer_sku')}" if data.get("retailer_sku") else None
    return jsonify(product)


# ── GET /api/product/<id>/history ────────────
@app.route("/api/product/<product_id>/history")
@timed("GET /api/product/<id>/history")
def get_product_history(product_id):
    """
    Full price history for a product with computed stats.
    Returns all price_history or deal_price_history rows + lowest/highest/avg/total points/change%.
    """
    sb = get_supabase()
    history = []

    try:
        if product_id.startswith("cocoprice_") or product_id.startswith("retailer_"):
            # Both use price_history table, but different key columns
            actual_id = product_id.replace("cocoprice_", "").replace("retailer_", "")
            # Try retailer_product_id first, then product_id
            h_result = sb.table("price_history").select("price, original_price, scraped_at, is_on_sale").eq("retailer_product_id", actual_id).order("scraped_at").execute()
            if not h_result.data:
                h_result = sb.table("price_history").select("price, original_price, scraped_at, is_on_sale").eq("retailer_product_id", actual_id).order("scraped_at").execute()
            history = h_result.data or []
        elif product_id.startswith("costco_photo_"):
            # No dedicated history table — return synthetic from product data
            actual_id = product_id.replace("costco_photo_", "")
            result = sb.table("costco_user_photos").select("*").eq("id", actual_id).limit(1).execute()
            if result.data:
                history = _build_price_history(result.data[0], price_key="price", first_seen_key="scraped_at", last_seen_key="updated_at")
                return jsonify(_compute_history_stats(history))
            return jsonify({"error": "Product not found"}), 404
        else:
            # Deal tables — use deal_price_history
            actual_id = product_id
            for table in DEAL_TABLES:
                prefix = f"{table['name']}_"
                if product_id.startswith(prefix):
                    actual_id = product_id[len(prefix):]
                    break
            actual_id = actual_id.replace("deal_", "")
            h_result = sb.table("deal_price_history").select("price, original_price, scraped_at, is_on_sale").eq("deal_id", actual_id).order("scraped_at").execute()
            history = h_result.data or []
    except Exception as e:
        log_warning(f"History lookup failed for {product_id}: {e}")

    return jsonify(_compute_history_stats(history))


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


# ── GET /api/price-tracker ───────────────────
@app.route("/api/price-tracker")
@timed("GET /api/price-tracker")
def price_tracker():
    """
    Price drops feed: recently_dropped, most_tracked, biggest_drops.
    Query params: source (optional), days (default 30), limit (default 50).
    """
    sb = get_supabase()
    days = _parse_int(request.args.get("days")) or 30
    limit = min(_parse_int(request.args.get("limit")) or 50, 100)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    recently_dropped = []
    most_tracked = []
    biggest_drops = []

    # ── Recently dropped: products where latest price < previous price ──
    try:
        # Get recent price history entries
        h_result = sb.table("price_history").select("retailer_product_id, price, original_price, scraped_at, is_on_sale").gte("scraped_at", cutoff).order("scraped_at", desc=True).limit(500).execute()

        # Group by product_id and find drops
        product_prices = {}
        for h in (h_result.data or []):
            pid = h.get("retailer_product_id")
            if not pid:
                continue
            if pid not in product_prices:
                product_prices[pid] = []
            product_prices[pid].append(h)

        drops = []
        for pid, entries in product_prices.items():
            if len(entries) >= 2:
                latest = entries[0]  # Most recent (sorted desc)
                previous = entries[1]
                if latest["price"] and previous["price"] and latest["price"] < previous["price"]:
                    drop_pct = ((previous["price"] - latest["price"]) / previous["price"]) * 100
                    drops.append({
                        "product_id": f"retailer_{pid}",
                        "old_price": previous["price"],
                        "new_price": latest["price"],
                        "drop_percent": round(drop_pct, 1),
                        "dropped_at": latest["scraped_at"],
                    })

        # Also check deal_price_history
        try:
            dh_result = sb.table("deal_price_history").select("deal_id, price, original_price, scraped_at, is_on_sale").gte("scraped_at", cutoff).order("scraped_at", desc=True).limit(500).execute()
            deal_prices = {}
            for h in (dh_result.data or []):
                did = h.get("deal_id")
                if not did:
                    continue
                if did not in deal_prices:
                    deal_prices[did] = []
                deal_prices[did].append(h)

            for did, entries in deal_prices.items():
                if len(entries) >= 2:
                    latest = entries[0]
                    previous = entries[1]
                    if latest["price"] and previous["price"] and latest["price"] < previous["price"]:
                        drop_pct = ((previous["price"] - latest["price"]) / previous["price"]) * 100
                        drops.append({
                            "product_id": f"deals_{did}",
                            "old_price": previous["price"],
                            "new_price": latest["price"],
                            "drop_percent": round(drop_pct, 1),
                            "dropped_at": latest["scraped_at"],
                        })
        except Exception:
            pass

        # Sort by drop % descending and take top N
        drops.sort(key=lambda x: x["drop_percent"], reverse=True)
        recently_dropped = drops[:limit]
    except Exception as e:
        log_warning(f"Price tracker recently_dropped failed: {e}")

    # ── Most tracked: products with the most data points ──
    try:
        # Count entries per product in price_history
        h_result = sb.table("price_history").select("retailer_product_id").limit(2000).execute()
        counts = {}
        for h in (h_result.data or []):
            pid = h.get("retailer_product_id")
            if pid:
                counts[pid] = counts.get(pid, 0) + 1

        top_tracked = sorted(counts.items(), key=lambda x: -x[1])[:limit]
        most_tracked = [{"product_id": f"retailer_{pid}", "data_points": count} for pid, count in top_tracked]
    except Exception as e:
        log_warning(f"Price tracker most_tracked failed: {e}")

    # ── Biggest drops: all-time largest % drops ──
    try:
        # Query products where current_price < original_price with the biggest gap
        result = sb.table("retailer_products").select("id, title, brand, current_price, original_price, sale_percentage").gt("sale_percentage", 0).order("sale_percentage", desc=True).limit(limit).execute()
        biggest_drops = [{
            "product_id": f"retailer_{r['id']}",
            "title": r.get("title", ""),
            "brand": r.get("brand"),
            "current_price": r.get("current_price"),
            "original_price": r.get("original_price"),
            "drop_percent": r.get("sale_percentage", 0),
        } for r in (result.data or [])]
    except Exception as e:
        log_warning(f"Price tracker biggest_drops failed: {e}")

    # Enrich recently_dropped and most_tracked with product titles
    all_pids = set()
    for item in recently_dropped + most_tracked:
        pid = item["product_id"]
        if pid.startswith("retailer_"):
            all_pids.add(pid.replace("retailer_", ""))

    product_names = {}
    if all_pids:
        try:
            id_list = list(all_pids)[:100]  # Cap lookups
            result = sb.table("retailer_products").select("id, title, brand, current_price, original_price").in_("id", id_list).execute()
            for r in (result.data or []):
                product_names[str(r["id"])] = {
                    "title": r.get("title", ""),
                    "brand": r.get("brand"),
                    "current_price": r.get("current_price"),
                    "original_price": r.get("original_price"),
                }
        except Exception:
            pass

    # Merge names into results
    for item in recently_dropped + most_tracked:
        pid = item["product_id"].replace("retailer_", "").replace("deals_", "")
        info = product_names.get(pid, {})
        item["title"] = item.get("title") or info.get("title", "Unknown Product")
        item["brand"] = item.get("brand") or info.get("brand")
        if "current_price" not in item:
            item["current_price"] = info.get("current_price")
        if "original_price" not in item:
            item["original_price"] = info.get("original_price")

    return jsonify({
        "recently_dropped": recently_dropped,
        "most_tracked": most_tracked,
        "biggest_drops": biggest_drops,
        "params": {"days": days, "limit": limit},
    })


# ── GET /api/scrapers ────────────────────────
@app.route("/api/scrapers")
@timed("GET /api/scrapers")
def get_scrapers():
    """Proxy to the droplet API for scraper status information."""
    try:
        resp = requests.get(f"{DROPLET_API_URL}/health/scrapers", timeout=10)
        return jsonify(resp.json()), resp.status_code
    except requests.exceptions.ConnectionError:
        log_warning(f"Cannot reach droplet API at {DROPLET_API_URL}")
        return jsonify({"error": "Droplet API unreachable", "url": DROPLET_API_URL}), 503
    except Exception as e:
        log_error(f"Scraper proxy error: {e}")
        return jsonify({"error": str(e)}), 500


# ── POST /api/scrapers/<name>/trigger ────────
@app.route("/api/scrapers/<name>/trigger", methods=["POST"])
@timed("POST /api/scrapers/<name>/trigger")
def trigger_scraper(name):
    """Trigger a scraper run via the droplet API."""
    try:
        resp = requests.post(f"{DROPLET_API_URL}/scrapers/{name}/run", timeout=15)
        return jsonify(resp.json()), resp.status_code
    except Exception as e:
        log_error(f"Trigger scraper error: {e}")
        return jsonify({"error": str(e)}), 500


# ══════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════

def _parse_int(value):
    """Safely parse an int from a string. Returns None if invalid."""
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _parse_float(value):
    """Safely parse a float from a string. Returns None if invalid."""
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
    log_info("  Deal Viewer API Server")
    log_info(f"  Port: {FLASK_PORT}")
    log_info(f"  Debug: {FLASK_DEBUG}")
    log_info(f"  Frontend: {FRONTEND_DIR}")
    log_info(f"  Droplet API: {DROPLET_API_URL}")
    log_info("=" * 60)
    print()

    # Test DB connection on startup
    try:
        get_supabase()
        log_success("Database connection verified")
    except Exception as e:
        log_error(f"Database connection failed: {e}")

    app.run(host="0.0.0.0", port=FLASK_PORT, debug=FLASK_DEBUG)
