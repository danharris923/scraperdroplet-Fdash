import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = getServiceSupabase()

    // Get counts for each table to determine which sources have data
    const [
      dealsCount,
      retailerCount,
      amazonCaCount,
      cabelasCount,
      frankOakCount,
      leonsCount,
      mastermindCount,
      reebokCount,
      brickCount,
      yepsavingsCount,
      // Costco trackers - count by source
      cocowestCount,
      warehouseRunnerCount,
      cocopriceCount,
    ] = await Promise.all([
      supabase.from('deals').select('*', { count: 'exact', head: true }),
      // Exclude CocoPriceTracker data from general retailer count (handled separately)
      supabase.from('retailer_products').select('*', { count: 'exact', head: true }).not('extra_data', 'cs', '{"source":"cocopricetracker.ca"}'),
      supabase.from('amazon_ca_deals').select('*', { count: 'exact', head: true }),
      supabase.from('cabelas_ca_deals').select('*', { count: 'exact', head: true }),
      supabase.from('frank_and_oak_deals').select('*', { count: 'exact', head: true }),
      supabase.from('leons_deals').select('*', { count: 'exact', head: true }),
      supabase.from('mastermind_toys_deals').select('*', { count: 'exact', head: true }),
      supabase.from('reebok_ca_deals').select('*', { count: 'exact', head: true }),
      supabase.from('the_brick_deals').select('*', { count: 'exact', head: true }),
      supabase.from('yepsavings_deals').select('*', { count: 'exact', head: true }),
      // CocoWest (Canada user photos)
      supabase.from('costco_user_photos').select('*', { count: 'exact', head: true }).eq('source', 'cocowest'),
      // WarehouseRunner (USA)
      supabase.from('costco_user_photos').select('*', { count: 'exact', head: true }).eq('source', 'warehouse_runner'),
      // CocoPriceTracker - stored in retailer_products with extra_data.source = 'cocopricetracker.ca'
      supabase.from('retailer_products').select('*', { count: 'exact', head: true }).contains('extra_data', { source: 'cocopricetracker.ca' }),
    ])

    // Build sources list organized by category
    const sourcesByCategory: {
      aggregators: { value: string; label: string; count: number }[]
      retailers: { value: string; label: string; count: number }[]
      costcoTrackers: { value: string; label: string; count: number }[]
    } = {
      aggregators: [],
      retailers: [],
      costcoTrackers: [],
    }

    // Aggregators (deal aggregation sites) - RFD only, removed Flipp retail
    if ((dealsCount.count || 0) > 0) {
      sourcesByCategory.aggregators.push({ value: 'rfd', label: 'RedFlagDeals', count: dealsCount.count || 0 })
    }

    // Direct retailer scrapers
    if ((retailerCount.count || 0) > 0) {
      sourcesByCategory.retailers.push({ value: 'amazon', label: 'Amazon (Keepa)', count: retailerCount.count || 0 })
    }
    if ((amazonCaCount.count || 0) > 0) {
      sourcesByCategory.retailers.push({ value: 'amazon_ca', label: 'Amazon CA', count: amazonCaCount.count || 0 })
    }
    if ((cabelasCount.count || 0) > 0) {
      sourcesByCategory.retailers.push({ value: 'cabelas_ca', label: "Cabela's", count: cabelasCount.count || 0 })
    }
    if ((frankOakCount.count || 0) > 0) {
      sourcesByCategory.retailers.push({ value: 'frank_and_oak', label: 'Frank And Oak', count: frankOakCount.count || 0 })
    }
    if ((leonsCount.count || 0) > 0) {
      sourcesByCategory.retailers.push({ value: 'leons', label: "Leon's", count: leonsCount.count || 0 })
    }
    if ((mastermindCount.count || 0) > 0) {
      sourcesByCategory.retailers.push({ value: 'mastermind_toys', label: 'Mastermind Toys', count: mastermindCount.count || 0 })
    }
    if ((reebokCount.count || 0) > 0) {
      sourcesByCategory.retailers.push({ value: 'reebok_ca', label: 'Reebok CA', count: reebokCount.count || 0 })
    }
    if ((brickCount.count || 0) > 0) {
      sourcesByCategory.retailers.push({ value: 'the_brick', label: 'The Brick', count: brickCount.count || 0 })
    }
    if ((yepsavingsCount.count || 0) > 0) {
      sourcesByCategory.retailers.push({ value: 'yepsavings', label: 'YepSavings', count: yepsavingsCount.count || 0 })
    }

    // Costco Trackers - separate checkboxes for each source
    // CocoWest - Canada user photos from cocowest.ca blog
    sourcesByCategory.costcoTrackers.push({
      value: 'cocowest',
      label: 'CocoWest (Canada)',
      count: cocowestCount.count || 0
    })
    // WarehouseRunner - USA Costco deals
    sourcesByCategory.costcoTrackers.push({
      value: 'warehouse_runner',
      label: 'WarehouseRunner (USA)',
      count: warehouseRunnerCount.count || 0
    })
    // CocoPriceTracker - Historical price tracking
    sourcesByCategory.costcoTrackers.push({
      value: 'cocopricetracker',
      label: 'CocoPriceTracker',
      count: cocopriceCount.count || 0
    })

    // Get unique stores from deals table (these are the flyer stores from Flipp/RFD)
    const { data: dealsStores } = await supabase
      .from('deals')
      .select('store')
      .limit(1000)

    const storesSet = new Set<string>()
    if (dealsStores) {
      dealsStores.forEach((row: any) => {
        if (row.store) storesSet.add(row.store)
      })
    }

    // Get regions from costco_user_photos
    const regionsSet = new Set<string>()
    const { data: costcoRegions } = await supabase
      .from('costco_user_photos')
      .select('region')
      .limit(100)
    if (costcoRegions) {
      costcoRegions.forEach((row: any) => {
        if (row.region) {
          row.region.split('/').forEach((r: string) => regionsSet.add(r.trim()))
        }
      })
    }

    // Flatten sources for simple list (with counts in label)
    const allSources = [
      ...sourcesByCategory.aggregators,
      ...sourcesByCategory.retailers,
      ...sourcesByCategory.costcoTrackers,
    ].map(s => ({
      value: s.value,
      label: `${s.label} (${s.count.toLocaleString()})`,
    }))

    const stores = Array.from(storesSet).sort().map(s => ({
      value: s,
      label: s,
    }))

    const regions = Array.from(regionsSet).sort().map(r => ({
      value: r,
      label: r,
    }))

    // Calculate totals
    const costcoTotal = (cocowestCount.count || 0) + (warehouseRunnerCount.count || 0) + (cocopriceCount.count || 0)
    const grandTotal = (dealsCount.count || 0) +
      (retailerCount.count || 0) +
      (amazonCaCount.count || 0) +
      (cabelasCount.count || 0) +
      (frankOakCount.count || 0) +
      (leonsCount.count || 0) +
      (mastermindCount.count || 0) +
      (reebokCount.count || 0) +
      (brickCount.count || 0) +
      (yepsavingsCount.count || 0) +
      costcoTotal

    return NextResponse.json({
      sources: allSources,
      sourcesByCategory: {
        aggregators: sourcesByCategory.aggregators.map(s => ({
          value: s.value,
          label: `${s.label} (${s.count.toLocaleString()})`,
        })),
        retailers: sourcesByCategory.retailers.map(s => ({
          value: s.value,
          label: `${s.label} (${s.count.toLocaleString()})`,
        })),
        costcoTrackers: sourcesByCategory.costcoTrackers.map(s => ({
          value: s.value,
          label: `${s.label} (${s.count.toLocaleString()})`,
        })),
      },
      stores,
      regions,
      counts: {
        sources: allSources.length,
        stores: stores.length,
        regions: regions.length,
        totalProducts: grandTotal,
        byCategory: {
          aggregators: sourcesByCategory.aggregators.reduce((sum, s) => sum + s.count, 0),
          retailers: sourcesByCategory.retailers.reduce((sum, s) => sum + s.count, 0),
          costcoTrackers: costcoTotal,
        },
      },
    })
  } catch (error: any) {
    console.error('Filter options error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
