export interface ScraperStatus {
  name: string
  type: 'browser' | 'shopify' | 'api' | 'rss' | 'pipeline'
  timer_enabled: boolean
  last_run: string | null
  next_run: string | null
  last_status: 'success' | 'failed' | 'running'
  last_duration_seconds: number | null
  items_found: number | null
  items_new: number | null
  items_updated: number | null
  errors: number | null
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical'
  uptime_seconds: number
  cpu_percent: number
  memory_percent: number
  disk_percent: number
  disk_used_gb: number
  disk_total_gb: number
  network_rx_bytes: number
  network_tx_bytes: number
}

export interface Product {
  id: string
  title: string
  brand: string | null
  store: string
  source: string
  image_url: string | null
  current_price: number | null
  original_price: number | null
  discount_percent: number | null
  category: string | null
  region: string | null
  affiliate_url: string
  is_active: boolean
  first_seen_at: string
  last_seen_at: string
}

export interface PricePoint {
  price: number
  original_price: number | null
  scraped_at: string
  is_on_sale: boolean
}

export interface CostcoDanPost {
  id: string
  title: string
  image_url: string
  posted_at: string | null
  facebook_url: string | null
  viral_score: number
}

export interface ProductFilters {
  sources: string[]
  stores: string[]
  regions: string[]
  categories: string[]
  minDiscount: number | null
  maxPrice: number | null
  search: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  page: number
  limit: number
}

export interface DashboardStats {
  totalProducts: number
  newToday: number
  activeScrapers: number
  errorCount: number
}

export interface ProductStats {
  total: number
  active: number
  newToday: number
  onSale: number
}

export interface ProductsResponse {
  products: Product[]
  total: number
  page: number
  limit: number
  stats?: ProductStats
}

export interface ProductDetail extends Product {
  price_history: PricePoint[]
  description?: string
}

export interface SimilarProduct extends Product {
  similarity_score: number
  match_reason: string
}
