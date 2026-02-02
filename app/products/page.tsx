"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Search,
  ShoppingBag,
  Filter,
  ExternalLink,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  Package,
  Clock,
  Tag,
  Activity,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useProducts, useProductDetail } from "@/hooks/useProducts"
import type { Product, ProductDetail } from "@/types"

interface FilterOption {
  value: string
  label: string
}

interface FilterOptions {
  sources: FilterOption[]
  sourcesByCategory: {
    aggregators: FilterOption[]
    retailers: FilterOption[]
    costcoTrackers: FilterOption[]
  }
  stores: FilterOption[]
  regions: FilterOption[]
  counts: {
    sources: number
    stores: number
    regions: number
    totalProducts: number
    byCategory: {
      aggregators: number
      retailers: number
      costcoTrackers: number
    }
  }
}

const DISCOUNTS = [
  { value: 10, label: '10% or more' },
  { value: 25, label: '25% or more' },
  { value: 50, label: '50% or more' },
  { value: 75, label: '75% or more' },
]

const FRESHNESS = [
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'all', label: 'All Time' },
]

const DEAL_STATUS = [
  { value: 'active', label: 'Active Deals' },
  { value: 'expired', label: 'Expired Deals' },
  { value: 'all', label: 'All Deals' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'discount_desc', label: 'Best Discount' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
]

const PRICE_RANGES = [
  { value: 'under25', label: 'Under $25', min: 0, max: 25 },
  { value: '25to50', label: '$25 - $50', min: 25, max: 50 },
  { value: '50to100', label: '$50 - $100', min: 50, max: 100 },
  { value: '100to250', label: '$100 - $250', min: 100, max: 250 },
  { value: 'over250', label: 'Over $250', min: 250, max: null },
]

// Collapsible filter section component (Newegg-style)
function FilterSection({
  title,
  children,
  defaultExpanded = true,
}: {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border-b border-slate-700 pb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full py-2 text-left hover:text-cyan-400 "
      >
        <span className="text-sm font-medium text-slate-300">{title}</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-slate-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-500" />
        )}
      </button>
      {isExpanded && <div className="mt-2">{children}</div>}
    </div>
  )
}

// Filter list with "Show More" functionality
function FilterList({
  options,
  selectedValues,
  onToggle,
  initialShowCount = 5,
}: {
  options: FilterOption[]
  selectedValues: string[]
  onToggle: (value: string) => void
  initialShowCount?: number
}) {
  const [showAll, setShowAll] = useState(false)
  const displayedOptions = showAll ? options : options.slice(0, initialShowCount)
  const hasMore = options.length > initialShowCount

  return (
    <div className="space-y-1">
      {displayedOptions.map((option) => (
        <div
          key={option.value}
          className="flex items-center space-x-2 py-1 hover:bg-slate-800 rounded px-1 -mx-1 cursor-pointer"
          onClick={() => onToggle(option.value)}
        >
          <Checkbox
            id={`filter-${option.value}`}
            checked={selectedValues.includes(option.value)}
            onCheckedChange={() => onToggle(option.value)}
            className="border-slate-600 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
          />
          <Label
            htmlFor={`filter-${option.value}`}
            className="text-sm text-slate-300 cursor-pointer flex-1 select-none"
          >
            {option.label}
          </Label>
        </div>
      ))}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-cyan-400 hover:text-cyan-300 mt-2 flex items-center gap-1"
        >
          {showAll ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show More ({options.length - initialShowCount} more)
            </>
          )}
        </button>
      )}
    </div>
  )
}

