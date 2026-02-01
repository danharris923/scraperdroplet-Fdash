"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, LineChart, ArrowLeft, Download, RefreshCw, FileText } from "lucide-react"
import { useRouter } from "next/navigation"

export default function Raporlar() {
  const router = useRouter()
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalEarthquakes: 0,
    averageMagnitude: 0,
    maxMagnitude: 0,
    regionDistribution: {},
    magnitudeDistribution: {
      "0-2.9": 0,
      "3.0-3.9": 0,
      "4.0-4.9": 0,
      "5.0+": 0,
    },
  })

  useEffect(() => {
    fetchReportData()
  }, [])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      // Simüle edilmiş rapor verileri
      const simulatedReports = [
        {
          id: "REP-2023-001",
          title: "Haftalık Sismik Aktivite Raporu",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          type: "weekly",
          status: "completed",
          summary: "Son 7 günde 42 deprem kaydedildi. En büyük deprem 4.6 büyüklüğünde.",
        },
        {
          id: "REP-2023-002",
          title: "Aylık Deprem Analizi",
          date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          type: "monthly",
          status: "completed",
          summary: "Geçen ay toplam 156 deprem kaydedildi. Ortalama büyüklük 3.2.",
        },
        {
          id: "REP-2023-003",
          title: "Bölgesel Risk Değerlendirmesi",
          date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          type: "analysis",
          status: "completed",
          summary: "Marmara bölgesinde sismik aktivite %15 arttı. İzleme yoğunlaştırıldı.",
        },
        {
          id: "REP-2023-004",
          title: "Günlük Sismik Özet",
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          type: "daily",
          status: "completed",
          summary: "Son 24 saatte 8 deprem kaydedildi. En büyük deprem 3.8 büyüklüğünde.",
        },
        {
          id: "REP-2023-005",
          title: "Özel Durum Raporu: Marmara",
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          type: "special",
          status: "completed",
          summary: "Marmara Denizi'nde artan sismik aktivite analizi ve risk değerlendirmesi.",
        },
        {
          id: "REP-2023-006",
          title: "Yıllık Deprem İstatistikleri",
          date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          type: "yearly",
          status: "completed",
          summary: "2022 yılında toplam 1842 deprem kaydedildi. Ortalama büyüklük 3.4.",
        },
        {
          id: "REP-2023-007",
          title: "Tsunami Risk Analizi",
          date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          type: "analysis",
          status: "completed",
          summary: "Ege ve Akdeniz kıyılarında tsunami risk analizi ve erken uyarı sistemi değerlendirmesi.",
        },
      ]

      setReports(simulatedReports)

      // İstatistik verileri
      setStats({
        totalEarthquakes: 1842,
        averageMagnitude: 3.4,
        maxMagnitude: 5.8,
        regionDistribution: {
          Marmara: 32,
          Ege: 28,
          "İç Anadolu": 15,
          Akdeniz: 12,
          Karadeniz: 8,
          "Doğu Anadolu": 5,
        },
        magnitudeDistribution: {
          "0-2.9": 45,
          "3.0-3.9": 35,
          "4.0-4.9": 15,
          "5.0+": 5,
        },
      })

      setLoading(false)
    } catch (error) {
      console.error("Rapor verisi çekerken hata oluştu:", error)
      setLoading(false)
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case "daily":
        return "Günlük"
      case "weekly":
        return "Haftalık"
      case "monthly":
        return "Aylık"
      case "yearly":
        return "Yıllık"
      case "analysis":
        return "Analiz"
      case "special":
        return "Özel"
      default:
        return type
    }
  }

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case "daily":
        return "bg-green-500/20 text-green-400 border-green-500/50"
      case "weekly":
        return "bg-blue-500/20 text-blue-400 border-blue-500/50"
      case "monthly":
        return "bg-purple-500/20 text-purple-400 border-purple-500/50"
      case "yearly":
        return "bg-amber-500/20 text-amber-400 border-amber-500/50"
      case "analysis":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/50"
      case "special":
        return "bg-red-500/20 text-red-400 border-red-500/50"
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/50"
    }
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
            <h1 className="text-2xl font-bold text-amber-500">Sismik Raporlar</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={fetchReportData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Yenile
            </Button>
          </div>
        </div>

        <Tabs defaultValue="reports" className="w-full">
          <TabsList className="bg-slate-800/50 p-1 mb-6">
            <TabsTrigger
              value="reports"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400"
            >
              Raporlar
            </TabsTrigger>
            <TabsTrigger
              value="statistics"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400"
            >
              İstatistikler
            </TabsTrigger>
            <TabsTrigger value="charts" className="data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400">
              Grafikler
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="mt-0">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-amber-500" />
                  Deprem Raporları
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div key={report.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="text-lg font-medium">{report.title}</div>
                          <Badge className={`ml-3 ${getReportTypeColor(report.type)}`}>
                            {getReportTypeLabel(report.type)}
                          </Badge>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          İndir
                        </Button>
                      </div>
                      <div className="text-sm text-slate-400 mb-2">{report.summary}</div>
                      <div className="text-xs text-slate-500">
                        Rapor ID: {report.id} | Tarih: {formatDate(report.date)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics" className="mt-0">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart className="h-5 w-5 mr-2 text-amber-500" />
                  Deprem İstatistikleri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="text-sm text-slate-400 mb-2">Toplam Deprem</div>
                    <div className="text-3xl font-bold text-amber-500 mb-1">{stats.totalEarthquakes}</div>
                    <div className="text-xs text-slate-500">Son 12 ay</div>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="text-sm text-slate-400 mb-2">Ortalama Büyüklük</div>
                    <div className="text-3xl font-bold text-amber-500 mb-1">{stats.averageMagnitude}</div>
                    <div className="text-xs text-slate-500">Richter Ölçeği</div>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="text-sm text-slate-400 mb-2">En Büyük Deprem</div>
                    <div className="text-3xl font-bold text-amber-500 mb-1">{stats.maxMagnitude}</div>
                    <div className="text-xs text-slate-500">Richter Ölçeği</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="text-sm font-medium mb-4">Bölgesel Dağılım (%)</div>
                    <div className="space-y-3">
                      {Object.entries(stats.regionDistribution).map(([region, percentage]) => (
                        <div key={region}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-sm text-slate-400">{region}</div>
                            <div className="text-sm text-amber-400">{percentage}%</div>
                          </div>
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="text-sm font-medium mb-4">Büyüklük Dağılımı (%)</div>
                    <div className="space-y-3">
                      {Object.entries(stats.magnitudeDistribution).map(([range, percentage]) => (
                        <div key={range}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-sm text-slate-400">M {range}</div>
                            <div className="text-sm text-amber-400">{percentage}%</div>
                          </div>
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="charts" className="mt-0">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChart className="h-5 w-5 mr-2 text-amber-500" />
                  Deprem Grafikleri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="text-sm font-medium mb-2">Aylık Deprem Sayısı</div>
                    <div className="h-64 w-full flex items-end justify-between px-4 pt-4 pb-8 relative">
                      {/* Basit çubuk grafik simülasyonu */}
                      <div className="absolute left-2 top-0 h-full flex flex-col justify-between py-4">
                        <div className="text-xs text-slate-500">200</div>
                        <div className="text-xs text-slate-500">150</div>
                        <div className="text-xs text-slate-500">100</div>
                        <div className="text-xs text-slate-500">50</div>
                        <div className="text-xs text-slate-500">0</div>
                      </div>

                      <div className="absolute left-0 right-0 top-0 h-full flex flex-col justify-between py-4 px-10">
                        <div className="border-b border-slate-700/30 w-full"></div>
                        <div className="border-b border-slate-700/30 w-full"></div>
                        <div className="border-b border-slate-700/30 w-full"></div>
                        <div className="border-b border-slate-700/30 w-full"></div>
                        <div className="border-b border-slate-700/30 w-full"></div>
                      </div>

                      <div className="flex-1 h-full flex items-end justify-between px-2 z-10">
                        {Array.from({ length: 12 }).map((_, i) => {
                          const height = Math.floor(Math.random() * 60) + 20

                          return (
                            <div key={i} className="flex space-x-0.5">
                              <div
                                className="w-6 bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-sm"
                                style={{ height: `${height}%` }}
                              ></div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-10">
                        <div className="text-xs text-slate-500">Oca</div>
                        <div className="text-xs text-slate-500">Şub</div>
                        <div className="text-xs text-slate-500">Mar</div>
                        <div className="text-xs text-slate-500">Nis</div>
                        <div className="text-xs text-slate-500">May</div>
                        <div className="text-xs text-slate-500">Haz</div>
                        <div className="text-xs text-slate-500">Tem</div>
                        <div className="text-xs text-slate-500">Ağu</div>
                        <div className="text-xs text-slate-500">Eyl</div>
                        <div className="text-xs text-slate-500">Eki</div>
                        <div className="text-xs text-slate-500">Kas</div>
                        <div className="text-xs text-slate-500">Ara</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="text-sm font-medium mb-2">Büyüklük Dağılımı</div>
                    <div className="h-64 w-full relative">
                      {/* Basit pasta grafik simülasyonu */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative h-40 w-40">
                          <div
                            className="absolute inset-0 bg-green-500 rounded-full"
                            style={{ clipPath: "polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 0%)" }}
                          ></div>
                          <div
                            className="absolute inset-0 bg-blue-500 rounded-full"
                            style={{ clipPath: "polygon(50% 50%, 100% 0%, 100% 100%, 0% 100%, 0% 50%)" }}
                          ></div>
                          <div
                            className="absolute inset-0 bg-yellow-500 rounded-full"
                            style={{ clipPath: "polygon(50% 50%, 0% 50%, 0% 100%, 50% 100%)" }}
                          ></div>
                          <div
                            className="absolute inset-0 bg-red-500 rounded-full"
                            style={{ clipPath: "polygon(50% 50%, 50% 100%, 100% 100%)" }}
                          ></div>
                        </div>
                      </div>

                      <div className="absolute bottom-4 left-0 right-0">
                        <div className="flex items-center justify-center space-x-4">
                          <div className="flex items-center">
                            <div className="h-3 w-3 rounded-full bg-green-500 mr-1"></div>
                            <span className="text-xs">0-2.9 (45%)</span>
                          </div>
                          <div className="flex items-center">
                            <div className="h-3 w-3 rounded-full bg-blue-500 mr-1"></div>
                            <span className="text-xs">3.0-3.9 (35%)</span>
                          </div>
                          <div className="flex items-center">
                            <div className="h-3 w-3 rounded-full bg-yellow-500 mr-1"></div>
                            <span className="text-xs">4.0-4.9 (15%)</span>
                          </div>
                          <div className="flex items-center">
                            <div className="h-3 w-3 rounded-full bg-red-500 mr-1"></div>
                            <span className="text-xs">5.0+ (5%)</span>
                          </div>
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
