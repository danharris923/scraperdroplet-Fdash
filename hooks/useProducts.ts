import { useQuery } from '@tanstack/react-query'
import type { ProductFilters, ProductsResponse, ProductDetail } from '@/types'

function buildQueryString(filters: Partial<ProductFilters>): string {
  const params = new URLSearchParams()

  if (filters.sources?.length) {
    params.set('sources', filters.sources.join(','))
  }
  if (filters.stores?.length) {
    params.set('stores', filters.stores.join(','))
  }
  if (filters.regions?.length) {
    params.set('regions', filters.regions.join(','))
  }
  if (filters.categories?.length) {
    params.set('categories', filters.categories.join(','))
  }
  if (filters.minDiscount !== null && filters.minDiscount !== undefined) {
    params.set('minDiscount', String(filters.minDiscount))
  }
  if (filters.maxPrice !== null && filters.maxPrice !== undefined) {
    params.set('maxPrice', String(filters.maxPrice))
  }
  if (filters.search) {
    params.set('search', filters.search)
  }
  if (filters.sortBy) {
    params.set('sortBy', filters.sortBy)
  }
  if (filters.sortOrder) {
    params.set('sortOrder', filters.sortOrder)
  }
  if (filters.page) {
    params.set('page', String(filters.page))
  }
  if (filters.limit) {
    params.set('limit', String(filters.limit))
  }

  return params.toString()
}

export function useProducts(filters: Partial<ProductFilters>) {
  const queryString = buildQueryString(filters)

  // Only fetch when at least one filter is applied (sources, search, etc.)
  const hasFilters = !!(
    filters.sources?.length ||
    filters.stores?.length ||
    filters.regions?.length ||
    filters.search ||
    filters.minDiscount !== null && filters.minDiscount !== undefined
  )

  return useQuery<ProductsResponse>({
    queryKey: ['products', queryString],
    queryFn: async () => {
      const response = await fetch(`/api/products?${queryString}`)
      if (!response.ok) {
        throw new Error('Failed to fetch products')
      }
      return response.json()
    },
    enabled: hasFilters, // Don't fetch until filters are applied
  })
}

export function useProductDetail(id: string | null) {
  return useQuery<ProductDetail>({
    queryKey: ['product', id],
    queryFn: async () => {
      const response = await fetch(`/api/products/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch product')
      }
      return response.json()
    },
    enabled: !!id,
  })
}