function PriceHistoryChart({ priceHistory }: { priceHistory: ProductDetail['price_history'] }) {
  if (!priceHistory || priceHistory.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-slate-500">
        No price history available
      </div>
    )
  }

  const prices = priceHistory.map(p => p.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const range = maxPrice - minPrice || 1

  // If only one data point, still show it
  if (priceHistory.length === 1) {
    const point = priceHistory[0]
    return (
      <div className="space-y-2">
        <div className="h-32 flex items-center justify-center bg-slate-800 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">${point.price.toFixed(2)}</div>
            <div className="text-xs text-slate-500 mt-1">
              {new Date(point.scraped_at).toLocaleDateString()}
            </div>
            {point.is_on_sale && (
              <Badge className="mt-2 bg-green-500/20 text-green-400 border-green-500/30">On Sale</Badge>
            )}
          </div>
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>Current Price</span>
          <span>{point.original_price && point.original_price > point.price ? `Was $${point.original_price.toFixed(2)}` : ''}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="h-32 relative bg-slate-800 rounded-lg p-2">
        <svg className="w-full h-full" viewBox={`0 0 ${priceHistory.length * 40} 100`} preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1="0" y1="25" x2={priceHistory.length * 40} y2="25" stroke="#334155" strokeWidth="0.5" strokeDasharray="2" />
          <line x1="0" y1="50" x2={priceHistory.length * 40} y2="50" stroke="#334155" strokeWidth="0.5" strokeDasharray="2" />
          <line x1="0" y1="75" x2={priceHistory.length * 40} y2="75" stroke="#334155" strokeWidth="0.5" strokeDasharray="2" />

          {/* Price line */}
          <polyline
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2"
            points={priceHistory.map((p, i) => {
              const x = (i / (priceHistory.length - 1)) * (priceHistory.length * 40 - 20) + 10
              const y = 90 - ((p.price - minPrice) / range) * 80
              return `${x},${y}`
            }).join(' ')}
          />

          {/* Area fill */}
          <polygon
            fill="url(#gradient)"
            opacity="0.3"
            points={`10,90 ${priceHistory.map((p, i) => {
              const x = (i / (priceHistory.length - 1)) * (priceHistory.length * 40 - 20) + 10
              const y = 90 - ((p.price - minPrice) / range) * 80
              return `${x},${y}`
            }).join(' ')} ${priceHistory.length * 40 - 10},90`}
          />

          {/* Data points */}
          {priceHistory.map((p, i) => {
            const x = (i / (priceHistory.length - 1)) * (priceHistory.length * 40 - 20) + 10
            const y = 90 - ((p.price - minPrice) / range) * 80
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3"
                fill={p.is_on_sale ? "#22c55e" : "#22d3ee"}
                stroke="#0f172a"
                strokeWidth="1"
              />
            )
          })}

          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{new Date(priceHistory[0].scraped_at).toLocaleDateString()}</span>
        <span>Low: ${minPrice.toFixed(2)} | High: ${maxPrice.toFixed(2)}</span>
        <span>{new Date(priceHistory[priceHistory.length - 1].scraped_at).toLocaleDateString()}</span>
      </div>
    </div>
  )
}

