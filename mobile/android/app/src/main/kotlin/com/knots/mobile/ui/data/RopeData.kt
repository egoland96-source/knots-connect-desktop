package com.knots.mobile.ui.data

enum class RopeMode {
    VPN,
    DPI,
}

data class RopeTelemetry(
    val latencyMs: Float = 0f,
    val avgPing: Float = 0f,
    val packetLoss: Float = 0f,
    val jitter: Float = 0f,
)
