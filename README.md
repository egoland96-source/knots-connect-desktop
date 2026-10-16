# Knots Connect Desktop

> **Next-Generation Smart Hybrid Routing & Zero-Log Desktop Client**

Knots Connect, yüksek performanslı ağ yönlendirmesi (traffic routing), yerel ağ ayrıştırması (split routing) ve uçtan uca gizlilik standartlarını tek bir masaüstü istemcisinde buluşturan, minimalist ve teknik odaklı bir yazılımdır.

Proje, geleneksel VPN/Proxy çözümlerindeki tüm trafiği tek bir sunucuya yükleyerek gecikmeyi (latency) artırma sorununu çözer. Cihazınızda çalışan akıllı yönlendirme motoru sayesinde oyun, canlı yayın ve hassas veri akışlarını en optimize rotalardan iletir.

---

## 🏛️ System Architecture

Knots Connect, modüler ve yüksek performanslı bir mimari üzerine kurulmuştur:

+-------------------------------------------------------+
|                Electron UI Layer                      |
|          (React 18 + Vite + Tailwind CSS)             |
+-------------------------------------------------------+
│
IPC / WebSocket Bridge
│
+-------------------------------------------------------+
|             Go Core Routing Engine                    |
|       (Smart Split Tunneling & Packet Handling)       |
+-------------------------------------------------------+
│
Encrypted Network Tunnels
│
+-------------------------------------------------------+
|            Global Node Infrastructure                 |
+-------------------------------------------------------+


### 1. Frontend Layer (UI)
* **Framework:** Electron + React 18
* **Styling:** Tailwind CSS & Glassmorphism UI
* **Build System:** Vite
* **State Management:** Local Storage & Context API

### 2. Core Engine (Backend)
* **Language:** Go (Golang)
* **Core Responsibilities:**
  * SOCKS5/HTTP Proxy sunucu yönetimi.
  * Windows, macOS ve Linux üzerinde ağ sürücüsü ve IP tablo entegrasyonu.
  * Paket analizi yapmadan kural tabanlı dinamik rota kararları (Smart Split Routing).

---

## ⚡ Key Features & Capabilities

### 1. Smart Split Routing (Akıllı Rota Ayrıştırma)
Geleneksel tünelleme araçlarının aksine Knots Connect, bilgisayarınızdaki uygulamaları ve ağ isteklerini kategorize eder. 
* **Gaming & Real-Time Traffic:** Minimum gecikme için doğrudan veya en yakın düğüm üzerinden iletilir.
* **Social & Web Browsing:** Tam gizlilik sağlayan şifrelenmiş tüneller üzerinden yönlendirilir.

### 2. Zero-Log & Zero-Knowledge Security
Sistem mimarimiz "Sıfır Bilgi" prensibiyle çalışır:
* Hiçbir kullanıcı trafiği, ziyaret edilen alan adları (DNS) veya veri içeriği sunucu tarafında saklanmaz.
* E-posta, isim veya telefon gibi kişisel veriler işlenmez.
* İstemci, tamamen cihaz üzerinde üretilen **16 karakterlik anonim Knots ID** anahtarını kullanır.

### 3. Lightweight & High Throughput
* **Low CPU/RAM Footprint:** Go çekirdeği sayesinde arka planda minimum kaynak tüketimi.
* **Instant Connect:** Karmaşık yapılandırma gerektirmeyen tek tıkla erişim altyapısı.

---

## 🛠️ Project Structure

```text
knots-connect-desktop/
├── electron/               # Electron ana süreç (Main Process) ve pencere yönetimi
├── go-backend/             # Go ile yazılmış yüksek performanslı tünel motoru
├── pkg/                    # Paylaşılan Go paketleri ve yardımcı kütüphaneler
├── public/                 # Statik varlıklar (simgeler, görseller)
├── scripts/                # Derleme, test ve otomasyon scriptleri
├── src/                    # React tabanlı arayüz kodları (Renderer Process)
│   ├── components/         # Modüler UI bileşenleri
│   ├── pages/              # Sayfa yapıları (Home, Settings, Privacy, Terms)
│   └── styles/             # Global CSS ve Tailwind konfigürasyonu
├── package.json            # Node.js bağımlılıkları ve scriptler
├── go.mod                  # Go modül bağımlılıkları
└── README.md               # Proje dokümantasyonu
🚀 Getting Started (Development Setup)
Prerequisites
Projeyi yerel ortamınızda çalıştırmak için aşağıdaki bileşenlerin yüklü olması gerekir:

Node.js (v18.x veya üzeri)

Go (v1.20 veya üzeri)

npm veya yarn

Installation Steps
Repoyu klonlayın:

Bash
git clone [https://github.com/egoland96-source/knots-connect-desktop.git](https://github.com/egoland96-source/knots-connect-desktop.git)
cd knots-connect-desktop
Frontend bağımlılıklarını yükleyin:

Bash
npm install
Geliştirici modunda çalıştırın:

Bash
npm run dev
Uygulamayı derleyin (Build):

Bash
npm run build
📄 Privacy Policy & Legal Terms
Privacy Policy (Gizlilik Politikası)
Knots Connect is built ground-up on a strict Zero-Log and Zero-Knowledge architecture.

We do not collect, monitor, store, or share your browsing history, IP addresses, DNS queries, or bandwidth usage.

Identity management is handled completely anonymously through a locally generated 16-character Knots ID.

No central servers log your connection timestamps or traffic destinations.

Terms of Service (Kullanım Koşulları)
Acceptable Use: Knots Connect is designed as an open and independent network tool. It must not be used for malicious network attacks (e.g., DDoS, spam, unauthorized intrusion).

Key Loss: Because no email addresses or personal accounts are stored on our servers, lost Knots IDs cannot be recovered by administrators. Managing and backing up your key is entirely your responsibility.

Disclaimer: The software is provided "as-is" without explicit or implied guarantees regarding regional ISP limitations or external network outages.

📜 License & Copyright
Plaintext
Copyright (c) 2026 Knots Connect. All rights reserved.

All software code, user interface designs, branding elements, and associated 
documentation contained in this repository are the exclusive property of Knots Connect.

Unauthorized copying, distribution, modification, or commercial exploitation 
of this software via any medium is strictly prohibited without prior written permission.
