"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  Search,
  ShoppingBag,
  Filter,
  Grid3X3,
  List,
  ExternalLink,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useRouter } from "next/navigation"
import type { Product } from "@/types"

// Mock product data
const mockProducts: Product[] = [
  { id: '1', title: 'Sony WH-1000XM5 Wireless Headphones', brand: 'Sony', store: 'Amazon', source: 'amazon_ca', image_url: '/placeholder.svg', current_price: 329.99, original_price: 449.99, discount_percent: 27, category: 'Electronics', region: 'CA', affiliate_url: '#', is_active: true, first_seen_at: '2024-01-15', last_seen_at: '2024-01-20' },
  { id: '2', title: 'Sony WH-1000XM4 Wireless Noise Cancelling', brand: 'Sony', store: 'Best Buy', source: 'shopify', image_url: '/placeholder.svg', current_price: 248.00, original_price: 349.99, discount_percent: 29, category: 'Electronics', region: 'CA', affiliate_url: '#', is_active: true, first_seen_at: '2024-01-10', last_seen_at: '2024-01-20' },
  { id: '3', title: 'Bose QuietComfort 45 Headphones', brand: 'Bose', store: 'Amazon', source: 'amazon_ca', image_url: '/placeholder.svg', current_price: 279.99, original_price: 449.99, discount_percent: 38, category: 'Electronics', region: 'CA', affiliate_url: '#', is_active: true, first_seen_at: '2024-01-12', last_seen_at: '2024-01-20' },
  { id: '4', title: 'Apple AirPods Pro 2nd Generation', brand: 'Apple', store: 'Costco', source: 'api', image_url: '/placeholder.svg', current_price: 299.99, original_price: 329.99, discount_percent: 9, category: 'Electronics', region: 'CA', affiliate_url: '#', is_active: true, first_seen_at: '2024-01-18', last_seen_at: '2024-01-20' },
  { id: '5', title: 'Samsung Galaxy Buds2 Pro', brand: 'Samsung', store: 'Amazon', source: 'amazon_ca', image_url: '/placeholder.svg', current_price: 159.99, original_price: 289.99, discount_percent: 45, category: 'Electronics', region: 'CA', affiliate_url: '#', is_active: true, first_seen_at: '2024-01-08', last_seen_at: '2024-01-20' },
  { id: '6', title: 'Nintendo Switch OLED Model', brand: 'Nintendo', store: 'Walmart', source: 'browser', image_url: '/placeholder.svg', current_price: 399.99, original_price: 449.99, discount_percent: 11, category: 'Gaming', region: 'CA', affiliate_url: '#', is_active: true, first_seen_at: '2024-01-05', last_seen_at: '2024-01-20' },
  { id: '7', title: 'PlayStation 5 Console', brand: 'Sony', store: 'Best Buy', source: 'browser', image_url: '/placeholder.svg', current_price: 579.99, original_price: 629.99, discount_percent: 8, category: 'Gaming', region: 'CA', affiliate_url: '#', is_active: true, first_seen_at: '2024-01-02', last_seen_at: '2024-01-20' },
  { id: '8', title: 'Xbox Series X Console', brand: 'Microsoft', store: 'Amazon', source: 'amazon_ca', image_url: '/placeholder.svg', current_price: 549.99, original_price: 599.99, discount_percent: 8, category: 'Gaming', region: 'CA', affiliate_url: '#', is_active: true, first_seen_at: '2024-01-03', last_seen_at: '2024-01-20' },
  { id: '9', title: 'Dyson V15 Detect Vacuum', brand: 'Dyson', store: 'Dyson', source: 'shopify', image_url: '/placeholder.svg', current_price: 749.99, original_price: 949.99, discount_percent: 21, category: 'Home', region: 'CA', affiliate_url: '#', is_active: true, first_seen_at: '2024-01-14', last_seen_at: '2024-01-20' },
  { id: '10', title: 'Dyson V12 Detect Slim Vacuum', brand: 'Dyson', store: 'Amazon', source: 'amazon_ca', image_url: '/placeholder.svg', current_price: 599.99, original_price: 799.99, discount_percent: 25, category: 'Home', region: 'CA', affiliate_url: '#', is_active: true, first_seen_at: '2024-01-16', last_seen_at: '2024-01-20' },
  { id: '11', title: 'LG C3 55" OLED TV', brand: 'LG', store: 'Best Buy', source: 'browser', image_url: '/placeholder.svg', current_price: 1299.99, original_price: 1799.99, discount_percent: 28, category: 'Electronics', region: 'CA', affiliate_url: '#', is_active: true, first_seen_at: '2024-01-11', last_seen_at: '2024-01-20' },
  { id: '12', title: 'Samsung 65" Neo QLED 4K TV', brand: 'Samsung', store: 'Amazon', source: 'amazon_ca', image_url: '/placeholder.svg', current_price: 1499.99, original_price: 2199.99, discount_percent: 32, category: 'Electronics', region: 'CA', affiliate_url: '#', is_active: true, first_seen_at: '2024-01-09', last_seen_at: '2024-01-20' },
]

const sources = ['amazon_ca', 'shopify', 'browser', 'api', 'rss']
const categories = ['Electronics', 'Gaming', 'Home']

