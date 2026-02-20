/**
 * table.js — Product table rendering, pagination, detail modal, CSV export,
 * and price tracker tab for the Deal Viewer.
 */

const TableManager = {

    // ── Last loaded data ──
    currentProducts: [],
    currentTotal: 0,
    currentPage: 1,
    totalPages: 1,

    // ── Loading state ──
    isLoading: false,

    /**
     * Fetch and render products for the current filter state.
     */
    async loadProducts() {
        if (this.isLoading) return;
        this.isLoading = true;
        this._showLoading();

        try {
            const params = FilterManager.getApiParams();
            const data = await ApiClient.getProducts(params);

            this.currentProducts = data.products || [];
            this.currentTotal = data.total || 0;
            this.currentPage = data.page || 1;
            this.totalPages = data.total_pages || 1;

            this._renderTable();
            this._renderPagination();
            this._renderResultsInfo(data);

            Utils.log.success('Products loaded', `${this.currentProducts.length} of ${this.currentTotal} total (${data.query_time_ms}ms)`);
        } catch (err) {
            this._showError(err.message);
            Utils.log.error('Failed to load products', err.message);
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * Render the product table rows.
     */
    _renderTable() {
        const tbody = document.getElementById('product-table-body');
        if (!tbody) return;

        if (this.currentProducts.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="8" class="empty-state">
                    <div class="empty-icon">&#128269;</div>
                    <div>No products found matching your filters.</div>
                    <button class="btn-secondary" onclick="FilterManager.clearAll()">Clear All Filters</button>
                </td></tr>`;
            return;
        }

        tbody.innerHTML = this.currentProducts.map(product => {
            const price = Utils.formatPrice(product.current_price);
            const origPrice = product.original_price && product.original_price > (product.current_price || 0)
                ? `<span class="original-price">${Utils.formatPrice(product.original_price)}</span>` : '';
            const discount = product.discount_percent
                ? `<span class="discount-badge ${Utils.discountTier(product.discount_percent)}">${Math.round(product.discount_percent)}% off</span>` : '';
            const priceDrop = product.current_price && product.original_price && product.current_price < product.original_price
                ? '<span class="price-drop-indicator" title="Price dropped">&#8595;</span>' : '';
            const img = product.image_url
                ? `<img src="${Utils.escapeHtml(product.image_url)}" alt="" class="product-thumb" loading="lazy" onerror="this.style.display='none'">`
                : '<div class="product-thumb-placeholder">&#128722;</div>';
            const source = Utils.sourceLabel(product.source);
            const time = Utils.timeAgo(product.last_seen_at);

            return `
                <tr class="product-row" data-id="${Utils.escapeHtml(product.id)}" onclick="TableManager.showDetail('${Utils.escapeHtml(product.id)}')">
                    <td class="col-image">${img}</td>
                    <td class="col-title">
                        <div class="product-title">${Utils.escapeHtml(Utils.truncate(product.title, 80))}</div>
                        <div class="product-meta">${Utils.escapeHtml(product.store)} &middot; ${Utils.escapeHtml(source)}</div>
                    </td>
                    <td class="col-price">
                        <div class="price-current">${priceDrop} ${price}</div>
                        ${origPrice}
                    </td>
                    <td class="col-discount">${discount}</td>
                    <td class="col-category">${Utils.escapeHtml(product.category || '—')}</td>
                    <td class="col-region">${Utils.escapeHtml(product.region || '—')}</td>
                    <td class="col-time">${time}</td>
                    <td class="col-link">
                        <a href="${Utils.escapeHtml(product.affiliate_url)}" target="_blank" rel="noopener" class="external-link" onclick="event.stopPropagation()" title="Open deal">&#8599;</a>
                    </td>
                </tr>`;
        }).join('');
    },

    /**
     * Render pagination controls.
     */
    _renderPagination() {
        const container = document.getElementById('pagination');
        if (!container) return;

        if (this.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';

        // Previous button
        html += `<button class="page-btn" ${this.currentPage <= 1 ? 'disabled' : ''} onclick="TableManager.goToPage(${this.currentPage - 1})">&#8592; Prev</button>`;

        // Page numbers — show first, last, and nearby pages
        const pages = this._getPageNumbers();
        for (const p of pages) {
            if (p === '...') {
                html += '<span class="page-ellipsis">...</span>';
            } else {
                html += `<button class="page-btn ${p === this.currentPage ? 'active' : ''}" onclick="TableManager.goToPage(${p})">${p}</button>`;
            }
        }

        // Next button
        html += `<button class="page-btn" ${this.currentPage >= this.totalPages ? 'disabled' : ''} onclick="TableManager.goToPage(${this.currentPage + 1})">Next &#8594;</button>`;

        container.innerHTML = html;
    },

    /**
     * Generate page number array with ellipsis for large page counts.
     */
    _getPageNumbers() {
        const total = this.totalPages;
        const current = this.currentPage;
        const pages = [];

        if (total <= 7) {
            for (let i = 1; i <= total; i++) pages.push(i);
        } else {
            pages.push(1);
            if (current > 3) pages.push('...');
            for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
                pages.push(i);
            }
            if (current < total - 2) pages.push('...');
            pages.push(total);
        }

        return pages;
    },

    /**
     * Navigate to a specific page.
     */
    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        FilterManager.set('page', page);
    },

    /**
     * Render results info bar (showing X of Y, query time).
     */
    _renderResultsInfo(data) {
        const info = document.getElementById('results-info');
        if (!info) return;

        const start = ((data.page - 1) * data.per_page) + 1;
        const end = Math.min(start + data.products.length - 1, data.total);

        info.innerHTML = `
            Showing <strong>${start.toLocaleString()}</strong>–<strong>${end.toLocaleString()}</strong>
            of <strong>${data.total.toLocaleString()}</strong> products
            <span class="query-time">(${data.query_time_ms}ms)</span>`;
    },

    /**
     * Show the initial welcome state — wireframe spider crawler on a data screen.
     * No products loaded yet, prompt user to pick filters.
     */
    showWelcome() {
        const tbody = document.getElementById('product-table-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr><td colspan="8" class="empty-state welcome-state">
                    <div class="welcome-graphic">
                        <svg viewBox="0 0 400 300" class="spider-svg" xmlns="http://www.w3.org/2000/svg">
                            <!-- Background grid — data screen look -->
                            <defs>
                                <filter id="glow">
                                    <feGaussianBlur stdDeviation="2" result="blur"/>
                                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                                </filter>
                                <filter id="glow-strong">
                                    <feGaussianBlur stdDeviation="4" result="blur"/>
                                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                                </filter>
                                <!-- Scan line sweeping down -->
                                <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stop-color="#22c55e" stop-opacity="0"/>
                                    <stop offset="45%" stop-color="#22c55e" stop-opacity="0.08"/>
                                    <stop offset="50%" stop-color="#22c55e" stop-opacity="0.15"/>
                                    <stop offset="55%" stop-color="#22c55e" stop-opacity="0.08"/>
                                    <stop offset="100%" stop-color="#22c55e" stop-opacity="0"/>
                                </linearGradient>
                            </defs>

                            <!-- Grid lines -->
                            <g stroke="#22c55e" stroke-opacity="0.07" stroke-width="0.5">
                                <line x1="0" y1="50" x2="400" y2="50"/>
                                <line x1="0" y1="100" x2="400" y2="100"/>
                                <line x1="0" y1="150" x2="400" y2="150"/>
                                <line x1="0" y1="200" x2="400" y2="200"/>
                                <line x1="0" y1="250" x2="400" y2="250"/>
                                <line x1="80" y1="0" x2="80" y2="300"/>
                                <line x1="160" y1="0" x2="160" y2="300"/>
                                <line x1="240" y1="0" x2="240" y2="300"/>
                                <line x1="320" y1="0" x2="320" y2="300"/>
                            </g>

                            <!-- Scan line sweep -->
                            <rect class="scan-line" x="0" y="0" width="400" height="300" fill="url(#scanGrad)"/>

                            <!-- Ground plane — perspective grid -->
                            <g stroke="#22c55e" stroke-opacity="0.12" stroke-width="0.5" filter="url(#glow)">
                                <line x1="100" y1="280" x2="200" y2="210"/>
                                <line x1="160" y1="280" x2="200" y2="210"/>
                                <line x1="240" y1="280" x2="200" y2="210"/>
                                <line x1="300" y1="280" x2="200" y2="210"/>
                                <line x1="60" y1="250" x2="340" y2="250"/>
                                <line x1="80" y1="265" x2="320" y2="265"/>
                                <line x1="50" y1="280" x2="350" y2="280"/>
                            </g>

                            <!-- SPIDER BODY — hexagonal wireframe -->
                            <g class="spider-body" filter="url(#glow)">
                                <!-- Abdomen (rear hex) -->
                                <polygon points="200,100 218,108 218,124 200,132 182,124 182,108"
                                    fill="none" stroke="#22c55e" stroke-width="1.5" stroke-opacity="0.9"/>
                                <!-- Inner abdomen detail -->
                                <polygon points="200,106 210,110 210,122 200,126 190,122 190,110"
                                    fill="none" stroke="#22c55e" stroke-width="0.7" stroke-opacity="0.4"/>

                                <!-- Thorax (front hex, slightly forward/down) -->
                                <polygon points="200,130 214,136 214,150 200,156 186,150 186,136"
                                    fill="none" stroke="#22c55e" stroke-width="1.5" stroke-opacity="0.9"/>

                                <!-- Head -->
                                <polygon points="200,155 210,160 210,170 200,174 190,170 190,160"
                                    fill="none" stroke="#22c55e" stroke-width="1.2" stroke-opacity="0.8"/>

                                <!-- Eyes — glowing dots -->
                                <circle cx="195" cy="163" r="2" fill="#22c55e" opacity="0.9" class="eye-blink"/>
                                <circle cx="205" cy="163" r="2" fill="#22c55e" opacity="0.9" class="eye-blink"/>
                                <!-- Eye glow halos -->
                                <circle cx="195" cy="163" r="4" fill="none" stroke="#22c55e" stroke-width="0.5" opacity="0.3" class="eye-blink"/>
                                <circle cx="205" cy="163" r="4" fill="none" stroke="#22c55e" stroke-width="0.5" opacity="0.3" class="eye-blink"/>

                                <!-- Fangs / mandibles -->
                                <line x1="194" y1="172" x2="190" y2="180" stroke="#22c55e" stroke-width="1" stroke-opacity="0.6"/>
                                <line x1="206" y1="172" x2="210" y2="180" stroke="#22c55e" stroke-width="1" stroke-opacity="0.6"/>
                            </g>

                            <!-- LEGS — angular poly wireframe, 4 per side -->
                            <g class="spider-legs" stroke="#22c55e" stroke-width="1.2" fill="none" filter="url(#glow)">
                                <!-- Right legs (top to bottom) -->
                                <!-- R1: upper-right, reaching forward -->
                                <polyline points="218,112 248,95 278,80 305,65" stroke-opacity="0.8" class="leg-r1"/>
                                <circle cx="305" cy="65" r="1.5" fill="#22c55e" fill-opacity="0.5"/>
                                <!-- R2 -->
                                <polyline points="218,120 255,115 285,120 310,130" stroke-opacity="0.7" class="leg-r2"/>
                                <circle cx="310" cy="130" r="1.5" fill="#22c55e" fill-opacity="0.5"/>
                                <!-- R3 -->
                                <polyline points="214,142 250,148 280,160 308,175" stroke-opacity="0.7" class="leg-r3"/>
                                <circle cx="308" cy="175" r="1.5" fill="#22c55e" fill-opacity="0.5"/>
                                <!-- R4: rear leg reaching back -->
                                <polyline points="214,148 245,165 270,190 290,215" stroke-opacity="0.6" class="leg-r4"/>
                                <circle cx="290" cy="215" r="1.5" fill="#22c55e" fill-opacity="0.5"/>

                                <!-- Left legs (mirrored) -->
                                <!-- L1 -->
                                <polyline points="182,112 152,95 122,80 95,65" stroke-opacity="0.8" class="leg-l1"/>
                                <circle cx="95" cy="65" r="1.5" fill="#22c55e" fill-opacity="0.5"/>
                                <!-- L2 -->
                                <polyline points="182,120 145,115 115,120 90,130" stroke-opacity="0.7" class="leg-l2"/>
                                <circle cx="90" cy="130" r="1.5" fill="#22c55e" fill-opacity="0.5"/>
                                <!-- L3 -->
                                <polyline points="186,142 150,148 120,160 92,175" stroke-opacity="0.7" class="leg-l3"/>
                                <circle cx="92" cy="175" r="1.5" fill="#22c55e" fill-opacity="0.5"/>
                                <!-- L4 -->
                                <polyline points="186,148 155,165 130,190 110,215" stroke-opacity="0.6" class="leg-l4"/>
                                <circle cx="110" cy="215" r="1.5" fill="#22c55e" fill-opacity="0.5"/>
                            </g>

                            <!-- Joint dots at leg bends -->
                            <g fill="#22c55e" fill-opacity="0.35">
                                <circle cx="248" cy="95" r="1.5"/><circle cx="278" cy="80" r="1.5"/>
                                <circle cx="255" cy="115" r="1.5"/><circle cx="285" cy="120" r="1.5"/>
                                <circle cx="250" cy="148" r="1.5"/><circle cx="280" cy="160" r="1.5"/>
                                <circle cx="245" cy="165" r="1.5"/><circle cx="270" cy="190" r="1.5"/>
                                <circle cx="152" cy="95" r="1.5"/><circle cx="122" cy="80" r="1.5"/>
                                <circle cx="145" cy="115" r="1.5"/><circle cx="115" cy="120" r="1.5"/>
                                <circle cx="150" cy="148" r="1.5"/><circle cx="120" cy="160" r="1.5"/>
                                <circle cx="155" cy="165" r="1.5"/><circle cx="130" cy="190" r="1.5"/>
                            </g>

                            <!-- Data readout text — bottom-right HUD style -->
                            <g class="hud-text" fill="#22c55e" font-family="monospace" font-size="9" opacity="0.4">
                                <text x="290" y="260">CRAWLER:ACTIVE</text>
                                <text x="290" y="272">AWAITING TARGET</text>
                                <text x="20" y="260" class="hud-blink">SYS:READY</text>
                                <text x="20" y="272">FILTERS:NONE</text>
                            </g>
                        </svg>
                    </div>
                    <div class="welcome-title">Crawler standing by</div>
                    <div class="welcome-hint">Select a source or set filters to deploy.</div>
                </td></tr>`;
        }
        // Clear pagination and results info too
        const pagination = document.getElementById('pagination');
        if (pagination) pagination.innerHTML = '';
        const info = document.getElementById('results-info');
        if (info) info.innerHTML = '';
    },

    /**
     * Show loading spinner in table area.
     */
    _showLoading() {
        const tbody = document.getElementById('product-table-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr><td colspan="8" class="loading-state">
                    <div class="spinner"></div>
                    <div>Loading products...</div>
                </td></tr>`;
        }
    },

    /**
     * Show error message in table area.
     */
    _showError(message) {
        const tbody = document.getElementById('product-table-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr><td colspan="8" class="error-state">
                    <div class="error-icon">&#9888;</div>
                    <div>Error loading products</div>
                    <div class="error-detail">${Utils.escapeHtml(message)}</div>
                    <button class="btn-secondary" onclick="TableManager.loadProducts()">Retry</button>
                </td></tr>`;
        }
    },

    // ═══════════════════════════════════════════
    // PRODUCT DETAIL MODAL
    // ═══════════════════════════════════════════

    /**
     * Open product detail modal with price history chart.
     */
    async showDetail(productId) {
        const modal = document.getElementById('product-modal');
        const content = document.getElementById('modal-content');
        if (!modal || !content) return;

        modal.classList.add('active');
        content.innerHTML = '<div class="modal-loading"><div class="spinner"></div>Loading product details...</div>';

        try {
            const product = await ApiClient.getProduct(productId);
            content.innerHTML = this._renderDetail(product);
            Utils.log.success('Product detail loaded', product.title);
        } catch (err) {
            content.innerHTML = `<div class="modal-error">Failed to load product details: ${Utils.escapeHtml(err.message)}</div>`;
        }
    },

    /**
     * Close the product detail modal.
     */
    closeModal() {
        const modal = document.getElementById('product-modal');
        if (modal) modal.classList.remove('active');
    },

    /**
     * Render product detail HTML with price history SVG chart.
     */
    _renderDetail(product) {
        const priceHistory = product.price_history || [];
        const chartHtml = this._renderPriceChart(priceHistory);

        const discount = product.discount_percent
            ? `<span class="discount-badge ${Utils.discountTier(product.discount_percent)}">${Math.round(product.discount_percent)}% off</span>` : '';

        const image = product.image_url
            ? `<img src="${Utils.escapeHtml(product.image_url)}" alt="" class="detail-image" onerror="this.style.display='none'">`
            : '';

        return `
            <div class="detail-header">
                <div class="detail-image-wrap">${image}</div>
                <div class="detail-info">
                    <h2 class="detail-title">${Utils.escapeHtml(product.title)}</h2>
                    <div class="detail-meta">
                        <span class="detail-store">${Utils.escapeHtml(product.store)}</span>
                        <span class="detail-source">${Utils.escapeHtml(Utils.sourceLabel(product.source))}</span>
                        ${product.brand ? `<span class="detail-brand">${Utils.escapeHtml(product.brand)}</span>` : ''}
                        ${product.region ? `<span class="detail-region">${Utils.escapeHtml(product.region)}</span>` : ''}
                    </div>
                    <div class="detail-pricing">
                        <span class="detail-price">${Utils.formatPrice(product.current_price)}</span>
                        ${product.original_price && product.original_price > (product.current_price || 0) ? `<span class="detail-original">${Utils.formatPrice(product.original_price)}</span>` : ''}
                        ${discount}
                    </div>
                    <div class="detail-dates">
                        <div>First seen: ${Utils.formatDate(product.first_seen_at)}</div>
                        <div>Last seen: ${Utils.formatDate(product.last_seen_at)}</div>
                    </div>
                    ${product.description ? `<div class="detail-description">${Utils.escapeHtml(product.description)}</div>` : ''}
                    <div class="detail-actions">
                        <a href="${Utils.escapeHtml(product.affiliate_url)}" target="_blank" rel="noopener" class="btn-primary">View Deal &#8599;</a>
                    </div>
                </div>
            </div>
            <div class="detail-chart-section">
                <h3>Price History <span class="chart-badge">${priceHistory.length} data point${priceHistory.length !== 1 ? 's' : ''}</span></h3>
                ${chartHtml}
            </div>`;
    },

    /**
     * Render SVG price history chart.
     * Ported from app/products/page.tsx PriceHistoryChart component.
     */
    _renderPriceChart(priceHistory) {
        if (!priceHistory || priceHistory.length === 0) {
            return '<div class="chart-empty">No price history available</div>';
        }

        const prices = priceHistory.map(p => p.price).filter(p => p != null);
        if (prices.length === 0) return '<div class="chart-empty">No price data</div>';

        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const range = maxPrice - minPrice || 1;

        // Single data point — show centered price
        if (priceHistory.length === 1) {
            const point = priceHistory[0];
            const saleClass = point.is_on_sale ? 'on-sale' : '';
            return `
                <div class="chart-single">
                    <div class="chart-single-price ${saleClass}">${Utils.formatPrice(point.price)}</div>
                    <div class="chart-single-date">${Utils.formatDate(point.scraped_at)}</div>
                    ${point.is_on_sale ? '<div class="chart-single-sale">On Sale</div>' : ''}
                    ${point.original_price && point.original_price > point.price ? `<div class="chart-single-was">Was ${Utils.formatPrice(point.original_price)}</div>` : ''}
                </div>`;
        }

        // Multi-point SVG chart
        const width = priceHistory.length * 40;
        const height = 100;
        const padding = 10;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;

        // Build polyline points
        const points = priceHistory.map((p, i) => {
            const x = (i / (priceHistory.length - 1)) * chartWidth + padding;
            const y = (height - padding) - ((p.price - minPrice) / range) * chartHeight;
            return `${x},${y}`;
        });

        // Build polygon for area fill (same points + bottom corners)
        const areaPoints = `${padding},${height - padding} ${points.join(' ')} ${chartWidth + padding},${height - padding}`;

        // Build data point circles
        const circles = priceHistory.map((p, i) => {
            const x = (i / (priceHistory.length - 1)) * chartWidth + padding;
            const y = (height - padding) - ((p.price - minPrice) / range) * chartHeight;
            const fill = p.is_on_sale ? '#22c55e' : '#22d3ee';
            return `<circle cx="${x}" cy="${y}" r="3" fill="${fill}" stroke="#0f172a" stroke-width="1"/>`;
        }).join('');

        // Grid lines
        const gridLines = [25, 50, 75].map(pct => {
            const y = (height - padding) - (pct / 100) * chartHeight;
            return `<line x1="${padding}" y1="${y}" x2="${chartWidth + padding}" y2="${y}" stroke="#334155" stroke-width="0.5" stroke-dasharray="2"/>`;
        }).join('');

        // Date labels
        const firstDate = Utils.formatDate(priceHistory[0].scraped_at);
        const lastDate = Utils.formatDate(priceHistory[priceHistory.length - 1].scraped_at);

        return `
            <div class="chart-container">
                <svg class="price-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stop-color="#22d3ee"/>
                            <stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/>
                        </linearGradient>
                    </defs>
                    ${gridLines}
                    <polygon fill="url(#chartGradient)" opacity="0.3" points="${areaPoints}"/>
                    <polyline fill="none" stroke="#22d3ee" stroke-width="2" points="${points.join(' ')}"/>
                    ${circles}
                </svg>
                <div class="chart-labels">
                    <span>${firstDate}</span>
                    <span>Low: ${Utils.formatPrice(minPrice)} | High: ${Utils.formatPrice(maxPrice)}</span>
                    <span>${lastDate}</span>
                </div>
            </div>`;
    },

    // ═══════════════════════════════════════════
    // PRICE TRACKER TAB
    // ═══════════════════════════════════════════

    /**
     * Load and render the price tracker tab content.
     */
    async loadPriceTracker() {
        const container = document.getElementById('price-tracker-content');
        if (!container) return;

        container.innerHTML = '<div class="loading-state"><div class="spinner"></div>Loading price tracker data...</div>';

        try {
            const data = await ApiClient.getPriceTracker({ days: 30, limit: 50 });
            container.innerHTML = this._renderPriceTracker(data);
            Utils.log.success('Price tracker loaded', `${data.recently_dropped.length} drops, ${data.most_tracked.length} tracked, ${data.biggest_drops.length} biggest`);
        } catch (err) {
            container.innerHTML = `<div class="error-state"><div class="error-icon">&#9888;</div>Failed to load price tracker: ${Utils.escapeHtml(err.message)}</div>`;
        }
    },

    /**
     * Render price tracker sections: recent drops, most tracked, biggest savings.
     */
    _renderPriceTracker(data) {
        let html = '<div class="tracker-sections">';

        // ── Recently Dropped ──
        html += '<div class="tracker-section">';
        html += '<h3 class="tracker-section-title">&#128200; Recent Price Drops</h3>';
        if (data.recently_dropped.length > 0) {
            html += '<table class="tracker-table"><thead><tr><th>Product</th><th>Old Price</th><th>New Price</th><th>Drop</th><th>When</th></tr></thead><tbody>';
            for (const item of data.recently_dropped) {
                html += `
                    <tr class="tracker-row" onclick="TableManager.showDetail('${Utils.escapeHtml(item.product_id)}')">
                        <td class="tracker-title">${Utils.escapeHtml(Utils.truncate(item.title || 'Unknown', 50))}</td>
                        <td class="tracker-old-price">${Utils.formatPrice(item.old_price)}</td>
                        <td class="tracker-new-price">${Utils.formatPrice(item.new_price)}</td>
                        <td><span class="discount-badge discount-good">${item.drop_percent}% off</span></td>
                        <td class="tracker-time">${Utils.timeAgo(item.dropped_at)}</td>
                    </tr>`;
            }
            html += '</tbody></table>';
        } else {
            html += '<div class="tracker-empty">No recent price drops found</div>';
        }
        html += '</div>';

        // ── Most Tracked ──
        html += '<div class="tracker-section">';
        html += '<h3 class="tracker-section-title">&#128202; Most Tracked Products</h3>';
        if (data.most_tracked.length > 0) {
            html += '<table class="tracker-table"><thead><tr><th>Product</th><th>Data Points</th><th>Current</th><th>Original</th></tr></thead><tbody>';
            for (const item of data.most_tracked) {
                html += `
                    <tr class="tracker-row" onclick="TableManager.showDetail('${Utils.escapeHtml(item.product_id)}')">
                        <td class="tracker-title">${Utils.escapeHtml(Utils.truncate(item.title || 'Unknown', 50))}</td>
                        <td><span class="tracked-badge">${item.data_points} points</span></td>
                        <td>${Utils.formatPrice(item.current_price)}</td>
                        <td>${Utils.formatPrice(item.original_price)}</td>
                    </tr>`;
            }
            html += '</tbody></table>';
        } else {
            html += '<div class="tracker-empty">No tracked products found</div>';
        }
        html += '</div>';

        // ── Biggest Drops ──
        html += '<div class="tracker-section">';
        html += '<h3 class="tracker-section-title">&#128176; Biggest Savings (All Time)</h3>';
        if (data.biggest_drops.length > 0) {
            html += '<table class="tracker-table"><thead><tr><th>Product</th><th>Current</th><th>Original</th><th>Savings</th></tr></thead><tbody>';
            for (const item of data.biggest_drops) {
                html += `
                    <tr class="tracker-row" onclick="TableManager.showDetail('${Utils.escapeHtml(item.product_id)}')">
                        <td class="tracker-title">${Utils.escapeHtml(Utils.truncate(item.title || 'Unknown', 50))}</td>
                        <td class="tracker-new-price">${Utils.formatPrice(item.current_price)}</td>
                        <td class="tracker-old-price">${Utils.formatPrice(item.original_price)}</td>
                        <td><span class="discount-badge ${Utils.discountTier(item.drop_percent)}">${Math.round(item.drop_percent)}% off</span></td>
                    </tr>`;
            }
            html += '</tbody></table>';
        } else {
            html += '<div class="tracker-empty">No data available</div>';
        }
        html += '</div>';

        html += '</div>';
        return html;
    },

    // ═══════════════════════════════════════════
    // CSV EXPORT
    // ═══════════════════════════════════════════

    /**
     * Export current filtered products to CSV and trigger download.
     */
    exportCsv() {
        if (this.currentProducts.length === 0) {
            alert('No products to export. Apply some filters first.');
            return;
        }

        const headers = ['Title', 'Store', 'Source', 'Current Price', 'Original Price', 'Discount %', 'Category', 'Region', 'URL', 'First Seen', 'Last Seen'];

        const rows = this.currentProducts.map(p => [
            `"${(p.title || '').replace(/"/g, '""')}"`,
            `"${(p.store || '').replace(/"/g, '""')}"`,
            `"${(p.source || '').replace(/"/g, '""')}"`,
            p.current_price ?? '',
            p.original_price ?? '',
            p.discount_percent ?? '',
            `"${(p.category || '').replace(/"/g, '""')}"`,
            `"${(p.region || '').replace(/"/g, '""')}"`,
            `"${(p.affiliate_url || '').replace(/"/g, '""')}"`,
            p.first_seen_at || '',
            p.last_seen_at || '',
        ].join(','));

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `deals-export-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        Utils.log.success('CSV Export', `${this.currentProducts.length} products exported`);
    },
};
