"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { HealthHistoryPoint } from "@/types"

interface StatCardWithSparklineProps {
  title: string
  value: number
  unit?: string
  icon: React.ReactNode
  history: HealthHistoryPoint[]
  dataKey: 'cpu' | 'memory' | 'disk'
  color: 'cyan' | 'purple' | 'amber' | 'green'
}

const colorMap = {
  cyan: { stroke: '#22d3ee', fill: '#22d3ee', text: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  purple: { stroke: '#a855f7', fill: '#a855f7', text: 'text-purple-400', bg: 'bg-purple-500/10' },
  amber: { stroke: '#f59e0b', fill: '#f59e0b', text: 'text-amber-400', bg: 'bg-amber-500/10' },
  green: { stroke: '#22c55e', fill: '#22c55e', text: 'text-green-400', bg: 'bg-green-500/10' },
}

export function StatCardWithSparkline({
  title,
  value,
  unit = '%',
  icon,
  history,
  dataKey,
  color,
}: StatCardWithSparklineProps) {
  const colors = colorMap[color]
  const data = history.map(h => h[dataKey])

  // Generate sparkline path
  const sparklinePath = () => {
    if (data.length < 2) return ''

    const width = 100
    const height = 30
    const max = Math.max(...data, 100)
    const min = Math.min(...data, 0)
    const range = max - min || 1

    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((val - min) / range) * height
      return `${x},${y}`
    })

    return `M ${points.join(' L ')}`
  }

  const areaPath = () => {
    if (data.length < 2) return ''

    const width = 100
    const height = 30
    const max = Math.max(...data, 100)
    const min = Math.min(...data, 0)
    const range = max - min || 1

    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((val - min) / range) * height
      return `${x},${y}`
    })

    return `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`
  }

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded ${colors.bg}`}>
              {icon}
            </div>
            <span className="text-sm text-slate-400">{title}</span>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div className={`text-3xl font-bold ${colors.text}`}>
            {value.toFixed(0)}<span className="text-lg ml-0.5">{unit}</span>
          </div>

          {data.length >= 2 && (
            <svg width="100" height="30" className="opacity-80">
              <defs>
                <linearGradient id={`gradient-${dataKey}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={colors.fill} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={colors.fill} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={areaPath()}
                fill={`url(#gradient-${dataKey})`}
              />
              <path
                d={sparklinePath()}
                fill="none"
                stroke={colors.stroke}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
