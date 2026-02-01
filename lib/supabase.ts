import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

let supabaseInstance: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and anon key are required')
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
  }
  return supabaseInstance
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export function getServiceSupabase(): SupabaseClient {
  if (!supabaseUrl) {
    throw new Error('Supabase URL is required')
  }
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (serviceKey) {
    return createClient(supabaseUrl, serviceKey)
  }
  if (!supabaseAnonKey) {
    throw new Error('Supabase key is required')
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}
