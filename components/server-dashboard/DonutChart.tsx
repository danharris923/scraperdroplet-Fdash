"use client"

interface DonutChartProps {
  value: number
  label: string
  color: 'cyan' | 'purple' | 'amber'
  size?: number
}

const colorMap = {
  cyan: { stroke: '#22d3ee', text: 'text-cyan-400', glow: 'drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' },
  purple: { stroke: '#a855f7', text: 'text-purple-400', glow: 'drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]' },
  amber: { stroke: '#f59e0b', text: 'text-amber-400', glow: 'drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' },
}

export function DonutChart({ value, label, color, size = 100 }: DonutChartProps) {
  const colors = colorMap[color]
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (value / 100) * circumference

  const getStatusColor = (val: number) => {
    if (val >= 90) return { stroke: '#ef4444', text: 'text-red-400' } // red
    if (val >= 70) return { stroke: '#f59e0b', text: 'text-amber-400' } // amber
    return colors
  }

  const statusColor = getStatusColor(value)

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={`transform -rotate-90 ${colors.glow}`}
        >
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={statusColor.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${statusColor.text}`}>{value.toFixed(0)}%</span>
        </div>
      </div>
      <span className="text-sm text-slate-400 mt-2">{label}</span>
    </div>
  )
}
