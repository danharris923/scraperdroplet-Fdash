"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Waves, ArrowLeft, RefreshCw, AlertTriangle, Map } from "lucide-react"
import { useRouter } from "next/navigation"

export default function SismikAktivite() {
  const router = useRouter()
  const [earthquakes, setEarthquakes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  useEffect(() => {
    fetchEarthquakeData()
    const interval = setInterval(fetchEarthquakeData, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchEarthquakeData = async () => {
    setLoading(true)
    try {
      // Türkiye'deki deprem verilerini çek (simüle edilmiş)
      const turkeyEarthquakes = Array.from({ length: 15 }, (_, i) => ({
        id: `tr-eq-${Date.now()}-${i}`,
        magnitude: Number.parseFloat((Math.random() * 4 + 2).toFixed(1)),
        depth: Math.floor(Math.random() * 50) + 5,
        location: [
          Number.parseFloat((Math.random() * 3 + 36).toFixed(2)), // Türkiye enlemleri
          Number.parseFloat((Math.random() * 10 + 26).toFixed(2)), // Türkiye boylamları
        ],
        region: [
          "İstanbul",
          "İzmir",
          "Ankara",
          "Antalya",
          "Muğla",
          "Bursa",
          "Çanakkale",
          "Erzurum",
          "Van",
          "Adana",
          "Konya",
          "Kayseri",
          "Trabzon",
          "Samsun",
          "Diyarbakır",
        ][i],
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 86400000)),
        felt: Math.random() > 0.7,
      }))

      setEarthquakes(turkeyEarthquakes)
      setLastUpdated(new Date())
    } catch (error) {
      console.error("Deprem verisi çekerken hata oluştu:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getMagnitudeColor = (mag: number) => {
    if (mag >= 6) return "text-red-500"
    if (mag >= 5) return "text-amber-500"
    if (mag >= 4) return "text-yellow-500"
    return "text-green-500"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-slate-800 text-slate-100 p-6">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" onClick={() => router.push("/")} className="text-slate-400">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Geri Dön
            </Button>
            <h1 className="text-2xl font-bold text-amber-500">Sismik Aktivite İzleme</h1>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-xs text-slate-400">Son Güncelleme: {formatTime(lastUpdated)}</div>
            <Button variant="outline" size="sm" onClick={fetchEarthquakeData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Yenile
            </Button>
          </div>
        </div>

        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="bg-slate-800/50 p-1 mb-6">
            <TabsTrigger
              value="activity"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400"
            >
              Aktivite Ekranı
            </TabsTrigger>
            <TabsTrigger value="recent" className="data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400">
              Son Depremler
            </TabsTrigger>
            <TabsTrigger value="map" className="data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400">
              Türkiye Haritası
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-0">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Waves className="h-5 w-5 mr-2 text-amber-500" />
                  Türkiye Sismik Aktivite Özeti
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="text-sm text-slate-400 mb-2">Son 24 Saat</div>
                    <div className="text-3xl font-bold text-amber-500 mb-1">{earthquakes.length}</div>
                    <div className="text-xs text-slate-500">Kaydedilen Deprem</div>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="text-sm text-slate-400 mb-2">En Büyük Deprem</div>
                    <div className="text-3xl font-bold text-amber-500 mb-1">
                      {earthquakes.length > 0 ? Math.max(...earthquakes.map((eq) => eq.magnitude)).toFixed(1) : "0.0"}
                    </div>
                    <div className="text-xs text-slate-500">Richter Ölçeği</div>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="text-sm text-slate-400 mb-2">Ortalama Derinlik</div>
                    <div className="text-3xl font-bold text-amber-500 mb-1">
                      {earthquakes.length > 0
                        ? Math.round(earthquakes.reduce((sum, eq) => sum + eq.depth, 0) / earthquakes.length)
                        : "0"}
                    </div>
                    <div className="text-xs text-slate-500">Kilometre</div>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="text-sm font-medium mb-4">Bölgesel Aktivite Dağılımı</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                      <div className="text-sm text-slate-400 mb-2">En Aktif Bölgeler</div>
                      <ul className="space-y-2">
                        {Array.from(new Set(earthquakes.map((eq) => eq.region)))
                          .slice(0, 5)
                          .map((region) => (
                            <li key={region} className="flex items-center justify-between">
                              <span className="text-sm">{region}</span>
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">
                                {earthquakes.filter((eq) => eq.region === region).length} deprem
                              </Badge>
                            </li>
                          ))}
                      </ul>
                    </div>

                    <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                      <div className="text-sm text-slate-400 mb-2">Büyüklük Dağılımı</div>
                      <ul className="space-y-2">
                        <li className="flex items-center justify-between">
                          <span className="text-sm">M 2.0 - 2.9</span>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                            {earthquakes.filter((eq) => eq.magnitude >= 2 && eq.magnitude < 3).length}
                          </Badge>
                        </li>
                        <li className="flex items-center justify-between">
                          <span className="text-sm">M 3.0 - 3.9</span>
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                            {earthquakes.filter((eq) => eq.magnitude >= 3 && eq.magnitude < 4).length}
                          </Badge>
                        </li>
                        <li className="flex items-center justify-between">
                          <span className="text-sm">M 4.0 - 4.9</span>
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                            {earthquakes.filter((eq) => eq.magnitude >= 4 && eq.magnitude < 5).length}
                          </Badge>
                        </li>
                        <li className="flex items-center justify-between">
                          <span className="text-sm">M 5.0+</span>
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                            {earthquakes.filter((eq) => eq.magnitude >= 5).length}
                          </Badge>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent" className="mt-0">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                  Son Depremler (Türkiye)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 overflow-hidden">
                  <div className="grid grid-cols-12 text-xs text-slate-400 p-3 border-b border-slate-700/50 bg-slate-800/50">
                    <div className="col-span-1">ID</div>
                    <div className="col-span-2">Büyüklük</div>
                    <div className="col-span-2">Derinlik</div>
                    <div className="col-span-3">Bölge</div>
                    <div className="col-span-3">Zaman</div>
                    <div className="col-span-1">Hissedildi</div>
                  </div>

                  <div className="divide-y divide-slate-700/30">
                    {earthquakes.map((eq) => (
                      <div key={eq.id} className="grid grid-cols-12 py-2 px-3 text-sm hover:bg-slate-800/50">
                        <div className="col-span-1 text-slate-500">{eq.id.substring(0, 8)}</div>
                        <div className={`col-span-2 font-medium ${getMagnitudeColor(eq.magnitude)}`}>
                          {eq.magnitude.toFixed(1)}
                        </div>
                        <div className="col-span-2 text-purple-400">{eq.depth} km</div>
                        <div className="col-span-3 text-slate-300">{eq.region}</div>
                        <div className="col-span-3 text-slate-400">{formatTime(eq.timestamp)}</div>
                        <div className="col-span-1">
                          <Badge
                            variant="outline"
                            className={`${
                              eq.felt
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : "bg-slate-500/10 text-slate-400 border-slate-500/30"
                            } text-xs`}
                          >
                            {eq.felt ? "Evet" : "Hayır"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="map" className="mt-0">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Map className="h-5 w-5 mr-2 text-amber-500" />
                  Türkiye Deprem Haritası
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-4">
                  <div className="h-[500px] w-full relative bg-slate-900/80 rounded-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img
                        src="/placeholder.svg?height=500&width=800"
                        alt="Türkiye Deprem Haritası"
                        className="w-full h-full object-cover opacity-50"
                      />

                      {/* Deprem noktaları */}
                      {earthquakes.map((eq) => {
                        const size = eq.magnitude * 5
                        const color = getMagnitudeColor(eq.magnitude).replace("text-", "bg-")

                        // Türkiye haritası üzerinde yaklaşık konumlandırma
                        const left = `${((eq.location[1] - 26) / 10) * 100}%`
                        const top = `${((41 - eq.location[0]) / 5) * 100}%`

                        return (
                          <div
                            key={eq.id}
                            className={`absolute ${color} rounded-full animate-pulse`}
                            style={{
                              width: `${size}px`,
                              height: `${size}px`,
                              left,
                              top,
                              opacity: 0.7,
                            }}
                            title={`${eq.region}: M${eq.magnitude.toFixed(1)}`}
                          />
                        )
                      })}
                    </div>

                    <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-sm rounded-md px-3 py-2 border border-slate-700/50">
                      <div className="text-xs text-slate-400">Türkiye Deprem Haritası</div>
                      <div className="text-xs text-slate-500">Son 24 Saat</div>
                    </div>

                    <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-sm rounded-md px-3 py-2 border border-slate-700/50">
                      <div className="text-xs text-slate-400 mb-1">Büyüklük</div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center">
                          <div className="h-2 w-2 rounded-full bg-green-500 mr-1"></div>
                          <span className="text-xs">2-3</span>
                        </div>
                        <div className="flex items-center">
                          <div className="h-2 w-2 rounded-full bg-blue-500 mr-1"></div>
                          <span className="text-xs">3-4</span>
                        </div>
                        <div className="flex items-center">
                          <div className="h-2 w-2 rounded-full bg-yellow-500 mr-1"></div>
                          <span className="text-xs">4-5</span>
                        </div>
                        <div className="flex items-center">
                          <div className="h-2 w-2 rounded-full bg-red-500 mr-1"></div>
                          <span className="text-xs">5+</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
