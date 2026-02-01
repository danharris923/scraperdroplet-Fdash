"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

export default function KonumlarPage() {
  const router = useRouter()
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const mapRef = useRef(null)

  useEffect(() => {
    fetchStationData()
    const interval = setInterval(fetchStationData, 60000) // Her dakika güncelle
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (stations.length > 0) {
      drawMap()
    }
  }, [stations])

  const fetchStationData = async () => {
    setLoading(true)
    try {
      // Simüle edilmiş istasyon verileri
      const simulatedData = Array.from({ length: 25 }, (_, i) => ({
        id: `station-${i + 1}`,
        name: [
          "İstanbul İstasyonu",
          "Ankara İstasyonu",
          "İzmir İstasyonu",
          "Antalya İstasyonu",
          "Erzurum İstasyonu",
          "Van İstasyonu",
          "Diyarbakır İstasyonu",
          "Trabzon İstasyonu",
          "Samsun İstasyonu",
          "Adana İstasyonu",
          "Konya İstasyonu",
          "Kayseri İstasyonu",
          "Gaziantep İstasyonu",
          "Bursa İstasyonu",
          "Mersin İstasyonu",
          "Kocaeli İstasyonu",
          "Şanlıurfa İstasyonu",
          "Hatay İstasyonu",
          "Manisa İstasyonu",
          "Balıkesir İstasyonu",
          "Malatya İstasyonu",
          "Kahramanmaraş İstasyonu",
          "Aydın İstasyonu",
          "Tekirdağ İstasyonu",
          "Denizli İstasyonu",
        ][i],
        location: [
          [41.0082, 28.9784], // İstanbul
          [39.9334, 32.8597], // Ankara
          [38.4192, 27.1287], // İzmir
          [36.8969, 30.7133], // Antalya
          [39.9055, 41.2658], // Erzurum
          [38.4891, 43.4089], // Van
          [37.9144, 40.2306], // Diyarbakır
          [41.0027, 39.7168], // Trabzon
          [41.2867, 36.33], // Samsun
          [37.0, 35.3213], // Adana
          [37.8667, 32.4833], // Konya
          [38.7312, 35.4787], // Kayseri
          [37.0662, 37.3833], // Gaziantep
          [40.1885, 29.061], // Bursa
          [36.8121, 34.6415], // Mersin
          [40.7654, 29.9408], // Kocaeli
          [37.1591, 38.7969], // Şanlıurfa
          [36.2023, 36.1613], // Hatay
          [38.6191, 27.4289], // Manisa
          [39.6484, 27.8826], // Balıkesir
          [38.3554, 38.3335], // Malatya
          [37.5753, 36.9228], // Kahramanmaraş
          [37.856, 27.8416], // Aydın
          [40.9781, 27.5126], // Tekirdağ
          [37.7765, 29.0864], // Denizli
        ][i],
        status: Math.random() > 0.15 ? "active" : "inactive",
        lastDataReceived: new Date(Date.now() - Math.floor(Math.random() * 3600000)),
        dataQuality: Math.floor(Math.random() * 30) + 70,
        type: ["Sismograf", "Accelerometer", "Broadband", "Kısa Periyot"][Math.floor(Math.random() * 4)],
        network: ["AFAD", "Kandilli", "MTA", "Üniversite Ağı"][Math.floor(Math.random() * 4)],
      }))

      setStations(simulatedData)
      setLastUpdate(new Date())
    } catch (error) {
      console.error("İstasyon verisi çekerken hata oluştu:", error)
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

    // Draw Turkey outline (simplified)
    ctx.strokeStyle = "#64748b"
    ctx.lineWidth = 2
    ctx.beginPath()

    // Simplified Turkey outline coordinates
    const turkeyOutline = [
      [0.2, 0.5],
      [0.25, 0.4],
      [0.35, 0.35],
      [0.45, 0.3],
      [0.55, 0.25],
      [0.65, 0.3],
      [0.75, 0.35],
      [0.85, 0.4],
      [0.9, 0.5],
      [0.85, 0.6],
      [0.75, 0.65],
      [0.65, 0.7],
      [0.55, 0.75],
      [0.45, 0.7],
      [0.35, 0.65],
      [0.25, 0.6],
      [0.2, 0.5],
    ]

    // Draw the outline
    ctx.moveTo(turkeyOutline[0][0] * canvas.width, turkeyOutline[0][1] * canvas.height)
    for (let i = 1; i < turkeyOutline.length; i++) {
      ctx.lineTo(turkeyOutline[i][0] * canvas.width, turkeyOutline[i][1] * canvas.height)
    }
    ctx.stroke()

    // Draw stations
    stations.forEach((station) => {
      // Convert lat/long to canvas coordinates (simplified mapping)
      // This is a very simplified conversion - in a real app you'd use proper geo mapping
      const x = ((station.location[1] - 26) / 15) * canvas.width
      const y = ((41 - station.location[0]) / 5) * canvas.height

      // Draw station point
      ctx.beginPath()
      ctx.arc(x, y, station.status === "active" ? 6 : 4, 0, Math.PI * 2)
      ctx.fillStyle = station.status === "active" ? "#10b981" : "#ef4444"
      ctx.fill()
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 1
      ctx.stroke()

      // Draw station name
      ctx.fillStyle = "#f8fafc"
      ctx.font = "8px sans-serif"
      ctx.fillText(station.name.split(" ")[0], x + 8, y + 3)
    })

    // Draw legend
    ctx.fillStyle = "#0f172a"
    ctx.fillRect(10, 10, 140, 60)
    ctx.strokeStyle = "#334155"
    ctx.strokeRect(10, 10, 140, 60)

    ctx.fillStyle = "#f8fafc"
    ctx.font = "10px sans-serif"
    ctx.fillText("İzleme İstasyonları", 15, 25)

    // Legend items
    ctx.beginPath()
    ctx.arc(25, 40, 6, 0, Math.PI * 2)
    ctx.fillStyle = "#10b981"
    ctx.fill()
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = "#f8fafc"
    ctx.fillText("Aktif İstasyon", 40, 43)

    ctx.beginPath()
    ctx.arc(25, 60, 4, 0, Math.PI * 2)
    ctx.fillStyle = "#ef4444"
    ctx.fill()
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = "#f8fafc"
    ctx.fillText("Pasif İstasyon", 40, 63)
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

  return (
    <div className="container mx-auto p-4">
      <Button variant="outline" className="mb-4" onClick={() => router.push("/")}>
        Ana Sayfaya Dön
      </Button>

      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="border-b border-slate-700/50 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-100 flex items-center">
              <MapPin className="mr-2 h-5 w-5 text-cyan-500" />
              İzleme İstasyonları
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
                onClick={fetchStationData}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 overflow-hidden">
                <div className="p-4">
                  <h3 className="text-lg font-medium text-slate-200 mb-4">İstasyon Haritası</h3>
                  <div className="h-[400px] w-full relative bg-slate-900/80 rounded-lg overflow-hidden">
                    <canvas ref={mapRef} className="w-full h-full" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 overflow-hidden">
                <div className="grid grid-cols-12 text-xs text-slate-400 p-3 border-b border-slate-700/50 bg-slate-800/50">
                  <div className="col-span-3">İstasyon Adı</div>
                  <div className="col-span-2">Durum</div>
                  <div className="col-span-2">Ağ</div>
                  <div className="col-span-2">Tip</div>
                  <div className="col-span-3">Son Veri</div>
                </div>

                <div className="divide-y divide-slate-700/30 max-h-[400px] overflow-y-auto">
                  {stations.map((station) => (
                    <div key={station.id} className="grid grid-cols-12 py-2 px-3 text-sm hover:bg-slate-800/50">
                      <div className="col-span-3 text-slate-300">{station.name}</div>
                      <div className="col-span-2">
                        {station.status === "active" ? (
                          <div className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-green-500 mr-1"></div>
                            <span className="text-green-400">Aktif</span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-red-500 mr-1"></div>
                            <span className="text-red-400">Pasif</span>
                          </div>
                        )}
                      </div>
                      <div className="col-span-2 text-slate-400">{station.network}</div>
                      <div className="col-span-2 text-slate-400">{station.type}</div>
                      <div className="col-span-3 text-slate-400">{formatTime(station.lastDataReceived)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-slate-400">Toplam İstasyon</div>
                      <div className="text-xl font-bold text-cyan-400">{stations.length}</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-slate-400">Aktif İstasyon</div>
                      <div className="text-xl font-bold text-green-400">
                        {stations.filter((s) => s.status === "active").length}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
