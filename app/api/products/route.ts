import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import type { Product } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const sources = searchParams.get('sources')?.split(',').filter(Boolean) || []
    const stores = searchParams.get('stores')?.split(',').filter(Boolean) || []
    const regions = searchParams.get('regions')?.split(',').filter(Boolean) || []
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || []
    const minDiscount = searchParams.get('minDiscount')
      ? parseInt(searchParams.get('minDiscount')!)
      : null
    const maxPrice = searchParams.get('maxPrice')
      ? parseFloat(searchParams.get('maxPrice')!)
      : null
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'last_seen_at'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? true : false
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '24')
    const offset = (page - 1) * limit

    const supabase = getServiceSupabase()

    // Query deals table
    let dealsQuery = supabase
      .from('deals')
      .select('*', { count: 'exact' })

    if (search) {
      dealsQuery = dealsQuery.ilike('title', `%${search}%`)
    }
    if (stores.length > 0) {
      dealsQuery = dealsQuery.in('store', stores)
    }
    if (sources.length > 0) {
      dealsQuery = dealsQuery.in('source', sources)
    }
    if (categories.length > 0) {
      dealsQuery = dealsQuery.in('category', categories)
    }
    if (minDiscount !== null) {
      dealsQuery = dealsQuery.gte('discount_percent', minDiscount)
    }
    if (maxPrice !== null) {
      dealsQuery = dealsQuery.lte('current_price', maxPrice)
    }

    // Query retailer_products table
    let retailerQuery = supabase
      .from('retailer_products')
      .select('*', { count: 'exact' })

    if (search) {
      retailerQuery = retailerQuery.ilike('title', `%${search}%`)
    }
    if (stores.length > 0) {
      retailerQuery = retailerQuery.in('store', stores)
    }
    if (regions.length > 0) {
      retailerQuery = retailerQuery.in('region', regions)
    }
    if (minDiscount !== null) {
      retailerQuery = retailerQuery.gte('discount_percent', minDiscount)
    }
    if (maxPrice !== null) {
      retailerQuery = retailerQuery.lte('current_price', maxPrice)
    }

    const [dealsResult, retailerResult] = await Promise.all([
      dealsQuery.order(sortBy === 'discount_percent' ? 'discount_percent' : 'created_at', { ascending: sortOrder }),
      retailerQuery.order(sortBy === 'discount_percent' ? 'discount_percent' : 'first_seen_at', { ascending: sortOrder }),
    ])

    // Normalize and combine results
    const deals: Product[] = (dealsResult.data || []).map((d: any) => ({
      id: `deal_${d.id}`,
      title: d.title || '',
      brand: d.brand || null,
      store: d.store || 'Unknown',
      source: d.source || 'deals',
      image_url: d.image_blob_url || d.image_url || null,
      current_price: d.current_price || d.price,
      original_price: d.original_price,
      discount_percent: d.discount_percent,
      category: d.category || null,
      region: d.region || null,
      affiliate_url: d.affiliate_url || d.url || '#',
      is_active: d.is_active !== false,
      first_seen_at: d.date_added || d.created_at,
      last_seen_at: d.date_updated || d.updated_at || d.created_at,
    }))

    const retailerProducts: Product[] = (retailerResult.data || []).map((r: any) => {
      const images = r.images || []
      const imageUrl = images.length > 0 ? images[0] : (r.thumbnail_url && !r.thumbnail_url.includes('LogoMobile') ? r.thumbnail_url : null)

      let store = 'Unknown'
      let source = 'retailer'

      if (r.retailer_sku && r.retailer_sku.includes('_')) {
        store = r.retailer_sku.split('_')[0]
        source = 'Flipp'
      } else if (r.affiliate_url?.includes('flipp.com')) {
        source = 'Flipp'
      } else if (r.extra_data?.source) {
        store = r.extra_data.source
        source = r.extra_data.source
      } else if (r.retailer_url) {
        try {
          const domain = new URL(r.retailer_url).hostname.replace('www.', '').split('.')[0]
          store = domain.charAt(0).toUpperCase() + domain.slice(1)
        } catch {
          // Invalid URL
        }
      }

      return {
        id: `retailer_${r.id}`,
        title: r.title || '',
        brand: r.brand || null,
        store,
        source,
        image_url: imageUrl,
        current_price: r.current_price,
        original_price: r.original_price,
        discount_percent: r.sale_percentage || r.discount_percent,
        category: r.retailer_category || null,
        region: r.extra_data?.region || null,
        affiliate_url: r.affiliate_url || r.retailer_url || '#',
        is_active: r.is_active !== false,
        first_seen_at: r.first_seen_at,
        last_seen_at: r.last_seen_at || r.first_seen_at,
      }
    })

    let allProducts = [...deals, ...retailerProducts]

    if (sortBy === 'discount_percent') {
      allProducts.sort((a, b) => {
        const aVal = a.discount_percent || 0
        const bVal = b.discount_percent || 0
        return sortOrder ? aVal - bVal : bVal - aVal
      })
    } else {
      allProducts.sort((a, b) => {
        const aDate = new Date(a.last_seen_at).getTime()
        const bDate = new Date(b.last_seen_at).getTime()
        return sortOrder ? aDate - bDate : bDate - aDate
      })
    }

    const total = allProducts.length
    const paginatedProducts = allProducts.slice(offset, offset + limit)

    return NextResponse.json({
      products: paginatedProducts,
      total,
      page,
      limit,
    })
  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
