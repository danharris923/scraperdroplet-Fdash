# Deal Viewer

Lightweight deal monitoring dashboard built with Flask + vanilla HTML/CSS/JS.
Aggregates 50k+ products from 12+ Supabase tables into a unified view with filtering, search, price tracking, and scraper health monitoring.

## Quick Start

```bash
# 1. Install Python dependencies
cd deal-viewer/backend
pip install -r requirements.txt

# 2. Set up credentials
# .env is pre-configured — verify SUPABASE_URL and SUPABASE_SERVICE_KEY are set

# 3. Start the server
python app.py

# 4. Open in browser
# http://localhost:5000
```

Or use the startup script:
```bash
bash run.sh
```

## Architecture

```
Browser (HTML/CSS/JS)  →  Flask API (port 5000)  →  Supabase PostgreSQL
                                                  →  Droplet API (scraper mgmt)
```

### Backend (`backend/`)

| File | Purpose |
|------|---------|
| `app.py` | Flask app with all API endpoints |
| `config.py` | Supabase client, table config, logging helpers |
| `requirements.txt` | Python dependencies |
| `.env` | Credentials (not committed) |

### Frontend (`frontend/`)

| File | Purpose |
|------|---------|
| `index.html` | Single-page app — header, stats, tabs, sidebar, table, modal |
| `css/style.css` | Dark theme with CSS custom properties |
| `js/utils.js` | Pure helpers: formatPrice, timeAgo, debounce, URL sync |
| `js/api.js` | API client with timing and colored console logging |
| `js/filters.js` | Filter state management + sidebar UI rendering |
| `js/table.js` | Product table, pagination, detail modal, CSV export |
| `js/app.js` | Main controller, tabs, keyboard shortcuts, auto-refresh |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check + DB connection test |
| `GET /api/filters` | Dynamic filter options with counts (5-min cache) |
| `GET /api/stats` | Dashboard summary stats (60s cache) |
| `GET /api/products` | Multi-table paginated product query with all filters |
| `GET /api/product/<id>` | Single product detail with price history |
| `GET /api/product/<id>/history` | Full price history with computed stats |
| `GET /api/price-tracker` | Price drops feed, most tracked, biggest drops |
| `GET /api/scrapers` | Proxy to droplet API for scraper statuses |

### Product Filters

| Param | Type | Description |
|-------|------|-------------|
| `sources` | comma-separated | Filter by data source |
| `stores` | comma-separated | Filter by store name |
| `regions` | comma-separated | Filter by region |
| `brands` | comma-separated | Filter by brand |
| `categories` | comma-separated | Filter by category |
| `search` | string | Text search on title |
| `min_discount` / `max_discount` | int | Discount % range |
| `min_price` / `max_price` | float | Price range |
| `date_from` / `date_to` | ISO date | Date range filter |
| `days` | int | Shortcut for date_from (last N days) |
| `on_sale_only` | bool | Only items with discount > 0 |
| `has_price_drop` | bool | Only items where current < original price |
| `active_only` | bool | Only active items |
| `sort_by` | string | Sort field (last_seen_at, discount_percent, current_price) |
| `sort_order` | asc/desc | Sort direction |
| `page` / `per_page` | int | Pagination |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search |
| `←` `→` | Previous / next page |
| `Esc` | Close modal |
| `R` | Refresh products |
| `E` | Export CSV |

## Data Sources

Queries 12+ Supabase tables in parallel:
- `deals` (RedFlagDeals)
- `amazon_ca_deals`, `cabelas_ca_deals`, `frank_and_oak_deals`, `leons_deals`
- `mastermind_toys_deals`, `reebok_ca_deals`, `the_brick_deals`, `yepsavings_deals`
- `retailer_products` (Flipp/Keepa)
- `costco_user_photos` (CocoWest, WarehouseRunner)
- CocoPriceTracker (via retailer_products extra_data)

Price history from `price_history` and `deal_price_history` tables.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key |
| `DROPLET_API_URL` | No | External scraper API (default: http://146.190.240.167:8080) |
| `FLASK_PORT` | No | Server port (default: 5000) |
| `FLASK_DEBUG` | No | Debug mode (default: true) |
