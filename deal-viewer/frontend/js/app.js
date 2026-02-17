/**
 * app.js — Main controller for the Deal Viewer SPA.
 * Wires together FilterManager, TableManager, and ApiClient.
 * Handles tab switching, keyboard shortcuts, auto-refresh, and stats bar.
 */

const App = {

    // ── Auto-refresh state ──
    autoRefreshInterval: null,
    autoRefreshEnabled: false,
    AUTO_REFRESH_MS: 60000,  // 60 seconds

    /**
     * Initialize the entire app.
     * Called from index.html on DOMContentLoaded.
     */
    async init() {
        Utils.log.info('App', 'Initializing Deal Viewer...');
        const start = performance.now();

        // Wire up FilterManager → TableManager
        FilterManager.onChange = () => TableManager.loadProducts();

        // Initialize filters (loads options from API, renders sidebar)
        await FilterManager.init();

        // Load initial data in parallel
        await Promise.all([
            TableManager.loadProducts(),
            this.loadStats(),
        ]);

        // Set up event listeners
        this._setupTabs();
        this._setupKeyboard();
        this._setupModal();
        this._setupAutoRefresh();
        this._setupSidebarToggle();

        // Listen for hash changes (browser back/forward)
        window.addEventListener('hashchange', () => {
            const urlFilters = Utils.getFiltersFromUrl();
            Object.assign(FilterManager.state, urlFilters);
            FilterManager.render();
            FilterManager.renderActiveBadges();
            TableManager.loadProducts();
        });

        const elapsed = performance.now() - start;
        Utils.log.success('App initialized', `${elapsed.toFixed(0)}ms`);
    },

    // ═══════════════════════════════════════════
    // STATS BAR
    // ═══════════════════════════════════════════

    async loadStats() {
        try {
            const stats = await ApiClient.getStats();
            document.getElementById('stat-total').textContent = Utils.formatNumber(stats.total_products);
            document.getElementById('stat-stores').textContent = Utils.formatNumber(stats.total_stores);
            document.getElementById('stat-today').textContent = Utils.formatNumber(stats.added_today);
            document.getElementById('stat-sale').textContent = Utils.formatNumber(stats.on_sale);
        } catch (err) {
            Utils.log.warn('Stats load failed', err.message);
        }
    },

    // ═══════════════════════════════════════════
    // TAB SWITCHING (Products / Price Tracker)
    // ═══════════════════════════════════════════

    _setupTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });
    },

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Show/hide tab content
        document.getElementById('products-tab').style.display = tabName === 'products' ? 'block' : 'none';
        document.getElementById('price-tracker-tab').style.display = tabName === 'price-tracker' ? 'block' : 'none';

        // Load price tracker data on first view
        if (tabName === 'price-tracker') {
            TableManager.loadPriceTracker();
        }

        Utils.log.info('Tab', `Switched to ${tabName}`);
    },

    // ═══════════════════════════════════════════
    // KEYBOARD SHORTCUTS
    // ═══════════════════════════════════════════

    _setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            // Don't capture if typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
                // Escape blurs the input
                if (e.key === 'Escape') {
                    e.target.blur();
                }
                return;
            }

            switch (e.key) {
                case '/':
                    // Focus search input
                    e.preventDefault();
                    const searchInput = document.getElementById('search-input');
                    if (searchInput) searchInput.focus();
                    break;

                case 'ArrowLeft':
                    // Previous page
                    if (TableManager.currentPage > 1) {
                        FilterManager.set('page', TableManager.currentPage - 1);
                    }
                    break;

                case 'ArrowRight':
                    // Next page
                    if (TableManager.currentPage < TableManager.totalPages) {
                        FilterManager.set('page', TableManager.currentPage + 1);
                    }
                    break;

                case 'Escape':
                    // Close modal
                    TableManager.closeModal();
                    break;

                case 'e':
                    // Export CSV
                    if (!e.ctrlKey && !e.metaKey) {
                        TableManager.exportCsv();
                    }
                    break;

                case 'r':
                    // Refresh
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        TableManager.loadProducts();
                    }
                    break;
            }
        });
    },

    // ═══════════════════════════════════════════
    // MODAL CLOSE HANDLERS
    // ═══════════════════════════════════════════

    _setupModal() {
        // Close on backdrop click
        const modal = document.getElementById('product-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    TableManager.closeModal();
                }
            });
        }

        // Close button
        const closeBtn = document.getElementById('modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => TableManager.closeModal());
        }
    },

    // ═══════════════════════════════════════════
    // AUTO-REFRESH
    // ═══════════════════════════════════════════

    _setupAutoRefresh() {
        const toggle = document.getElementById('auto-refresh-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => this.toggleAutoRefresh());
        }
    },

    toggleAutoRefresh() {
        this.autoRefreshEnabled = !this.autoRefreshEnabled;
        const toggle = document.getElementById('auto-refresh-toggle');

        if (this.autoRefreshEnabled) {
            this.autoRefreshInterval = setInterval(() => {
                Utils.log.info('Auto-refresh', 'Refreshing products...');
                TableManager.loadProducts();
                this.loadStats();
            }, this.AUTO_REFRESH_MS);
            if (toggle) toggle.classList.add('active');
            Utils.log.success('Auto-refresh', `Enabled (every ${this.AUTO_REFRESH_MS / 1000}s)`);
        } else {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
            if (toggle) toggle.classList.remove('active');
            Utils.log.info('Auto-refresh', 'Disabled');
        }
    },

    // ═══════════════════════════════════════════
    // SIDEBAR TOGGLE (mobile)
    // ═══════════════════════════════════════════

    _setupSidebarToggle() {
        const toggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('filter-sidebar');
        if (toggle && sidebar) {
            toggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }
    },
};

// ── Bootstrap on DOM ready ──
document.addEventListener('DOMContentLoaded', () => App.init());
