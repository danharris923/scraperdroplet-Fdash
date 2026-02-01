"use client"

import { useEffect, useState, useRef } from "react"
import {
  Activity,
  AlertCircle,
  Bell,
  Bot,
  Command,
  Database,
  type LucideIcon,
  LineChart,
  Moon,
  Package,
  Play,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShoppingBag,
  Sun,
  Terminal,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useScrapers, useSystemHealth, useTriggerScraper } from "@/hooks/useDroplet"
import type { ScraperStatus, SystemHealth } from "@/types"
import { formatDistanceToNow } from "date-fns"

// Utility functions
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${days}d ${hours}h ${minutes}m`
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never'
  return formatDistanceToNow(new Date(dateString), { addSuffix: true })
}

// Component for nav items
function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
}: { icon: LucideIcon; label: string; active?: boolean; onClick?: () => void; badge?: string }) {
  return (
    <Button
      variant="ghost"
      className={`w-full justify-start ${active ? "bg-slate-800/70 text-cyan-400" : "text-slate-400 hover:text-slate-100"}`}
      onClick={onClick}
    >
      <Icon className="mr-2 h-4 w-4" />
      {label}
      {badge && (
        <Badge variant="outline" className="ml-auto bg-cyan-500/20 text-cyan-400 border-cyan-500/50 text-xs">
          {badge}
        </Badge>
      )}
    </Button>
  )
}

// Component for status items
function StatusItem({ label, value, color }: { label: string; value: number; color: string }) {
  const getBarColor = (val: number) => {
    if (val >= 90) return "from-red-500 to-red-400"
    if (val >= 70) return "from-amber-500 to-yellow-500"
    switch (color) {
      case "cyan": return "from-cyan-500 to-blue-500"
      case "purple": return "from-purple-500 to-pink-500"
      case "amber": return "from-amber-500 to-yellow-500"
      default: return "from-cyan-500 to-blue-500"
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-slate-400">{label}</div>
        <div className="text-xs text-slate-400">{value}%</div>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${getBarColor(value)} rounded-full`} style={{ width: `${value}%` }}></div>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
  detail,
}: {
  title: string
  value: number
  icon: LucideIcon
  trend: "up" | "down" | "stable"
  color: string
  detail: string
}) {
  const colorClasses: Record<string, string> = {
    amber: "from-amber-500 to-red-500 border-amber-500/30",
    green: "from-green-500 to-emerald-500 border-green-500/30",
    blue: "from-blue-500 to-indigo-500 border-blue-500/30",
    purple: "from-purple-500 to-pink-500 border-purple-500/30",
    cyan: "from-cyan-500 to-blue-500 border-cyan-500/30",
  }

  const getTrendIcon = () => {
    switch (trend) {
      case "up": return <TrendingUp className="h-4 w-4 text-green-500" />
      case "down": return <TrendingDown className="h-4 w-4 text-red-500" />
      default: return <LineChart className="h-4 w-4 text-blue-500" />
    }
  }

  return (
    <div className={`bg-slate-800/50 rounded-lg border ${colorClasses[color] || colorClasses.cyan} p-4 relative overflow-hidden`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-slate-400">{title}</div>
        <Icon className="h-5 w-5 text-cyan-500" />
      </div>
      <div className="text-2xl font-bold mb-1 bg-gradient-to-r bg-clip-text text-transparent from-slate-100 to-slate-300">
        {value}
      </div>
      <div className="text-xs text-slate-500">{detail}</div>
      <div className="absolute bottom-2 right-2 flex items-center">{getTrendIcon()}</div>
      <div className={`absolute -bottom-6 -right-6 h-16 w-16 rounded-full bg-gradient-to-r ${colorClasses[color] || colorClasses.cyan} opacity-20 blur-xl`}></div>
    </div>
  )
}

// System metrics chart
function SystemMetricsChart({ health }: { health: SystemHealth | undefined }) {
  const [history, setHistory] = useState<{ cpu: number; memory: number; disk: number }[]>([])

  useEffect(() => {
    if (health) {
      setHistory(prev => {
        const newHistory = [...prev, { cpu: health.cpu_percent, memory: health.memory_percent, disk: health.disk_percent }]
        return newHistory.slice(-24)
      })
    }
  }, [health])

  return (
    <div className="h-full w-full flex items-end justify-between px-4 pt-4 pb-8 relative">
      <div className="absolute left-2 top-0 h-full flex flex-col justify-between py-4">
        {[100, 75, 50, 25, 0].map(v => <div key={v} className="text-xs text-slate-500">{v}%</div>)}
      </div>

      <div className="absolute left-0 right-0 top-0 h-full flex flex-col justify-between py-4 px-10">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="border-b border-slate-700/30 w-full"></div>)}
      </div>

      <div className="flex-1 h-full flex items-end justify-between px-2 z-10">
        {Array.from({ length: 24 }).map((_, i) => {
          const data = history[i] || { cpu: 0, memory: 0, disk: 0 }
          return (
            <div key={i} className="flex space-x-0.5">
              <div className="w-1 bg-gradient-to-t from-cyan-500 to-cyan-400 rounded-t-sm transition-all duration-300" style={{ height: `${data.cpu}%` }}></div>
              <div className="w-1 bg-gradient-to-t from-purple-500 to-purple-400 rounded-t-sm transition-all duration-300" style={{ height: `${data.memory}%` }}></div>
              <div className="w-1 bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-sm transition-all duration-300" style={{ height: `${data.disk}%` }}></div>
            </div>
          )
        })}
      </div>

      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-10">
        {['-24', '-18', '-12', '-6', 'Now'].map(l => <div key={l} className="text-xs text-slate-500">{l}</div>)}
      </div>
    </div>
  )
}

