package com.knots.mobile.ui.components.connectionborder

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.knots.mobile.ui.theme.KnotsThemeColors

@Composable
fun ConnectionBorder(
    active: Boolean,
    connecting: Boolean,
    modifier: Modifier = Modifier,
) {
    val travelSpeed = when {
        connecting -> 4500
        active -> 9000
        else -> 14000
    }

    val infiniteTransition = rememberInfiniteTransition(label = "ConnectionBorder")
    val offset by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 100f,
        animationSpec = infiniteRepeatable(
            animation = tween(
                durationMillis = travelSpeed,
                easing = CubicBezierEasing(0.4f, 0f, 0.2f, 1.0f),
            ),
            repeatMode = RepeatMode.Restart,
        ),
        label = "BorderTravel",
    )

    val opacityTarget = when {
        active -> 1f
        connecting -> 0.55f
        else -> 0.1f
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .drawBehind {
                if (!active && !connecting) {
                    drawRect(
                        color = KnotsThemeColors.borderDefault,
                        style = Stroke(width = if (active) 2f else 1f),
                    )
                    return@drawBehind
                }

                drawRect(
                    color = KnotsThemeColors.borderDefault.copy(alpha = opacityTarget * 0.2f),
                    style = Stroke(width = 1f),
                )

                val strokeWidth = 2f
                val padding = 1f
                val left = padding
                val top = padding
                val right = size.width - padding
                val bottom = size.height - padding

                val path = Path().apply {
                    moveTo(size.width / 2, bottom)
                    lineTo(left, bottom)
                    lineTo(left, top)
                    lineTo(right, top)
                    lineTo(right, bottom)
                    close()
                }

                val tailColor = KnotsThemeColors.connectedGlow.copy(alpha = opacityTarget * 0.4f)
                val coreColor = Color.White.copy(alpha = opacityTarget)

                drawPath(
                    path = path,
                    color = tailColor,
                    style = Stroke(
                        width = 5f,
                        cap = StrokeCap.Round,
                    ),
                )

                drawPath(
                    path = path,
                    color = coreColor,
                    style = Stroke(
                        width = 1.6f,
                        cap = StrokeCap.Round,
                    ),
                )
            },
    )
}
