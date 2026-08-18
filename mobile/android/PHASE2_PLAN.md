# Phase 2 — Android Mobile UI Implementation Plan

**Knots Connect Android** — Mobile UI mirroring the Windows desktop design language ("Midnight Blue" + "iOS 26 Liquid Glass" + "Living Rope identity").

**Tech stack:** Kotlin + Jetpack Compose (Material 3), already set up in `mobile/android/`.
**Target:** `mobile/android/app/src/main/kotlin/com/knots/mobile/`

---

## Architectural Constraints

### ⚠️ No Modifications to Windows
The following directories and files under the project root are **read-only** throughout Phase 2:
- `src/`
- `go-backend/`
- `backend/`
- `electron/`
- `build/`
- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- All other root-level files

**All new Android code lives exclusively under `mobile/android/`.**

### ⚠️ No Real Network / VPN / Service Code
Phase 2 is **UI + UI state only**. The following are **NOT implemented** in this phase:
- VpnService, TUN, packet interception, DNS interception, TCP/UDP forwarding, QUIC processing, SNI parsing, fakeDesync, packet injection, Android DPI bypass, real AdBlock engine, real telemetry network collection.

These belong to Phases 3–5.

### ⚠️ Mock / Local-Only State for ConnectButton
ConnectButton supports 4 states (Disconnected / Connecting / Connected / Error) but uses **local mock state** — no real connection is initiated. Tapping toggles `ConnectionStatus` in `DashboardViewModel`'s StateFlow for preview/testing only.

### EngineMode — UI-Level States (Not Windows Backend Mirrors)
Android has: no Python backend, no WinDivert, no Go Windows binary, no Electron IPC.

`EngineMode` represents the **user-facing connection paradigm**, not the backend implementation:

| Enum Value | Windows Equivalent | Android Future (Phase 3+) |
|---|---|---|
| `VPN` | Python backend (VPN mode) | Android VpnService (TUN) |
| `DPI` | Go Windows binary (DPI mode) | Kotlin packet processing via TUN |
| `DISABLED` | N/A | (future: manual/blocked) |
| `AUTO` | N/A | (future: auto-select based on conditions) |

Phase 2 defines the type and UI only; the real Android VPN/DPI engine comes later.

---

## Architecture Mapping (Windows → Android)

| Windows Concept | Android Equivalent |
|---|---|
| React + TypeScript | Kotlin + Jetpack Compose |
| framer-motion animations | `animate*AsState`, `InfiniteTransition` (simple loops), `Choreographer` + `Canvas` (LivingRope physics) |
| CSS custom properties (tokens.css) | `KnotsThemeColors` object + `Spacing.kt` + `Radius.kt` + `Motion.kt` |
| CSS `backdrop-filter: blur()` (glassmorphism) | `RenderEffect.createBlurEffect()` on API 31+, or fallback surface |
| Zustand state management | `ViewModel` + `StateFlow` / Compose `collectAsState()` |
| Electron IPC bridge (`bridgeService`) | `ConnectionRepository` (stub for P3 onward) |
| SVG (LivingRope, ConnectButton) | Compose `Canvas` with `Path` + `drawPath` |
| lucide-react icons | Android VectorDrawable via `Icons.Default` from `androidx.compose.material:material-icons` or custom |
| CSS `radial-gradient` / `box-shadow` | Compose `Brush` + `Shadow` + custom draw modifiers |
| Window frame border (ConnectionBorder) | Status bar insets + edge border composable |
| Sidebar navigation (desktop) | Bottom navigation rail / BottomBar |
| TopBar window controls | N/A (Android has system window controls) |

---

## Files to Create (in implementation order)

### Foundation Layer — Theme & Data

| # | File | Purpose |
|---|------|---------|
| 1 | `ui/theme/Spacing.kt` | 8px grid system (0–96), matching `--space-0` → `--space-10` |
| 2 | `ui/theme/Radius.kt` | Border radius scale (6–9999dp), matching `--radius-xs` → `--radius-full` |
| 3 | `ui/theme/Motion.kt` | Animation specs: spring configs, durations (50ms–1000ms), easing curves |
| 4 | `data/model/ConnectionStatus.kt` | Sealed class: `Disconnected` / `Connecting` / `Connected` / `Error(String)` |
| 5 | `data/model/EngineMode.kt` | Enum: `VPN` / `DPI` / `DISABLED` / `AUTO` — **UI-level user-facing connection modes**. Android has no Python/WinDivert/Go binary. Real backend in Phase 3+. |
| 6 | `data/model/ConnectionMetrics.kt` | Data class for telemetry: latencyMs, downloadSpeed, uploadSpeed, bytesReceived, bytesSent, uptimeSeconds, packetLoss, jitter, packetsReceived, packetsSent, cpuUsage, memoryUsage |