// Scraper row
function ScraperRow({ scraper, onTrigger, isTriggering }: { scraper: ScraperStatus; onTrigger: () => void; isTriggering: boolean }) {
  const statusBadges: Record<string, JSX.Element> = {
    success: <Badge className="bg-green-500/20 text-green-400 border-green-500/50"><CheckCircle2 className="h-3 w-3 mr-1" />Success</Badge>,
    failed: <Badge className="bg-red-500/20 text-red-400 border-red-500/50"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>,
    running: <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Running</Badge>,
  }

  const typeColors: Record<string, string> = {
    browser: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
    shopify: 'bg-green-500/20 text-green-400 border-green-500/50',
    api: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    rss: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
    pipeline: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
  }

  return (
    <div className="grid grid-cols-12 py-3 px-3 text-sm hover:bg-slate-800/50 items-center border-b border-slate-700/30">
      <div className="col-span-3 font-medium text-slate-200 flex items-center gap-2">
        <Bot className="h-4 w-4 text-cyan-500" />
        {scraper.name}
      </div>
      <div className="col-span-1"><Badge variant="outline" className={typeColors[scraper.type] || ''}>{scraper.type}</Badge></div>
      <div className="col-span-2">{statusBadges[scraper.last_status] || <Badge className="bg-slate-500/20 text-slate-400">Unknown</Badge>}</div>
      <div className="col-span-2 text-slate-400 text-xs">{formatRelativeTime(scraper.last_run)}</div>
      <div className="col-span-2 text-slate-300">
        {scraper.items_found ?? 0}
        {(scraper.items_new ?? 0) > 0 && <span className="text-green-400 ml-1">(+{scraper.items_new})</span>}
      </div>
      <div className="col-span-1">{(scraper.errors ?? 0) > 0 ? <span className="text-red-400 font-medium">{scraper.errors}</span> : <span className="text-slate-500">0</span>}</div>
      <div className="col-span-1">
        <Button size="sm" variant="outline" className="h-7 px-2 bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20" onClick={onTrigger} disabled={isTriggering || scraper.last_status === 'running'}>
          {isTriggering ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  )
}

function AlertItem({ title, time, description, type }: { title: string; time: string; description: string; type: "warning" | "info" | "success" }) {
  const colors = { warning: "text-amber-500", info: "text-blue-500", success: "text-green-500" }
  return (
    <div className="flex items-start space-x-3">
      <AlertCircle className={`h-4 w-4 ${colors[type]}`} />
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-slate-400">{description}</div>
        <div className="text-xs text-slate-500">{time}</div>
      </div>
    </div>
  )
}

function ActionButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick?: () => void }) {
  return (
    <Button variant="outline" className="w-full justify-center bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-700 hover:text-slate-100" onClick={onClick}>
      <Icon className="mr-2 h-4 w-4" />{label}
    </Button>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [triggeringScrapers, setTriggeringScrapers] = useState<Set<string>>(new Set())
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { data: scrapers, isLoading: scrapersLoading, error: scrapersError } = useScrapers()
  const { data: health } = useSystemHealth()
  const triggerMutation = useTriggerScraper()

  const stats = {
    totalScrapers: scrapers?.length ?? 0,
    activeScrapers: scrapers?.filter(s => s.last_status === 'running').length ?? 0,
    successScrapers: scrapers?.filter(s => s.last_status === 'success').length ?? 0,
    errorCount: scrapers?.reduce((sum, s) => sum + (s.errors ?? 0), 0) ?? 0,
    totalItemsFound: scrapers?.reduce((sum, s) => sum + (s.items_found ?? 0), 0) ?? 0,
    newItemsToday: scrapers?.reduce((sum, s) => sum + (s.items_new ?? 0), 0) ?? 0,
  }

  const handleTrigger = async (scraperName: string) => {
    setTriggeringScrapers(prev => new Set(prev).add(scraperName))
    try { await triggerMutation.mutateAsync(scraperName) }
    finally { setTriggeringScrapers(prev => { const n = new Set(prev); n.delete(scraperName); return n }) }
  }

  useEffect(() => { const t = setTimeout(() => setIsLoading(false), 1500); return () => clearTimeout(t) }, [])
  useEffect(() => { const i = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(i) }, [])

  // Particle effect
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext("2d"); if (!ctx) return
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1, speedX: (Math.random() - 0.5) * 0.3, speedY: (Math.random() - 0.5) * 0.3,
      color: `rgba(${50 + Math.random() * 50}, ${150 + Math.random() * 100}, ${200 + Math.random() * 55}, ${0.1 + Math.random() * 0.4})`
    }))

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.speedX; p.y += p.speedY
        if (p.x > canvas.width) p.x = 0; if (p.x < 0) p.x = canvas.width
        if (p.y > canvas.height) p.y = 0; if (p.y < 0) p.y = canvas.height
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
      })
      requestAnimationFrame(animate)
    }
    animate()

    const handleResize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const formatTime = (d: Date) => d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })
  const formatDate = (d: Date) => d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  const navigateTo = (path: string) => router.push(path)

  return (
    <div className={`${theme} min-h-screen bg-gradient-to-br from-black to-slate-800 text-slate-100 relative overflow-hidden`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-30" />

      {isLoading && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full animate-ping"></div>
              <div className="absolute inset-2 border-4 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-4 border-4 border-r-blue-500 border-t-transparent border-b-transparent border-l-transparent rounded-full animate-spin" style={{ animationDuration: '1.5s' }}></div>
              <div className="absolute inset-6 border-4 border-b-purple-500 border-t-transparent border-r-transparent border-l-transparent rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>
            </div>
            <div className="mt-4 text-cyan-500 font-mono text-sm tracking-wider">INITIALIZING SCRAPER MONITOR</div>
          </div>
        </div>
      )}

      <div className="container mx-auto p-4 relative z-10">
        <header className="flex items-center justify-between py-4 border-b border-slate-700/50 mb-6">
          <div className="flex items-center space-x-2">
            <Database className="h-8 w-8 text-cyan-500" />
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">SCRAPER DASHBOARD</span>
          </div>
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center space-x-1 bg-slate-800/50 rounded-full px-3 py-1.5 border border-slate-700/50 backdrop-blur-sm">
              <Search className="h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search scrapers..." className="bg-transparent border-none focus:outline-none text-sm w-40 placeholder:text-slate-500" />
            </div>
            <div className="flex items-center space-x-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-slate-100">
                      <Bell className="h-5 w-5" />
                      {stats.errorCount > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs flex items-center justify-center">{stats.errorCount}</span>}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Notifications</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="text-slate-400 hover:text-slate-100">
                      {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Toggle theme</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Avatar><AvatarImage src="/placeholder.svg?height=40&width=40" alt="User" /><AvatarFallback className="bg-slate-700 text-cyan-500">SD</AvatarFallback></Avatar>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-12 md:col-span-3 lg:col-span-2">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm h-full">
              <CardContent className="p-4">
                <nav className="space-y-2">
                  <NavItem icon={Command} label="Dashboard" active />
                  <NavItem icon={Bot} label="Scrapers" badge={String(stats.totalScrapers)} />
                  <NavItem icon={Server} label="Server" onClick={() => navigateTo("/server")} />
                  <NavItem icon={ShoppingBag} label="Products" onClick={() => navigateTo("/products")} />
                  <NavItem icon={ArrowUpDown} label="Compare" onClick={() => navigateTo("/compare")} />
                  <NavItem icon={Terminal} label="Logs" onClick={() => navigateTo("/logs")} />
                  <NavItem icon={Settings} label="Settings" />
                </nav>
                <div className="mt-8 pt-6 border-t border-slate-700/50">
                  <div className="text-xs text-slate-500 mb-2 font-mono">SYSTEM STATUS</div>
                  <div className="space-y-3">
                    <StatusItem label="CPU Usage" value={health?.cpu_percent ?? 0} color="cyan" />
                    <StatusItem label="Memory" value={health?.memory_percent ?? 0} color="purple" />
                    <StatusItem label="Disk" value={health?.disk_percent ?? 0} color="amber" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main content */}
          <div className="col-span-12 md:col-span-9 lg:col-span-7">
            <div className="grid gap-6">
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="border-b border-slate-700/50 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-slate-100 flex items-center"><Activity className="mr-2 h-5 w-5 text-cyan-500" />System Overview</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-slate-800/50 text-cyan-400 border-cyan-500/50 text-xs"><div className="h-1.5 w-1.5 rounded-full bg-cyan-500 mr-1 animate-pulse"></div>LIVE</Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><RefreshCw className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MetricCard title="Active Scrapers" value={stats.activeScrapers} icon={Bot} trend="stable" color="cyan" detail={`of ${stats.totalScrapers} total`} />
                    <MetricCard title="Items Found" value={stats.totalItemsFound} icon={Package} trend="up" color="green" detail={`+${stats.newItemsToday} new today`} />
                    <MetricCard title="Errors" value={stats.errorCount} icon={AlertCircle} trend={stats.errorCount > 0 ? "up" : "stable"} color={stats.errorCount > 0 ? "amber" : "green"} detail="total errors" />
                  </div>

                  <div className="mt-8">
                    <Tabs defaultValue="scrapers" className="w-full">
                      <div className="flex items-center justify-between mb-4">
                        <TabsList className="bg-slate-800/50 p-1">
                          <TabsTrigger value="scrapers" className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400">Scrapers</TabsTrigger>
                          <TabsTrigger value="metrics" className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400">Metrics</TabsTrigger>
                        </TabsList>
                        <div className="flex items-center space-x-2 text-xs text-slate-400">
                          <div className="flex items-center"><div className="h-2 w-2 rounded-full bg-cyan-500 mr-1"></div>CPU</div>
                          <div className="flex items-center"><div className="h-2 w-2 rounded-full bg-purple-500 mr-1"></div>Memory</div>
                          <div className="flex items-center"><div className="h-2 w-2 rounded-full bg-amber-500 mr-1"></div>Disk</div>
                        </div>
                      </div>

                      <TabsContent value="scrapers" className="mt-0">
                        <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 overflow-hidden">
                          <div className="grid grid-cols-12 text-xs text-slate-400 p-3 border-b border-slate-700/50 bg-slate-800/50 font-medium">
                            <div className="col-span-3">Name</div><div className="col-span-1">Type</div><div className="col-span-2">Status</div>
                            <div className="col-span-2">Last Run</div><div className="col-span-2">Items</div><div className="col-span-1">Errors</div><div className="col-span-1">Action</div>
                          </div>
                          <div className="max-h-80 overflow-y-auto">
                            {scrapersLoading ? (
                              <div className="p-8 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading scrapers...</div>
                            ) : scrapersError ? (
                              <div className="p-8 text-center text-red-400">Failed to load scrapers</div>
                            ) : scrapers && scrapers.length > 0 ? (
                              scrapers.map(scraper => <ScraperRow key={scraper.name} scraper={scraper} onTrigger={() => handleTrigger(scraper.name)} isTriggering={triggeringScrapers.has(scraper.name)} />)
                            ) : (
                              <div className="p-8 text-center text-slate-400">No scrapers found</div>
                            )}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="metrics" className="mt-0">
                        <div className="h-64 w-full relative bg-slate-800/30 rounded-lg border border-slate-700/50 overflow-hidden">
                          <SystemMetricsChart health={health} />
                          <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-sm rounded-md px-3 py-2 border border-slate-700/50">
                            <div className="text-xs text-slate-400">System Status</div>
                            <div className={`text-lg font-mono ${health?.status === 'healthy' ? 'text-green-400' : health?.status === 'degraded' ? 'text-amber-400' : 'text-red-400'}`}>{health?.status?.toUpperCase() ?? 'UNKNOWN'}</div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                  <CardHeader className="pb-2"><CardTitle className="text-slate-100 flex items-center text-base"><Server className="mr-2 h-5 w-5 text-cyan-500" />Server Status</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between"><div className="text-sm text-slate-400">Droplet API</div><Badge className={health ? "bg-green-500/20 text-green-400 border-green-500/50" : "bg-red-500/20 text-red-400 border-red-500/50"}>{health ? 'Online' : 'Offline'}</Badge></div>
                      <div className="flex items-center justify-between"><div className="text-sm text-slate-400">Scrapers Active</div><Badge className="bg-green-500/20 text-green-400 border-green-500/50">{stats.activeScrapers} Running</Badge></div>
                      <div className="flex items-center justify-between"><div className="text-sm text-slate-400">Data Sync</div><Badge className="bg-green-500/20 text-green-400 border-green-500/50">Real-time</Badge></div>
                      <div className="pt-2 mt-2 border-t border-slate-700/50">
                        <div className="flex items-center justify-between mb-2"><div className="text-sm font-medium">Network I/O</div><div className="text-sm text-cyan-400">{health ? `${formatBytes(health.network_rx_bytes)} / ${formatBytes(health.network_tx_bytes)}` : 'N/A'}</div></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                  <CardHeader className="pb-2"><CardTitle className="text-slate-100 flex items-center text-base"><AlertCircle className="mr-2 h-5 w-5 text-amber-500" />Recent Alerts</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.errorCount > 0 && <AlertItem title="Scraper Errors Detected" time="Now" description={`${stats.errorCount} errors across scrapers`} type="warning" />}
                      <AlertItem title="System Online" time={formatTime(currentTime)} description="All systems operational" type="success" />
                      <AlertItem title="Data Sync Active" time="Continuous" description="Real-time data synchronization enabled" type="info" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="col-span-12 lg:col-span-3">
            <div className="grid gap-6">
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 border-b border-slate-700/50">
                    <div className="text-center">
                      <div className="text-xs text-slate-500 mb-1 font-mono">SYSTEM TIME</div>
                      <div className="text-3xl font-mono text-cyan-400 mb-1">{formatTime(currentTime)}</div>
                      <div className="text-sm text-slate-400">{formatDate(currentTime)}</div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-800/50 rounded-md p-3 border border-slate-700/50"><div className="text-xs text-slate-500 mb-1">Uptime</div><div className="text-sm font-mono text-slate-200">{health ? formatUptime(health.uptime_seconds) : 'N/A'}</div></div>
                      <div className="bg-slate-800/50 rounded-md p-3 border border-slate-700/50"><div className="text-xs text-slate-500 mb-1">Disk</div><div className="text-sm font-mono text-slate-200">{health ? `${health.disk_used_gb.toFixed(1)}/${health.disk_total_gb.toFixed(0)}GB` : 'N/A'}</div></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader className="pb-2"><CardTitle className="text-slate-100 text-base">Quick Actions</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <ActionButton icon={Play} label="Run All" />
                    <ActionButton icon={RefreshCw} label="Sync Data" />
                    <ActionButton icon={Terminal} label="View Logs" onClick={() => navigateTo('/logs')} />
                    <ActionButton icon={Settings} label="Settings" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader className="pb-2"><CardTitle className="text-slate-100 text-base">Resource Usage</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[{ label: 'CPU', value: health?.cpu_percent ?? 0, color: 'cyan' }, { label: 'Memory', value: health?.memory_percent ?? 0, color: 'purple' }, { label: 'Disk', value: health?.disk_percent ?? 0, color: 'amber' }].map(r => (
                      <div key={r.label}>
                        <div className="flex items-center justify-between mb-1"><div className="text-sm text-slate-400">{r.label}</div><div className={`text-xs ${r.value > 80 ? 'text-red-400' : `text-${r.color}-400`}`}>{r.value}%</div></div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${r.value > 80 ? 'bg-gradient-to-r from-red-500 to-red-400' : `bg-gradient-to-r from-${r.color}-500 to-${r.color}-400`}`} style={{ width: `${r.value}%` }}></div></div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader className="pb-2"><CardTitle className="text-slate-100 text-base">Scraper Stats</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between"><div className="text-sm text-slate-400">Total Scrapers</div><div className="text-sm font-medium text-cyan-400">{stats.totalScrapers}</div></div>
                    <div className="flex items-center justify-between"><div className="text-sm text-slate-400">Success Rate</div><div className="text-sm font-medium text-green-400">{stats.totalScrapers > 0 ? Math.round((stats.successScrapers / stats.totalScrapers) * 100) : 0}%</div></div>
                    <div className="flex items-center justify-between"><div className="text-sm text-slate-400">Items Today</div><div className="text-sm font-medium text-purple-400">+{stats.newItemsToday}</div></div>
                    <div className="pt-2 border-t border-slate-700/50">
                      <div className="text-xs text-slate-500 mb-2">By Type</div>
                      <div className="text-xs text-slate-400 space-y-1">
                        {['browser', 'shopify', 'api', 'rss', 'pipeline'].map(type => {
                          const count = scrapers?.filter(s => s.type === type).length ?? 0
                          return count > 0 ? <div key={type} className="flex items-center justify-between"><span className="capitalize">{type}</span><span className="text-slate-300">{count}</span></div> : null
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader className="pb-2"><CardTitle className="text-slate-100 text-base">Monitor Settings</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[{ icon: Bell, label: 'Error Alerts' }, { icon: Zap, label: 'Auto Retry' }, { icon: Clock, label: '24/7 Monitor' }].map(s => (
                      <div key={s.label} className="flex items-center justify-between">
                        <div className="flex items-center"><s.icon className="text-cyan-500 mr-2 h-4 w-4" /><Label className="text-sm text-slate-400">{s.label}</Label></div>
                        <Switch defaultChecked />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
