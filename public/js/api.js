/**
 * api.js — API client for the Deal Viewer Flask backend.
 * All fetch() calls to the Flask API, with built-in timing and colored console logging.
 */

const API_BASE = window.location.origin;

const ApiClient = {

    /**
     * Generic fetch wrapper with timing and error handling.
     * @param {string} endpoint — e.g. "/api/products"
     * @param {object} params — query parameters as key-value pairs
     * @returns {Promise<object>} — parsed JSON response
     */
    async _fetch(endpoint, params = {}) {
        const start = performance.now();
        const url = new URL(endpoint, API_BASE);

        // Add query params, skipping empty/null values
        for (const [key, value] of Object.entries(params)) {
            if (value === undefined || value === null || value === '') continue;
            if (Array.isArray(value)) {
                if (value.length > 0) url.searchParams.set(key, value.join(','));
            } else if (typeof value === 'boolean') {
                if (value) url.searchParams.set(key, 'true');
            } else {
                url.searchParams.set(key, String(value));
            }
        }

        Utils.log.info(`API Request`, url.pathname + url.search);

        try {
            const response = await fetch(url.toString());
            const elapsed = performance.now() - start;

            if (!response.ok) {
                const errorText = await response.text();
                Utils.log.error(`API ${response.status}`, endpoint, errorText);
                throw new Error(`API ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            Utils.log.timing(`API ${endpoint}`, elapsed);
            return data;
        } catch (err) {
            const elapsed = performance.now() - start;
            Utils.log.error(`API Failed: ${endpoint}`, `${elapsed.toFixed(0)}ms`, err.message);
            throw err;
        }
    },

    // ── Health check ──
    async health() {
        return this._fetch('/api/health');
    },

    // ── Filter options (sources, stores, regions, brands, categories with counts) ──
    async getFilters() {
        return this._fetch('/api/filters');
    },

    // ── Dashboard stats (total products, stores, today's adds, on-sale count) ──
    async getStats() {
        return this._fetch('/api/stats');
    },

    /**
     * Fetch products with all filter params.
     * @param {object} filters — see app.py GET /api/products for all supported params
     * @returns {Promise<{products: Array, total: number, page: number, per_page: number, total_pages: number}>}
     */
    async getProducts(filters = {}) {
        return this._fetch('/api/products', filters);
    },

    /**
     * Fetch single product detail with price history.
     * @param {string} id — product ID with prefix (e.g. "retailer_123", "deals_456")
     */
    async getProduct(id) {
        return this._fetch(`/api/product/${encodeURIComponent(id)}`);
    },

    /**
     * Fetch full price history for a product with computed stats.
     * @param {string} id — product ID with prefix
     */
    async getProductHistory(id) {
        return this._fetch(`/api/product/${encodeURIComponent(id)}/history`);
    },

    /**
     * Price tracker feed: recent drops, most tracked, biggest drops.
     * @param {object} params — { days, limit, source }
     */
    async getPriceTracker(params = {}) {
        return this._fetch('/api/price-tracker', params);
    },

    // ── Scraper statuses from the droplet API ──
    async getScrapers() {
        return this._fetch('/api/scrapers');
    },

    // ── Trigger a scraper run ──
    async triggerScraper(name) {
        const start = performance.now();
        Utils.log.info('API Request', `POST /api/scrapers/${name}/trigger`);
        try {
            const response = await fetch(`${API_BASE}/api/scrapers/${name}/trigger`, { method: 'POST' });
            const elapsed = performance.now() - start;
            const data = await response.json();
            Utils.log.timing(`POST /api/scrapers/${name}/trigger`, elapsed);
            return data;
        } catch (err) {
            Utils.log.error('Trigger scraper failed', err.message);
            throw err;
        }
    },
};
