/**
 * filters.js — Filter state management + UI rendering for the Deal Viewer.
 * Manages all filter state, renders the sidebar filter UI, syncs to URL hash,
 * and provides active-filter badge summary with clear buttons.
 */

const FilterManager = {

    // ── Current filter state ──
    state: {
        sources: [],
        stores: [],
        regions: [],
        brands: [],
        categories: [],
        search: '',
        min_discount: undefined,
        max_discount: undefined,
        min_price: undefined,
        max_price: undefined,
        date_from: undefined,
        date_to: undefined,
        days: undefined,
        on_sale_only: false,
        has_price_drop: false,
        active_only: false,
        sort_by: 'last_seen_at',
        sort_order: 'desc',
        page: 1,
        per_page: 24,
    },

    // ── Cached filter options from the API ──
    options: null,

    // ── Callback when filters change (set by app.js) ──
    onChange: null,

    /**
     * Initialize: load filter options from API, restore state from URL, render UI.
     */
    async init() {
        Utils.log.info('FilterManager', 'Initializing...');

        // Restore filters from URL hash
        const urlFilters = Utils.getFiltersFromUrl();
        Object.assign(this.state, urlFilters);

        // Load filter options from API
        try {
            this.options = await ApiClient.getFilters();
            Utils.log.success('Filters loaded', `${this.options.counts.totalProducts.toLocaleString()} total products`);
        } catch (err) {
            Utils.log.error('Failed to load filter options', err.message);
            this.options = { sources: [], sourcesByCategory: { dealAggregators: [], amazon: [], storeScrapers: [], costcoTrackers: [] }, stores: [], regions: [], brands: [], categories: [], counts: {} };
        }

        this.render();
        this.renderActiveBadges();
    },

    /**
     * Update a filter value and trigger a re-fetch.
     * Resets page to 1 for any non-page filter change.
     */
    set(key, value) {
        if (key !== 'page') {
            this.state.page = 1;  // Reset to page 1 on any filter change
        }
        this.state[key] = value;
        this._sync();
    },

    /**
     * Toggle a value in an array filter (sources, stores, regions, brands, categories).
     */
    toggle(key, value) {
        const arr = this.state[key] || [];
        const idx = arr.indexOf(value);
        if (idx >= 0) {
            arr.splice(idx, 1);
        } else {
            arr.push(value);
        }
        this.state[key] = arr;
        this.state.page = 1;
        this._sync();
    },

    /**
     * Clear all filters back to defaults.
     */
    clearAll() {
        this.state = {
            sources: [], stores: [], regions: [], brands: [], categories: [],
            search: '', min_discount: undefined, max_discount: undefined,
            min_price: undefined, max_price: undefined,
            date_from: undefined, date_to: undefined, days: undefined,
            on_sale_only: false, has_price_drop: false, active_only: false,
            sort_by: 'last_seen_at', sort_order: 'desc',
            page: 1, per_page: 24,
        };
        // Reset UI inputs
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';
        this._sync();
    },

    /**
     * Clear a single filter key.
     */
    clear(key) {
        if (Array.isArray(this.state[key])) {
            this.state[key] = [];
        } else if (typeof this.state[key] === 'boolean') {
            this.state[key] = false;
        } else {
            this.state[key] = undefined;
        }
        this.state.page = 1;
        this._sync();
    },

    /**
     * Get filter state as params object suitable for API call.
     * Strips undefined/empty values.
     */
    getApiParams() {
        const p = {};
        for (const [key, value] of Object.entries(this.state)) {
            if (value === undefined || value === null || value === '' || value === false) continue;
            if (Array.isArray(value) && value.length === 0) continue;
            p[key] = value;
        }
        return p;
    },

    /**
     * Count how many filters are actively applied.
     */
    activeCount() {
        let count = 0;
        if (this.state.sources.length) count++;
        if (this.state.search) count++;
        if (this.state.min_discount !== undefined) count++;
        if (this.state.max_discount !== undefined) count++;
        if (this.state.min_price !== undefined) count++;
        if (this.state.max_price !== undefined) count++;
        if (this.state.date_from) count++;
        if (this.state.date_to) count++;
        if (this.state.days) count++;
        if (this.state.on_sale_only) count++;
        if (this.state.has_price_drop) count++;
        if (this.state.active_only) count++;
        return count;
    },

    // ── Internal: sync state to URL and trigger callback ──
    _sync() {
        Utils.setFiltersToUrl(this.state);
        this.render();
        this.renderActiveBadges();
        if (this.onChange) this.onChange();
    },

    // ═══════════════════════════════════════════
    // RENDER METHODS
    // ═══════════════════════════════════════════

    /**
     * Render the entire filter sidebar.
     */
    render() {
        const container = document.getElementById('filter-sidebar-content');
        if (!container) return;

        container.innerHTML = '';

        // Search
        container.appendChild(this._renderSearch());

        // Date range
        container.appendChild(this._renderDateRange());

        // Sort
        container.appendChild(this._renderSort());

        // Toggle switches (on sale, price drop, active only)
        container.appendChild(this._renderToggles());

        // Price range
        container.appendChild(this._renderPriceRange());

        // Discount range
        container.appendChild(this._renderDiscountRange());

        // Sources by category
        if (this.options && this.options.sourcesByCategory) {
            container.appendChild(this._renderSourcesByCategory());
        }

        // Stores, Regions, Brands, Categories — removed.
        // These only apply to one table each (deals, costco, retailer_products)
        // but appeared as global filters, causing broken/confusing results.
    },

    // ── Search input ──
    _renderSearch() {
        const section = this._section('Search');
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'search-input';
        input.placeholder = 'Search products...';
        input.className = 'filter-input';
        input.value = this.state.search || '';
        input.addEventListener('input', Utils.debounce((e) => {
            this.set('search', e.target.value.trim());
        }, 400));
        section.appendChild(input);
        return section;
    },

    // ── Date range with presets ──
    _renderDateRange() {
        const section = this._section('Date Range');

        // Preset buttons
        const presets = document.createElement('div');
        presets.className = 'date-presets';
        const presetList = [
            { label: 'Today', days: 1 },
            { label: '7d', days: 7 },
            { label: '30d', days: 30 },
            { label: 'All', days: null },
        ];
        for (const preset of presetList) {
            const btn = document.createElement('button');
            btn.className = 'preset-btn' + (this.state.days === preset.days ? ' active' : '');
            btn.textContent = preset.label;
            btn.addEventListener('click', () => {
                this.state.date_from = undefined;
                this.state.date_to = undefined;
                this.set('days', preset.days);
            });
            presets.appendChild(btn);
        }
        section.appendChild(presets);

        // Custom date inputs
        const dateRow = document.createElement('div');
        dateRow.className = 'date-row';

        const fromInput = document.createElement('input');
        fromInput.type = 'date';
        fromInput.className = 'filter-input date-input';
        fromInput.value = this.state.date_from || '';
        fromInput.addEventListener('change', (e) => {
            this.state.days = undefined;
            this.set('date_from', e.target.value || undefined);
        });

        const toLabel = document.createElement('span');
        toLabel.textContent = 'to';
        toLabel.className = 'date-separator';

        const toInput = document.createElement('input');
        toInput.type = 'date';
        toInput.className = 'filter-input date-input';
        toInput.value = this.state.date_to || '';
        toInput.addEventListener('change', (e) => {
            this.state.days = undefined;
            this.set('date_to', e.target.value || undefined);
        });

        dateRow.appendChild(fromInput);
        dateRow.appendChild(toLabel);
        dateRow.appendChild(toInput);
        section.appendChild(dateRow);

        return section;
    },

    // ── Sort dropdown ──
    _renderSort() {
        const section = this._section('Sort By');
        const select = document.createElement('select');
        select.className = 'filter-select';
        const options = [
            { value: 'last_seen_at|desc', label: 'Newest First' },
            { value: 'first_seen_at|desc', label: 'Recently Added' },
            { value: 'discount_percent|desc', label: 'Best Discount' },
            { value: 'current_price|asc', label: 'Price: Low to High' },
            { value: 'current_price|desc', label: 'Price: High to Low' },
        ];
        for (const opt of options) {
            const el = document.createElement('option');
            el.value = opt.value;
            el.textContent = opt.label;
            if (`${this.state.sort_by}|${this.state.sort_order}` === opt.value) el.selected = true;
            select.appendChild(el);
        }
        select.addEventListener('change', (e) => {
            const [sortBy, sortOrder] = e.target.value.split('|');
            this.state.sort_by = sortBy;
            this.set('sort_order', sortOrder);
        });
        section.appendChild(select);
        return section;
    },

    // ── Toggle switches ──
    _renderToggles() {
        const section = this._section('Quick Filters');
        const toggles = [
            { key: 'on_sale_only', label: 'On Sale Only' },
            { key: 'has_price_drop', label: 'Has Price Drop' },
            { key: 'active_only', label: 'Active Deals Only' },
        ];
        for (const t of toggles) {
            const row = document.createElement('label');
            row.className = 'toggle-row';

            const toggle = document.createElement('div');
            toggle.className = 'toggle-switch' + (this.state[t.key] ? ' active' : '');
            toggle.addEventListener('click', () => {
                this.set(t.key, !this.state[t.key]);
            });

            const knob = document.createElement('div');
            knob.className = 'toggle-knob';
            toggle.appendChild(knob);

            const label = document.createElement('span');
            label.textContent = t.label;

            row.appendChild(toggle);
            row.appendChild(label);
            section.appendChild(row);
        }
        return section;
    },

    // ── Price range inputs ──
    _renderPriceRange() {
        const section = this._section('Price Range');
        const row = document.createElement('div');
        row.className = 'range-row';

        const minInput = document.createElement('input');
        minInput.type = 'number';
        minInput.className = 'filter-input range-input';
        minInput.placeholder = 'Min $';
        minInput.value = this.state.min_price ?? '';
        minInput.min = '0';
        minInput.step = '0.01';
        minInput.addEventListener('change', (e) => {
            this.set('min_price', e.target.value ? parseFloat(e.target.value) : undefined);
        });

        const sep = document.createElement('span');
        sep.textContent = '—';
        sep.className = 'range-separator';

        const maxInput = document.createElement('input');
        maxInput.type = 'number';
        maxInput.className = 'filter-input range-input';
        maxInput.placeholder = 'Max $';
        maxInput.value = this.state.max_price ?? '';
        maxInput.min = '0';
        maxInput.step = '0.01';
        maxInput.addEventListener('change', (e) => {
            this.set('max_price', e.target.value ? parseFloat(e.target.value) : undefined);
        });

        row.appendChild(minInput);
        row.appendChild(sep);
        row.appendChild(maxInput);
        section.appendChild(row);
        return section;
    },

    // ── Discount range inputs ──
    _renderDiscountRange() {
        const section = this._section('Discount Range');
        const row = document.createElement('div');
        row.className = 'range-row';

        const minInput = document.createElement('input');
        minInput.type = 'number';
        minInput.className = 'filter-input range-input';
        minInput.placeholder = 'Min %';
        minInput.value = this.state.min_discount ?? '';
        minInput.min = '0';
        minInput.max = '100';
        minInput.addEventListener('change', (e) => {
            this.set('min_discount', e.target.value ? parseInt(e.target.value) : undefined);
        });

        const sep = document.createElement('span');
        sep.textContent = '—';
        sep.className = 'range-separator';

        const maxInput = document.createElement('input');
        maxInput.type = 'number';
        maxInput.className = 'filter-input range-input';
        maxInput.placeholder = 'Max %';
        maxInput.value = this.state.max_discount ?? '';
        maxInput.min = '0';
        maxInput.max = '100';
        maxInput.addEventListener('change', (e) => {
            this.set('max_discount', e.target.value ? parseInt(e.target.value) : undefined);
        });

        row.appendChild(minInput);
        row.appendChild(sep);
        row.appendChild(maxInput);
        section.appendChild(row);
        return section;
    },

    // ── Sources by category — organized by scraper type ──
    _renderSourcesByCategory() {
        const section = this._section('Sources');
        const cats = this.options.sourcesByCategory;

        const groups = [
            { label: 'Amazon', items: cats.amazon || [] },
            { label: 'Deal Aggregators', items: cats.dealAggregators || [] },
            { label: 'Store Scrapers', items: cats.storeScrapers || [] },
            { label: 'Costco Trackers', items: cats.costcoTrackers || [] },
        ];

        for (const group of groups) {
            if (group.items.length === 0) continue;

            const groupLabel = document.createElement('div');
            groupLabel.className = 'source-group-label';
            groupLabel.textContent = group.label;
            section.appendChild(groupLabel);

            for (const item of group.items) {
                const row = document.createElement('label');
                row.className = 'checkbox-row';

                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = this.state.sources.includes(item.value);
                cb.addEventListener('change', () => this.toggle('sources', item.value));

                const text = document.createElement('span');
                text.textContent = item.label;

                row.appendChild(cb);
                row.appendChild(text);
                section.appendChild(row);
            }
        }

        return section;
    },

    // ── Generic searchable checkbox list (stores, regions, brands, categories) ──
    _renderCheckboxList(title, key, options, showCount = 5, searchable = false) {
        const section = this._section(title);
        let visibleOptions = options;
        let showAll = false;
        let searchTerm = '';

        const render = () => {
            // Clear previous items (keep section header)
            while (section.children.length > 1) {
                section.removeChild(section.lastChild);
            }

            // Search input for searchable lists
            if (searchable) {
                const searchInput = document.createElement('input');
                searchInput.type = 'text';
                searchInput.className = 'filter-input filter-search';
                searchInput.placeholder = `Search ${title.toLowerCase()}...`;
                searchInput.value = searchTerm;
                searchInput.addEventListener('input', (e) => {
                    searchTerm = e.target.value.toLowerCase();
                    render();
                });
                section.appendChild(searchInput);
            }

            // Filter options by search term
            let filtered = searchTerm
                ? options.filter(o => o.label.toLowerCase().includes(searchTerm) || o.value.toLowerCase().includes(searchTerm))
                : options;

            const displayed = showAll ? filtered : filtered.slice(0, showCount);

            for (const opt of displayed) {
                const row = document.createElement('label');
                row.className = 'checkbox-row';

                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = (this.state[key] || []).includes(opt.value);
                cb.addEventListener('change', () => this.toggle(key, opt.value));

                const text = document.createElement('span');
                text.textContent = opt.label;

                row.appendChild(cb);
                row.appendChild(text);
                section.appendChild(row);
            }

            // Show more/less toggle
            if (filtered.length > showCount) {
                const toggle = document.createElement('button');
                toggle.className = 'show-more-btn';
                toggle.textContent = showAll ? 'Show Less' : `+${filtered.length - showCount} more`;
                toggle.addEventListener('click', () => {
                    showAll = !showAll;
                    render();
                });
                section.appendChild(toggle);
            }
        };

        render();
        return section;
    },

    // ── Active filter badges (shown above product table) ──
    renderActiveBadges() {
        const container = document.getElementById('active-filters');
        if (!container) return;

        const count = this.activeCount();
        if (count === 0) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        container.innerHTML = '';

        // Individual filter badges
        const badges = [];
        if (this.state.sources.length) badges.push({ key: 'sources', label: `Sources: ${this.state.sources.length}` });
        if (this.state.search) badges.push({ key: 'search', label: `"${Utils.truncate(this.state.search, 20)}"` });
        if (this.state.min_discount !== undefined) badges.push({ key: 'min_discount', label: `${this.state.min_discount}%+ off` });
        if (this.state.max_discount !== undefined) badges.push({ key: 'max_discount', label: `<${this.state.max_discount}% off` });
        if (this.state.min_price !== undefined) badges.push({ key: 'min_price', label: `$${this.state.min_price}+` });
        if (this.state.max_price !== undefined) badges.push({ key: 'max_price', label: `Under $${this.state.max_price}` });
        if (this.state.date_from) badges.push({ key: 'date_from', label: `From ${this.state.date_from}` });
        if (this.state.date_to) badges.push({ key: 'date_to', label: `Until ${this.state.date_to}` });
        if (this.state.days) badges.push({ key: 'days', label: `Last ${this.state.days}d` });
        if (this.state.on_sale_only) badges.push({ key: 'on_sale_only', label: 'On Sale' });
        if (this.state.has_price_drop) badges.push({ key: 'has_price_drop', label: 'Price Drop' });
        if (this.state.active_only) badges.push({ key: 'active_only', label: 'Active Only' });

        for (const badge of badges) {
            const el = document.createElement('span');
            el.className = 'filter-badge';
            el.innerHTML = `${Utils.escapeHtml(badge.label)} <button class="badge-clear" title="Clear">&times;</button>`;
            el.querySelector('.badge-clear').addEventListener('click', () => this.clear(badge.key));
            container.appendChild(el);
        }

        // Clear all button
        if (badges.length > 1) {
            const clearAll = document.createElement('button');
            clearAll.className = 'clear-all-btn';
            clearAll.textContent = 'Clear All';
            clearAll.addEventListener('click', () => this.clearAll());
            container.appendChild(clearAll);
        }
    },

    // ── Helper: create a collapsible filter section ──
    _section(title) {
        const section = document.createElement('div');
        section.className = 'filter-section';

        const header = document.createElement('div');
        header.className = 'filter-section-header';
        header.textContent = title;
        section.appendChild(header);

        return section;
    },
};
