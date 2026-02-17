# Claude Code Prompt: Rebuild Database Viewer as Lightweight HTML/CSS/JS

## IMPORTANT — Read This First

ultrathink before starting. Read this entire prompt, understand the full picture, then execute phase by phase.

### My Preferences (Follow These ALWAYS)
- **Verbose debug output everywhere** — console.log with labels, timestamps, data counts
- **Colorful output** — use CSS-styled console.log messages (colored backgrounds, emoji prefixes) in the browser console so I can debug easily
- **Before editing ANY existing file**, make a timestamped backup (e.g., `filename.bak.2026-02-17_1430`)
- **Only edit the sections I'm working on** — don't refactor, reorganize, or "optimize" code I didn't ask you to touch
- **Don't drop code** — every function, every handler, every piece of logic must be complete. No `// ... rest of code` or `// similar to above` shortcuts
- **Lots of comments** — explain what each section does and why, like you're teaching a student
- **No frameworks** — no React, no Next.js, no Vue, no Angular, no Svelte. Pure HTML, CSS, and vanilla JavaScript only
- **No build tools** — no webpack, no vite, no npm build step. Just files that work when you open them

---

## Background

I have a Supabase (PostgreSQL) database with ~50,000+ products from my deal scraping operation. I had Claude Code build me a database viewer/dashboard using Next.js 15 and it works but it's WAY too heavy for what it does. It's a full-stack JavaScript app with node_modules, build steps, hydration delays — total overkill for viewing a database.

I want to **tear it all down and rebuild it as pure HTML/CSS/JS** with a thin Python (Flask) API backend. The result should be:
- Lightning fast page loads (no framework overhead)
- Server-side filtering and pagination (the database does the heavy lifting)
- Clean, readable code I can maintain myself
- Easy to deploy (static files + a small Python server)

---

## Phase 0: Reconnaissance

Before writing ANY code, do the following:

1. **Find my existing database viewer project** — look in common locations:
   - `~/projects/`, `~/Sites/`, `~/code/`, `~/dev/`, home directory
   - Look for Next.js projects (package.json with "next" dependency)
   - Look for any project with "dashboard", "viewer", "admin", "deals" in the name
   
2. **Find my Supabase connection details** — look for:
   - `.env` files, `.env.local`, `.env.production`
   - Any file containing `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_ANON_KEY`
   - `supabase` config files
   
3. **Introspect the database** — Connect to Supabase and discover:
   - All table names
   - All column names and data types per table
   - Row counts per table
   - Sample data (first 3 rows from each table)
   - All unique values for columns that look like categories (store names, brands, categories, status fields, etc.) — these become our filter options
   - Min/max values for numeric columns (prices, discounts, etc.)
   - Date ranges for timestamp columns (when was data first/last scraped)
   
4. **Write a Python introspection script** (`db_introspect.py`) that does all of the above with colorama output:
   - GREEN for success messages
   - YELLOW for warnings
   - RED for errors  
   - CYAN for data/info
   - MAGENTA for section headers
   - Save results to `db_schema_report.json` (machine-readable) AND `db_schema_report.txt` (human-readable)

5. **Show me the results** and ask me to confirm before proceeding to Phase 1.

---

## Phase 1: Python Flask API Backend

Build a lightweight Flask API that sits between the HTML frontend and Supabase. This is where ALL the database querying happens — the frontend never talks to Supabase directly.

### File Structure
```
deal-viewer/
├── backend/
│   ├── app.py              # Main Flask app
│   ├── config.py           # Supabase connection config (reads from .env)
│   ├── requirements.txt    # Flask, supabase-py, python-dotenv, colorama
│   └── .env                # SUPABASE_URL, SUPABASE_KEY (gitignored)
├── frontend/
│   ├── index.html          # Main page — the whole app lives here
│   ├── css/
│   │   └── style.css       # All styles
│   ├── js/
│   │   ├── app.js          # Main app logic, initialization
│   │   ├── api.js          # All fetch() calls to the Flask backend
│   │   ├── filters.js      # Filter UI logic (dropdowns, tabs, search)
│   │   ├── table.js        # Table rendering, pagination, sorting
│   │   └── utils.js        # Helper functions (formatPrice, timeAgo, etc.)
│   └── img/                # Any icons or images
└── README.md               # How to run it
```

### API Endpoints to Build

**GET /api/health**
- Returns server status, database connection status, last scrape timestamps
- Debug: log every health check with timestamp

