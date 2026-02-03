"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from "lucide-react"
import type { HealthHistoryPoint } from "@/types"

interface ActivityLineChartProps {
  history: HealthHistoryPoint[]
}

export function ActivityLineChart({ history }: ActivityLineChartProps) {
  const width = 400
  const height = 150
  const padding = { top: 20, right: 20, bottom: 30, left: 40 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const data = history.slice(-20) // Show last 20 points

  if (data.length < 2) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-slate-100 text-sm">
            <Activity className="h-4 w-4 text-cyan-500" />
            Resource Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[150px] flex items-center justify-center text-slate-500 text-sm">
            Collecting data...
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxValue = 100
  const minValue = 0

  const getY = (value: number) => {
    return chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight
  }

  const getX = (index: number) => {
    return (index / (data.length - 1)) * chartWidth
  }

  const createPath = (key: 'cpu' | 'memory' | 'disk') => {
    return data.map((point, i) => {
      const x = getX(i)
      const y = getY(point[key])
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')
  }

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-slate-100 text-sm">
          <Activity className="h-4 w-4 text-cyan-500" />
          Resource Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          <g transform={`translate(${padding.left}, ${padding.top})`}>
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(val => (
              <g key={val}>
                <line
                  x1={0}
                  y1={getY(val)}
                  x2={chartWidth}
                  y2={getY(val)}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="4"
                />
                <text
                  x={-8}
                  y={getY(val)}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="end"
                  alignmentBaseline="middle"
                >
                  {val}
                </text>
              </g>
            ))}

            {/* CPU line */}
            <path
              d={createPath('cpu')}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Memory line */}
            <path
              d={createPath('memory')}
              fill="none"
              stroke="#a855f7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Disk line */}
            <path
              d={createPath('disk')}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-400" />
            <span className="text-xs text-slate-400">CPU</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-400" />
            <span className="text-xs text-slate-400">Memory</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="text-xs text-slate-400">Disk</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
