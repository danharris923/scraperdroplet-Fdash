"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Activity,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
} from "lucide-react"
import type { ActivityEvent } from "@/types"

interface RecentActivityFeedProps {
  events: ActivityEvent[]
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diffMs = now - timestamp
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)

  if (diffSecs < 60) return `${diffSecs}s ago`
  if (diffMins < 60) return `${diffMins}m ago`
  return `${diffHours}h ago`
}

const eventConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
  scraper_start: {
    icon: Play,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
  scraper_complete: {
    icon: CheckCircle2,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
  },
  scraper_error: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
  },
  system_alert: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  items_found: {
    icon: Package,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
}

export function RecentActivityFeed({ events }: RecentActivityFeedProps) {
  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-slate-100 text-sm">
          <Activity className="h-4 w-4 text-cyan-500" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px]">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
              <Activity className="h-8 w-8 mb-2 opacity-50" />
              <p>No recent activity</p>
              <p className="text-xs mt-1">Events will appear here as scrapers run</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(event => {
                const config = eventConfig[event.type] || eventConfig.scraper_start
                const Icon = config.icon

                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
                  >
                    <div className={`p-1.5 rounded ${config.bgColor}`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{event.message}</p>
                      {event.details && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {event.details.itemsNew !== undefined && (
                            <span className="text-xs text-purple-400">
                              +{event.details.itemsNew} new
                            </span>
                          )}
                          {event.details.duration !== undefined && (
                            <span className="text-xs text-slate-500">
                              {event.details.duration}s
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {formatTimeAgo(event.timestamp)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
