"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  Search,
  ArrowUpDown,
  ShoppingBag,
  Tag,
  TrendingDown,
  ExternalLink,
  Loader2,
  Sparkles,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"
import type { Product, SimilarProduct } from "@/types"
import Fuse from "fuse.js"

// Mock product data - in production this would come from an API
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
]

function ProductCard({ product, onSelect, isSelected }: { product: Product; onSelect?: () => void; isSelected?: boolean }) {
  return (
    <Card
      className={`bg-slate-900/50 border-slate-700/50 backdrop-blur-sm cursor-pointer transition-all hover:border-cyan-500/50 ${isSelected ? 'ring-2 ring-cyan-500 border-cyan-500/50' : ''}`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="aspect-square bg-slate-800/50 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
          <ShoppingBag className="h-12 w-12 text-slate-600" />
        </div>
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Badge variant="outline" className="text-xs bg-slate-800/50 text-slate-400 border-slate-600/50 shrink-0">
              {product.store}
            </Badge>
            {(product.discount_percent ?? 0) > 0 && (
              <Badge className={`text-xs shrink-0 ${(product.discount_percent ?? 0) >= 30 ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-amber-500/20 text-amber-400 border-amber-500/50'}`}>
                -{product.discount_percent}%
              </Badge>
            )}
          </div>
          <h3 className="text-sm font-medium text-slate-200 line-clamp-2">{product.title}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-cyan-400">${product.current_price?.toFixed(2)}</span>
            {product.original_price && product.original_price > (product.current_price ?? 0) && (
              <span className="text-sm text-slate-500 line-through">${product.original_price?.toFixed(2)}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SimilarProductCard({ product, similarity }: { product: SimilarProduct; similarity: number }) {
  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="w-20 h-20 bg-slate-800/50 rounded-lg flex items-center justify-center shrink-0">
            <ShoppingBag className="h-8 w-8 text-slate-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <Badge variant="outline" className="text-xs bg-slate-800/50 text-slate-400 border-slate-600/50">
                {product.store}
              </Badge>
              <Badge className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/50">
                {Math.round(similarity * 100)}% match
              </Badge>
            </div>
            <h3 className="text-sm font-medium text-slate-200 line-clamp-2 mb-2">{product.title}</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-green-400">${product.current_price?.toFixed(2)}</span>
                {(product.discount_percent ?? 0) > 0 && (
                  <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/50">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {product.discount_percent}% off
                  </Badge>
                )}
              </div>
              <Button size="sm" variant="outline" className="h-7 bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ComparePage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  // Fuse.js for fuzzy search
  const fuse = useMemo(() => new Fuse(mockProducts, {
    keys: ['title', 'brand', 'category'],
    threshold: 0.4,
    includeScore: true,
  }), [])

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return mockProducts.slice(0, 8)
    return fuse.search(searchQuery).map(r => r.item).slice(0, 8)
  }, [searchQuery, fuse])

  // Find similar products when one is selected
  const similarProducts = useMemo(() => {
    if (!selectedProduct) return []

    const similarFuse = new Fuse(mockProducts.filter(p => p.id !== selectedProduct.id), {
      keys: ['title', 'brand', 'category'],
      threshold: 0.6,
      includeScore: true,
    })

    // Search for similar products
    const results = similarFuse.search(selectedProduct.title)

    return results
      .filter(r => (r.item.discount_percent ?? 0) > 0) // Only show products on sale
      .map(r => ({
        ...r.item,
        similarity_score: 1 - (r.score ?? 0),
        match_reason: r.item.brand === selectedProduct.brand ? 'Same brand' :
                      r.item.category === selectedProduct.category ? 'Same category' : 'Similar name'
      } as SimilarProduct))
      .slice(0, 5)
  }, [selectedProduct])

  // Simulate search delay
  useEffect(() => {
    if (searchQuery) {
      setIsSearching(true)
      const timer = setTimeout(() => setIsSearching(false), 300)
      return () => clearTimeout(timer)
    }
  }, [searchQuery])

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-slate-800 text-slate-100 p-6">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="text-slate-400 hover:text-slate-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-8 w-8 text-cyan-500" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Search & Compare
            </h1>
          </div>
        </div>

        {/* Search Bar */}
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search for products to find similar deals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-700/50 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-cyan-500 animate-spin" />
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Selection */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-200">
                {searchQuery ? 'Search Results' : 'Browse Products'}
              </h2>
              <Badge variant="outline" className="bg-slate-800/50 text-slate-400 border-slate-600/50">
                {searchResults.length} products
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {searchResults.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={() => setSelectedProduct(product)}
                  isSelected={selectedProduct?.id === product.id}
                />
              ))}
            </div>
          </div>

          {/* Similar Products */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Similar Products on Sale
              </h2>
              {selectedProduct && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProduct(null)}
                  className="text-slate-400 hover:text-slate-100"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {selectedProduct ? (
              <div className="space-y-4">
                {/* Selected Product Summary */}
                <Card className="bg-cyan-500/10 border-cyan-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="h-4 w-4 text-cyan-400" />
                      <span className="text-sm text-cyan-400">Comparing to:</span>
                    </div>
                    <h3 className="text-sm font-medium text-slate-200">{selectedProduct.title}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-lg font-bold text-cyan-400">${selectedProduct.current_price?.toFixed(2)}</span>
                      <span className="text-sm text-slate-500">at {selectedProduct.store}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Similar Products List */}
                {similarProducts.length > 0 ? (
                  <div className="space-y-3">
                    {similarProducts.map(product => (
                      <SimilarProductCard
                        key={product.id}
                        product={product}
                        similarity={product.similarity_score}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="bg-slate-900/50 border-slate-700/50">
                    <CardContent className="p-8 text-center">
                      <ShoppingBag className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400">No similar products on sale found</p>
                      <p className="text-sm text-slate-500 mt-1">Try selecting a different product</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardContent className="p-8 text-center">
                  <ArrowUpDown className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Select a product to find similar deals</p>
                  <p className="text-sm text-slate-500 mt-1">Click on any product card to compare prices</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