**GET /api/stats**
- Total product count
- Total stores count  
- Products added today/this week
- Last scrape time per scraper/source
- Price drops detected today
- Basically a "dashboard at a glance" endpoint

**GET /api/products**
- This is the big one — paginated, filtered product listing
- Query parameters:
  - `page` (default 1)
  - `per_page` (default 50, max 200)
  - `store` (filter by store name, comma-separated for multiple)
  - `min_discount` (minimum discount percentage, e.g., 20 = 20% off)
  - `max_discount` (maximum discount percentage)
  - `min_price` / `max_price` (price range filter)
  - `category` (filter by category if the column exists)
  - `search` (full-text search across product name/title)
  - `sort_by` (column name to sort by)
  - `sort_dir` (asc/desc)
  - `days` (only show products scraped in the last N days)
  - `has_price_drop` (boolean — only show products where current price < previous price)
- Response includes:
  - `products` array
  - `total_count` (for pagination math)
  - `page`, `per_page`, `total_pages`
  - `applied_filters` (echo back what filters are active)
  - `query_time_ms` (how long the database query took — I want to see this!)
- Debug: log every query with all parameters, row count returned, and execution time in colorama colors

**GET /api/filters**
- Returns all available filter options built dynamically from the database:
  - List of all unique store names (with product count per store)
  - List of all unique categories (with counts)
  - Min/max price range
  - Min/max discount range
  - Available date range
  - Any other filterable columns
