"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TerminalIcon, ArrowLeft, Download, X } from "lucide-react"
import { useRouter } from "next/navigation"

export default function Konsol() {
  const router = useRouter()
  const [logs, setLogs] = useState<string[]>([])
  const [baseStations, setBaseStations] = useState<{ name: string; status: string; dataRate: number }[]>([])
  const [isRunning, setIsRunning] = useState(true)
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Baz istasyonları oluştur
    const stations = [
      { name: "Kandilli Rasathanesi", status: "online", dataRate: 98 },
      { name: "AFAD Merkez", status: "online", dataRate: 95 },
      { name: "Ege Üniversitesi", status: "online", dataRate: 92 },
      { name: "Boğaziçi Üniversitesi", status: "online", dataRate: 97 },
      { name: "ODTÜ Deprem Merkezi", status: "online", dataRate: 94 },
      { name: "İTÜ Sismik İzleme", status: "online", dataRate: 91 },
      { name: "Dokuz Eylül Üniversitesi", status: "online", dataRate: 89 },
      { name: "Çanakkale 18 Mart Üniversitesi", status: "offline", dataRate: 0 },
      { name: "Kocaeli Üniversitesi", status: "online", dataRate: 93 },
      { name: "Sakarya Üniversitesi", status: "online", dataRate: 90 },
    ]
    setBaseStations(stations)

    // Başlangıç logları
    const initialLogs = [
      "[SYS] Deprem İzleme Sistemi başlatılıyor...",
      "[SYS] Veri kaynakları kontrol ediliyor...",
      "[SYS] Baz istasyonları ile bağlantı kuruluyor...",
      `[SYS] ${stations.filter((s) => s.status === "online").length}/${stations.length} istasyon çevrimiçi`,
      "[SYS] Veri akışı başlatıldı",
      "[DATA] Kandilli Rasathanesi'nden veri alınıyor (98% veri akış hızı)",
      "[DATA] AFAD Merkez'den veri alınıyor (95% veri akış hızı)",
      "[DATA] Ege Üniversitesi'nden veri alınıyor (92% veri akış hızı)",
    ]
    setLogs(initialLogs)

    // Periyodik log ekleme
    const interval = setInterval(() => {
      if (isRunning) {
        addLog()
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [isRunning])

  // Yeni log eklendiğinde otomatik scroll
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs])

  const addLog = () => {
    const logTypes = [
      {
        type: "DATA",
        messages: [
          "Veri paketi alındı: 256KB",
          "Sismik dalga analizi yapılıyor",
          "Deprem verisi işleniyor",
          "Veri doğrulaması tamamlandı",
          "Veri merkeze iletiliyor",
        ],
      },
      {
        type: "SYS",
        messages: [
          "Sistem durumu: Normal",
          "Bellek kullanımı: 42%",
          "CPU kullanımı: 38%",
          "Ağ trafiği: 1.2MB/s",
          "Veri tabanı senkronizasyonu tamamlandı",
        ],
      },
      {
        type: "ALERT",
        messages: [
          "Yeni deprem verisi tespit edildi",
          "Veri doğrulaması gerekiyor",
          "Olası sismik aktivite tespit edildi",
          "Uyarı sistemi kontrol ediliyor",
          "Bölgesel analiz yapılıyor",
        ],
      },
    ]

    const randomStation = baseStations[Math.floor(Math.random() * baseStations.length)]
    if (randomStation.status === "online") {
      const logType = logTypes[Math.floor(Math.random() * logTypes.length)]
      const message = logType.messages[Math.floor(Math.random() * logType.messages.length)]

      const newLog = `[${logType.type}] ${randomStation.name}: ${message}`
      setLogs((prev) => [...prev, newLog])
    }
  }

  const clearLogs = () => {
    setLogs(["[SYS] Terminal temizlendi", "[SYS] Veri akışı devam ediyor"])
  }

  const toggleRunning = () => {
    setIsRunning(!isRunning)
    setLogs((prev) => [...prev, `[SYS] Veri akışı ${!isRunning ? "başlatıldı" : "durduruldu"}`])
  }

  const downloadLogs = () => {
    const logText = logs.join("\n")
    const blob = new Blob([logText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `deprem-izleme-logs-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
            <h1 className="text-2xl font-bold text-amber-500">Sistem Konsolu</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={toggleRunning}>
              {isRunning ? "Durdur" : "Başlat"}
            </Button>
            <Button variant="outline" size="sm" onClick={clearLogs}>
              <X className="h-4 w-4 mr-2" />
              Temizle
            </Button>
            <Button variant="outline" size="sm" onClick={downloadLogs}>
              <Download className="h-4 w-4 mr-2" />
              İndir
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm h-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <TerminalIcon className="h-5 w-5 mr-2 text-amber-500" />
                  Terminal Çıktısı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  ref={terminalRef}
                  className="bg-black/50 rounded-lg p-4 font-mono text-sm h-[600px] overflow-y-auto"
                >
                  {logs.map((log, index) => {
                    let textColor = "text-slate-300"
                    if (log.includes("[SYS]")) textColor = "text-blue-400"
                    if (log.includes("[DATA]")) textColor = "text-green-400"
                    if (log.includes("[ALERT]")) textColor = "text-amber-400"
                    if (log.includes("[ERROR]")) textColor = "text-red-400"

                    return (
                      <div key={index} className={`${textColor} mb-1`}>
                        <span className="text-slate-500">{new Date().toLocaleTimeString()}</span> {log}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Baz İstasyonları</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                  {baseStations.map((station, index) => (
                    <div key={index} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-medium">{station.name}</div>
                        <Badge
                          className={
                            station.status === "online"
                              ? "bg-green-500/20 text-green-400 border-green-500/50"
                              : "bg-red-500/20 text-red-400 border-red-500/50"
                          }
                        >
                          {station.status === "online" ? "Çevrimiçi" : "Çevrimdışı"}
                        </Badge>
                      </div>
                      {station.status === "online" && (
                        <div className="text-xs text-slate-400">Veri Akış Hızı: {station.dataRate}%</div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
