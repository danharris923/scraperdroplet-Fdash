/**
 * utils.js — Pure helper functions for the Deal Viewer frontend.
 * No DOM manipulation, no state — just formatting, parsing, and logging.
 */

const Utils = {

    // ── Price formatting ──────────────────────
    formatPrice(price) {
        if (price === null || price === undefined) return '—';
        return `$${parseFloat(price).toFixed(2)}`;
    },

    // ── Large number formatting (1234 → "1,234") ──
    formatNumber(num) {
        if (num === null || num === undefined) return '0';
        return Number(num).toLocaleString();
    },

    // ── Relative time ("2 hours ago", "3 days ago") ──
    timeAgo(dateStr) {
        if (!dateStr) return 'Unknown';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHr = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHr / 24);

        if (diffSec < 60) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHr < 24) return `${diffHr}h ago`;
        if (diffDay < 30) return `${diffDay}d ago`;
        if (diffDay < 365) return `${Math.floor(diffDay / 30)}mo ago`;
        return `${Math.floor(diffDay / 365)}y ago`;
    },

    // ── Format a date as "Feb 17, 2026" ──
    formatDate(dateStr) {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    },

    // ── Format a date as "Feb 17, 2026 2:30 PM" ──
    formatDateTime(dateStr) {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit'
        });
    },

    // ── Debounce function — delays execution until pause in calls ──
    debounce(fn, delayMs) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delayMs);
        };
    },

    // ── HTML-escape to prevent XSS ──
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // ── URL param sync — read filters from URL hash ──
    getFiltersFromUrl() {
        const params = new URLSearchParams(window.location.hash.slice(1));
        const filters = {};
        for (const [key, value] of params.entries()) {
            // Convert comma-separated values to arrays for multi-value params
            if (['sources', 'stores', 'regions', 'brands', 'categories'].includes(key)) {
                filters[key] = value.split(',').filter(Boolean);
            } else if (['on_sale_only', 'has_price_drop', 'active_only'].includes(key)) {
                filters[key] = value === 'true';
            } else if (['min_discount', 'max_discount', 'page', 'per_page', 'days'].includes(key)) {
                filters[key] = parseInt(value) || undefined;
            } else if (['min_price', 'max_price'].includes(key)) {
                filters[key] = parseFloat(value) || undefined;
            } else {
                filters[key] = value;
            }
        }
        return filters;
    },

    // ── URL param sync — write filters to URL hash (bookmarkable) ──
    setFiltersToUrl(filters) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(filters)) {
            if (value === undefined || value === null || value === '' || value === false) continue;
            if (Array.isArray(value)) {
                if (value.length > 0) params.set(key, value.join(','));
            } else {
                params.set(key, String(value));
            }
        }
        const hash = params.toString();
        // Only update if changed, to avoid extra history entries
        if (window.location.hash.slice(1) !== hash) {
            window.location.hash = hash;
        }
    },

    // ── Discount color tier — returns CSS class name ──
    discountTier(percent) {
        if (!percent || percent <= 0) return '';
        if (percent >= 75) return 'discount-legendary';
        if (percent >= 50) return 'discount-epic';
        if (percent >= 25) return 'discount-good';
        return 'discount-ok';
    },

    // ── Source display name — matches SOURCE_LABELS in config.py ──
    sourceLabel(source) {
        const labels = {
            'rfd': 'RedFlagDeals', 'yepsavings': 'YepSavings', 'flipp': 'Flipp Flyers',
            'amazon_ca': 'Amazon.ca Deals', 'amazon': 'Amazon Price Tracker',
            'cabelas_ca': "Cabela's Canada", 'frank_and_oak': 'Frank & Oak', 'leons': "Leon's",
            'mastermind_toys': 'Mastermind Toys', 'reebok_ca': 'Reebok Canada',
            'the_brick': 'The Brick',
            'cocowest': 'CocoWest (Canada)', 'warehouse_runner': 'WarehouseRunner (USA)',
            'cocopricetracker': 'CocoPriceTracker',
        };
        return labels[source] || source;
    },

    // ── Truncate long strings ──
    truncate(str, maxLen = 60) {
        if (!str || str.length <= maxLen) return str || '';
        return str.substring(0, maxLen) + '...';
    },

    // ── CSS-styled console logging (colored, labeled, timestamped) ──
    log: {
        info(label, ...data) {
            console.log(
                `%c[INFO]%c ${label}`,
                'background:#0ea5e9;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold',
                'color:#0ea5e9;font-weight:bold',
                ...data
            );
        },
        success(label, ...data) {
            console.log(
                `%c[OK]%c ${label}`,
                'background:#22c55e;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold',
                'color:#22c55e;font-weight:bold',
                ...data
            );
        },
        warn(label, ...data) {
            console.warn(
                `%c[WARN]%c ${label}`,
                'background:#f59e0b;color:#000;padding:2px 6px;border-radius:3px;font-weight:bold',
                'color:#f59e0b;font-weight:bold',
                ...data
            );
        },
        error(label, ...data) {
            console.error(
                `%c[ERR]%c ${label}`,
                'background:#ef4444;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold',
                'color:#ef4444;font-weight:bold',
                ...data
            );
        },
        timing(label, ms) {
            const color = ms < 500 ? '#22c55e' : ms < 2000 ? '#f59e0b' : '#ef4444';
            console.log(
                `%c[TIME]%c ${label}: ${Math.round(ms)}ms`,
                `background:${color};color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold`,
                `color:${color};font-weight:bold`
            );
        },
    },
};
