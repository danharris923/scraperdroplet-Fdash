"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, Bell, Info, CheckCircle, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function UyarilarPage() {
  const router = useRouter()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  useEffect(() => {
    fetchAlertData()
    const interval = setInterval(fetchAlertData, 60000) // Her dakika güncelle
    return () => clearInterval(interval)
  }, [])

  const fetchAlertData = async () => {
    setLoading(true)
    try {
      // Simüle edilmiş uyarı verileri
      const simulatedData = [
        {
          id: "alert-1",
          type: "warning",
          title: "Japonya'da 6.8 Büyüklüğünde Deprem",
          description:
            "Japonya'nın Honshu adası açıklarında 6.8 büyüklüğünde deprem meydana geldi. Tsunami uyarısı verildi.",
          timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 dakika önce
          region: "Japonya",
          source: "JMA",
          level: "Yüksek",
          status: "active",
        },
        {
          id: "alert-2",
          type: "info",
          title: "Kaliforniya'da Artçı Sarsıntılar",
          description:
            "San Andreas Fay Hattı'nda meydana gelen 5.2 büyüklüğündeki depremin ardından bölgede artçı sarsıntılar devam ediyor.",
          timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 saat önce
          region: "ABD",
          source: "USGS",
          level: "Orta",
          status: "active",
        },
        {
          id: "alert-3",
          type: "success",
          title: "Tsunami Uyarısı Kaldırıldı",
          description:
            "Endonezya açıklarında meydana gelen 7.1 büyüklüğündeki deprem sonrası verilen tsunami uyarısı kaldırıldı.",
          timestamp: new Date(Date.now() - 1000 * 60 * 240), // 4 saat önce
          region: "Endonezya",
          source: "BMKG",
          level: "Düşük",
          status: "resolved",
        },
        {
          id: "alert-4",
          type: "warning",
          title: "Türkiye'de Sismik Aktivite Artışı",
          description:
            "Kuzey Anadolu Fay Hattı'nda son 24 saatte 15'in üzerinde küçük deprem kaydedildi. Bölgede aktivite artışı gözleniyor.",
          timestamp: new Date(Date.now() - 1000 * 60 * 360), // 6 saat önce
          region: "Türkiye",
          source: "AFAD",
          level: "Orta",
          status: "active",
        },
        {
          id: "alert-5",
          type: "info",
          title: "Şili'de Volkanik Aktivite",
          description:
            "Şili'deki Villarrica Yanardağı'nda artan aktivite nedeniyle çevredeki yerleşim yerlerinde uyarı seviyesi yükseltildi.",
          timestamp: new Date(Date.now() - 1000 * 60 * 480), // 8 saat önce
          region: "Şili",
          source: "SERNAGEOMIN",
          level: "Orta",
          status: "active",
        },
        {
          id: "alert-6",
          type: "warning",
          title: "İtalya'da Deprem Riski",
          description:
            "İtalya'nın Napoli kentinde Campi Flegrei kaldera bölgesinde artan sismik aktivite nedeniyle uyarı seviyesi yükseltildi.",
          timestamp: new Date(Date.now() - 1000 * 60 * 600), // 10 saat önce
          region: "İtalya",
          source: "INGV",
          level: "Yüksek",
          status: "active",
        },
        {
          id: "alert-7",
          type: "success",
          title: "Filipinler'de Deprem Tatbikatı Tamamlandı",
          description:
            "Filipinler'de ulusal çapta düzenlenen deprem tatbikatı başarıyla tamamlandı. 2 milyon kişi tatbikata katıldı.",
          timestamp: new Date(Date.now() - 1000 * 60 * 720), // 12 saat önce
          region: "Filipinler",
          source: "PHIVOLCS",
          level: "Bilgi",
          status: "resolved",
        },
        {
          id: "alert-8",
          type: "warning",
          title: "Alaska'da Deprem Fırtınası",
          description:
            "Alaska'nın güney kıyılarında son 24 saatte 30'dan fazla deprem meydana geldi. Bölgede deprem fırtınası yaşanıyor.",
          timestamp: new Date(Date.now() - 1000 * 60 * 840), // 14 saat önce
          region: "ABD",
          source: "USGS",
          level: "Orta",
          status: "active",
        },
        {
          id: "alert-9",
          type: "info",
          title: "Yeni Zelanda'da Sismik İzleme Ağı Genişletiliyor",
          description: "Yeni Zelanda, ülke genelindeki sismik izleme ağını genişletmek için yeni istasyonlar kuruyor.",
          timestamp: new Date(Date.now() - 1000 * 60 * 960), // 16 saat önce
          region: "Yeni Zelanda",
          source: "GeoNet",
          level: "Bilgi",
          status: "active",
        },
        {
          id: "alert-10",
          type: "success",
          title: "Meksika'daki Deprem Erken Uyarı Sistemi Başarılı Oldu",
          description:
            "Meksika'da meydana gelen 5.6 büyüklüğündeki depremde erken uyarı sistemi başarıyla çalıştı ve vatandaşlara 20 saniye önceden uyarı verildi.",
          timestamp: new Date(Date.now() - 1000 * 60 * 1080), // 18 saat önce
          region: "Meksika",
          source: "SSN",
          level: "Bilgi",
          status: "resolved",
        },
      ]

      setAlerts(simulatedData)
      setLastUpdate(new Date())
    } catch (error) {
      console.error("Uyarı verisi çekerken hata oluştu:", error)
    } finally {
      setLoading(false)
    }
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

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000)

    let interval = seconds / 31536000
    if (interval > 1) return Math.floor(interval) + " yıl önce"

    interval = seconds / 2592000
    if (interval > 1) return Math.floor(interval) + " ay önce"

    interval = seconds / 86400
    if (interval > 1) return Math.floor(interval) + " gün önce"

    interval = seconds / 3600
    if (interval > 1) return Math.floor(interval) + " saat önce"

    interval = seconds / 60
    if (interval > 1) return Math.floor(interval) + " dakika önce"

    return Math.floor(seconds) + " saniye önce"
  }

  const getAlertIcon = (type) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      default:
        return <Bell className="h-5 w-5 text-slate-500" />
    }
  }

  const getAlertColor = (type) => {
    switch (type) {
      case "warning":
        return "bg-amber-500/10 text-amber-500 border-amber-500/30"
      case "info":
        return "bg-blue-500/10 text-blue-500 border-blue-500/30"
      case "success":
        return "bg-green-500/10 text-green-500 border-green-500/30"
      default:
        return "bg-slate-500/10 text-slate-500 border-slate-500/30"
    }
  }

  const getLevelColor = (level) => {
    switch (level) {
      case "Yüksek":
        return "bg-red-500/10 text-red-500 border-red-500/30"
      case "Orta":
        return "bg-amber-500/10 text-amber-500 border-amber-500/30"
      case "Düşük":
        return "bg-green-500/10 text-green-500 border-green-500/30"
      default:
        return "bg-slate-500/10 text-slate-500 border-slate-500/30"
    }
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
              <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
              Deprem Uyarıları ve Bildirimler
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
                onClick={fetchAlertData}
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

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="bg-slate-800/50 p-1 mb-4">
              <TabsTrigger value="all" className="data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400">
                Tüm Uyarılar
              </TabsTrigger>
              <TabsTrigger
                value="active"
                className="data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400"
              >
                Aktif Uyarılar
              </TabsTrigger>
              <TabsTrigger
                value="resolved"
                className="data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400"
              >
                Çözülen Uyarılar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0">
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <Card key={alert.id} className="bg-slate-800/50 border-slate-700/50">
                    <CardContent className="p-4">
                      <div className="flex items-start">
                        <div className="mr-4 mt-1">{getAlertIcon(alert.type)}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-slate-200">{alert.title}</h3>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className={getLevelColor(alert.level)}>
                                {alert.level}
                              </Badge>
                              <div className="text-sm text-slate-400 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {getTimeAgo(alert.timestamp)}
                              </div>
                            </div>
                          </div>
                          <p className="mt-1 text-sm text-slate-400">{alert.description}</p>
                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Badge variant="outline" className="bg-slate-700/50 text-slate-300 border-slate-600/50">
                                {alert.region}
                              </Badge>
                              <span className="text-xs text-slate-500">Kaynak: {alert.source}</span>
                            </div>
                            <div>
                              {alert.status === "active" ? (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                                  Aktif
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                                  Çözüldü
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="active" className="mt-0">
              <div className="space-y-4">
                {alerts
                  .filter((alert) => alert.status === "active")
                  .map((alert) => (
                    <Card key={alert.id} className="bg-slate-800/50 border-slate-700/50">
                      <CardContent className="p-4">
                        <div className="flex items-start">
                          <div className="mr-4 mt-1">{getAlertIcon(alert.type)}</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-medium text-slate-200">{alert.title}</h3>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className={getLevelColor(alert.level)}>
                                  {alert.level}
                                </Badge>
                                <div className="text-sm text-slate-400 flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {getTimeAgo(alert.timestamp)}
                                </div>
                              </div>
                            </div>
                            <p className="mt-1 text-sm text-slate-400">{alert.description}</p>
                            <div className="mt-3 flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Badge variant="outline" className="bg-slate-700/50 text-slate-300 border-slate-600/50">
                                  {alert.region}
                                </Badge>
                                <span className="text-xs text-slate-500">Kaynak: {alert.source}</span>
                              </div>
                              <div>
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                                  Aktif
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="resolved" className="mt-0">
              <div className="space-y-4">
                {alerts
                  .filter((alert) => alert.status === "resolved")
                  .map((alert) => (
                    <Card key={alert.id} className="bg-slate-800/50 border-slate-700/50">
                      <CardContent className="p-4">
                        <div className="flex items-start">
                          <div className="mr-4 mt-1">{getAlertIcon(alert.type)}</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-medium text-slate-200">{alert.title}</h3>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className={getLevelColor(alert.level)}>
                                  {alert.level}
                                </Badge>
                                <div className="text-sm text-slate-400 flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {getTimeAgo(alert.timestamp)}
                                </div>
                              </div>
                            </div>
                            <p className="mt-1 text-sm text-slate-400">{alert.description}</p>
                            <div className="mt-3 flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Badge variant="outline" className="bg-slate-700/50 text-slate-300 border-slate-600/50">
                                  {alert.region}
                                </Badge>
                                <span className="text-xs text-slate-500">Kaynak: {alert.source}</span>
                              </div>
                              <div>
                                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                                  Çözüldü
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
