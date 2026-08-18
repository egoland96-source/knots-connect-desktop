package com.knots.mobile.data.model

import kotlin.time.Duration.Companion.seconds

data class ConnectionMetrics(
    val latencyMs: Float = 0f,
    val downloadSpeed: Float = 0f,
    val uploadSpeed: Float = 0f,
    val bytesReceived: Long = 0L,
    val bytesSent: Long = 0L,
    val uptimeSeconds: Int = 0,
    val packetLoss: Float = 0f,
    val jitter: Float = 0f,
    val packetsReceived: Long = 0L,
    val packetsSent: Long = 0L,
    val cpuUsage: Float = 0f,
    val memoryUsage: Float = 0f,
)

sealed class PrivacyStats {
    data object Loading : PrivacyStats()
    data class Active(
        val requestsBlocked: Long,
        val categories: PrivacyCategories,
    ) : PrivacyStats()

    data class Disabled(val lastUpdated: String? = null) : PrivacyStats()
}

data class PrivacyCategories(
    val ads: Boolean = false,
    val trackers: Boolean = false,
    val malware: Boolean = false,
    val phishing: Boolean = false,
)

val MockMetrics = ConnectionMetrics(
    latencyMs = 12f,
    downloadSpeed = 42.5f,
    uploadSpeed = 18.3f,
    bytesReceived = 1_258_291_354L,
    bytesSent = 523_908_441L,
    uptimeSeconds = 3621,
    packetLoss = 0.02f,
    jitter = 2.3f,
    packetsReceived = 4_829_147L,
    packetsSent = 2_103_568L,
    cpuUsage = 12.5f,
    memoryUsage = 45.3f,
)
