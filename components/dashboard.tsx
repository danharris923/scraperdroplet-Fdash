"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Activity,
  AlertTriangle,
  Settings,
  Map,
  Globe,
  Navigation,
  FileText,
  Terminal,
  Menu,
  Bell,
  Radio,
  Zap,
  Clock,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarTrigger,
} from "@/components/ui/sidebar"

// Türkiye'deki son depremler için örnek veri
const recentEarthquakes = [
  { id: 1, location: "Hatay", magnitude: 4.2, depth: 7.2, time: "2 dakika önce", color: "bg-yellow-500" },
  { id: 2, location: "İzmir", magnitude: 3.5, depth: 5.1, time: "15 dakika önce", color: "bg-green-500" },
  { id: 3, location: "Van", magnitude: 2.8, depth: 4.3, time: "32 dakika önce", color: "bg-green-500" },
  { id: 4, location: "Muğla", magnitude: 3.1, depth: 6.7, time: "1 saat önce", color: "bg-green-500" },
  { id: 5, location: "Elazığ", magnitude: 3.7, depth: 8.2, time: "2 saat önce", color: "bg-green-500" },
]

// Küresel deprem uyarıları için örnek veri
const globalAlerts = [
  { id: 1, location: "Japonya, Tokyo", magnitude: 6.8, time: "5 dakika önce", risk: "Yüksek", color: "bg-red-500" },
  { id: 2, location: "Şili, Santiago", magnitude: 5.4, time: "30 dakika önce", risk: "Orta", color: "bg-yellow-500" },
  { id: 3, location: "Endonezya, Bali", magnitude: 5.9, time: "1 saat önce", risk: "Orta", color: "bg-yellow-500" },
]

// Baz istasyonları için örnek veri
const baseStations = [
  { id: 1, name: "İstanbul-1", status: "Aktif", dataRate: "128 kb/s", lastUpdate: "2 saniye önce" },
  { id: 2, name: "Ankara-1", status: "Aktif", dataRate: "112 kb/s", lastUpdate: "5 saniye önce" },
  { id: 3, name: "İzmir-1", status: "Aktif", dataRate: "96 kb/s", lastUpdate: "8 saniye önce" },
  { id: 4, name: "Antalya-1", status: "Aktif", dataRate: "104 kb/s", lastUpdate: "3 saniye önce" },
  { id: 5, name: "Erzurum-1", status: "Aktif", dataRate: "88 kb/s", lastUpdate: "10 saniye önce" },
  { id: 6, name: "Diyarbakır-1", status: "Aktif", dataRate: "72 kb/s", lastUpdate: "15 saniye önce" },
  { id: 7, name: "Trabzon-1", status: "Aktif", dataRate: "64 kb/s", lastUpdate: "12 saniye önce" },
]

// Konsol mesajları için örnek veri
const consoleMessages = [
  { id: 1, type: "info", message: "Sistem başlatıldı, tüm servisler aktif.", time: "09:30:15" },
  { id: 2, type: "data", message: "Kandilli Rasathanesi API bağlantısı kuruldu.", time: "09:30:18" },
  { id: 3, type: "data", message: "AFAD veri akışı başladı.", time: "09:30:20" },
  { id: 4, type: "warning", message: "İstanbul-2 istasyonu düşük sinyal gücü bildiriyor.", time: "09:31:05" },
  { id: 5, type: "info", message: "Toplam 7 baz istasyonundan veri alınıyor.", time: "09:31:30" },
  { id: 6, type: "data", message: "USGS global deprem verileri güncellendi.", time: "09:32:15" },
  { id: 7, type: "alert", message: "Japonya'da 6.8 büyüklüğünde deprem tespit edildi.", time: "09:33:42" },
  { id: 8, type: "data", message: "Hatay'da 4.2 büyüklüğünde deprem kaydedildi.", time: "09:35:10" },
]

