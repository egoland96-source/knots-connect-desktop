package com.knots.mobile.ui.components.livingrope

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.drawscope.Stroke
import com.knots.mobile.ui.data.RopeMode
import com.knots.mobile.ui.data.RopeTelemetry
import com.knots.mobile.ui.theme.KnotsThemeColors

@Composable
fun LivingRope(
    mode: RopeMode,
    active: Boolean,
    connecting: Boolean = false,
    telemetry: RopeTelemetry = RopeTelemetry(),
    modifier: Modifier = Modifier,
) {
    val renderer = remember { LivingRopeRenderer() }

    val path by renderer.pathState
    val opacity by renderer.opacityState

    val shapeId = when (mode) {
        RopeMode.VPN -> RopeShapeId.Knot
        RopeMode.DPI -> RopeShapeId.Graph
    }

    DisposableEffect(Unit) {
        renderer.attach()
        onDispose { renderer.detach() }
    }

    LaunchedEffect(shapeId, active, connecting) {
        renderer.setConnectionState(shapeId, active, connecting)
    }

    LaunchedEffect(telemetry) {
        renderer.updateTelemetry(
            ping = telemetry.latencyMs,
            avgPing = telemetry.avgPing,
            packetLoss = telemetry.packetLoss,
            jitter = telemetry.jitter,
        )
    }

    Box(modifier = modifier.fillMaxSize()) {
        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer(alpha = opacity),
        ) {
            if (path.isEmpty) return@Canvas

            val glowColor = if (active) {
                KnotsThemeColors.accentGlow.copy(alpha = 0.50f)
            } else {
                KnotsThemeColors.accentGlow.copy(alpha = 0.30f)
            }

            drawPath(
                path = path,
                color = glowColor,
                style = Stroke(
                    width = 4f,
                    cap = StrokeCap.Round,
                ),
            )

            drawPath(
                path = path,
                color = if (active) Color.White.copy(alpha = 0.92f) else Color.White.copy(alpha = 0.55f),
                style = Stroke(
                    width = 2.2f,
                    cap = StrokeCap.Round,
                ),
            )
        }
    }
}