function ProductCard({ product }: { product: Product }) {
  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm group hover:border-cyan-500/30 transition-all">
      <CardContent className="p-4">
        <div className="aspect-square bg-slate-800/50 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
          <ShoppingBag className="h-12 w-12 text-slate-600" />
          {(product.discount_percent ?? 0) > 0 && (
            <Badge className={`absolute top-2 right-2 ${(product.discount_percent ?? 0) >= 30 ? 'bg-red-500/90 text-white' : 'bg-amber-500/90 text-white'}`}>
              -{product.discount_percent}%
            </Badge>
          )}
          <Badge variant="outline" className="absolute bottom-2 left-2 bg-slate-900/80 text-slate-300 border-slate-600/50 text-xs">
            {product.source}
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-slate-500">{product.store}</div>
          <h3 className="text-sm font-medium text-slate-200 line-clamp-2 min-h-[2.5rem]">{product.title}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-cyan-400">${product.current_price?.toFixed(2)}</span>
            {product.original_price && product.original_price > (product.current_price ?? 0) && (
              <span className="text-sm text-slate-500 line-through">${product.original_price.toFixed(2)}</span>
            )}
          </div>
          <Button size="sm" variant="outline" className="w-full mt-2 bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink className="h-3 w-3 mr-2" />
            View Deal
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ProductsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [minDiscount, setMinDiscount] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const itemsPerPage = 8

  const filteredProducts = useMemo(() => {
    let filtered = mockProducts

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query) ||
        p.store.toLowerCase().includes(query)
      )
    }

    if (selectedSources.length > 0) {
      filtered = filtered.filter(p => selectedSources.includes(p.source))
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter(p => p.category && selectedCategories.includes(p.category))
    }

    if (minDiscount) {
      filtered = filtered.filter(p => (p.discount_percent ?? 0) >= minDiscount)
    }

    return filtered
  }, [searchQuery, selectedSources, selectedCategories, minDiscount])

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const paginatedProducts = filteredProducts.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  const toggleSource = (source: string) => {
    setSelectedSources(prev =>
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    )
    setPage(1)
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    )
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-slate-800 text-slate-100 p-6">
      <div className="container mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="text-slate-400 hover:text-slate-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-8 w-8 text-cyan-500" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Product Catalog
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-100 text-base">
                  <Filter className="h-4 w-4 text-cyan-500" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search */}
                <div className="space-y-2">
                  <Label className="text-sm text-slate-400">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type="text"
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                      className="pl-9 bg-slate-800/50 border-slate-700/50 text-slate-100 placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {/* Sources */}
                <div className="space-y-2">
                  <Label className="text-sm text-slate-400">Sources</Label>
                  <div className="space-y-2">
                    {sources.map(source => (
                      <div key={source} className="flex items-center space-x-2">
                        <Checkbox
                          id={source}
                          checked={selectedSources.includes(source)}
                          onCheckedChange={() => toggleSource(source)}
                          className="border-slate-600 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                        />
                        <Label htmlFor={source} className="text-sm text-slate-300 cursor-pointer">{source}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-2">
                  <Label className="text-sm text-slate-400">Categories</Label>
                  <div className="space-y-2">
                    {categories.map(category => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={category}
                          checked={selectedCategories.includes(category)}
                          onCheckedChange={() => toggleCategory(category)}
                          className="border-slate-600 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                        />
                        <Label htmlFor={category} className="text-sm text-slate-300 cursor-pointer">{category}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Min Discount */}
                <div className="space-y-2">
                  <Label className="text-sm text-slate-400">Minimum Discount</Label>
                  <div className="flex flex-wrap gap-2">
                    {[null, 10, 25, 50].map(discount => (
                      <Button
                        key={discount ?? 'all'}
                        size="sm"
                        variant={minDiscount === discount ? "default" : "outline"}
                        onClick={() => { setMinDiscount(discount); setPage(1) }}
                        className={minDiscount === discount
                          ? "bg-cyan-500 text-white hover:bg-cyan-600"
                          : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-100"
                        }
                      >
                        {discount ? `${discount}%+` : 'All'}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Clear Filters */}
                {(selectedSources.length > 0 || selectedCategories.length > 0 || minDiscount || searchQuery) && (
                  <Button
                    variant="outline"
                    className="w-full bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-100"
                    onClick={() => {
                      setSelectedSources([])
                      setSelectedCategories([])
                      setMinDiscount(null)
                      setSearchQuery("")
                      setPage(1)
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-slate-800/50 text-slate-400 border-slate-600/50">
                  {filteredProducts.length} products
                </Badge>
                {minDiscount && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {minDiscount}%+ off
                  </Badge>
                )}
              </div>
            </div>

            {paginatedProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {paginatedProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
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
                      className="bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-100 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <Button
                          key={p}
                          variant={p === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(p)}
                          className={p === page
                            ? "bg-cyan-500 text-white"
                            : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-100"
                          }
                        >
                          {p}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-100 disabled:opacity-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardContent className="p-12 text-center">
                  <ShoppingBag className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">No products found</p>
                  <p className="text-sm text-slate-500 mt-1">Try adjusting your filters</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