// İstatistikler için örnek veri
const statistics = {
  dailyEarthquakes: 24,
  weeklyEarthquakes: 142,
  monthlyEarthquakes: 587,
  activeStations: 7,
  dataPoints: 12845,
  alertsSent: 3,
  systemUptime: "99.8%",
  averageResponseTime: "1.2s",
}

// NavItem bileşeni
const NavItem = ({ icon: Icon, label, active, onClick }) => {
  return (
    <Link href="#" onClick={onClick} passHref>
      <div
        className={cn(
          "flex items-center space-x-3 px-4 py-2 rounded-md transition-colors cursor-pointer",
          active ? "bg-gray-800 text-emerald-500" : "hover:bg-gray-800",
        )}
      >
        <Icon className="h-5 w-5" />
        <span>{label}</span>
      </div>
    </Link>
  )
}

// StatusItem bileşeni
const StatusItem = ({ status, label }) => {
  return (
    <div className="flex items-center space-x-2">
      <div className={`h-2 w-2 rounded-full ${status === "active" ? "bg-emerald-500" : "bg-red-500"}`}></div>
      <span className="text-sm">{label}</span>
    </div>
  )
}

// MetricCard bileşeni
const MetricCard = ({ value, label, icon: Icon, color = "text-emerald-500" }) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg flex flex-col items-center justify-center">
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-sm text-gray-400 flex items-center mt-1">
        {Icon && <Icon className="h-3 w-3 mr-1" />}
        {label}
      </div>
    </div>
  )
}

