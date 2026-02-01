import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ScraperStatus, SystemHealth } from '@/types'

async function fetchFromDroplet<T>(path: string): Promise<T> {
  const response = await fetch(`/api/droplet/${path}`)
  if (!response.ok) {
    throw new Error('Failed to fetch from droplet')
  }
  return response.json()
}

async function postToDroplet<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(`/api/droplet/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) {
    throw new Error('Failed to post to droplet')
  }
  return response.json()
}

export function useScrapers() {
  return useQuery<ScraperStatus[]>({
    queryKey: ['scrapers'],
    queryFn: () => fetchFromDroplet<ScraperStatus[]>('health/scrapers'),
    refetchInterval: 30000,
  })
}

export function useSystemHealth() {
  return useQuery<SystemHealth>({
    queryKey: ['health'],
    queryFn: () => fetchFromDroplet<SystemHealth>('health'),
    refetchInterval: 10000,
  })
}

export function useTriggerScraper() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (scraperName: string) =>
      postToDroplet(`trigger/${scraperName}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scrapers'] })
    },
  })
}

export function useScraperLogs(scraperName: string, enabled = true) {
  return useQuery<string[]>({
    queryKey: ['logs', scraperName],
    queryFn: () => fetchFromDroplet<string[]>(`logs/${scraperName}`),
    enabled,
    refetchInterval: 5000,
  })
}