function ProductDetailModal({
  productId,
  isOpen,
  onClose
}: {
  productId: string | null
  isOpen: boolean
  onClose: () => void
}) {
  const { data: product, isLoading } = useProductDetail(productId)

  // Format source name for display
  const formatSource = (source: string) => {
    const sourceNames: Record<string, string> = {
      'cocowest': 'CocoWest (Canada)',
      'warehouse_runner': 'WarehouseRunner (USA)',
      'cocopricetracker': 'CocoPriceTracker',
      'rfd': 'RedFlagDeals',
      'amazon_ca': 'Amazon CA',
      'cabelas_ca': "Cabela's",
      'frank_and_oak': 'Frank And Oak',
      'leons': "Leon's",
      'mastermind_toys': 'Mastermind Toys',
      'reebok_ca': 'Reebok CA',
      'the_brick': 'The Brick',
    }
    return sourceNames[source] || source
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          </div>
        ) : product ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-slate-100 pr-8">{product.title}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Product Image and Info */}
              <div className="flex gap-4">
                <div className="w-32 h-32 bg-slate-800 rounded-lg flex-shrink-0 overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="h-12 w-12 text-slate-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                      {formatSource(product.source)}
                    </Badge>
                    <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-600/50">
                      {product.store}
                    </Badge>
                    {product.region && (
                      <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                        {product.region}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-cyan-400">${(product.current_price ?? 0).toFixed(2)}</span>
                    {product.original_price && product.original_price > (product.current_price ?? 0) && (
                      <span className="text-lg text-slate-500 line-through">${(product.original_price ?? 0).toFixed(2)}</span>
                    )}
                    {(product.discount_percent ?? 0) > 0 && (
                      <Badge className={`${(product.discount_percent ?? 0) >= 30 ? 'bg-red-500/90' : 'bg-amber-500/90'} text-white`}>
                        -{product.discount_percent}%
                      </Badge>
                    )}
                  </div>
                  {product.brand && (
                    <div className="text-sm text-slate-400">
                      Brand: <span className="text-slate-300">{product.brand}</span>
                    </div>
                  )}
                  {product.category && (
                    <div className="text-sm text-slate-400">
                      Category: <span className="text-slate-300">{product.category}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="text-slate-500 text-xs mb-1">First Seen</div>
                  <div className="text-slate-300">
                    {new Date(product.first_seen_at).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric'
                    })}
                  </div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="text-slate-500 text-xs mb-1">Last Updated</div>
                  <div className="text-slate-300">
                    {new Date(product.last_seen_at).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric'
                    })}
                  </div>
                </div>
                {product.description && (
                  <div className="col-span-2 bg-slate-800 rounded-lg p-3">
                    <div className="text-slate-500 text-xs mb-1">Details</div>
                    <div className="text-slate-300">{product.description}</div>
                  </div>
                )}
              </div>

              {/* Price History / Price Tracker */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan-500" />
                  Price Tracker
                  <Badge variant="outline" className="bg-slate-800 text-slate-400 border-slate-600/50 text-xs">
                    {product.price_history?.length || 1} data point{(product.price_history?.length || 1) !== 1 ? 's' : ''}
                  </Badge>
                </h4>
                <PriceHistoryChart priceHistory={product.price_history} />
              </div>

              {/* Action Button */}
              <a href={product.affiliate_url} target="_blank" rel="noopener noreferrer" className="block">
                <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Deal at {product.store}
                </Button>
              </a>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-slate-400">
            Product not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function formatLargeNumber(num: number): string {
  // Only abbreviate for truly massive numbers (billions+)
  if (num >= 1e12) return (num / 1e12).toFixed(1).replace(/\.0$/, '') + 'T'
  if (num >= 1e9) return (num / 1e9).toFixed(1).replace(/\.0$/, '') + 'B'
  // Show full number with commas for anything under a billion
  return num.toLocaleString()
}

function StatCard({
  icon: Icon,
  label,
  value,
  color
}: {
  icon: any
  label: string
  value: number
  color: string
}) {
  const colorClasses: Record<string, string> = {
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${colorClasses[color]}`}>
      <Icon className={`h-5 w-5 ${color === 'cyan' ? 'text-cyan-400' : color === 'green' ? 'text-green-400' : color === 'purple' ? 'text-purple-400' : 'text-amber-400'}`} />
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-lg font-bold text-slate-100" title={value.toLocaleString()}>{formatLargeNumber(value)}</div>
      </div>
    </div>
  )
}

function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  // Format source for display
  const formatSource = (source: string) => {
    const sourceNames: Record<string, string> = {
      'cocowest': 'CocoWest',
      'warehouse_runner': 'WarehouseRunner',
      'cocopricetracker': 'CocoPriceTracker',
      'rfd': 'RFD',
      'amazon_ca': 'Amazon CA',
      'cabelas_ca': "Cabela's",
      'frank_and_oak': 'F&O',
      'leons': "Leon's",
      'mastermind_toys': 'Mastermind',
      'reebok_ca': 'Reebok',
      'the_brick': 'The Brick',
    }
    return sourceNames[source] || source
  }

  const isCostco = ['cocowest', 'warehouse_runner', 'cocopricetracker'].includes(product.source)

  return (
    <Card
      className="bg-slate-900 border-slate-700 hover:border-cyan-500/50 cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="aspect-square bg-slate-800 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
          {product.image_url ? (
            <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <ShoppingBag className="h-12 w-12 text-slate-600" />
          )}
          {(product.discount_percent ?? 0) > 0 && (
            <Badge className={`absolute top-2 right-2 ${(product.discount_percent ?? 0) >= 30 ? 'bg-red-500/90 text-white' : 'bg-amber-500/90 text-white'}`}>
              -{product.discount_percent}%
            </Badge>
          )}
          <Badge
            variant="outline"
            className={`absolute bottom-2 left-2 text-xs ${
              isCostco
                ? 'bg-red-900/80 text-red-300 border-red-600/50'
                : 'bg-slate-900/80 text-slate-300 border-slate-600/50'
            }`}
          >
            {formatSource(product.source)}
          </Badge>
          {product.region && (
            <Badge variant="outline" className="absolute bottom-2 right-2 bg-purple-900/80 text-purple-300 border-purple-600/50 text-xs">
              {product.region}
            </Badge>
          )}
        </div>
        <div className="space-y-2">
          <div className="text-xs text-slate-500">{product.store}</div>
          <h3 className="text-sm font-medium text-slate-200 line-clamp-2 min-h-[2.5rem]">{product.title}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-cyan-400">${(product.current_price ?? 0).toFixed(2)}</span>
            {product.original_price && product.original_price > (product.current_price ?? 0) && (
              <span className="text-sm text-slate-500 line-through">${(product.original_price ?? 0).toFixed(2)}</span>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full mt-2 bg-slate-800 border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50"
            onClick={(e) => {
              e.stopPropagation()
              window.open(product.affiliate_url, '_blank', 'noopener,noreferrer')
            }}
          >
            <ExternalLink className="h-3 w-3 mr-2" />
            View Deal
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Applied filters type - only these are sent to the API
interface AppliedFilters {
  search: string
  sources: string[]
  stores: string[]
  regions: string[]
  minDiscount: number | null
  priceRange: string | null
  sortBy: string
}

export default function ProductsPage() {
  const router = useRouter()
  // Pending filter states (UI state, not yet applied)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [selectedStores, setSelectedStores] = useState<string[]>([])
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [minDiscount, setMinDiscount] = useState<number | null>(null)
  const [priceRange, setPriceRange] = useState<string | null>(null)
  const [freshness, setFreshness] = useState<string>('all')
  const [dealStatus, setDealStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [page, setPage] = useState(1)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [filterLoading, setFilterLoading] = useState(true)
  const itemsPerPage = 24

  // Applied filters - only updated when "Apply Filters" is clicked
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(null)

  // Fetch filter options from API
  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        const res = await fetch('/api/filter-options')
        const data = await res.json()
        setFilterOptions(data)
      } catch (err) {
        console.error('Failed to fetch filter options:', err)
      } finally {
        setFilterLoading(false)
      }
    }
    fetchFilterOptions()
  }, [])

  // Parse sort option into sortBy and sortOrder (uses applied filters)
  const getSortParams = () => {
    const sort = appliedFilters?.sortBy || 'newest'
    switch (sort) {
      case 'price_asc': return { sortBy: 'current_price' as const, sortOrder: 'asc' as const }
      case 'price_desc': return { sortBy: 'current_price' as const, sortOrder: 'desc' as const }
      case 'newest': return { sortBy: 'first_seen_at' as const, sortOrder: 'desc' as const }
      default: return { sortBy: 'discount_percent' as const, sortOrder: 'desc' as const }
    }
  }

  // Parse price range into min/max (uses applied filters)
  const getPriceParams = () => {
    const pr = appliedFilters?.priceRange
    if (!pr) return {}
    const range = PRICE_RANGES.find(r => r.value === pr)
    if (!range) return {}
    return { minPrice: range.min, maxPrice: range.max ?? undefined }
  }

  // Apply current filters - this triggers the API call
  const applyFilters = () => {
    setAppliedFilters({
      search: searchQuery,
      sources: selectedSources,
      stores: selectedStores,
      regions: selectedRegions,
      minDiscount,
      priceRange,
      sortBy,
    })
    setPage(1)
  }

  // Check if pending filters differ from applied filters
  const hasPendingChanges = appliedFilters ? (
    searchQuery !== appliedFilters.search ||
    JSON.stringify(selectedSources) !== JSON.stringify(appliedFilters.sources) ||
    JSON.stringify(selectedRegions) !== JSON.stringify(appliedFilters.regions) ||
    minDiscount !== appliedFilters.minDiscount ||
    priceRange !== appliedFilters.priceRange ||
    sortBy !== appliedFilters.sortBy
  ) : (selectedSources.length > 0 || searchQuery || minDiscount !== null)

  const { data, isLoading, error } = useProducts({
    search: appliedFilters?.search || '',
    sources: appliedFilters?.sources || [],
    regions: appliedFilters?.regions || [],
    minDiscount: appliedFilters?.minDiscount ?? null,
    ...getPriceParams(),
    page,
    limit: itemsPerPage,
    ...getSortParams(),
  })

  const products = data?.products || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / itemsPerPage)
  const stats = data?.stats

  const toggleSource = (source: string) => {
    setSelectedSources(prev =>
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    )
  }

  const toggleStore = (store: string) => {
    setSelectedStores(prev =>
      prev.includes(store) ? prev.filter(s => s !== store) : [...prev, store]
    )
  }

  const toggleRegion = (region: string) => {
    setSelectedRegions(prev =>
      prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
    )
  }

  const toggleDiscount = (value: number) => {
    setMinDiscount(prev => prev === value ? null : value)
  }

  const togglePriceRange = (value: string) => {
    setPriceRange(prev => prev === value ? null : value)
  }

  const clearAllFilters = () => {
    setSelectedSources([])
    setSelectedStores([])
    setSelectedRegions([])
    setMinDiscount(null)
    setPriceRange(null)
    setSearchQuery("")
    setAppliedFilters(null)
    setPage(1)
  }

  const hasFilters = selectedSources.length > 0 || selectedStores.length > 0 || selectedRegions.length > 0 || minDiscount !== null || priceRange !== null || !!searchQuery
  const activeFilterCount = selectedSources.length + selectedStores.length + selectedRegions.length + (minDiscount ? 1 : 0) + (priceRange ? 1 : 0)

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="container mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="text-slate-400 hover:text-slate-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-8 w-8 text-cyan-500" />
            <h1 className="text-2xl font-bold text-cyan-400">
              Product Catalog
            </h1>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Package} label="Total Products" value={stats.total} color="cyan" />
            <StatCard icon={Activity} label="Active" value={stats.active} color="green" />
            <StatCard icon={Clock} label="New Today" value={stats.newToday} color="purple" />
            <StatCard icon={Tag} label="On Sale" value={stats.onSale} color="amber" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar - Newegg Style */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-900 border-slate-700  sticky top-6">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-slate-100 text-base">
                    <Filter className="h-4 w-4 text-cyan-500" />
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </CardTitle>
                  {hasFilters && (
                    <button
                      onClick={clearAllFilters}
                      className="text-xs text-cyan-400 hover:text-cyan-300"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-2">
                {/* Search */}
                <div className="pb-4 border-b border-slate-700 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type="text"
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                    />
                  </div>
                  {/* Apply Filters Button */}
                  <Button
                    onClick={applyFilters}
                    disabled={!hasPendingChanges}
                    className={`w-full ${hasPendingChanges
                      ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                      : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                  >
                    {appliedFilters ? 'Update Results' : 'Apply Filters'}
                    {hasPendingChanges && (
                      <Badge className="ml-2 bg-white/20 text-white text-xs">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </div>

                {filterLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
                  </div>
                ) : (
                  <>
                    {/* Costco Trackers */}
                    <FilterSection title="Costco Trackers" defaultExpanded={true}>
                      {filterOptions?.sourcesByCategory?.costcoTrackers && filterOptions.sourcesByCategory.costcoTrackers.length > 0 ? (
                        <FilterList
                          options={filterOptions.sourcesByCategory.costcoTrackers}
                          selectedValues={selectedSources}
                          onToggle={toggleSource}
                          initialShowCount={6}
                        />
                      ) : (
                        <div className="text-xs text-slate-500 py-2">No Costco trackers available</div>
                      )}
                    </FilterSection>

                    {/* Aggregators */}
                    <FilterSection title="Deal Aggregators" defaultExpanded={false}>
                      {filterOptions?.sourcesByCategory?.aggregators && filterOptions.sourcesByCategory.aggregators.length > 0 ? (
                        <FilterList
                          options={filterOptions.sourcesByCategory.aggregators}
                          selectedValues={selectedSources}
                          onToggle={toggleSource}
                          initialShowCount={6}
                        />
                      ) : (
                        <div className="text-xs text-slate-500 py-2">No aggregators available</div>
                      )}
                    </FilterSection>

                    {/* Retailers */}
                    <FilterSection title="Retailers" defaultExpanded={false}>
                      {filterOptions?.sourcesByCategory?.retailers && filterOptions.sourcesByCategory.retailers.length > 0 ? (
                        <FilterList
                          options={filterOptions.sourcesByCategory.retailers}
                          selectedValues={selectedSources}
                          onToggle={toggleSource}
                          initialShowCount={6}
                        />
                      ) : (
                        <div className="text-xs text-slate-500 py-2">No retailers available</div>
                      )}
                    </FilterSection>

                    {/* Store */}
                    <FilterSection title="Store" defaultExpanded={false}>
                      {filterOptions?.stores && filterOptions.stores.length > 0 ? (
                        <FilterList
                          options={filterOptions.stores}
                          selectedValues={selectedStores}
                          onToggle={toggleStore}
                          initialShowCount={6}
                        />
                      ) : (
                        <div className="text-xs text-slate-500 py-2">No stores available</div>
                      )}
                    </FilterSection>

                    {/* Region */}
                    <FilterSection title="Region" defaultExpanded={false}>
                      {filterOptions?.regions && filterOptions.regions.length > 0 ? (
                        <FilterList
                          options={filterOptions.regions}
                          selectedValues={selectedRegions}
                          onToggle={toggleRegion}
                          initialShowCount={6}
                        />
                      ) : (
                        <div className="text-xs text-slate-500 py-2">No regions available</div>
                      )}
                    </FilterSection>

                    {/* Discount */}
                    <FilterSection title="Discount" defaultExpanded={true}>
                      <div className="space-y-1">
                        {DISCOUNTS.map((discount) => (
                          <div
                            key={discount.value}
                            className="flex items-center space-x-2 py-1 hover:bg-slate-800 rounded px-1 -mx-1 cursor-pointer"
                            onClick={() => toggleDiscount(discount.value)}
                          >
                            <Checkbox
                              id={`discount-${discount.value}`}
                              checked={minDiscount === discount.value}
                              onCheckedChange={() => toggleDiscount(discount.value)}
                              className="border-slate-600 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                            />
                            <Label
                              htmlFor={`discount-${discount.value}`}
                              className="text-sm text-slate-300 cursor-pointer flex-1 select-none"
                            >
                              {discount.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </FilterSection>
                  </>
                )}

                {/* Database Stats */}
                {filterOptions?.counts && (
                  <div className="pt-4 border-t border-slate-700">
                    <div className="text-xs text-slate-500 space-y-1">
                      <div className="flex justify-between">
                        <span>Total Products:</span>
                        <span className="text-cyan-400 font-medium">
                          {filterOptions.counts.totalProducts.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sources:</span>
                        <span className="text-slate-400">{filterOptions.counts.sources}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Stores:</span>
                        <span className="text-slate-400">{filterOptions.counts.stores}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-slate-800 text-slate-400 border-slate-600/50" title={`${total.toLocaleString()} products`}>
                  {formatLargeNumber(total)} products
                </Badge>
                {minDiscount && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {minDiscount}%+ off
                  </Badge>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
              </div>
            ) : error ? (
              <Card className="bg-red-500/10 border-red-500/50">
                <CardContent className="p-6 text-center text-red-400">
                  Failed to load products. Please try again later.
                </CardContent>
              </Card>
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onClick={() => setSelectedProductId(product.id)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-100 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (page <= 3) {
                          pageNum = i + 1
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = page - 2 + i
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                            className={pageNum === page
                              ? "bg-cyan-500 text-white"
                              : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-100"
                            }
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-100 disabled:opacity-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Card className="bg-slate-900 border-slate-700">
                <CardContent className="p-12 text-center">
                  <ShoppingBag className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  {!appliedFilters ? (
                    <>
                      <p className="text-slate-400 text-lg">Select filters and click Apply</p>
                      <p className="text-sm text-slate-500 mt-1">Choose sources from the sidebar, then click "Apply Filters"</p>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-400 text-lg">No products found</p>
                      <p className="text-sm text-slate-500 mt-1">Try adjusting your filters</p>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal
        productId={selectedProductId}
        isOpen={!!selectedProductId}
        onClose={() => setSelectedProductId(null)}
      />
    </div>
  )
}
