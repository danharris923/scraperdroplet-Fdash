# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Scraper Dashboard — a lightweight Flask + vanilla HTML/CSS/JS dashboard for web scrapers and product deals. Aggregates ~50k+ products from 12+ Supabase tables into a unified view with filtering, search, price tracking, and scraper health monitoring. Runs as a single Flask process serving both the API and static frontend.

The legacy Next.js 15 app lives in `futuristic-dashboard/` (archived). The active codebase is `deal-viewer/`.

## Directory Structure

```
deal-viewer/
├── backend/
│   ├── app.py           # Flask app — all API endpoints + static file serving
│   ├── config.py        # SupabaseREST client, DEAL_TABLES config, logging helpers, cache
│   ├── requirements.txt # Python dependencies
│   └── .env             # Credentials (not committed)
└── frontend/
    ├── index.html       # Single-page app
    ├── css/style.css    # Dark theme, CSS custom properties
    └── js/
        ├── utils.js     # formatPrice, timeAgo, debounce, URL param sync
        ├── api.js       # ApiClient — fetch wrapper with timing
        ├── filters.js   # FilterManager — state, rendering, URL sync, badges
        ├── table.js     # TableManager — product table, pagination, modal, CSV export, price tracker
        └── app.js       # App controller — tabs, keyboard shortcuts, auto-refresh
```

## Commands

```bash
# Start the server (from deal-viewer/backend/)
cd deal-viewer/backend
pip install -r requirements.txt
python app.py              # Flask on http://localhost:5000

# Or use the helper script
bash deal-viewer/run.sh
```

No test framework is configured. Verify endpoints with curl:
```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/stats
curl http://localhost:5000/api/products?per_page=5
curl http://localhost:5000/api/filters
```

## Architecture

### Data Flow

```
Vanilla JS (fetch) → Flask API Routes → Supabase PostgREST API
                                       → External Droplet API (146.190.240.167:8080)
```

### Key Architectural Pattern: Multi-Table Aggregation

`app.py` queries **12+ separate Supabase tables** in parallel, each with different schemas, then normalizes results into a unified product dict. Tables include `deals`, `amazon_ca_deals`, `retailer_products`, `costco_user_photos`, etc. Each table has its own column names configured in `DEAL_TABLES` in `config.py`.

### Custom Supabase Client (config.py)

Uses a custom `SupabaseREST` class that talks directly to the PostgREST API via `httpx` (the official `supabase-py` library rejects the service key format). The `QueryBuilder` class provides a chainable API: `.select()`, `.eq()`, `.gte()`, `.ilike()`, `.in_()`, `.contains()`, `.not_contains()`, `.order()`, `.limit()`, `.execute()`.

### DEAL_TABLES Config

Each table entry specifies `name`, `source`, `date_col`, `title_col`, and `store_col` to handle schema differences across tables. Key variations:
- `deals` uses `date_added` (not `created_at`), source comes from data
- `yepsavings_deals` uses `created_date` and `store_name`
- All others use `created_at` and `store`

### API Endpoints (app.py)

- **`GET /api/health`** — DB connection test, deal count
- **`GET /api/stats`** — Total products, stores, today's adds, on-sale count (60s cache)
- **`GET /api/filters`** — Dynamic filter options with counts (5-min cache)
- **`GET /api/products`** — Multi-table query with full filter support (sources, stores, search, date range, price range, discount range, on_sale_only, has_price_drop, brands, categories)
- **`GET /api/product/<id>`** — Detail with price history, ID prefix routing
- **`GET /api/product/<id>/history`** — Full price history with computed stats
- **`GET /api/price-tracker`** — Recently dropped, most tracked, biggest drops
- **`GET /api/scrapers`** — Proxy to droplet API
- **`POST /api/scrapers/<name>/trigger`** — Trigger a scraper run

### ID Prefix Routing

Product IDs are prefixed by source table: `retailer_`, `costco_photo_`, `cocoprice_`, `{deal_table_name}_`. The detail endpoint parses the prefix to query the correct table.

### Price History

Two tables: `price_history` (keyed by `retailer_product_id`) and `deal_price_history` (keyed by `deal_id`). The frontend renders SVG price charts in the product detail modal.

## Environment Variables

Required in `deal-viewer/backend/.env`:
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_KEY` — Supabase service role key (sb_secret_p_ format)
- `DROPLET_API_URL` — External scraper API base URL
- `FLASK_PORT` — Server port (default 5000)
- `FLASK_DEBUG` — Debug mode (default true)

## User Preferences

- Verbose debug output with labels, timestamps, data counts
- Colorful console logging (colorama) with ASCII-safe characters (no Unicode symbols — Windows cp1252 compatibility)
- Before editing existing files, make timestamped backups
- Only edit sections being worked on — don't refactor untouched code
- Complete code always — no placeholder comments like `// ... rest of code`
- Lots of comments explaining what and why
