# Knots Connect

İzlanda merkezli güvenli bağlantı uygulaması. Expo + React Native + TypeScript ile geliştirilmiştir.

## Ekranlar

### Gerçek Telemetri

- **Ağ durumu:** Cihazın gerçek ağ bilgisi (Wi-Fi/mobil veri, internet erişimi) — `@react-native-community/netinfo`
- **HTTP gecikmesi:** Belirlenmiş sunucuya gerçek HTTP istek ölçümü (fetch + AbortController, zaman aşımı 5s)
- **Genel IP:** Ölçüm sunucusunun gördüğü gerçek IP adresi
- **Periyodik yenileme:** 30 saniyede bir otomatik yeniden ölçüm, pull-to-refresh ile manuel yenileme
- **VPN durumu:** Uygulama artık 'disconnected' durumda başlar; gerçek native VPN motoru gerektirir

### Önemli Ayrım

Gerçek VPN tünel telemetrisi (tünelden geçen baytlar, bağlantı süresi, tünel gecikmesi) native VPN motoru gerektirir ve bu prototipte ölçülmez — `—` gösterilir.

### Ana Sekmeler (Bottom Navigation)

| Sekme | İçerik |
|-------|--------|
| **Overview** | Bağlantı durumu, canlı bağlantı haritası, özel rota/ağ kısıtları kartları, Knots ID, bağlantıyı kes düğmesi |
| **Account** | Knots ID, kimlik oluşturma/geri yükleme, Premium üyelik durumu, hesap yönetimi |
| **Settings** | Bağlantı ayarları (otomatik başlat, yeniden bağlan, split routing), yerel koruma (reklam engelleme, DNS), sürüm bilgisi |

### Alt Ekranlar (Stack)

| Ekran | İçerik |
|-------|--------|
| **Country Control** | Ülke bazlı rota kontrolü — DPI/VPN/Tor düğümleri, mevcut mod durumu, Premium modalı |
| **Route Control** | 4 adımlı split route oluşturma akışı: Resting → Hold → Move → Release |

## Tasarım Sistemi

- **Arka plan:** Koyu lacivert (`#080E14`)
- **Kart yüzeyleri:** `#0D151D` / `#111C26`
- **Vurgu rengi:** Turkuaz (`#35D5E8`) — aktif durumlar
- **Bağlantı rengi:** Yeşil (`#75F0A4`) — rota çizgileri, durum göstergeleri
- **Mor:** Premium vurgu (`#6757FF`)
- **Mavi:** Cihaz konumu (`#248BFF`)
- Tipografi: Küçük uppercase bölüm etiketleri, büyük sade başlıklar, bol boşluk

## Teknoloji

- Expo 51 + React Native 0.74 + TypeScript 5.3
- React Navigation 6 (Bottom Tabs + Native Stack)
- Context API (VPN state)
- Saf React Native View ile stilize bağlantı haritası

## Kurulum

```bash
npm install
npm start
```

Expo Go ile QR kod tarayarak telefonunuzda çalıştırın.

## Klasör Yapısı

```
mobile-app/
├── App.tsx                          # Uygulama girişi
├── app.json                         # Expo konfigürasyonu
├── tsconfig.json                    # TypeScript ayarları
├── package.json                     # Bağımlılıklar
└── src/
    ├── components/                  # Yeniden kullanılabilir bileşenler
    │   ├── StatusPill.tsx           #   Durum göstergesi (On/Off/Premium)
    │   ├── KnotsCard.tsx            #   Kart + bölüm etiketi
    │   ├── ScreenHeader.tsx         #   Ekran başlığı
    │   ├── SettingRow.tsx           #   Ayar satırı (toggle/value/arrow)
    │   ├── RouteNode.tsx            #   Rota düğümü (DPI/VPN/Tor) + bağlantı çizgisi
    │   ├── ConnectionMap.tsx        #   Stilize canlı bağlantı haritası
    │   ├── PremiumModal.tsx         #   Premium gerekli modalı
    │   └── index.ts
    ├── navigation/                  # Navigasyon
    │   └── AppNavigator.tsx         #   3 tab + stack (Overview/Account/Settings + CountryControl/RouteControl)
    ├── screens/                     # Ekranlar
    │   ├── OverviewScreen.tsx       #   Ana bağlantı ekranı
    │   ├── AccountScreen.tsx        #   Hesap/kimlik ekranı
    │   ├── SettingsScreen.tsx       #   Ayarlar ekranı
    │   ├── CountryControlScreen.tsx #   Ülke rota kontrolü (Amsterdam)
    │   ├── RouteControlScreen.tsx  #   Split route oluşturma akışı
    │   └── index.ts
    ├── store/                       # State yönetimi
    │   └── VpnContext.tsx           #   VPN durumu (connected/disconnected, stats)
    ├── services/                    # Servisler
    │   └── vpn.ts                   #   Sunucu/paket/uygulama verisi
    ├── theme/                       # Tasarım sistemi
    │   ├── colors.ts                #   Marka renk paleti
    │   ├── index.ts                 #   Tema tanımı
    │   └── ThemeProvider.tsx        #   Tema context
    └── types/                       # TypeScript tipleri
        └── vpn.ts                   #   VPN tip tanımları
```

## Önemli Not

Bu sürüm arayüz prototipidir. Gerçek VPN tünel motoru için iOS'ta Network Extension, Android'de VpnService native modülleri gerekir. Route Control ekranındaki sürükle-bırak etkileşimi şu an "Next" butonu ile adım adım simüle edilir; gerçek PanResponder sürükleme sonraki adımda eklenebilir.

## Lisans

MIT
