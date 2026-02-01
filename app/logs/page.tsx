"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  Terminal,
  RefreshCw,
  Pause,
  Play,
  Download,
  Trash2,
  Loader2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useScrapers, useScraperLogs } from "@/hooks/useDroplet"

function LogLine({ line, index }: { line: string; index: number }) {
  const getLogColor = (text: string) => {
    if (text.includes('ERROR') || text.includes('error') || text.includes('Error')) return 'text-red-400'
    if (text.includes('WARN') || text.includes('warn') || text.includes('Warning')) return 'text-amber-400'
    if (text.includes('SUCCESS') || text.includes('success') || text.includes('completed')) return 'text-green-400'
    if (text.includes('INFO') || text.includes('info')) return 'text-blue-400'
    if (text.includes('DEBUG') || text.includes('debug')) return 'text-purple-400'
    return 'text-slate-400'
  }

  return (
    <div className={`font-mono text-xs py-0.5 px-2 hover:bg-slate-800/50 ${getLogColor(line)}`}>
      <span className="text-slate-600 select-none mr-3">{String(index + 1).padStart(4, ' ')}</span>
      {line}
    </div>
  )
}

export default function LogsPage() {
  const router = useRouter()
  const [selectedScraper, setSelectedScraper] = useState<string>("")
  const [isPaused, setIsPaused] = useState(false)
  const logContainerRef = useRef<HTMLDivElement>(null)

  const { data: scrapers, isLoading: scrapersLoading } = useScrapers()
  const { data: logs, isLoading: logsLoading, error: logsError, refetch } = useScraperLogs(selectedScraper, !!selectedScraper && !isPaused)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logContainerRef.current && !isPaused) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs, isPaused])

  // Set first scraper as default
  useEffect(() => {
    if (scrapers && scrapers.length > 0 && !selectedScraper) {
      setSelectedScraper(scrapers[0].name)
    }
  }, [scrapers, selectedScraper])

  const downloadLogs = () => {
    if (!logs || logs.length === 0) return
    const content = logs.join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedScraper}-logs-${new Date().toISOString()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-slate-800 text-slate-100 p-6">
      <div className="container mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="text-slate-400 hover:text-slate-100">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Terminal className="h-8 w-8 text-cyan-500" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Scraper Logs
              </h1>
            </div>
          </div>
        </div>

        {/* Controls */}
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">Scraper:</span>
                  <Select value={selectedScraper} onValueChange={setSelectedScraper}>
                    <SelectTrigger className="w-[200px] bg-slate-800/50 border-slate-700/50 text-slate-200">
                      <SelectValue placeholder="Select scraper" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {scrapersLoading ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : scrapers && scrapers.length > 0 ? (
                        scrapers.map(s => (
                          <SelectItem key={s.name} value={s.name} className="text-slate-200 focus:bg-slate-800">
                            {s.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No scrapers found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Badge variant="outline" className={`${isPaused ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'bg-green-500/20 text-green-400 border-green-500/50'}`}>
                  {isPaused ? 'Paused' : 'Live'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPaused(!isPaused)}
                  className="bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-100"
                >
                  {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={logsLoading}
                  className="bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-100"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${logsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadLogs}
                  disabled={!logs || logs.length === 0}
                  className="bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-100"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Log Viewer */}
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-700/50 py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-slate-100 text-sm font-mono">
                <Terminal className="h-4 w-4 text-cyan-500" />
                {selectedScraper || 'Select a scraper'}
              </CardTitle>
              {logs && (
                <Badge variant="outline" className="bg-slate-800/50 text-slate-400 border-slate-600/50 font-mono">
                  {logs.length} lines
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div
              ref={logContainerRef}
              className="h-[600px] overflow-auto bg-slate-950/50 font-mono text-sm"
            >
              {!selectedScraper ? (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <div className="text-center">
                    <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a scraper to view logs</p>
                  </div>
                </div>
              ) : logsLoading ? (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : logsError ? (
                <div className="flex items-center justify-center h-full text-red-400">
                  <div className="text-center">
                    <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Failed to load logs</p>
                    <p className="text-sm text-slate-500 mt-1">The scraper may not have any logs yet</p>
                  </div>
                </div>
              ) : logs && logs.length > 0 ? (
                <div className="py-2">
                  {logs.map((line, index) => (
                    <LogLine key={index} line={line} index={index} />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <div className="text-center">
                    <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No logs available</p>
                    <p className="text-sm text-slate-500 mt-1">Run the scraper to generate logs</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
