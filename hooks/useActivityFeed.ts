import { useState, useEffect, useRef } from 'react'
import type { ScraperStatus, ActivityEvent } from '@/types'

const MAX_EVENTS = 50

export function useActivityFeed(scrapers: ScraperStatus[] | undefined) {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const previousScrapersRef = useRef<Map<string, ScraperStatus>>(new Map())

  useEffect(() => {
    if (!scrapers) return

    const newEvents: ActivityEvent[] = []
    const now = Date.now()

    scrapers.forEach(scraper => {
      const prev = previousScrapersRef.current.get(scraper.name)

      // Detect status changes
      if (prev) {
        // Scraper started running
        if (prev.last_status !== 'running' && scraper.last_status === 'running') {
          newEvents.push({
            id: `${scraper.name}-start-${now}`,
            type: 'scraper_start',
            message: `${scraper.name} started running`,
            timestamp: now,
            scraper: scraper.name,
          })
        }

        // Scraper completed successfully
        if (prev.last_status === 'running' && scraper.last_status === 'success') {
          newEvents.push({
            id: `${scraper.name}-complete-${now}`,
            type: 'scraper_complete',
            message: `${scraper.name} completed successfully`,
            timestamp: now,
            scraper: scraper.name,
            details: {
              itemsFound: scraper.items_found ?? undefined,
              itemsNew: scraper.items_new ?? undefined,
              duration: scraper.last_duration_seconds ?? undefined,
            },
          })

          // Also add items found event if new items were found
          if (scraper.items_new && scraper.items_new > 0) {
            newEvents.push({
              id: `${scraper.name}-items-${now}`,
              type: 'items_found',
              message: `${scraper.items_new} new items from ${scraper.name}`,
              timestamp: now,
              scraper: scraper.name,
              details: {
                itemsNew: scraper.items_new,
              },
            })
          }
        }

        // Scraper failed
        if (prev.last_status === 'running' && scraper.last_status === 'failed') {
          newEvents.push({
            id: `${scraper.name}-error-${now}`,
            type: 'scraper_error',
            message: `${scraper.name} failed with ${scraper.errors ?? 0} errors`,
            timestamp: now,
            scraper: scraper.name,
            details: {
              error: `${scraper.errors ?? 0} errors encountered`,
            },
          })
        }
      }

      // Update reference
      previousScrapersRef.current.set(scraper.name, { ...scraper })
    })

    if (newEvents.length > 0) {
      setEvents(prev => [...newEvents, ...prev].slice(0, MAX_EVENTS))
    }
  }, [scrapers])

  return events
}
