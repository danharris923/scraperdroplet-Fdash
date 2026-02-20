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
                        <svg viewBox="0 0 600 400" class="spider-svg" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <!-- Heavy neon glow -->
                                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                    <feGaussianBlur stdDeviation="3" result="b"/>
                                    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                                </filter>
                                <filter id="glow-heavy" x="-50%" y="-50%" width="200%" height="200%">
                                    <feGaussianBlur stdDeviation="6" result="b"/>
                                    <feFlood flood-color="#22c55e" flood-opacity="0.4" result="c"/>
                                    <feComposite in="c" in2="b" operator="in" result="d"/>
                                    <feMerge><feMergeNode in="d"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                                </filter>
                                <filter id="glow-eye" x="-100%" y="-100%" width="300%" height="300%">
                                    <feGaussianBlur stdDeviation="8" result="b"/>
                                    <feFlood flood-color="#22c55e" flood-opacity="0.6" result="c"/>
                                    <feComposite in="c" in2="b" operator="in" result="d"/>
                                    <feMerge><feMergeNode in="d"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                                </filter>
                                <!-- Scan line -->
                                <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stop-color="#22c55e" stop-opacity="0"/>
                                    <stop offset="48%" stop-color="#22c55e" stop-opacity="0.06"/>
                                    <stop offset="50%" stop-color="#22c55e" stop-opacity="0.18"/>
                                    <stop offset="52%" stop-color="#22c55e" stop-opacity="0.06"/>
                                    <stop offset="100%" stop-color="#22c55e" stop-opacity="0"/>
                                </linearGradient>
                                <!-- Floor glow -->
                                <radialGradient id="floorGlow" cx="50%" cy="100%" r="60%">
                                    <stop offset="0%" stop-color="#22c55e" stop-opacity="0.08"/>
                                    <stop offset="100%" stop-color="#22c55e" stop-opacity="0"/>
                                </radialGradient>
                            </defs>

                            <!-- Black void background -->
                            <rect width="600" height="400" fill="#050a05"/>

                            <!-- Floor glow -->
                            <rect width="600" height="400" fill="url(#floorGlow)"/>

                            <!-- PERSPECTIVE GRID FLOOR — converges to vanishing point at (300, 180) -->
                            <g stroke="#22c55e" fill="none" filter="url(#glow)">
                                <!-- Radial lines from vanishing point to bottom -->
                                <line x1="300" y1="180" x2="-60"  y2="400" stroke-opacity="0.2" stroke-width="0.8"/>
                                <line x1="300" y1="180" x2="60"   y2="400" stroke-opacity="0.25" stroke-width="0.8"/>
                                <line x1="300" y1="180" x2="150"  y2="400" stroke-opacity="0.3" stroke-width="1"/>
                                <line x1="300" y1="180" x2="230"  y2="400" stroke-opacity="0.3" stroke-width="1"/>
                                <line x1="300" y1="180" x2="300"  y2="400" stroke-opacity="0.35" stroke-width="1.2"/>
                                <line x1="300" y1="180" x2="370"  y2="400" stroke-opacity="0.3" stroke-width="1"/>
                                <line x1="300" y1="180" x2="450"  y2="400" stroke-opacity="0.3" stroke-width="1"/>
                                <line x1="300" y1="180" x2="540"  y2="400" stroke-opacity="0.25" stroke-width="0.8"/>
                                <line x1="300" y1="180" x2="660"  y2="400" stroke-opacity="0.2" stroke-width="0.8"/>
                                <!-- Horizontal grid rows — closer together near vanishing point -->
                                <line x1="180" y1="260" x2="420" y2="260" stroke-opacity="0.15" stroke-width="0.6"/>
                                <line x1="130" y1="290" x2="470" y2="290" stroke-opacity="0.2" stroke-width="0.7"/>
                                <line x1="80"  y1="320" x2="520" y2="320" stroke-opacity="0.25" stroke-width="0.8"/>
                                <line x1="20"  y1="350" x2="580" y2="350" stroke-opacity="0.3" stroke-width="1"/>
                                <line x1="-30" y1="380" x2="630" y2="380" stroke-opacity="0.35" stroke-width="1.2"/>
                            </g>

                            <!-- Grid intersection sparks -->
                            <g fill="#22c55e" class="grid-sparks">
                                <circle cx="300" cy="350" r="2" opacity="0.6" filter="url(#glow)"/>
                                <circle cx="230" cy="350" r="1.5" opacity="0.4"/>
                                <circle cx="370" cy="350" r="1.5" opacity="0.4"/>
                                <circle cx="150" cy="380" r="2" opacity="0.5" filter="url(#glow)"/>
                                <circle cx="450" cy="380" r="2" opacity="0.5" filter="url(#glow)"/>
                            </g>

                            <!-- Scan line sweep -->
                            <rect class="scan-line" x="0" y="0" width="600" height="400" fill="url(#scanGrad)"/>

                            <!-- ══════ SPIDER — massive, low angle, aggressive ══════ -->

                            <!-- ABDOMEN — large rear section, chunky polygon -->
                            <g class="spider-body" filter="url(#glow-heavy)">
                                <polygon points="300,70 340,55 365,70 365,105 340,120 300,125 260,120 235,105 235,70 260,55"
                                    fill="none" stroke="#22c55e" stroke-width="2.5" stroke-opacity="0.7"/>
                                <!-- Inner wireframe detail on abdomen -->
                                <polygon points="300,65 330,58 348,68 348,100 330,112 300,115 270,112 252,100 252,68 270,58"
                                    fill="none" stroke="#22c55e" stroke-width="1" stroke-opacity="0.25"/>
                                <!-- Spine line -->
                                <line x1="300" y1="55" x2="300" y2="125" stroke="#22c55e" stroke-width="0.8" stroke-opacity="0.2"/>
                                <line x1="235" y1="87" x2="365" y2="87" stroke="#22c55e" stroke-width="0.8" stroke-opacity="0.15"/>

                                <!-- THORAX — connects to head, angular -->
                                <polygon points="300,125 330,130 345,145 340,170 300,180 260,170 255,145 270,130"
                                    fill="none" stroke="#22c55e" stroke-width="2.5" stroke-opacity="0.8"/>
                                <!-- Inner thorax wireframe -->
                                <polygon points="300,132 322,136 332,148 328,165 300,172 272,165 268,148 278,136"
                                    fill="none" stroke="#22c55e" stroke-width="0.8" stroke-opacity="0.25"/>
                                <!-- Cross struts -->
                                <line x1="270" y1="130" x2="340" y2="170" stroke="#22c55e" stroke-width="0.6" stroke-opacity="0.15"/>
                                <line x1="330" y1="130" x2="260" y2="170" stroke="#22c55e" stroke-width="0.6" stroke-opacity="0.15"/>

                                <!-- HEAD — angular, aggressive, wide -->
                                <polygon points="300,178 328,182 340,195 335,215 300,222 265,215 260,195 272,182"
                                    fill="none" stroke="#22c55e" stroke-width="2.5" stroke-opacity="0.9"/>
                                <!-- Brow ridge — angry V shape -->
                                <polyline points="265,192 285,186 300,190 315,186 335,192"
                                    fill="none" stroke="#22c55e" stroke-width="1.8" stroke-opacity="0.6"/>

                                <!-- FANGS — sharp, pointing down -->
                                <polyline points="280,218 274,240 278,248" fill="none" stroke="#22c55e" stroke-width="2.2" stroke-opacity="0.8" stroke-linejoin="round"/>
                                <polyline points="320,218 326,240 322,248" fill="none" stroke="#22c55e" stroke-width="2.2" stroke-opacity="0.8" stroke-linejoin="round"/>
                                <!-- Fang tips glow -->
                                <circle cx="278" cy="248" r="2" fill="#22c55e" opacity="0.6" filter="url(#glow)"/>
                                <circle cx="322" cy="248" r="2" fill="#22c55e" opacity="0.6" filter="url(#glow)"/>
                            </g>

                            <!-- EYES — 4 glowing eyes, menacing cluster -->
                            <g class="spider-eyes" filter="url(#glow-eye)">
                                <!-- Main eyes (large) -->
                                <circle cx="286" cy="198" r="5" fill="#22c55e" opacity="0.95" class="eye-pulse"/>
                                <circle cx="314" cy="198" r="5" fill="#22c55e" opacity="0.95" class="eye-pulse"/>
                                <!-- Secondary eyes (smaller, above) -->
                                <circle cx="279" cy="190" r="3" fill="#22c55e" opacity="0.7" class="eye-pulse-alt"/>
                                <circle cx="321" cy="190" r="3" fill="#22c55e" opacity="0.7" class="eye-pulse-alt"/>
                                <!-- Eye highlights -->
                                <circle cx="288" cy="196" r="1.5" fill="#fff" opacity="0.5"/>
                                <circle cx="316" cy="196" r="1.5" fill="#fff" opacity="0.5"/>
                            </g>

                            <!-- LEGS — thick, angular, aggressive, reaching wide -->
                            <g stroke="#22c55e" fill="none" stroke-linejoin="round" stroke-linecap="round" filter="url(#glow-heavy)">
                                <!-- RIGHT LEGS — each has 3 segments: shoulder, forearm, claw -->
                                <!-- R1: front-right, reaching forward and down -->
                                <polyline class="leg-r1" points="340,140 390,110 440,80 480,30" stroke-width="2.8" stroke-opacity="0.9"/>
                                <polyline points="480,30 495,18" stroke-width="2" stroke-opacity="0.7"/>
                                <!-- R2: mid-front right -->
                                <polyline class="leg-r2" points="345,155 400,145 460,140 520,115" stroke-width="2.5" stroke-opacity="0.8"/>
                                <polyline points="520,115 540,108" stroke-width="1.8" stroke-opacity="0.6"/>
                                <!-- R3: mid-rear right -->
                                <polyline class="leg-r3" points="340,165 395,180 455,195 530,200" stroke-width="2.5" stroke-opacity="0.75"/>
                                <polyline points="530,200 550,202" stroke-width="1.8" stroke-opacity="0.6"/>
                                <!-- R4: rear right, sweeping back -->
                                <polyline class="leg-r4" points="330,125 375,140 430,175 490,240" stroke-width="2.2" stroke-opacity="0.65"/>
                                <polyline points="490,240 505,260" stroke-width="1.5" stroke-opacity="0.5"/>

                                <!-- LEFT LEGS — mirrored -->
                                <!-- L1 -->
                                <polyline class="leg-l1" points="260,140 210,110 160,80 120,30" stroke-width="2.8" stroke-opacity="0.9"/>
                                <polyline points="120,30 105,18" stroke-width="2" stroke-opacity="0.7"/>
                                <!-- L2 -->
                                <polyline class="leg-l2" points="255,155 200,145 140,140 80,115" stroke-width="2.5" stroke-opacity="0.8"/>
                                <polyline points="80,115 60,108" stroke-width="1.8" stroke-opacity="0.6"/>
                                <!-- L3 -->
                                <polyline class="leg-l3" points="260,165 205,180 145,195 70,200" stroke-width="2.5" stroke-opacity="0.75"/>
                                <polyline points="70,200 50,202" stroke-width="1.8" stroke-opacity="0.6"/>
                                <!-- L4 -->
                                <polyline class="leg-l4" points="270,125 225,140 170,175 110,240" stroke-width="2.2" stroke-opacity="0.65"/>
                                <polyline points="110,240 95,260" stroke-width="1.5" stroke-opacity="0.5"/>
                            </g>

                            <!-- LEG JOINTS — bright dots at bends -->
                            <g fill="#22c55e" filter="url(#glow)">
                                <!-- Right joints -->
                                <circle cx="390" cy="110" r="3" opacity="0.7"/>
                                <circle cx="440" cy="80"  r="2.5" opacity="0.5"/>
                                <circle cx="400" cy="145" r="2.5" opacity="0.6"/>
                                <circle cx="460" cy="140" r="2" opacity="0.4"/>
                                <circle cx="395" cy="180" r="2.5" opacity="0.5"/>
                                <circle cx="455" cy="195" r="2" opacity="0.4"/>
                                <circle cx="375" cy="140" r="2" opacity="0.45"/>
                                <circle cx="430" cy="175" r="2" opacity="0.4"/>
                                <!-- Left joints -->
                                <circle cx="210" cy="110" r="3" opacity="0.7"/>
                                <circle cx="160" cy="80"  r="2.5" opacity="0.5"/>
                                <circle cx="200" cy="145" r="2.5" opacity="0.6"/>
                                <circle cx="140" cy="140" r="2" opacity="0.4"/>
                                <circle cx="205" cy="180" r="2.5" opacity="0.5"/>
                                <circle cx="145" cy="195" r="2" opacity="0.4"/>
                                <circle cx="225" cy="140" r="2" opacity="0.45"/>
                                <circle cx="170" cy="175" r="2" opacity="0.4"/>
                            </g>

                            <!-- Claw tip sparks — where legs meet the ground -->
                            <g fill="#22c55e" class="claw-sparks">
                                <circle cx="495" cy="18"  r="2.5" opacity="0.8" filter="url(#glow-heavy)"/>
                                <circle cx="540" cy="108" r="2" opacity="0.6" filter="url(#glow)"/>
                                <circle cx="550" cy="202" r="2" opacity="0.6" filter="url(#glow)"/>
                                <circle cx="505" cy="260" r="2" opacity="0.5" filter="url(#glow)"/>
                                <circle cx="105" cy="18"  r="2.5" opacity="0.8" filter="url(#glow-heavy)"/>
                                <circle cx="60"  cy="108" r="2" opacity="0.6" filter="url(#glow)"/>
                                <circle cx="50"  cy="202" r="2" opacity="0.6" filter="url(#glow)"/>
                                <circle cx="95"  cy="260" r="2" opacity="0.5" filter="url(#glow)"/>
                            </g>

                            <!-- HUD readout -->
                            <g fill="#22c55e" font-family="monospace" font-size="10" opacity="0.35">
                                <text x="440" y="370">STATUS: HUNTING</text>
                                <text x="440" y="384" class="hud-blink">TARGET: UNSET</text>
                                <text x="30" y="370">CRAWLER v3.1</text>
                                <text x="30" y="384">AWAITING FILTERS</text>
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
