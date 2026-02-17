"""
config.py -- Supabase REST client, table definitions, and colorful logging helpers.
Uses httpx directly to talk to the Supabase PostgREST API (avoids supabase-py key validation issues).
All shared configuration lives here so app.py stays focused on routes.
"""

import os
import time
import json
import functools
from datetime import datetime

from dotenv import load_dotenv
import httpx
from colorama import init, Fore, Style

# -----------------------------------------------
# Initialize colorama for Windows terminal colors
# -----------------------------------------------
init(autoreset=True)

# -----------------------------------------------
# Load environment variables
# -----------------------------------------------
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
DROPLET_API_URL = os.getenv("DROPLET_API_URL", "http://146.190.240.167:8080")
FLASK_PORT = int(os.getenv("FLASK_PORT", "5000"))
FLASK_DEBUG = os.getenv("FLASK_DEBUG", "true").lower() == "true"


# -----------------------------------------------
# Supabase REST Client
# Talks directly to PostgREST API at {SUPABASE_URL}/rest/v1/
# This avoids the supabase-py library's key format validation issues.
# -----------------------------------------------
class SupabaseREST:
    """
    Lightweight Supabase PostgREST client using httpx.
    Supports select, insert, filter, ordering, and pagination.
    Mirrors the supabase-js query builder pattern.
    """

    def __init__(self, url, key):
        self.base_url = f"{url.rstrip('/')}/rest/v1"
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        self._client = httpx.Client(timeout=30.0)

    def table(self, table_name):
        """Start a query builder for the given table."""
        return QueryBuilder(self, table_name)

    def close(self):
        self._client.close()

    def _request(self, method, path, params=None, headers=None, json_data=None):
        """Make an HTTP request to the PostgREST API."""
        url = f"{self.base_url}/{path}"
        merged_headers = {**self.headers}
        if headers:
            merged_headers.update(headers)
        resp = self._client.request(method, url, params=params, headers=merged_headers, json=json_data)
        resp.raise_for_status()
        return resp


class QueryResult:
    """Result of a Supabase query -- holds data and optional count."""
    def __init__(self, data=None, count=None, error=None):
        self.data = data or []
        self.count = count
        self.error = error