### Shared Components Layer

| # | File | Purpose |
|---|------|---------|
| 7 | `ui/components/SectionCard.kt` | Glass-morphism card wrapper (surface bg, border, blur, shadow). Replaces Windows `<Card>`. Used by Dashboard, Settings, Security Status, Advanced Details. |
| 8 | `ui/components/StatCard.kt` | Metric card: icon + label + value + unit + sparkline. Mirrors Windows `FriendlyStat` / `ui/StatCard`. 4 stats on Dashboard: Protection Time, Packets Protected, Privacy Level, Tunnel Health. |
| 9 | `ui/components/KnotGlyph.kt` | The rope-knot SVG path as a `Path`. Reused by ConnectButton. Matches Windows `KnotGlyph` exactly (same SVG path data). |
| 10 | `ui/components/ToggleItem.kt` | Row with icon + title + desc + toggle switch. Mirrors Windows `ToggleItem`. Used in Settings. |
| 11 | `ui/components/SettingRow.kt` | Row with icon + title + desc + control slot. Mirrors Windows `SettingRow`. Used in Settings. |
| 12 | `ui/components/SectionHeader.kt` | Titled section with optional icon + action. Mirrors Windows `Section`. Used in Settings. |

### Signature Components Layer

| # | File | Purpose |
|---|---|------|
| 13 | `ui/components/connectbutton/ConnectButtonState.kt` | Enum: `Disconnected` / `Connecting` / `Connected` / `Error`. Mirrors Windows `ButtonState`. |
| 14 | `ui/components/connectbutton/ConnectButton.kt` | 170dp circular button with knot glyph, breathing glow, rotation ring, connecting arc. Mirrors Windows `ConnectButton.tsx` exactly. Uses `Canvas` for knot glyph, `InfiniteTransition` for breathing/rotation (simple periodic flourishes OK). Reads `ConnectionStatus` + `toggleConnection` callback. **Local mock state only — no real connection in Phase 2.** |
| 15 | `ui/components/livingrope/RopeShape.kt` | Shape generators (pure math, identical to Windows): `neutral()`, `silhouette()`, `knot()`, `graph(params)`. 80-point path generation. |
| 16 | `ui/components/livingrope/VerletChain.kt` | Verlet physics: 80-point chain, spring-damped ping smoothing, distance-constraint relaxation (5 iterations), anchor stiffness. **Not a continuous tick — driven by `LivingRopeRenderer`'s frame callback, only active during transitions/morphs.** Matches Windows physics constants exactly. |
| 17 | `ui/components/livingrope/RopeState.kt` | Enum: `Neutral` / `Silhouette` / `Knot` / `Graph`. Plus transition sequence logic (neutral→knot, knot→neutral→graph, etc.). Mirrors Windows `ShapeId` + transition logic. |
| 18 | `ui/components/livingrope/LivingRope.kt` | **Controlled physics Canvas.** NOT `InfiniteTransition` as driver. Uses a `Choreographer` callback or `produceState` + `LaunchedEffect` with `snapshotFlow` for frame updates. The rope only redraws when telemetry changes or during shape transitions — it does NOT continuously vibrate like a music visualizer. Reacts to ping/jitter/packetLoss changes via spring-damped target, settles, then holds stable until next telemetry. 60 FPS target. No recomposition per frame — mutable `Canvas` state with `drawBehind`/native draw. Single entity, no fade/pop-in during morph. |
| 19 | `ui/components/livingrope/LivingRopeRenderer.kt` | Low-level frame controller: `Choreographer.FrameCallback` that owns the Verlet chain state. Updates mutable path data per frame only during active transition (morph in progress). When settled, stops frame callbacks entirely. Receives telemetry updates via StateFlow collector. |
| 19 | `ui/components/connectionborder/ConnectionBorder.kt` | Window-edge neon border animation. On mobile: a `Box` border with `BorderStroke` + animated dash pattern, replacing the SVG path. `strokeDasharray` + `strokeDashoffset` → `Animatable` offset. Slower when idle, faster when connecting. Mirrors Windows `ConnectionBorder.tsx` spirit (not pixel-identical due to screen shape). |

### Page Layer

