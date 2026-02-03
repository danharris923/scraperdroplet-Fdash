"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Server, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import type { ScraperStatus } from "@/types"

interface ServerStatusTableProps {
  scrapers: ScraperStatus[] | undefined
  isLoading: boolean
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export function ServerStatusTable({ scrapers, isLoading }: ServerStatusTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Success
          </Badge>
        )
      case 'failed':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        )
      case 'running':
        return (
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Running
          </Badge>
        )
      default:
        return (
          <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
            Unknown
          </Badge>
        )
    }
  }

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      browser: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      shopify: 'bg-green-500/20 text-green-400 border-green-500/30',
      api: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      rss: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      pipeline: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    }
    return (
      <Badge variant="outline" className={colors[type] || 'bg-slate-500/20 text-slate-400'}>
        {type}
      </Badge>
    )
  }

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-slate-100 text-sm">
          <Server className="h-4 w-4 text-cyan-500" />
          Scraper Status
          {scrapers && (
            <Badge variant="outline" className="bg-slate-800 text-slate-400 border-slate-600/50 text-xs ml-2">
              {scrapers.length} scrapers
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium text-right">Last Run</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {scrapers?.map(scraper => (
                  <tr key={scraper.name} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-2">
                      <span className="text-sm text-slate-200">{scraper.name}</span>
                    </td>
                    <td className="py-2">
                      {getTypeBadge(scraper.type)}
                    </td>
                    <td className="py-2">
                      {getStatusBadge(scraper.last_status)}
                    </td>
                    <td className="py-2 text-right">
                      <span className="text-sm text-slate-400">
                        {formatTimeAgo(scraper.last_run)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