// PerformanceChart bileşeni
const PerformanceChart = ({ data, title, subtitle }) => {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-xs text-gray-500">{subtitle}</span>
      </div>
      <div className="grid grid-cols-5 gap-2 mb-2">
        {data.map((item, index) => (
          <div key={index} className="h-24 bg-gray-800 rounded-md relative overflow-hidden">
            <div className={`absolute bottom-0 w-full ${item.color}`} style={{ height: `${item.percentage}%` }}></div>
            <div className="absolute bottom-0 w-full p-1 text-xs font-medium">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// EarthquakeRow bileşeni
const EarthquakeRow = ({ quake, getMagnitudeColor }) => {
  return (
    <div className="bg-gray-800 p-3 rounded-lg flex items-center space-x-3">
      <div className={`h-2 w-2 rounded-full ${quake.color}`}></div>
      <div className="flex-1">
        <div className="flex justify-between">
          <span className="font-medium">{quake.location}</span>
          <span className={`font-bold ${getMagnitudeColor(quake.magnitude)}`}>{quake.magnitude}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>Derinlik: {quake.depth} km</span>
          <span>{quake.time}</span>
        </div>
      </div>
    </div>
  )
}

export function Dashboard() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState("sismik-aktivite")
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [consoleLog, setConsoleLog] = useState(consoleMessages)

  // Zaman güncellemesi
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Konsol mesajları için otomatik güncelleme
  useEffect(() => {
    const consoleTimer = setInterval(() => {
      const newMessage = {
        id: consoleLog.length + 1,
        type: ["info", "data", "warning", "alert"][Math.floor(Math.random() * 4)],
        message: `Veri güncellendi: ${Math.floor(Math.random() * 100)} yeni veri noktası işlendi.`,
        time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      }
      setConsoleLog((prev) => [newMessage, ...prev.slice(0, 19)])
    }, 8000)

    return () => clearInterval(consoleTimer)
  }, [consoleLog])

  // Menü açma/kapama
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  // Aktif bölümü değiştirme
  const handleSectionChange = (section) => {
    setActiveSection(section)
    setIsMenuOpen(false)
    router.push(`/${section}`)
  }

  // Konsol mesaj tipi için renk belirleme
  const getConsoleMessageColor = (type) => {
    switch (type) {
      case "info":
        return "text-blue-400"
      case "data":
        return "text-green-400"
      case "warning":
        return "text-yellow-400"
      case "alert":
        return "text-red-400"
      default:
        return "text-gray-400"
    }
  }

  // Deprem büyüklüğüne göre renk belirleme
  const getMagnitudeColor = (magnitude) => {
    if (magnitude >= 6.0) return "text-red-500"
    if (magnitude >= 4.5) return "text-orange-500"
    if (magnitude >= 3.0) return "text-yellow-500"
    return "text-green-500"
  }

  // Büyüklük dağılımı için örnek veri
  const magnitudeData = [
    { label: "0-2", percentage: 30, color: "bg-green-500" },
    { label: "2-3", percentage: 60, color: "bg-green-500" },
    { label: "3-4", percentage: 40, color: "bg-yellow-500" },
    { label: "4-5", percentage: 20, color: "bg-orange-500" },
    { label: "5+", percentage: 10, color: "bg-red-500" },
  ]

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-black text-white overflow-hidden">
        {/* Sidebar */}
        <Sidebar className="bg-gray-900 border-r border-gray-800">
          <SidebarHeader className="p-4 border-b border-gray-800">
            <div className="flex items-center space-x-2">
              <Activity className="h-6 w-6 text-emerald-500" />
              <h1 className="text-xl font-bold">SismikNet</h1>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="px-4 py-2 text-xs text-gray-500 uppercase">Ana Menü</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <Link href="/sismik-aktivite" passHref>
                      <SidebarMenuButton
                        className={cn(
                          "flex items-center space-x-3 px-4 py-2 rounded-md transition-colors",
                          activeSection === "sismik-aktivite" ? "bg-gray-800 text-emerald-500" : "hover:bg-gray-800",
                        )}
                        onClick={() => handleSectionChange("sismik-aktivite")}
                      >
                        <Activity className="h-5 w-5" />
                        <span>Sismik Aktivite</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <Link href="/uyarilar" passHref>
                      <SidebarMenuButton
                        className={cn(
                          "flex items-center space-x-3 px-4 py-2 rounded-md transition-colors",
                          activeSection === "uyarilar" ? "bg-gray-800 text-emerald-500" : "hover:bg-gray-800",
                        )}
                        onClick={() => handleSectionChange("uyarilar")}
                      >
                        <AlertTriangle className="h-5 w-5" />
                        <span>Uyarılar</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <Link href="/kuresel-ag" passHref>
                      <SidebarMenuButton
                        className={cn(
                          "flex items-center space-x-3 px-4 py-2 rounded-md transition-colors",
                          activeSection === "kuresel-ag" ? "bg-gray-800 text-emerald-500" : "hover:bg-gray-800",
                        )}
                        onClick={() => handleSectionChange("kuresel-ag")}
                      >
                        <Globe className="h-5 w-5" />
                        <span>Küresel Ağ</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <Link href="/konumlar" passHref>
                      <SidebarMenuButton
                        className={cn(
                          "flex items-center space-x-3 px-4 py-2 rounded-md transition-colors",
                          activeSection === "konumlar" ? "bg-gray-800 text-emerald-500" : "hover:bg-gray-800",
                        )}
                        onClick={() => handleSectionChange("konumlar")}
                      >
                        <Navigation className="h-5 w-5" />
                        <span>Konumlar</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <Link href="/harita" passHref>
                      <SidebarMenuButton
                        className={cn(
                          "flex items-center space-x-3 px-4 py-2 rounded-md transition-colors",
                          activeSection === "harita" ? "bg-gray-800 text-emerald-500" : "hover:bg-gray-800",
                        )}
                        onClick={() => handleSectionChange("harita")}
                      >
                        <Map className="h-5 w-5" />
                        <span>Harita</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="px-4 py-2 text-xs text-gray-500 uppercase mt-6">Sistem</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <Link href="/raporlar" passHref>
                      <SidebarMenuButton
                        className={cn(
                          "flex items-center space-x-3 px-4 py-2 rounded-md transition-colors",
                          activeSection === "raporlar" ? "bg-gray-800 text-emerald-500" : "hover:bg-gray-800",
                        )}
                        onClick={() => handleSectionChange("raporlar")}
                      >
                        <FileText className="h-5 w-5" />
                        <span>Raporlar</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <Link href="/konsol" passHref>
                      <SidebarMenuButton
                        className={cn(
                          "flex items-center space-x-3 px-4 py-2 rounded-md transition-colors",
                          activeSection === "konsol" ? "bg-gray-800 text-emerald-500" : "hover:bg-gray-800",
                        )}
                        onClick={() => handleSectionChange("konsol")}
                      >
                        <Terminal className="h-5 w-5" />
                        <span>Konsol</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <Link href="/ayarlar" passHref>
                      <SidebarMenuButton
                        className={cn(
                          "flex items-center space-x-3 px-4 py-2 rounded-md transition-colors",
                          activeSection === "ayarlar" ? "bg-gray-800 text-emerald-500" : "hover:bg-gray-800",
                        )}
                        onClick={() => handleSectionChange("ayarlar")}
                      >
                        <Settings className="h-5 w-5" />
                        <span>Ayarlar</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                <span className="text-sm">Sistem Aktif</span>
              </div>
              <span className="text-xs text-gray-500">v1.2.4</span>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* Ana İçerik */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Üst Çubuk */}
          <header className="bg-gray-900 border-b border-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <SidebarTrigger className="md:hidden">
                  <Menu className="h-6 w-6" />
                </SidebarTrigger>
                <h2 className="text-xl font-semibold hidden md:block">
                  {activeSection === "sismik-aktivite" && "Sismik Aktivite Monitörü"}
                  {activeSection === "uyarilar" && "Deprem Uyarıları"}
                  {activeSection === "kuresel-ag" && "Küresel Sismik Ağ"}
                  {activeSection === "konumlar" && "İstasyon Konumları"}
                  {activeSection === "harita" && "Türkiye Deprem Haritası"}
                  {activeSection === "raporlar" && "Deprem Raporları"}
                  {activeSection === "konsol" && "Sistem Konsolu"}
                  {activeSection === "ayarlar" && "Sistem Ayarları"}
                </h2>
              </div>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Bell className="h-5 w-5 cursor-pointer hover:text-emerald-500 transition-colors" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-xs">
                    3
                  </span>
                </div>
                <div className="bg-gray-800 rounded-md px-3 py-1 text-sm flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-emerald-500" />
                  <span>{currentTime.toLocaleTimeString("tr-TR")}</span>
                </div>
                <div className="hidden md:flex items-center space-x-2 bg-gray-800 rounded-md px-3 py-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  <span className="text-sm">Tüm Sistemler Aktif</span>
                </div>
              </div>
            </div>
          </header>

          {/* İçerik Alanı */}
          <main className="flex-1 overflow-y-auto bg-gray-950 p-4">
            {activeSection === "sismik-aktivite" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Aktivite Özeti */}
                <Card className="bg-gray-900 border-gray-800 col-span-1 md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <Activity className="h-5 w-5 mr-2 text-emerald-500" />
                      Sismik Aktivite Özeti
                    </CardTitle>
                    <CardDescription>Son 24 saat içindeki deprem aktivitesi</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-800 p-4 rounded-lg flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold text-emerald-500">{statistics.dailyEarthquakes}</div>
                        <div className="text-sm text-gray-400">Günlük Deprem</div>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-lg flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold text-emerald-500">{statistics.weeklyEarthquakes}</div>
                        <div className="text-sm text-gray-400">Haftalık Deprem</div>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-lg flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold text-emerald-500">{statistics.monthlyEarthquakes}</div>
                        <div className="text-sm text-gray-400">Aylık Deprem</div>
                      </div>
                    </div>

                    <PerformanceChart data={magnitudeData} title="Büyüklük Dağılımı" subtitle="Son 24 saat" />
                  </CardContent>
                </Card>

                {/* Son Depremler */}
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                      Son Depremler
                    </CardTitle>
                    <CardDescription>Türkiye'deki son depremler</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentEarthquakes.map((quake) => (
                        <EarthquakeRow key={quake.id} quake={quake} getMagnitudeColor={getMagnitudeColor} />
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-white border-gray-700"
                    >
                      Tüm Depremleri Görüntüle
                    </Button>
                  </CardContent>
                </Card>

                {/* Baz İstasyonları */}
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <Radio className="h-5 w-5 mr-2 text-blue-500" />
                      Baz İstasyonları
                    </CardTitle>
                    <CardDescription>Aktif veri toplama istasyonları</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {baseStations.map((station) => (
                        <div key={station.id} className="bg-gray-800 p-2 rounded-lg flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                            <span className="font-medium">{station.name}</span>
                          </div>
                          <div className="text-xs text-gray-400">{station.dataRate}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-800 flex justify-between items-center">
                      <div className="text-sm">
                        <span className="text-emerald-500 font-bold">{baseStations.length}</span> aktif istasyon
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-gray-800 hover:bg-gray-700 text-white border-gray-700"
                      >
                        Detaylar
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Uyarılar */}
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
                      Aktif Uyarılar
                    </CardTitle>
                    <CardDescription>Küresel sismik aktivite uyarıları</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {globalAlerts.map((alert) => (
                        <div key={alert.id} className="bg-gray-800 p-3 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className={`h-2 w-2 rounded-full ${alert.color}`}></div>
                              <span className="font-medium">{alert.location}</span>
                            </div>
                            <span className={`font-bold ${getMagnitudeColor(alert.magnitude)}`}>{alert.magnitude}</span>
                          </div>
                          <div className="flex justify-between mt-1 text-xs text-gray-400">
                            <span>Risk: {alert.risk}</span>
                            <span>{alert.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-white border-gray-700"
                    >
                      Tüm Uyarıları Görüntüle
                    </Button>
                  </CardContent>
                </Card>

                {/* Konsol Çıktısı */}
                <Card className="bg-gray-900 border-gray-800 col-span-1 md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <Terminal className="h-5 w-5 mr-2 text-emerald-500" />
                      Sistem Konsolu
                    </CardTitle>
                    <CardDescription>Canlı veri işleme günlüğü</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-950 rounded-md p-3 h-60 overflow-y-auto font-mono text-sm">
                      {consoleLog.slice(0, 10).map((log) => (
                        <div key={log.id} className="mb-1 flex">
                          <span className="text-gray-500 mr-2">[{log.time}]</span>
                          <span className={getConsoleMessageColor(log.type)}>{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection === "uyarilar" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gray-900 border-gray-800 col-span-1 md:col-span-3">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
                      Küresel Sismik Aktivite Uyarıları
                    </CardTitle>
                    <CardDescription>Dünya genelinde yüksek sismik aktivite gösteren bölgeler</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-red-500">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-bold">Japonya, Pasifik Kıyısı</h3>
                          <span className="bg-red-500 text-white px-2 py-1 rounded-md text-xs">Yüksek Risk</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">
                          Son 24 saatte 12 deprem kaydedildi. En büyüğü 6.8 büyüklüğünde.
                        </p>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Son güncelleme: 5 dakika önce</span>
                          <Button variant="link" size="sm" className="text-emerald-500 p-0 h-auto">
                            Detaylar
                          </Button>
                        </div>
                      </div>

                      <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-yellow-500">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-bold">Şili, Santiago Bölgesi</h3>
                          <span className="bg-yellow-500 text-white px-2 py-1 rounded-md text-xs">Orta Risk</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">
                          Son 24 saatte 8 deprem kaydedildi. En büyüğü 5.4 büyüklüğünde.
                        </p>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Son güncelleme: 30 dakika önce</span>
                          <Button variant="link" size="sm" className="text-emerald-500 p-0 h-auto">
                            Detaylar
                          </Button>
                        </div>
                      </div>

                      <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-yellow-500">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-bold">Endonezya, Bali Adası</h3>
                          <span className="bg-yellow-500 text-white px-2 py-1 rounded-md text-xs">Orta Risk</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">
                          Son 24 saatte 6 deprem kaydedildi. En büyüğü 5.9 büyüklüğünde.
                        </p>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Son güncelleme: 1 saat önce</span>
                          <Button variant="link" size="sm" className="text-emerald-500 p-0 h-auto">
                            Detaylar
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-4">Tsunami Uyarıları</h3>
                      <div className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="h-3 w-3 rounded-full bg-green-500"></div>
                          <span className="font-medium">Şu anda aktif tsunami uyarısı bulunmamaktadır.</span>
                        </div>
                        <p className="text-sm text-gray-400">
                          Sistem, 6.5 ve üzeri büyüklükteki deniz depremleri için otomatik tsunami risk değerlendirmesi
                          yapar.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800 col-span-1 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Bell className="h-5 w-5 mr-2 text-blue-500" />
                      Bildirim Ayarları
                    </CardTitle>
                    <CardDescription>Deprem uyarıları için bildirim tercihlerinizi yapılandırın</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                          <div>
                            <h4 className="font-medium">Büyük Deprem Uyarıları</h4>
                            <p className="text-xs text-gray-400">5.0+ büyüklüğündeki depremler için bildirim alın</p>
                          </div>
                        </div>
                        <div className="h-6 w-12 bg-emerald-500 rounded-full relative cursor-pointer">
                          <div className="absolute right-1 top-1 bg-white h-4 w-4 rounded-full"></div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <AlertCircle className="h-5 w-5 text-red-500" />
                          <div>
                            <h4 className="font-medium">Tsunami Uyarıları</h4>
                            <p className="text-xs text-gray-400">
                              Potansiyel tsunami riski olan depremler için bildirim alın
                            </p>
                          </div>
                        </div>
                        <div className="h-6 w-12 bg-emerald-500 rounded-full relative cursor-pointer">
                          <div className="absolute right-1 top-1 bg-white h-4 w-4 rounded-full"></div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Map className="h-5 w-5 text-blue-500" />
                          <div>
                            <h4 className="font-medium">Yerel Deprem Bildirimleri</h4>
                            <p className="text-xs text-gray-400">Bulunduğunuz bölgedeki depremler için bildirim alın</p>
                          </div>
                        </div>
                        <div className="h-6 w-12 bg-gray-700 rounded-full relative cursor-pointer">
                          <div className="absolute left-1 top-1 bg-white h-4 w-4 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Activity className="h-5 w-5 mr-2 text-emerald-500" />
                      Uyarı İstatistikleri
                    </CardTitle>
                    <CardDescription>Son 30 gün içindeki uyarı verileri</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-emerald-500 mb-1">{statistics.alertsSent}</div>
                        <div className="text-sm text-gray-400">Gönderilen Uyarılar</div>
                        <div className="h-1 w-full bg-gray-700 mt-2">
                          <div className="h-1 bg-emerald-500" style={{ width: "15%" }}></div>
                        </div>
                      </div>

                      <div className="bg-gray-800 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-500 mb-1">12</div>
                        <div className="text-sm text-gray-400">Orta Riskli Bölgeler</div>
                        <div className="h-1 w-full bg-gray-700 mt-2">
                          <div className="h-1 bg-yellow-500" style={{ width: "40%" }}></div>
                        </div>
                      </div>

                      <div className="bg-gray-800 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-red-500 mb-1">3</div>
                        <div className="text-sm text-gray-400">Yüksek Riskli Bölgeler</div>
                        <div className="h-1 w-full bg-gray-700 mt-2">
                          <div className="h-1 bg-red-500" style={{ width: "10%" }}></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Diğer bölümler için içerikler buraya eklenebilir */}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