| # | File | Purpose |
|---|------|---------|
| 20 | `ui/dashboard/DashboardViewModel.kt` | `ViewModel` holding: `ConnectionStatus` (StateFlow), `EngineMode`, `ConnectionMetrics?`, privacy enabled/stats. Exposes `toggleConnection()`, `setEngineMode()`. Mirrors Zustand `connectionStore` + `privacyStore` selectors. |
| 21 | `ui/dashboard/DashboardScreen.kt` | **UPDATE existing file.** Compose the full Dashboard: gradient background, mode selector (VPN/DPI segmented buttons), LivingRope (in glass card), ConnectButton, status line + dot, 4× StatCards, Security Status card with checks, Advanced Details expand/collapse. Matches Windows Dashboard.tsx layout: `Column > HeaderSection + RopeSection + ConnectButtonSection + StatusSection + FriendlyStatRow + SecurityCard + AdvancedDetails`. |
| 22 | `ui/settings/SettingsViewModel.kt` | `ViewModel` for settings toggles: autoConnect, killSwitch, aggressiveMode, dnsLeakProtection, adblock, autoUpdate, startAtStartup. Mirrors Windows `settings` object. |
| 23 | `ui/settings/SettingsScreen.kt` | Settings page with 5 sections: Connection (engine toggle, encryption dropdown, auto-connect), Security (kill switch, aggressive mode), Privacy (DNS leak protection, privacy protection engine toggle), Notifications (connection alerts, update alerts), Application (launch at startup). Uses `SectionHeader`, `ToggleItem`, `SettingRow`. Mirrors Windows `Settings.tsx` 1:1. |
| 24 | `ui/navigation/Screen.kt` | Sealed class / enum of routes: Dashboard, Servers, Statistics, Settings, Account. |
| 25 | `ui/navigation/NavGraph.kt` | Compose `NavHost` with `com.google.accompanist:accompanist-navigation` or `androidx.navigation:navigation-compose`. 5 destinations. |
| 26 | `ui/navigation/BottomNavBar.kt` | Bottom navigation (phone) with 5 items: Dashboard, Servers, Statistics, Settings, Account. Uses `NavigationBar` from Material 3. **Tablet:** `NavigationRail` available via `WindowSizeClass` check. |

### Stub Pages (P3+ dependencies, minimal UI only)

| # | File | Purpose |
|---|------|---------|
| 27 | `ui/servers/ServersScreen.kt` | Server list screen (stub: dark gradient background + "Coming soon" text). |
| 28 | `ui/statistics/StatisticsScreen.kt` | Statistics screen (stub). |
| 29 | `ui/account/AccountScreen.kt` | Account screen (stub). |

### Resources

| # | File | Purpose |
|---|------|---------|
| 30 | `res/values/strings.xml` | **UPDATE.** Add: `settings_title`, `settings_subtitle`, `bypass_engine`, `encryption_method`, `auto_connect`, `kill_switch`, `aggressive_mode`, `dns_leak_protection`, `privacy_engine`, `connection_alerts`, `update_alerts`, `launch_at_startup`, `vpn_mode`, `dpi_mode`, `security_status`, `advanced_details`, `protected`, `idle`, `shield_active`, `connected`, `connecting`, `disconnected`, `protection_time`, `packets_protected`, `privacy_level`, `tunnel_health`, `maximum`, `high`, `standard`, `excellent`, `good`, `fair`, `technical`, `location`, `server_ip`, `protocol`, `engine`, `cipher`, `downloaded`, `uploaded`, `dns_protection_enabled`, `dns_protection_standard`, `not_connected`, `establishing_tunnel`, `secure_not_protected` |
| 31 | `res/values/dimens.xml` | **UPDATE.** Add dimension aliases matching the 8px grid and the Windows pixel values. |
| 32 | `res/drawable/knot_glyph.xml` | VectorDrawable of the rope-knot path (for use as launcher icon or fallback). |

### Dependency Updates (1 file)

| # | File | Purpose |
|---|------|---------|
| 33 | `app/build.gradle.kts` | **UPDATE.** Add: `androidx.navigation:navigation-compose`, `androidx.lifecycle:lifecycle-viewmodel-compose`, `androidx.compose.material:material-icons-core`, `androidx.compose.material:material-icons-extended` |

---

## Implementation Order (Week-by-Week)

### Week 1 — Foundation
1. `Spacing.kt`, `Radius.kt`, `Motion.kt`
2. `ConnectionStatus.kt`, `EngineMode.kt`, `ConnectionMetrics.kt`
3. `SectionCard.kt`, `StatCard.kt`, `KnotGlyph.kt`
4. `ToggleItem.kt`, `SettingRow.kt`, `SectionHeader.kt`

