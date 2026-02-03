"use client"

import { useState, useEffect } from "react"
import { useSystemHealth, useScrapers } from "@/hooks/useDroplet"
import { useHealthHistory } from "@/hooks/useHealthHistory"
import { useActivityFeed } from "@/hooks/useActivityFeed"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  HealthIndicator,
  StatCardWithSparkline,
  DonutChart,
  ActivityLineChart,
  ServerStatusTable,
  RecentActivityFeed,
} from "@/components/server-dashboard"
import {
  Server,
  Cpu,
  HardDrive,
  Database,
  Wifi,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  ArrowLeft,
  Activity,
} from "lucide-react"
import { useRouter } from "next/navigation"

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

export default function ServerPage() {
  const router = useRouter()
  const { data: health, isLoading: healthLoading, error: healthError, refetch: refetchHealth } = useSystemHealth()
  const { data: scrapers, isLoading: scrapersLoading } = useScrapers()

  const [lastCheckTime, setLastCheckTime] = useState(Date.now())

  // Track health history for sparklines
  const healthHistory = useHealthHistory(health)

  // Generate activity events from scraper changes
  const activityEvents = useActivityFeed(scrapers)

  // Update last check time when health data changes
  useEffect(() => {
    if (health) {
      setLastCheckTime(Date.now())
    }
  }, [health])

  const handleRefresh = () => {
    refetchHealth()
  }

  // Count scrapers by status
  const scraperCounts = {
    total: scrapers?.length || 0,
    running: scrapers?.filter(s => s.last_status === 'running').length || 0,
    success: scrapers?.filter(s => s.last_status === 'success').length || 0,
    failed: scrapers?.filter(s => s.last_status === 'failed').length || 0,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/')}
              className="text-slate-400 hover:text-slate-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Server className="h-8 w-8 text-cyan-500" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Server Monitoring
              </h1>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            className="bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-100"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {healthError ? (
          <Card className="bg-red-500/10 border-red-500/50">
            <CardContent className="p-6 text-center text-red-400">
              Failed to load server health data. The server may be offline.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Health Indicator Banner */}
            <HealthIndicator health={health} lastCheckTime={lastCheckTime} />

            {/* Stat Cards with Sparklines */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCardWithSparkline
                title="CPU Usage"
                value={health?.cpu_percent ?? 0}
                icon={<Cpu className="h-4 w-4 text-cyan-400" />}
                history={healthHistory}
                dataKey="cpu"
                color="cyan"
              />
              <StatCardWithSparkline
                title="Memory"
                value={health?.memory_percent ?? 0}
                icon={<Database className="h-4 w-4 text-purple-400" />}
                history={healthHistory}
                dataKey="memory"
                color="purple"
              />
              <StatCardWithSparkline
                title="Disk"
                value={health?.disk_percent ?? 0}
                icon={<HardDrive className="h-4 w-4 text-amber-400" />}
                history={healthHistory}
                dataKey="disk"
                color="amber"
              />
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-green-500/10">
                        <Activity className="h-4 w-4 text-green-400" />
                      </div>
                      <span className="text-sm text-slate-400">Scrapers</span>
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-3xl font-bold text-green-400">
                      {scraperCounts.total}
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="text-green-400">{scraperCounts.success} ok</span>
                      {scraperCounts.running > 0 && (
                        <span className="text-cyan-400">{scraperCounts.running} running</span>
                      )}
                      {scraperCounts.failed > 0 && (
                        <span className="text-red-400">{scraperCounts.failed} failed</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Activity Line Chart */}
              <ActivityLineChart history={healthHistory} />

              {/* Resource Donuts */}
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-slate-100 text-sm">
                    <Server className="h-4 w-4 text-cyan-500" />
                    Resource Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-around py-4">
                    <DonutChart
                      value={health?.cpu_percent ?? 0}
                      label="CPU"
                      color="cyan"
                    />
                    <DonutChart
                      value={health?.memory_percent ?? 0}
                      label="Memory"
                      color="purple"
                    />
                    <DonutChart
                      value={health?.disk_percent ?? 0}
                      label="Disk"
                      color="amber"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Data Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Server Status Table */}
              <ServerStatusTable scrapers={scrapers} isLoading={scrapersLoading} />

              {/* Recent Activity Feed */}
              <RecentActivityFeed events={activityEvents} />
            </div>

            {/* Network Stats */}
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-slate-100 text-sm">
                  <Wifi className="h-4 w-4 text-blue-500" />
                  Network Traffic
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowDown className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-slate-400">Download</span>
                    </div>
                    <div className="text-2xl font-mono text-green-400">
                      {formatBytes(health?.network_rx_bytes ?? 0)}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowUp className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-slate-400">Upload</span>
                    </div>
                    <div className="text-2xl font-mono text-blue-400">
                      {formatBytes(health?.network_tx_bytes ?? 0)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 text-center mt-4">
                  Total bytes transferred since system boot
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
