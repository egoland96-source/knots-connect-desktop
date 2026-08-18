package com.knots.mobile.ui.components.livingrope

import android.view.Choreographer
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.graphics.Path

class LivingRopeRenderer {
    val pathState = mutableStateOf(Path())
    val opacityState = mutableStateOf(0.5f)

    private val chain = VerletChain()
    private val stateManager = RopeStateManager()
    private var choreographer: Choreographer? = null
    private var frameCallback: Choreographer.FrameCallback? = null
    private var lastFrameTimeNanos: Long = 0L

    private var targetShape: RopeShapeId = RopeShapeId.Neutral
    private var isActive = false
    private var isConnecting = false
    private var telemetryParams = RopeShape.GraphParams()

    fun attach() {
        choreographer = Choreographer.getInstance()
    }

    fun detach() {
        stopFrameCallback()
        choreographer = null
    }

    fun setConnectionState(mode: RopeShapeId, active: Boolean, connecting: Boolean) {
        isActive = active
        isConnecting = connecting

        targetShape = when {
            !active && !connecting -> RopeShapeId.Neutral
            mode == RopeShapeId.Graph -> RopeShapeId.Graph
            mode == RopeShapeId.Knot -> RopeShapeId.Knot
            else -> RopeShapeId.Neutral
        }

        opacityState.value = if (active) {
            if (connecting) 0.6f else 0.8f
        } else {
            0.5f
        }

        if (targetShape != stateManager.currentShape || stateManager.morphInProgress) {
            startMorph()
        }
    }

    fun updateTelemetry(ping: Float, avgPing: Float, packetLoss: Float, jitter: Float) {
        telemetryParams = RopeShape.GraphParams(
            ping = ping.coerceAtLeast(0f),
            avgPing = avgPing.coerceAtLeast(0f),
            packetLoss = packetLoss.coerceIn(0f, 100f),
            jitter = jitter.coerceAtLeast(0f),
        )
        chain.updateTelemetry(ping, avgPing, packetLoss, jitter)
    }

    private fun startMorph() {
        val sequence = stateManager.startTransition(targetShape, isConnecting)

        if (sequence.isNotEmpty()) {
            val fromShape = stateManager.fromShape
            chain.setMorphStart(fromShape, telemetryParams)
        }

        registerFrameCallback()
    }

    private fun registerFrameCallback() {
        if (frameCallback != null) return

        val callback = object : Choreographer.FrameCallback {
            override fun doFrame(frameTimeNanos: Long) {
                val deltaTimeMs = if (lastFrameTimeNanos == 0L) {
                    16.67f
                } else {
                    (frameTimeNanos - lastFrameTimeNanos) / 1_000_000f
                }
                lastFrameTimeNanos = frameTimeNanos

                val stillActive = stateManager.update(deltaTimeMs / 1000f)

                val morphValue = stateManager.morphValue
                val intoShape = stateManager.intoShape

                val path = chain.step(
                    morphValue = morphValue,
                    intoShape = intoShape,
                    params = telemetryParams,
                    deltaMs = deltaTimeMs,
                )

                if (path != null) {
                    pathState.value = path
                }

                if (stillActive) {
                    choreographer?.postFrameCallback(this)
                } else {
                    stopFrameCallback()
                }
            }
        }

        frameCallback = callback
        lastFrameTimeNanos = 0L
        choreographer?.postFrameCallback(callback)
    }

    private fun stopFrameCallback() {
        frameCallback?.let { cb ->
            choreographer?.removeFrameCallback(cb)
        }
        frameCallback = null
        lastFrameTimeNanos = 0L
    }

    fun getCurrentPath(): Path = pathState.value
}