- This endpoint powers the filter dropdowns/tabs on the frontend
- Cache this for 5 minutes (it doesn't need to be real-time)

**GET /api/product/<id>**
- Full details for a single product
- Include price history if available
- Include all metadata

**GET /api/scrapers**
- Status of each scraper/source
- Last run time
- Products scraped per source
- Any error counts

### Flask App Requirements
- CORS enabled (so the frontend can call it from a different port during dev)
- Every request logged with colorama colors:
  - 🟢 GREEN: successful requests
  - 🟡 YELLOW: slow queries (>500ms)
  - 🔴 RED: errors
  - 🔵 BLUE: request method + path
  - ⏱️ Query execution time on every database call
- Error handling on every endpoint — never crash, always return useful error JSON
- `.env` file for all config — no hardcoded credentials

---

## Phase 2: HTML/CSS Frontend

### Design Philosophy
- **Dark theme** — dark background (#1a1a2e or similar), light text, colored accents
- **Fast** — no JavaScript frameworks, no CSS frameworks (no Bootstrap, no Tailwind)
- **Responsive** — works on desktop and tablet (mobile is a nice-to-have, not required)
- **Information-dense** — this is a tool for ME, not a consumer product. Pack in the data

### Page Layout

```
┌──────────────────────────────────────────────────────┐
│  HEADER: Dashboard title + last updated timestamp    │
├──────────────────────────────────────────────────────┤
│  STATS BAR: Total products | Stores | Today's adds  │
│  | Last scraped: X min ago | Price drops today       │
├──────────────────────────────────────────────────────┤
│  FILTER TABS ROW 1: [All] [Store A] [Store B] ...   │
│  FILTER TABS ROW 2: [All Discounts] [10%+] [25%+]   │
│  [50%+] [75%+]                                       │
│  SEARCH BAR: [🔍 Search products...        ] [Go]    │
│  SORT: [Sort by ▾] [Price ▾] [Date ▾] [Discount ▾]  │
├──────────────────────────────────────────────────────┤
│  RESULTS: "Showing 1-50 of 12,345 products"         │
├──────────────────────────────────────────────────────┤
│  PRODUCT TABLE                                        │
│  ┌──────┬──────┬───────┬──────┬────────┬──────────┐  │
│  │Image │Name  │Store  │Price │Discount│Last Seen │  │
│  ├──────┼──────┼───────┼──────┼────────┼──────────┤  │
│  │ 🖼️  │Prod1 │CostCo │$29   │-35%    │2 hrs ago │  │
│  │ 🖼️  │Prod2 │Amazon │$15   │-50%    │5 min ago │  │
│  └──────┴──────┴───────┴──────┴────────┴──────────┘  │
├──────────────────────────────────────────────────────┤
│  PAGINATION: [← Prev] Page 1 of 247 [Next →]        │
├──────────────────────────────────────────────────────┤
│  FOOTER: Scraper status indicators (green/red dots)  │
└──────────────────────────────────────────────────────┘
```

### Filter Tabs — How They Work

**Store Filter Tabs (Row 1):**
- Tab for each store, dynamically generated from `/api/filters`
- Show product count on each tab: `[Costco (2,341)]` `[Amazon (8,992)]`
- "All" tab selected by default
- Clicking a tab immediately re-queries the API with that store filter
- Multiple store selection allowed (Ctrl+Click or toggle behavior)
- Active tabs get a highlighted color (bright accent color)

**Discount Filter Tabs (Row 2):**
- Pre-defined ranges: `[All]` `[10%+ Off]` `[25%+ Off]` `[50%+ Off]` `[75%+ Off]`
- Only one can be active at a time (radio-style)
- Combines with store filter (so you can do "Costco + 50% off")

**Time Filter:**
- Dropdown or tabs: `[All Time]` `[Today]` `[Last 7 Days]` `[Last 30 Days]`
- Combines with other filters

**All filters combine** — selecting Costco + 50%+ + Last 7 Days queries for products matching ALL three criteria.

### CSS Requirements
- CSS custom properties (variables) for the color theme — easy to change later
- Smooth transitions on tab hover/active states
- Table rows with alternating background colors (subtle)
- Sticky header on the table so column names stay visible while scrolling
- Loading spinner/skeleton while data loads
- Responsive grid for the stats bar
- Color-coded discount badges:
  - 10-24% = light green
  - 25-49% = green  
  - 50-74% = orange
  - 75%+ = red/hot
- Price drop indicators (↓ arrow with green color when price dropped)

### JavaScript Requirements
- **No jQuery** — vanilla JS only (`document.querySelector`, `fetch`, etc.)
- All API calls go through `api.js` as a clean module
- URL state management — filters should update the URL query string so you can bookmark/share filtered views (e.g., `?store=costco&min_discount=50`)
- Debounced search input (don't fire API call on every keystroke, wait 300ms)
- Loading states — show a spinner or "Loading..." while fetching
- Error states — show a clear error message if the API is down
- Console debug logging — every API call, response time, data count logged with styled console messages
- Keyboard shortcuts would be nice:
  - `/` to focus search
  - `←` `→` for pagination
  - `Escape` to clear filters

---

## Phase 3: Scraper Status Dashboard

Add a secondary "tab" or page section that shows scraper health:

- Each scraper listed with:
  - Name/source
  - Last successful run (timestamp + "X minutes ago")
  - Products scraped on last run
  - Status indicator (green dot = ran within expected schedule, yellow = overdue, red = failed)
  - Error log (last error message if any)
- This data comes from the `/api/scrapers` endpoint
- Auto-refreshes every 60 seconds

---

## Phase 4: Polish and Quality of Life

1. **Auto-refresh toggle** — checkbox to auto-refresh the product table every 60 seconds
2. **Export** — button to export current filtered view as CSV
3. **Product detail modal** — clicking a product row opens a modal/slide-out with full details and price history
4. **Counts everywhere** — always show how many results match the current filter combination
5. **Speed indicator** — show query time in the footer (e.g., "Query took 45ms")
6. **Favicon** — just a simple colored square or something, so the browser tab is identifiable

---

## Deployment Notes

This will run on my Digital Ocean droplet. The Flask backend will run as a systemd service (or just in a tmux session, whatever). The frontend files get served by nginx (which I already have set up for my other sites).

Provide me with:
- A `run.sh` script that starts the Flask backend
- Nginx config snippet for serving the static frontend files and proxying `/api/` to Flask
- A simple `deploy.sh` that rsyncs the files to my server (I'll fill in the server details)

---

## What NOT To Do

- ❌ Don't use React, Vue, Svelte, or any JavaScript framework
- ❌ Don't use Bootstrap, Tailwind, or any CSS framework  
- ❌ Don't use TypeScript
- ❌ Don't use a build step (no webpack, vite, parcel, etc.)
- ❌ Don't use npm/node for the frontend at all
- ❌ Don't "optimize" or refactor my existing scraper code
- ❌ Don't use server-side rendering — the Flask API returns JSON, the browser renders HTML
- ❌ Don't make it "mobile first" — this is a desktop tool, mobile is secondary
- ❌ Don't add user authentication (it's just for me, behind my network)
- ❌ Don't over-engineer it — this is a database viewer, not a SaaS product

---

## Let's Go

Start with Phase 0 (reconnaissance). Find my database, introspect it, show me what you find. Then we'll build from there.

Ask me questions if anything is unclear. Don't assume — ASK.
