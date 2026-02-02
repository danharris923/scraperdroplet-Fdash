import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

// Cache for 15 minutes - sources rarely change
export const revalidate = 900

export async function GET() {
  try {
    const supabase = getServiceSupabase()

    // Get distinct sources from deals table
    const { data: dealsData, error: dealsError } = await supabase
      .from('deals')
      .select('source')

    // Get distinct regions from retailer_products
    const { data: regionsData, error: regionsError } = await supabase
      .from('retailer_products')
      .select('region')

    const sources = new Set<string>()
    const regions = new Set<string>()

    // Process deals sources
    if (dealsData) {
      dealsData.forEach((d: any) => {
        if (d.source) sources.add(d.source)
      })
    }

    // Add Flipp as a source since retailer_products come from Flipp
    sources.add('Flipp')

    // Process regions
    if (regionsData) {
      regionsData.forEach((r: any) => {
        if (r.region) regions.add(r.region)
      })
    }

    return NextResponse.json({
      sources: Array.from(sources).sort(),
      regions: Array.from(regions).sort(),
    })
  } catch (error) {
    console.error('Sources API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sources' },
      { status: 500 }
    )
  }
}
