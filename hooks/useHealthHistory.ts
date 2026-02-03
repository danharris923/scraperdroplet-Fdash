import { useState, useEffect, useRef, useCallback } from 'react'
import type { SystemHealth, HealthHistoryPoint } from '@/types'

const MAX_HISTORY_POINTS = 30

export function useHealthHistory(health: SystemHealth | undefined) {
  const [history, setHistory] = useState<HealthHistoryPoint[]>([])
  const lastUpdateRef = useRef<number>(0)

  const addPoint = useCallback((healthData: SystemHealth) => {
    const now = Date.now()
    // Only add a new point if at least 5 seconds have passed
    if (now - lastUpdateRef.current < 5000) return

    lastUpdateRef.current = now
    setHistory(prev => {
      const newPoint: HealthHistoryPoint = {
        timestamp: now,
        cpu: healthData.cpu_percent,
        memory: healthData.memory_percent,
        disk: healthData.disk_percent,
      }
      const updated = [...prev, newPoint]
      // Keep only the last MAX_HISTORY_POINTS
      return updated.slice(-MAX_HISTORY_POINTS)
    })
  }, [])

  useEffect(() => {
    if (health) {
      addPoint(health)
    }
  }, [health, addPoint])

  return history
}
