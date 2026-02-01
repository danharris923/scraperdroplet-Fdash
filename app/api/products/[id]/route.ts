import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import type { ProductDetail, PricePoint } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    const supabase = getServiceSupabase()

    // Parse the id to determine source table
    const isRetailer = id.startsWith('retailer_')
    const isCostcoPhoto = id.startsWith('costco_photo_')
    const isCocoPrice = id.startsWith('cocoprice_')
    const actualId = id.replace(/^(deal_|retailer_|costco_photo_|cocoprice_)/, '')

    let product: ProductDetail | null = null
    let priceHistory: PricePoint[] = []

    if (isCostcoPhoto) {
      // Query costco_user_photos table (CocoWest / WarehouseRunner)
      const { data, error } = await supabase
        .from('costco_user_photos')
        .select('*')
        .eq('id', actualId)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }

      const isUSA = data.source === 'warehouse_runner'

      // Create single price point from current data
      priceHistory = [{
        price: data.price,
        original_price: data.original_price,
        scraped_at: data.scraped_at || data.created_at || new Date().toISOString(),
        is_on_sale: (data.discount_percent || 0) > 0,
      }]

      product = {
        id: `costco_photo_${data.id}`,
        title: data.name || '',
        brand: null,
        store: 'Costco',
        source: data.source || 'cocowest',
        image_url: data.processed_url || data.original_url,
        current_price: data.price,
        original_price: data.original_price,
        discount_percent: data.discount_percent,
        category: null,
        region: data.region || (isUSA ? 'USA' : 'Canada'),
        affiliate_url: isUSA
          ? `https://www.costco.com/CatalogSearch?keyword=${data.sku || data.name}`
          : `https://www.costco.ca/CatalogSearch?keyword=${data.sku || data.name}`,
        is_active: true,
        first_seen_at: data.scraped_at || data.created_at,
        last_seen_at: data.updated_at || data.scraped_at,
        description: data.sku ? `SKU: ${data.sku}` : undefined,
        price_history: priceHistory,
      }
    } else if (isCocoPrice) {
      // Query retailer_products for CocoPriceTracker data
      const { data, error } = await supabase
        .from('retailer_products')
        .select('*')
        .eq('id', actualId)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }

      const extraData = data.extra_data || {}
      const region = extraData.region || 'west'

      // Get price history from price_history table
      const { data: historyData } = await supabase
        .from('price_history')
        .select('price, original_price, scraped_at, is_on_sale')
        .eq('retailer_product_id', actualId)
        .order('scraped_at', { ascending: true })

      if (historyData && historyData.length > 0) {
        priceHistory = historyData.map(h => ({
          price: h.price,
          original_price: h.original_price,
          scraped_at: h.scraped_at,
          is_on_sale: h.is_on_sale ?? false,
        }))
      } else {
        // If no price history, create single point from current data
        priceHistory = [{
          price: data.current_price,
          original_price: data.original_price,
          scraped_at: data.first_seen_at || new Date().toISOString(),
          is_on_sale: (data.sale_percentage || data.discount_percent || 0) > 0,
        }]
      }

      product = {
        id: `cocoprice_${data.id}`,
        title: data.title || '',
        brand: data.brand || null,
        store: 'Costco',
        source: 'cocopricetracker',
        image_url: data.thumbnail_url || null,
        current_price: data.current_price,
        original_price: data.original_price,
        discount_percent: data.sale_percentage || data.discount_percent,
        category: data.retailer_category || null,
        region: region === 'west' ? 'Costco West' : region === 'east' ? 'Costco East' : 'Canada',
        affiliate_url: data.retailer_url || `https://www.costco.ca/CatalogSearch?keyword=${data.retailer_sku || data.title}`,
        is_active: data.is_active !== false,
        first_seen_at: data.first_seen_at,
        last_seen_at: data.last_seen_at || data.first_seen_at,
        description: data.retailer_sku ? `SKU: ${data.retailer_sku}` : undefined,
        price_history: priceHistory,
      }
    } else if (isRetailer) {
      // Query retailer_products table
      const { data, error } = await supabase
        .from('retailer_products')
        .select('*')
        .eq('id', actualId)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }

      const images = data.images || []
      const imageUrl = images.length > 0 ? images[0] : (data.thumbnail_url && !data.thumbnail_url.includes('LogoMobile') ? data.thumbnail_url : null)

      let store = 'Unknown'
      let source = 'retailer'

      if (data.retailer_sku && data.retailer_sku.includes('_')) {
        store = data.retailer_sku.split('_')[0]
        source = 'Flipp'
      } else if (data.affiliate_url?.includes('flipp.com')) {
        source = 'Flipp'
      }

      // Get price history from price_history table if it exists
      const { data: historyData } = await supabase
        .from('price_history')
        .select('price, original_price, scraped_at, is_on_sale')
        .eq('product_id', actualId)
        .order('scraped_at', { ascending: true })

      if (historyData && historyData.length > 0) {
        priceHistory = historyData.map(h => ({
          price: h.price,
          original_price: h.original_price,
          scraped_at: h.scraped_at,
          is_on_sale: h.is_on_sale ?? false,
        }))
      } else {
        // If no price history, create a single point from current data
        priceHistory = [{
          price: data.current_price,
          original_price: data.original_price,
          scraped_at: data.first_seen_at || new Date().toISOString(),
          is_on_sale: (data.sale_percentage || data.discount_percent || 0) > 0,
        }]
      }

      product = {
        id: `retailer_${data.id}`,
        title: data.title || '',
        brand: data.brand || null,
        store,
        source,
        image_url: imageUrl,
        current_price: data.current_price,
        original_price: data.original_price,
        discount_percent: data.sale_percentage || data.discount_percent,
        category: data.retailer_category || null,
        region: data.extra_data?.region || null,
        affiliate_url: data.affiliate_url || data.retailer_url || '#',
        is_active: data.is_active !== false,
        first_seen_at: data.first_seen_at,
        last_seen_at: data.last_seen_at || data.first_seen_at,
        description: data.description || undefined,
        price_history: priceHistory,
      }
    } else {
      // Query deals table
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('id', actualId)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }

      // Get price history from deal_price_history if exists
      const { data: historyData } = await supabase
        .from('deal_price_history')
        .select('price, original_price, scraped_at, is_on_sale')
        .eq('deal_id', actualId)
        .order('scraped_at', { ascending: true })

      if (historyData && historyData.length > 0) {
        priceHistory = historyData.map(h => ({
          price: h.price,
          original_price: h.original_price,
          scraped_at: h.scraped_at,
          is_on_sale: h.is_on_sale ?? false,
        }))
      } else {
        // If no price history, create a single point from current data
        priceHistory = [{
          price: data.current_price || data.price,
          original_price: data.original_price,
          scraped_at: data.date_added || data.created_at || new Date().toISOString(),
          is_on_sale: (data.discount_percent || 0) > 0,
        }]
      }

      product = {
        id: `deal_${data.id}`,
        title: data.title || '',
        brand: data.brand || null,
        store: data.store || 'Unknown',
        source: data.source || 'deals',
        image_url: data.image_blob_url || data.image_url || null,
        current_price: data.current_price || data.price,
        original_price: data.original_price,
        discount_percent: data.discount_percent,
        category: data.category || null,
        region: data.region || null,
        affiliate_url: data.affiliate_url || data.url || '#',
        is_active: data.is_active !== false,
        first_seen_at: data.date_added || data.created_at,
        last_seen_at: data.date_updated || data.updated_at || data.created_at,
        description: data.description || undefined,
        price_history: priceHistory,
      }
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Product detail API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}
