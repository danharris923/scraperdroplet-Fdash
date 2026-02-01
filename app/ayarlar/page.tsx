"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, SettingsIcon, Bell, Shield, Wifi, Save } from "lucide-react"
import { useRouter } from "next/navigation"

export default function Ayarlar() {
  const router = useRouter()
  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    smsAlerts: false,
    pushNotifications: true,
    soundAlerts: true,
    minMagnitude: 4.0,
  })

  const [systemSettings, setSystemSettings] = useState({
    dataRefreshRate: 60,
    darkMode: true,
    language: "tr",
    timeZone: "Europe/Istanbul",
    autoUpdate: true,
  })

  const [monitoringSettings, setMonitoringSettings] = useState({
    sensitivity: 3,
    autoFilter: true,
    focusRegion: "all",
    continuousMonitoring: true,
    dataRetentionDays: 90,
  })

  const handleSaveSettings = () => {
    // Ayarları kaydetme simülasyonu
    alert("Ayarlar başarıyla kaydedildi!")
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
            <h1 className="text-2xl font-bold text-amber-500">Sistem Ayarları</h1>
          </div>
          <Button onClick={handleSaveSettings}>
            <Save className="h-4 w-4 mr-2" />
            Ayarları Kaydet
          </Button>
        </div>

        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="bg-slate-800/50 p-1 mb-6">
            <TabsTrigger
              value="notifications"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400"
            >
              Bildirim Ayarları
            </TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400">
              Sistem Ayarları
            </TabsTrigger>
            <TabsTrigger
              value="monitoring"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400"
            >
              İzleme Ayarları
            </TabsTrigger>
            <TabsTrigger
              value="account"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400"
            >
              Hesap Ayarları
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="mt-0">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2 text-amber-500" />
                  Bildirim Ayarları
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor="email-alerts">E-posta Bildirimleri</Label>
                        </div>
                        <Switch
                          id="email-alerts"
                          checked={notificationSettings.emailAlerts}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({ ...notificationSettings, emailAlerts: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor="sms-alerts">SMS Bildirimleri</Label>
                        </div>
                        <Switch
                          id="sms-alerts"
                          checked={notificationSettings.smsAlerts}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({ ...notificationSettings, smsAlerts: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor="push-notifications">Push Bildirimleri</Label>
                        </div>
                        <Switch
                          id="push-notifications"
                          checked={notificationSettings.pushNotifications}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({ ...notificationSettings, pushNotifications: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor="sound-alerts">Sesli Uyarılar</Label>
                        </div>
                        <Switch
                          id="sound-alerts"
                          checked={notificationSettings.soundAlerts}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({ ...notificationSettings, soundAlerts: checked })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="min-magnitude" className="mb-2 block">
                          Minimum Bildirim Büyüklüğü
                        </Label>
                        <div className="flex items-center space-x-4">
                          <Slider
                            id="min-magnitude"
                            min={2.0}
                            max={7.0}
                            step={0.1}
                            value={[notificationSettings.minMagnitude]}
                            onValueChange={(value) =>
                              setNotificationSettings({ ...notificationSettings, minMagnitude: value[0] })
                            }
                            className="flex-1"
                          />
                          <span className="text-amber-400 font-medium">
                            {notificationSettings.minMagnitude.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Bu büyüklüğün üzerindeki depremler için bildirim alacaksınız.
                        </p>
                      </div>

                      <div className="pt-4">
                        <Label htmlFor="notification-email" className="mb-2 block">
                          Bildirim E-posta Adresi
                        </Label>
                        <Input
                          id="notification-email"
                          type="email"
                          placeholder="ornek@email.com"
                          className="bg-slate-800/50 border-slate-700/50"
                        />
                      </div>

                      <div>
                        <Label htmlFor="notification-phone" className="mb-2 block">
                          Bildirim Telefon Numarası
                        </Label>
                        <Input
                          id="notification-phone"
                          type="tel"
                          placeholder="+90 555 123 4567"
                          className="bg-slate-800/50 border-slate-700/50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="mt-0">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <SettingsIcon className="h-5 w-5 mr-2 text-amber-500" />
                  Sistem Ayarları
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="data-refresh" className="mb-2 block">
                          Veri Yenileme Sıklığı (saniye)
                        </Label>
                        <div className="flex items-center space-x-4">
                          <Slider
                            id="data-refresh"
                            min={10}
                            max={300}
                            step={10}
                            value={[systemSettings.dataRefreshRate]}
                            onValueChange={(value) =>
                              setSystemSettings({ ...systemSettings, dataRefreshRate: value[0] })
                            }
                            className="flex-1"
                          />
                          <span className="text-amber-400 font-medium">{systemSettings.dataRefreshRate}s</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor="dark-mode">Karanlık Mod</Label>
                        </div>
                        <Switch
                          id="dark-mode"
                          checked={systemSettings.darkMode}
                          onCheckedChange={(checked) => setSystemSettings({ ...systemSettings, darkMode: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor="auto-update">Otomatik Güncelleme</Label>
                        </div>
                        <Switch
                          id="auto-update"
                          checked={systemSettings.autoUpdate}
                          onCheckedChange={(checked) => setSystemSettings({ ...systemSettings, autoUpdate: checked })}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="language" className="mb-2 block">
                          Dil
                        </Label>
                        <Select
                          value={systemSettings.language}
                          onValueChange={(value) => setSystemSettings({ ...systemSettings, language: value })}
                        >
                          <SelectTrigger className="bg-slate-800/50 border-slate-700/50">
                            <SelectValue placeholder="Dil seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tr">Türkçe</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="de">Deutsch</SelectItem>
                            <SelectItem value="fr">Français</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="timezone" className="mb-2 block">
                          Zaman Dilimi
                        </Label>
                        <Select
                          value={systemSettings.timeZone}
                          onValueChange={(value) => setSystemSettings({ ...systemSettings, timeZone: value })}
                        >
                          <SelectTrigger className="bg-slate-800/50 border-slate-700/50">
                            <SelectValue placeholder="Zaman dilimi seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Europe/Istanbul">Europe/Istanbul (UTC+3)</SelectItem>
                            <SelectItem value="Europe/London">Europe/London (UTC+0)</SelectItem>
                            <SelectItem value="Europe/Paris">Europe/Paris (UTC+1)</SelectItem>
                            <SelectItem value="America/New_York">America/New_York (UTC-5)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="data-format" className="mb-2 block">
                          Tarih Formatı
                        </Label>
                        <Select defaultValue="dd-mm-yyyy">
                          <SelectTrigger className="bg-slate-800/50 border-slate-700/50">
                            <SelectValue placeholder="Tarih formatı seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dd-mm-yyyy">DD-MM-YYYY</SelectItem>
                            <SelectItem value="mm-dd-yyyy">MM-DD-YYYY</SelectItem>
                            <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring" className="mt-0">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wifi className="h-5 w-5 mr-2 text-amber-500" />
                  İzleme Ayarları
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="sensitivity" className="mb-2 block">
                          Hassasiyet Seviyesi
                        </Label>
                        <div className="flex items-center space-x-4">
                          <Slider
                            id="sensitivity"
                            min={1}
                            max={5}
                            step={1}
                            value={[monitoringSettings.sensitivity]}
                            onValueChange={(value) =>
                              setMonitoringSettings({ ...monitoringSettings, sensitivity: value[0] })
                            }
                            className="flex-1"
                          />
                          <span className="text-amber-400 font-medium">{monitoringSettings.sensitivity}/5</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Daha yüksek hassasiyet, daha küçük depremleri de algılar.
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor="auto-filter">Otomatik Filtreleme</Label>
                        </div>
                        <Switch
                          id="auto-filter"
                          checked={monitoringSettings.autoFilter}
                          onCheckedChange={(checked) =>
                            setMonitoringSettings({ ...monitoringSettings, autoFilter: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor="continuous-monitoring">24/7 İzleme</Label>
                        </div>
                        <Switch
                          id="continuous-monitoring"
                          checked={monitoringSettings.continuousMonitoring}
                          onCheckedChange={(checked) =>
                            setMonitoringSettings({ ...monitoringSettings, continuousMonitoring: checked })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="focus-region" className="mb-2 block">
                          Odak Bölgesi
                        </Label>
                        <Select
                          value={monitoringSettings.focusRegion}
                          onValueChange={(value) =>
                            setMonitoringSettings({ ...monitoringSettings, focusRegion: value })
                          }
                        >
                          <SelectTrigger className="bg-slate-800/50 border-slate-700/50">
                            <SelectValue placeholder="Bölge seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tüm Bölgeler</SelectItem>
                            <SelectItem value="marmara">Marmara Bölgesi</SelectItem>
                            <SelectItem value="ege">Ege Bölgesi</SelectItem>
                            <SelectItem value="akdeniz">Akdeniz Bölgesi</SelectItem>
                            <SelectItem value="karadeniz">Karadeniz Bölgesi</SelectItem>
                            <SelectItem value="ic-anadolu">İç Anadolu Bölgesi</SelectItem>
                            <SelectItem value="dogu-anadolu">Doğu Anadolu Bölgesi</SelectItem>
                            <SelectItem value="guneydogu-anadolu">Güneydoğu Anadolu Bölgesi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="data-retention" className="mb-2 block">
                          Veri Saklama Süresi (gün)
                        </Label>
                        <div className="flex items-center space-x-4">
                          <Slider
                            id="data-retention"
                            min={30}
                            max={365}
                            step={30}
                            value={[monitoringSettings.dataRetentionDays]}
                            onValueChange={(value) =>
                              setMonitoringSettings({ ...monitoringSettings, dataRetentionDays: value[0] })
                            }
                            className="flex-1"
                          />
                          <span className="text-amber-400 font-medium">{monitoringSettings.dataRetentionDays} gün</span>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="data-sources" className="mb-2 block">
                          Veri Kaynakları
                        </Label>
                        <Select defaultValue="all">
                          <SelectTrigger className="bg-slate-800/50 border-slate-700/50">
                            <SelectValue placeholder="Veri kaynağı seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tüm Kaynaklar</SelectItem>
                            <SelectItem value="kandilli">Kandilli Rasathanesi</SelectItem>
                            <SelectItem value="afad">AFAD</SelectItem>
                            <SelectItem value="emsc">EMSC</SelectItem>
                            <SelectItem value="usgs">USGS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="mt-0">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-amber-500" />
                  Hesap Ayarları
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="username" className="mb-2 block">
                          Kullanıcı Adı
                        </Label>
                        <Input id="username" defaultValue="admin" className="bg-slate-800/50 border-slate-700/50" />
                      </div>

                      <div>
                        <Label htmlFor="email" className="mb-2 block">
                          E-posta Adresi
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          defaultValue="admin@depremizleme.org"
                          className="bg-slate-800/50 border-slate-700/50"
                        />
                      </div>

                      <div>
                        <Label htmlFor="current-password" className="mb-2 block">
                          Mevcut Şifre
                        </Label>
                        <Input
                          id="current-password"
                          type="password"
                          placeholder="••••••••"
                          className="bg-slate-800/50 border-slate-700/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="new-password" className="mb-2 block">
                          Yeni Şifre
                        </Label>
                        <Input
                          id="new-password"
                          type="password"
                          placeholder="••••••••"
                          className="bg-slate-800/50 border-slate-700/50"
                        />
                      </div>

                      <div>
                        <Label htmlFor="confirm-password" className="mb-2 block">
                          Şifre Tekrar
                        </Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="••••••••"
                          className="bg-slate-800/50 border-slate-700/50"
                        />
                      </div>

                      <div className="pt-4">
                        <Button variant="outline" className="w-full">
                          Şifreyi Değiştir
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-700/50 pt-6">
                    <h3 className="text-sm font-medium mb-4">Erişim İzinleri</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="admin-access">Yönetici Erişimi</Label>
                        <Switch id="admin-access" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="data-export">Veri Dışa Aktarma</Label>
                        <Switch id="data-export" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="system-config">Sistem Yapılandırma</Label>
                        <Switch id="system-config" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="user-management">Kullanıcı Yönetimi</Label>
                        <Switch id="user-management" defaultChecked />
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