### Week 2 — Signature Components
5. `ConnectButtonState.kt`, `ConnectButton.kt`
6. `RopeShape.kt` — shape generators (neutral/silhouette/knot/graph)
7. `VerletChain.kt` — physics state + solver
8. `RopeState.kt` — transition sequence logic
9. `LivingRopeRenderer.kt` — `Choreographer.FrameCallback` controller (registered only during morph)
10. `LivingRope.kt` — Compose `Canvas` wrapping the renderer
11. `ConnectionBorder.kt` (mobile-adapted)

### Week 3 — Pages
12. `DashboardViewModel.kt`, then **update** `DashboardScreen.kt` to use all new components
13. `SettingsViewModel.kt`, `SettingsScreen.kt`
14. `Screen.kt`, `NavGraph.kt`, `BottomNavBar.kt`
15. Update `MainActivity.kt` to use `NavHost` instead of direct `DashboardScreen()`
16. `ServersScreen.kt`, `StatisticsScreen.kt`, `AccountScreen.kt` (stubs)

### Week 4 — Polish & Integration
17. Update `strings.xml`, `dimens.xml`
18. Dependency updates in `build.gradle.kts`
19. `knot_glyph.xml` drawable
20. Full rebuild + APK test on emulator

---

## Key Design Decisions

1. **State management:** `ViewModel` + `StateFlow` (not Zustand/React Context). Each page gets its own ViewModel. `DashboardViewModel` is shared between Dashboard and ConnectButton/LivingRope via `collectAsState()`.

2. **Animations:** Compose `animate*AsState` for simple transitions. `InfiniteTransition` reserved for periodic flourishes (breathing halos, rotating rings). **LivingRope physics use `Choreographer.FrameCallback`**, NOT `InfiniteTransition` — frames only run during active morph/transition, then stop.

3. **Glassmorphism:** Use `Modifier.graphicsLayer { RenderEffect.createBlurEffect(...) }` on API 31+ (targetSdk = 35, so always available). Wrap in `@RequiresApi(31)` helper with fallback for older devices (minSdk = 24).

4. **Canvas for SVG:** The LivingRope and ConnectButton knot glyph are drawn using Compose `Canvas` with `Path` and `drawPath`. The path data is ported verbatim from the Windows SVG.

5. **Navigation:** `Navigation Compose` library. Bottom bar for primary nav (Dashboard, Servers, Statistics, Settings, Account). Modal navigation for secondary flows.

6. **No native bridge yet:** The `ConnectionRepository` will be a stub returning mock data. Real Electron IPC bridge integration comes in Phase 3 (VpnService).

7. **Window-level border:** The `ConnectionBorder` becomes a thin animated border around the root `Box` of each screen (status bar insets + edge). Not a fixed-position window frame like Windows.

8. **Icons:** Use `androidx.compose.material:material-icons` for standard icons (ShieldCheck, Timer, Package, Sparkles, Activity, Network, Zap, etc.). Custom knot glyph uses Canvas drawPath.

9. **Typography:** Already defined in `Typography.kt`. Extend with caption/small styles matching Windows `tokens.css` scale.

10. **Dark theme only:** Matches Windows — no light theme. `KnotsTheme` always applies `knotsDarkColors`.

---

## LivingRope — Controlled Physics Animation Principle

The LivingRope is the brand's core visual identity. It must be faithful to Windows behavior:

1. **No continuous vibration.** The rope does NOT constantly oscillate or act like a music visualizer. When connected with stable telemetry, it settles into a stable shape and holds it.
2. **Reactive, not procedural.** The rope only redraws when:
   - Telemetry values (latency, jitter, packetLoss) change enough to cross a physics threshold.
   - A shape transition is actively morphing (mode change, connect/disconnect).
3. **Frame control.** Uses `Choreographer.FrameCallback` as the frame driver. Frame callbacks are **registered only during active morph** and **unregistered when settled**. No `InfiniteTransition` loop.
4. **No recomposition per frame.** The `Canvas` mutable path is updated directly via `CanvasState`/`drawBehind` — the Compose UI tree does not recompose at 60 FPS.
5. **Spring-damped response.** Ping is spring-interpolated toward the latest value (critically damped — no overshoot). The Verlet chain reacts, then settles to rest via `FRICTION = 0.9` and constraint relaxation.
6. **Single entity.** One `<Path>` / `Canvas` draw call. Transitions (neutral→knot→graph) happen by interpolating the same path vertices — no fade, no pop-in, no destroy/recreate.
7. **60 FPS during transitions.** When a morph is active, the frame callback runs at 60 FPS until the chain settles (typically 0.3–0.8s), then stops.

`InfiniteTransition` is reserved for simple periodic UI flourishes only (e.g., ConnectButton breathing halo, rotating ring).
