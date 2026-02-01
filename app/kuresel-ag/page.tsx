"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Globe, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function KureselAgPage() {
  const router = useRouter()
  const [globalEarthquakes, setGlobalEarthquakes] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const mapRef = useRef(null)

  useEffect(() => {
    fetchGlobalData()
    const interval = setInterval(fetchGlobalData, 60000) // Her dakika güncelle
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (globalEarthquakes.length > 0) {
      drawMap()
    }
  }, [globalEarthquakes])

  const fetchGlobalData = async () => {
    setLoading(true)
    try {
      // USGS API'sinden gerçek veri çekilebilir
      // Şimdilik simüle ediyoruz
      const simulatedData = Array.from({ length: 30 }, (_, i) => ({
        id: `eq-global-${Date.now()}-${i}`,
        magnitude: Number.parseFloat((Math.random() * 6 + 2).toFixed(1)),
        depth: Math.floor(Math.random() * 200) + 5,
        location: [
          Number.parseFloat((Math.random() * 180 - 90).toFixed(2)), // latitude
          Number.parseFloat((Math.random() * 360 - 180).toFixed(2)), // longitude
        ],
        region: [
          "Alaska",
          "California",
          "Japan",
          "Indonesia",
          "Chile",
          "Mexico",
          "New Zealand",
          "Philippines",
          "Peru",
          "Italy",
          "Greece",
          "Turkey",
          "Iran",
          "Pakistan",
          "China",
          "Taiwan",
          "Hawaii",
          "Iceland",
          "Russia",
          "Australia",
          "Papua New Guinea",
          "Fiji",
          "Solomon Islands",
          "Vanuatu",
          "Tonga",
          "South Africa",
          "Brazil",
          "Argentina",
          "Colombia",
          "Ecuador",
        ][i],
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 86400000 * 7)), // Son 7 gün
        tsunami: Math.random() > 0.9, // %10 ihtimalle tsunami uyarısı
        source: ["USGS", "EMSC", "GFZ", "INGV", "JMA"][Math.floor(Math.random() * 5)],
      }))

      setGlobalEarthquakes(simulatedData)
      setLastUpdate(new Date())
    } catch (error) {
      console.error("Küresel deprem verisi çekerken hata oluştu:", error)
    } finally {
      setLoading(false)
    }
  }

  const drawMap = () => {
    const canvas = mapRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Draw map background
    ctx.fillStyle = "#1e293b"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw grid lines
    ctx.strokeStyle = "#334155"
    ctx.lineWidth = 0.5

    // Vertical grid lines
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, canvas.height)
      ctx.stroke()
    }

    // Horizontal grid lines
    for (let i = 0; i < canvas.height; i += 40) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(canvas.width, i)
      ctx.stroke()
    }

    // Draw simplified continents
    ctx.strokeStyle = "#64748b"
    ctx.lineWidth = 1.5

    // North America
    ctx.beginPath()
    ctx.moveTo(canvas.width * 0.1, canvas.height * 0.2)
    ctx.lineTo(canvas.width * 0.2, canvas.height * 0.2)
    ctx.lineTo(canvas.width * 0.25, canvas.height * 0.4)
    ctx.lineTo(canvas.width * 0.15, canvas.height * 0.5)
    ctx.lineTo(canvas.width * 0.1, canvas.height * 0.3)
    ctx.closePath()
    ctx.stroke()

    // South America
    ctx.beginPath()
    ctx.moveTo(canvas.width * 0.2, canvas.height * 0.5)
    ctx.lineTo(canvas.width * 0.25, canvas.height * 0.7)
    ctx.lineTo(canvas.width * 0.2, canvas.height * 0.8)
    ctx.lineTo(canvas.width * 0.15, canvas.height * 0.6)
    ctx.closePath()
    ctx.stroke()

    // Europe and Africa
    ctx.beginPath()
    ctx.moveTo(canvas.width * 0.4, canvas.height * 0.2)
    ctx.lineTo(canvas.width * 0.5, canvas.height * 0.2)
    ctx.lineTo(canvas.width * 0.55, canvas.height * 0.4)
    ctx.lineTo(canvas.width * 0.5, canvas.height * 0.7)
    ctx.lineTo(canvas.width * 0.4, canvas.height * 0.6)
    ctx.lineTo(canvas.width * 0.35, canvas.height * 0.4)
    ctx.closePath()
    ctx.stroke()

    // Asia and Australia
    ctx.beginPath()
    ctx.moveTo(canvas.width * 0.5, canvas.height * 0.2)
    ctx.lineTo(canvas.width * 0.8, canvas.height * 0.2)
    ctx.lineTo(canvas.width * 0.85, canvas.height * 0.4)
    ctx.lineTo(canvas.width * 0.7, canvas.height * 0.5)
    ctx.lineTo(canvas.width * 0.6, canvas.height * 0.4)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(canvas.width * 0.7, canvas.height * 0.6)
    ctx.lineTo(canvas.width * 0.8, canvas.height * 0.7)
    ctx.lineTo(canvas.width * 0.75, canvas.height * 0.8)
    ctx.lineTo(canvas.width * 0.65, canvas.height * 0.7)
    ctx.closePath()
    ctx.stroke()

    // Draw earthquakes
    globalEarthquakes.forEach((eq) => {
      // Convert lat/long to canvas coordinates
      const x = ((eq.location[1] + 180) / 360) * canvas.width
      const y = ((eq.location[0] + 90) / 180) * canvas.height

      // Size based on magnitude
      const size = eq.magnitude * 2

      // Color based on depth
      const depthColor = eq.depth < 50 ? "#f59e0b" : eq.depth < 100 ? "#8b5cf6" : "#3b82f6"

      // Draw earthquake circle
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fillStyle = depthColor
      ctx.fill()
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 0.5
      ctx.stroke()

      // Draw tsunami warning if applicable
      if (eq.tsunami) {
        ctx.beginPath()
        ctx.arc(x, y, size + 5, 0, Math.PI * 2)
        ctx.strokeStyle = "#ef4444"
        ctx.lineWidth = 2
        ctx.stroke()
      }
    })

    // Draw legend
    ctx.fillStyle = "#0f172a"
    ctx.fillRect(10, 10, 150, 100)
    ctx.strokeStyle = "#334155"
    ctx.strokeRect(10, 10, 150, 100)

    ctx.fillStyle = "#f8fafc"
    ctx.font = "10px sans-serif"
    ctx.fillText("Küresel Depremler", 15, 25)

    // Magnitude circles
    const magnitudes = [3, 5, 7]
    magnitudes.forEach((mag, i) => {
      const y = 45 + i * 20
      ctx.beginPath()
      ctx.arc(20, y, mag * 2, 0, Math.PI * 2)
      ctx.fillStyle = "#f59e0b"
      ctx.fill()
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 0.5
      ctx.stroke()

      ctx.fillStyle = "#f8fafc"
      ctx.fillText(`M${mag.toFixed(1)}`, 35, y + 3)
    })

    // Tsunami warning
    ctx.beginPath()
    ctx.arc(20, 95, 6, 0, Math.PI * 2)
    ctx.fillStyle = "#f59e0b"
    ctx.fill()
    ctx.strokeStyle = "#ef4444"
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = "#f8fafc"
    ctx.fillText("Tsunami Uyarısı", 35, 98)
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getMagnitudeColor = (mag) => {
    if (mag >= 7) return "text-red-500 bg-red-500/10 border-red-500/30"
    if (mag >= 6) return "text-red-500 bg-red-500/10 border-red-500/30"
    if (mag >= 5) return "text-amber-500 bg-amber-500/10 border-amber-500/30"
    if (mag >= 4) return "text-yellow-500 bg-yellow-500/10 border-yellow-500/30"
    return "text-green-500 bg-green-500/10 border-green-500/30"
  }

  return (
    <div className="container mx-auto p-4">
      <Button variant="outline" className="mb-4" onClick={() => router.push("/")}>
        Ana Sayfaya Dön
      </Button>

      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="border-b border-slate-700/50 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-100 flex items-center">
              <Globe className="mr-2 h-5 w-5 text-blue-500" />
              Küresel Deprem Ağı
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-slate-800/50 text-cyan-400 border-cyan-500/50 text-xs">
                <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 mr-1 animate-pulse"></div>
                CANLI
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400"
                onClick={fetchGlobalData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-sm text-slate-400 mb-4">
            Son güncelleme: {formatTime(lastUpdate)} - {formatDate(lastUpdate)}
          </div>

          <Tabs defaultValue="map" className="w-full">
            <TabsList className="bg-slate-800/50 p-1 mb-4">
              <TabsTrigger value="map" className="data-[state=active]:bg-slate-700 data-[state=active]:text-blue-400">
                Dünya Haritası
              </TabsTrigger>
              <TabsTrigger value="list" className="data-[state=active]:bg-slate-700 data-[state=active]:text-blue-400">
                Deprem Listesi
              </TabsTrigger>
              <TabsTrigger
                value="statistics"
                className="data-[state=active]:bg-slate-700 data-[state=active]:text-blue-400"
              >
                İstatistikler
              </TabsTrigger>
            </TabsList>

            <TabsContent value="map" className="mt-0">
              <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-4">
                <div className="h-[500px] w-full relative bg-slate-900/80 rounded-lg overflow-hidden">
                  <canvas ref={mapRef} className="w-full h-full" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="list" className="mt-0">
              <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 overflow-hidden">
                <div className="grid grid-cols-12 text-xs text-slate-400 p-3 border-b border-slate-700/50 bg-slate-800/50">
                  <div className="col-span-1">ID</div>
                  <div className="col-span-1">Büyüklük</div>
                  <div className="col-span-1">Derinlik</div>
                  <div className="col-span-3">Bölge</div>
                  <div className="col-span-2">Tarih</div>
                  <div className="col-span-1">Saat</div>
                  <div className="col-span-1">Kaynak</div>
                  <div className="col-span-1">Tsunami</div>
                  <div className="col-span-1">Detay</div>
                </div>

                <div className="divide-y divide-slate-700/30 max-h-[500px] overflow-y-auto">
                  {globalEarthquakes.map((eq) => (
                    <div key={eq.id} className="grid grid-cols-12 py-2 px-3 text-sm hover:bg-slate-800/50">
                      <div className="col-span-1 text-slate-500">{eq.id.substring(0, 6)}</div>
                      <div className="col-span-1">
                        <Badge variant="outline" className={getMagnitudeColor(eq.magnitude)}>
                          {eq.magnitude.toFixed(1)}
                        </Badge>
                      </div>
                      <div className="col-span-1 text-purple-400">{eq.depth} km</div>
                      <div className="col-span-3 text-slate-300">{eq.region}</div>
                      <div className="col-span-2 text-slate-400">{formatDate(eq.timestamp)}</div>
                      <div className="col-span-1 text-slate-400">{formatTime(eq.timestamp)}</div>
                      <div className="col-span-1 text-slate-400">{eq.source}</div>
                      <div className="col-span-1">
                        {eq.tsunami ? (
                          <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                            Var
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/30">
                            Yok
                          </Badge>
                        )}
                      </div>
                      <div className="col-span-1">
                        <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
                          Detay
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="statistics" className="mt-0">
              <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Son 7 Gün İstatistikleri</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Toplam Deprem Sayısı:</span>
                          <span className="text-cyan-400 font-medium">{globalEarthquakes.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">M5.0+ Depremler:</span>
                          <span className="text-yellow-400 font-medium">
                            {globalEarthquakes.filter((eq) => eq.magnitude >= 5.0).length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">M6.0+ Depremler:</span>
                          <span className="text-amber-400 font-medium">
                            {globalEarthquakes.filter((eq) => eq.magnitude >= 6.0).length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">M7.0+ Depremler:</span>
                          <span className="text-red-400 font-medium">
                            {globalEarthquakes.filter((eq) => eq.magnitude >= 7.0).length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Tsunami Uyarıları:</span>
                          <span className="text-red-400 font-medium">
                            {globalEarthquakes.filter((eq) => eq.tsunami).length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Ortalama Derinlik:</span>
                          <span className="text-purple-400 font-medium">
                            {(
                              globalEarthquakes.reduce((sum, eq) => sum + eq.depth, 0) / globalEarthquakes.length
                            ).toFixed(1)}{" "}
                            km
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">En Büyük Deprem:</span>
                          <span className="text-red-400 font-medium">
                            {Math.max(...globalEarthquakes.map((eq) => eq.magnitude)).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Bölgesel Dağılım</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Array.from(new Set(globalEarthquakes.map((eq) => eq.region)))
                          .slice(0, 5)
                          .map((region) => {
                            const count = globalEarthquakes.filter((eq) => eq.region === region).length
                            return (
                              <div key={region} className="flex justify-between">
                                <span className="text-slate-400">{region}:</span>
                                <span className="text-cyan-400 font-medium">{count} deprem</span>
                              </div>
                            )
                          })}
                        <div className="pt-2 mt-2 border-t border-slate-700/50">
                          <div className="flex justify-between">
                            <span className="text-slate-400">En Aktif Bölge:</span>
                            <span className="text-amber-400 font-medium">
                              {(() => {
                                const regions = globalEarthquakes.map((eq) => eq.region)
                                const counts = {}
                                regions.forEach((region) => {
                                  counts[region] = (counts[region] || 0) + 1
                                })
                                const mostActive = Object.keys(counts).reduce(
                                  (a, b) => (counts[a] > counts[b] ? a : b),
                                  "",
                                )
                                return mostActive
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Veri Kaynakları</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Array.from(new Set(globalEarthquakes.map((eq) => eq.source))).map((source) => {
                          const count = globalEarthquakes.filter((eq) => eq.source === source).length
                          return (
                            <div key={source} className="flex justify-between">
                              <span className="text-slate-400">{source}:</span>
                              <span className="text-cyan-400 font-medium">{count} deprem</span>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Derinlik Dağılımı</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Sığ (0-50 km):</span>
                          <span className="text-amber-400 font-medium">
                            {globalEarthquakes.filter((eq) => eq.depth < 50).length} deprem
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Orta (50-100 km):</span>
                          <span className="text-purple-400 font-medium">
                            {globalEarthquakes.filter((eq) => eq.depth >= 50 && eq.depth < 100).length} deprem
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Derin (100+ km):</span>
                          <span className="text-blue-400 font-medium">
                            {globalEarthquakes.filter((eq) => eq.depth >= 100).length} deprem
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
