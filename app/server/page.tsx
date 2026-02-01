"use client"

import { useSystemHealth } from "@/hooks/useDroplet"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Server,
  Cpu,
  HardDrive,
  Database,
  Wifi,
  ArrowDown,
  ArrowUp,
  Clock,
  Activity,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${days}d ${hours}h ${minutes}m ${secs}s`
}

function GaugeCard({ title, value, icon: Icon, color, detail }: { title: string; value: number; icon: any; color: string; detail?: string }) {
  const getStatusColor = (val: number) => {
    if (val >= 90) return { bg: 'from-red-500 to-red-400', text: 'text-red-400', ring: 'ring-red-500/30' }
    if (val >= 70) return { bg: 'from-amber-500 to-yellow-500', text: 'text-amber-400', ring: 'ring-amber-500/30' }
    return { bg: `from-${color}-500 to-${color}-400`, text: `text-${color}-400`, ring: `ring-${color}-500/30` }
  }

  const status = getStatusColor(value)

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${status.text}`} />
            <span className="text-sm font-medium text-slate-300">{title}</span>
          </div>
          <Badge variant="outline" className={`${value >= 90 ? 'bg-red-500/20 text-red-400 border-red-500/50' : value >= 70 ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'bg-green-500/20 text-green-400 border-green-500/50'}`}>
            {value >= 90 ? 'Critical' : value >= 70 ? 'Warning' : 'Healthy'}
          </Badge>
        </div>

        <div className="relative">
          <div className="flex items-center justify-center">
            <div className={`relative w-32 h-32 rounded-full ring-4 ${status.ring} bg-slate-800/50`}>
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-700" />
                <circle
                  cx="50" cy="50" r="45" fill="none" strokeWidth="8"
                  strokeLinecap="round"
                  className={value >= 90 ? 'text-red-500' : value >= 70 ? 'text-amber-500' : `text-${color}-500`}
                  strokeDasharray={`${value * 2.83} 283`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${status.text}`}>{value}%</span>
              </div>
            </div>
          </div>
        </div>

        {detail && <div className="text-center text-xs text-slate-500 mt-4">{detail}</div>}
      </CardContent>
    </Card>
  )
}

export default function ServerPage() {
  const router = useRouter()
  const { data: health, isLoading, error, refetch } = useSystemHealth()

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'degraded': return <AlertTriangle className="h-5 w-5 text-amber-500" />
      case 'critical': return <XCircle className="h-5 w-5 text-red-500" />
      default: return <Activity className="h-5 w-5 text-slate-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-slate-800 text-slate-100 p-6">
      <div className="container mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="text-slate-400 hover:text-slate-100">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Server className="h-8 w-8 text-cyan-500" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Server Health</h1>
            </div>
          </div>
          <Button variant="outline" onClick={() => refetch()} className="bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-100">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : error ? (
          <Card className="bg-red-500/10 border-red-500/50">
            <CardContent className="p-6 text-center text-red-400">
              Failed to load server health data. The server may be offline.
            </CardContent>
          </Card>
        ) : health ? (
          <div className="space-y-6">
            {/* Status Banner */}
            <Card className={`border-2 ${health.status === 'healthy' ? 'bg-green-500/10 border-green-500/50' : health.status === 'degraded' ? 'bg-amber-500/10 border-amber-500/50' : 'bg-red-500/10 border-red-500/50'}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(health.status)}
                    <div>
                      <h2 className="text-lg font-semibold">System Status: {health.status.toUpperCase()}</h2>
                      <p className="text-sm text-slate-400">All services are monitored in real-time</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-400">Uptime</div>
                    <div className="text-lg font-mono text-cyan-400">{formatUptime(health.uptime_seconds)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resource Gauges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GaugeCard title="CPU Usage" value={Math.round(health.cpu_percent)} icon={Cpu} color="cyan" detail="Processing power utilization" />
              <GaugeCard title="Memory Usage" value={Math.round(health.memory_percent)} icon={Database} color="purple" detail="RAM consumption" />
              <GaugeCard title="Disk Usage" value={Math.round(health.disk_percent)} icon={HardDrive} color="amber" detail={`${health.disk_used_gb.toFixed(1)} GB / ${health.disk_total_gb.toFixed(0)} GB`} />
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Disk Details */}
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-100">
                    <HardDrive className="h-5 w-5 text-amber-500" />
                    Disk Storage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Used</span>
                      <span className="text-slate-200">{health.disk_used_gb.toFixed(2)} GB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Total</span>
                      <span className="text-slate-200">{health.disk_total_gb.toFixed(2)} GB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Free</span>
                      <span className="text-green-400">{(health.disk_total_gb - health.disk_used_gb).toFixed(2)} GB</span>
                    </div>
                  </div>
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${health.disk_percent >= 90 ? 'bg-gradient-to-r from-red-500 to-red-400' : health.disk_percent >= 70 ? 'bg-gradient-to-r from-amber-500 to-yellow-500' : 'bg-gradient-to-r from-amber-500 to-amber-400'}`}
                      style={{ width: `${health.disk_percent}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Network Stats */}
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-100">
                    <Wifi className="h-5 w-5 text-blue-500" />
                    Network Traffic
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowDown className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-slate-400">Download</span>
                      </div>
                      <div className="text-xl font-mono text-green-400">{formatBytes(health.network_rx_bytes)}</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowUp className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-slate-400">Upload</span>
                      </div>
                      <div className="text-xl font-mono text-blue-400">{formatBytes(health.network_tx_bytes)}</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 text-center">Total bytes transferred since system boot</div>
                </CardContent>
              </Card>
            </div>

            {/* System Info */}
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-100">
                  <Clock className="h-5 w-5 text-cyan-500" />
                  System Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="text-xs text-slate-500 mb-1">Status</div>
                    <div className={`text-lg font-medium capitalize ${health.status === 'healthy' ? 'text-green-400' : health.status === 'degraded' ? 'text-amber-400' : 'text-red-400'}`}>{health.status}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="text-xs text-slate-500 mb-1">Uptime</div>
                    <div className="text-lg font-mono text-slate-200">{formatUptime(health.uptime_seconds)}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="text-xs text-slate-500 mb-1">CPU Load</div>
                    <div className="text-lg font-mono text-cyan-400">{health.cpu_percent.toFixed(1)}%</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="text-xs text-slate-500 mb-1">Memory Load</div>
                    <div className="text-lg font-mono text-purple-400">{health.memory_percent.toFixed(1)}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  )
}
