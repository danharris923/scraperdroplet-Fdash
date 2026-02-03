"use client"

import { CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react"
import type { SystemHealth } from "@/types"

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${days}d ${hours}h ${minutes}m`
}

interface HealthIndicatorProps {
  health: SystemHealth | undefined
  lastCheckTime: number
}

export function HealthIndicator({ health, lastCheckTime }: HealthIndicatorProps) {
  const getStatusConfig = (status: string | undefined) => {
    switch (status) {
      case 'healthy':
        return {
          icon: CheckCircle2,
          label: 'HEALTHY',
          bgClass: 'bg-green-500/10 border-green-500/30',
          textClass: 'text-green-400',
          iconClass: 'text-green-500',
        }
      case 'degraded':
        return {
          icon: AlertTriangle,
          label: 'DEGRADED',
          bgClass: 'bg-amber-500/10 border-amber-500/30',
          textClass: 'text-amber-400',
          iconClass: 'text-amber-500',
        }
      case 'critical':
        return {
          icon: XCircle,
          label: 'CRITICAL',
          bgClass: 'bg-red-500/10 border-red-500/30',
          textClass: 'text-red-400',
          iconClass: 'text-red-500',
        }
      default:
        return {
          icon: Clock,
          label: 'LOADING',
          bgClass: 'bg-slate-500/10 border-slate-500/30',
          textClass: 'text-slate-400',
          iconClass: 'text-slate-500',
        }
    }
  }

  const config = getStatusConfig(health?.status)
  const Icon = config.icon
  const timeSinceCheck = Math.floor((Date.now() - lastCheckTime) / 1000)

  return (
    <div className={`rounded-lg border ${config.bgClass} p-4 backdrop-blur-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bgClass}`}>
            <Icon className={`h-6 w-6 ${config.iconClass}`} />
          </div>
          <div>
            <div className={`text-lg font-bold ${config.textClass}`}>{config.label}</div>
            <div className="text-sm text-slate-400">System Status</div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right">
            <div className="text-sm text-slate-500">Uptime</div>
            <div className="text-lg font-mono text-cyan-400">
              {health ? formatUptime(health.uptime_seconds) : '--'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-500">Last Check</div>
            <div className="text-lg font-mono text-slate-300">
              {timeSinceCheck < 60 ? `${timeSinceCheck}s ago` : `${Math.floor(timeSinceCheck / 60)}m ago`}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
