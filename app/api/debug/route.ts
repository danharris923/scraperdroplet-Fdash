import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

// Cache for 5 minutes
export const revalidate = 300

export async function GET() {
  try {
    const supabase = getServiceSupabase()

    // Get ALL deals to count sources and stores
    const { data: allDeals } = await supabase
      .from('deals')
      .select('source, store')

    // Get ALL retailer_products to count stores and regions
    const { data: allRetailer } = await supabase
      .from('retailer_products')
      .select('retailer_sku, region')

    // Get counts
    const [dealsCount, retailerCount] = await Promise.all([
      supabase.from('deals').select('*', { count: 'exact', head: true }),
      supabase.from('retailer_products').select('*', { count: 'exact', head: true }),
    ])

    // Count unique sources in deals
    const sourceCounts: Record<string, number> = {}
    const storeCounts: Record<string, number> = {}
    if (allDeals) {
      allDeals.forEach((row: any) => {
        const source = row.source || 'null'
        const store = row.store || 'null'
        sourceCounts[source] = (sourceCounts[source] || 0) + 1
        storeCounts[store] = (storeCounts[store] || 0) + 1
      })
    }

    // Count unique stores and regions in retailer_products
    const retailerStoreCounts: Record<string, number> = {}
    const regionCounts: Record<string, number> = {}
    if (allRetailer) {
      allRetailer.forEach((row: any) => {
        // Extract store from retailer_sku (e.g., "Sport Chek_xxx" → "Sport Chek")
        let store = 'Unknown'
        if (row.retailer_sku && row.retailer_sku.includes('_')) {
          store = row.retailer_sku.split('_')[0]
        }
        retailerStoreCounts[store] = (retailerStoreCounts[store] || 0) + 1

        const region = row.region || 'null'
        regionCounts[region] = (regionCounts[region] || 0) + 1
      })
    }

    return NextResponse.json({
      deals_count: dealsCount.count,
      retailer_count: retailerCount.count,
      deals_sources: sourceCounts,
      deals_stores: storeCounts,
      retailer_stores: retailerStoreCounts,
      retailer_regions: regionCounts,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