class QueryBuilder:
    """
    Chainable query builder that mirrors the supabase-js API.
    Usage: sb.table("deals").select("*").eq("id", 123).limit(10).execute()
    """

    def __init__(self, client, table_name):
        self._client = client
        self._table = table_name
        self._select_cols = "*"
        self._filters = []        # list of (column, operator, value) tuples
        self._order_col = None
        self._order_desc = False
        self._limit_val = None
        self._offset_val = None
        self._count_only = False   # HEAD request for count
        self._count_mode = None    # "exact" to get count with data

    def select(self, columns="*", count=None):
        self._select_cols = columns
        if count == "exact":
            self._count_mode = "exact"
        return self

    # -- Filter methods (chainable) --

    def eq(self, col, value):
        self._filters.append((col, "eq", value))
        return self

    def neq(self, col, value):
        self._filters.append((col, "neq", value))
        return self

    def gt(self, col, value):
        self._filters.append((col, "gt", value))
        return self

    def gte(self, col, value):
        self._filters.append((col, "gte", value))
        return self

    def lt(self, col, value):
        self._filters.append((col, "lt", value))
        return self

    def lte(self, col, value):
        self._filters.append((col, "lte", value))
        return self

    def ilike(self, col, pattern):
        self._filters.append((col, "ilike", pattern))
        return self

    def in_(self, col, values):
        """Filter where column value is in a list of values."""
        self._filters.append((col, "in", values))
        return self

    def is_(self, col, value):
        """Filter where column is null/not null."""
        self._filters.append((col, "is", value))
        return self

    def contains(self, col, value):
        """Filter where JSONB column contains the given object."""
        self._filters.append((col, "cs", value))
        return self

    def not_contains(self, col, value):
        """Filter where JSONB column does NOT contain the given object."""
        self._filters.append((col, "not.cs", value))
        return self

    def not_is(self, col, value):
        """Filter where column is NOT null."""
        self._filters.append((col, "not.is", value))
        return self

    # -- Ordering and pagination --

    def order(self, col, desc=False):
        self._order_col = col
        self._order_desc = desc
        return self

    def limit(self, n):
        self._limit_val = n
        return self

    def offset(self, n):
        self._offset_val = n
        return self

    def single(self):
        """Execute and return a single row (or None)."""
        self._limit_val = 1
        result = self.execute()
        if result.data:
            result.data = result.data[0]
        else:
            result.data = None
        return result

    # -- Execute --

    def execute(self):
        """Build and execute the PostgREST query."""
        params = {"select": self._select_cols}

        # Apply filters as PostgREST query params
        for col, op, value in self._filters:
            if op == "in":
                # PostgREST in: column=in.(val1,val2,val3)
                vals = ",".join(str(v) for v in value)
                params[col] = f"in.({vals})"
            elif op == "cs":
                # Contains (JSONB): column=cs.{"key":"value"}
                params[col] = f"cs.{json.dumps(value)}"
            elif op == "not.cs":
                # Not contains: column=not.cs.{"key":"value"}
                params[col] = f"not.cs.{json.dumps(value)}"
            elif op == "is":
                params[col] = f"is.{value}"
            elif op == "not.is":
                params[col] = f"not.is.{value}"
            elif op == "ilike":
                params[col] = f"ilike.{value}"
            else:
                # eq, neq, gt, gte, lt, lte
                params[col] = f"{op}.{value}"

        # Ordering
        if self._order_col:
            direction = "desc" if self._order_desc else "asc"
            params["order"] = f"{self._order_col}.{direction}.nullslast"

        # Pagination
        extra_headers = {}
        if self._limit_val is not None:
            # Use Range header for proper PostgREST pagination
            start = self._offset_val or 0
            end = start + self._limit_val - 1
            extra_headers["Range"] = f"{start}-{end}"
            extra_headers["Range-Unit"] = "items"

        # Request count if needed
        if self._count_mode == "exact":
            extra_headers["Prefer"] = "count=exact"

        try:
            resp = self._client._request("GET", self._table, params=params, headers=extra_headers)

            # Parse count from Content-Range header (e.g. "0-9/1234")
            count = None
            content_range = resp.headers.get("Content-Range", "")
            if "/" in content_range:
                total_part = content_range.split("/")[-1]
                if total_part != "*":
                    try:
                        count = int(total_part)
                    except ValueError:
                        pass

            data = resp.json() if resp.content else []
            return QueryResult(data=data, count=count)
        except httpx.HTTPStatusError as e:
            log_error(f"Supabase query error on '{self._table}': {e.response.status_code} {e.response.text[:200]}")
            return QueryResult(error=str(e))
        except Exception as e:
            log_error(f"Supabase request failed for '{self._table}': {e}")
            return QueryResult(error=str(e))


# -----------------------------------------------
# Global Supabase REST client (singleton)
# -----------------------------------------------
_supabase_client = None


