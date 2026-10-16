# Knots Connect Desktop

> **Next-Generation Smart Hybrid Routing & Zero-Log Desktop Client**

Knots Connect is a minimalist and performance-focused network routing utility designed to combine social media privacy and low-latency network performance (for gaming, streaming, etc.) into a single intelligent desktop client.

---

## 🏛️ System Architecture

Knots Connect is built on a modular and high-performance architecture:

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

### 2. Core Engine (Backend)
* **Language:** Go (Golang)
* **Core Responsibilities:** SOCKS5/HTTP proxy management, system-level network integration, and smart route optimization.

---

## ⚡ Key Features & Capabilities

1. **Smart Split Routing:** The client on your device decides in real-time whether your traffic routes through the secure tunnel or your local ISP network.
2. **Zero-Log Architecture:** No user traffic, browsing history, DNS queries, or IP addresses are ever recorded or monitored.
3. **16-Character Knots ID:** No emails, phone numbers, or passwords. Your identity is strictly bound to an anonymous key generated locally on your device.

---

## 🚀 Getting Started & Development

### Prerequisites
* Node.js (v18+)
* Go (v1.20+)

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/egoland96-source/knots-connect-desktop.git](https://github.com/egoland96-source/knots-connect-desktop.git)
   cd knots-connect-desktop
Install dependencies:

Bash
npm install
Run in development mode:

Bash
npm run dev
Build the application:

Bash
npm run build
📄 Privacy Policy & Terms of Service
Privacy Policy
Knots Connect is built ground-up on a strict Zero-Log and Zero-Knowledge architecture. We do not collect, monitor, store, or share your browsing history, IP addresses, or DNS queries. Identity management is handled completely anonymously through a locally generated 16-character Knots ID.

Terms of Service
Knots Connect is provided as an open and independent network tool. It must not be used for malicious activities such as DDoS attacks, automated spam, or unauthorized network intrusions. Because our system contains no central user databases or emails, lost Knots IDs cannot be recovered. Managing your access key is entirely your responsibility.

📜 Copyright & License
Plaintext
Copyright (c) 2026 Knots Connect. All rights reserved.

All software code, user interface designs, branding elements, and associated 
documentation contained in this repository are the exclusive property of Knots Connect.

Unauthorized copying, distribution, modification, or commercial exploitation 
of this software via any medium is strictly prohibited without prior written permission.