def get_supabase():
    """Get or create the Supabase REST client."""
    global _supabase_client
    if _supabase_client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
        _supabase_client = SupabaseREST(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        log_success(f"Supabase REST client initialized: {SUPABASE_URL}")
    return _supabase_client


# -----------------------------------------------
# Deal tables config
# source=None means source comes from the data itself (e.g. 'deals' table has a source column)
# -----------------------------------------------
DEAL_TABLES = [
    {"name": "deals",                  "source": None,              "date_col": "date_added",   "title_col": "title", "store_col": "store"},
    {"name": "amazon_ca_deals",        "source": "amazon_ca",       "date_col": "created_at",   "title_col": "title", "store_col": "store"},
    {"name": "cabelas_ca_deals",       "source": "cabelas_ca",      "date_col": "created_at",   "title_col": "title", "store_col": "store"},
    {"name": "frank_and_oak_deals",    "source": "frank_and_oak",   "date_col": "created_at",   "title_col": "title", "store_col": "store"},
    {"name": "leons_deals",            "source": "leons",           "date_col": "created_at",   "title_col": "title", "store_col": "store"},
    {"name": "mastermind_toys_deals",  "source": "mastermind_toys", "date_col": "created_at",   "title_col": "title", "store_col": "store"},
    {"name": "reebok_ca_deals",        "source": "reebok_ca",       "date_col": "created_at",   "title_col": "title", "store_col": "store"},
    {"name": "the_brick_deals",        "source": "the_brick",       "date_col": "created_at",   "title_col": "title", "store_col": "store"},
    {"name": "yepsavings_deals",       "source": "yepsavings",      "date_col": "created_date", "title_col": "title", "store_col": "store_name"},
]

# Source display names for human-readable labels
SOURCE_LABELS = {
    "rfd": "RedFlagDeals",
    "amazon": "Amazon (Keepa)",
    "amazon_ca": "Amazon CA",
    "cabelas_ca": "Cabela's",
    "frank_and_oak": "Frank And Oak",
    "leons": "Leon's",
    "mastermind_toys": "Mastermind Toys",
    "reebok_ca": "Reebok CA",
    "the_brick": "The Brick",
    "yepsavings": "YepSavings",
    "cocowest": "CocoWest (Canada)",
    "warehouse_runner": "WarehouseRunner (USA)",
    "cocopricetracker": "CocoPriceTracker",
    "flipp": "Flipp",
    "retailer": "Retailer",
}


# -----------------------------------------------
# Colorful logging helpers
# Each prints a timestamped, color-coded message to the console
# -----------------------------------------------
def _timestamp():
    """Current time formatted for log output."""
    return datetime.now().strftime("%H:%M:%S.%f")[:-3]


def log_success(msg):
    """Green -- operation completed successfully."""
    print(f"{Fore.GREEN}[OK {_timestamp()}]{Style.RESET_ALL} {msg}")


def log_warning(msg):
    """Yellow -- non-fatal issue."""
    print(f"{Fore.YELLOW}[WARN {_timestamp()}]{Style.RESET_ALL} {msg}")


def log_error(msg):
    """Red -- something failed."""
    print(f"{Fore.RED}[ERR {_timestamp()}]{Style.RESET_ALL} {msg}")


def log_info(msg):
    """Cyan -- general status update."""
    print(f"{Fore.CYAN}[>> {_timestamp()}]{Style.RESET_ALL} {msg}")


def log_debug(msg):
    """Dim debug -- verbose detail."""
    print(f"{Fore.WHITE}{Style.DIM}[.. {_timestamp()}] {msg}{Style.RESET_ALL}")


def log_timing(label, start_time):
    """Log elapsed time since start_time in milliseconds."""
    elapsed_ms = (time.time() - start_time) * 1000
    color = Fore.GREEN if elapsed_ms < 500 else Fore.YELLOW if elapsed_ms < 2000 else Fore.RED
    print(f"{color}[TIME {_timestamp()}]{Style.RESET_ALL} {label}: {elapsed_ms:.0f}ms")
    return elapsed_ms


# -----------------------------------------------
# Timing decorator for route handlers
# -----------------------------------------------
def timed(label=None):
    """Decorator that logs execution time of a function."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            route_label = label or func.__name__
            start = time.time()
            log_info(f">> {route_label}")
            try:
                result = func(*args, **kwargs)
                log_timing(route_label, start)
                return result
            except Exception as e:
                log_error(f"{route_label} failed: {e}")
                raise
        return wrapper
    return decorator


# -----------------------------------------------
# Simple in-memory cache with TTL
# -----------------------------------------------
class SimpleCache:
    """Dead-simple in-memory cache with per-key TTL."""

    def __init__(self):
        self._store = {}  # key -> (value, expires_at)

    def get(self, key):
        """Return cached value if not expired, else None."""
        if key in self._store:
            value, expires_at = self._store[key]
            if time.time() < expires_at:
                log_debug(f"Cache HIT: {key}")
                return value
            else:
                del self._store[key]
                log_debug(f"Cache EXPIRED: {key}")
        return None

    def set(self, key, value, ttl_seconds):
        """Store a value with a TTL in seconds."""
        self._store[key] = (value, time.time() + ttl_seconds)
        log_debug(f"Cache SET: {key} (TTL={ttl_seconds}s)")

    def invalidate(self, key=None):
        """Clear one key, or all keys if key is None."""
        if key is None:
            self._store.clear()
            log_debug("Cache CLEARED (all)")
        elif key in self._store:
            del self._store[key]
            log_debug(f"Cache INVALIDATED: {key}")


# Global cache instance
cache = SimpleCache()
