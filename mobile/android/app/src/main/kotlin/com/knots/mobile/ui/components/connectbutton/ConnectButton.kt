package com.knots.mobile.ui.components.connectbutton

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.onClick
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.knots.mobile.ui.components.drawKnotPath
import com.knots.mobile.ui.theme.KnotsThemeColors

@Composable
fun ConnectButton(
    state: ConnectButtonState = ConnectButtonState.Disconnected,
    buttonSize: Dp = 170.dp,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val interactionSource = MutableInteractionSource()

    val accentColor = when (state) {
        ConnectButtonState.Connected -> KnotsThemeColors.connectedMint
        ConnectButtonState.Connecting -> KnotsThemeColors.accent
        ConnectButtonState.Error -> KnotsThemeColors.danger
        ConnectButtonState.Disconnected -> KnotsThemeColors.accent
    }

    val innerBrush = when (state) {
        ConnectButtonState.Connected -> Brush.radialGradient(
            colors = listOf(
                KnotsThemeColors.connectedMint.copy(alpha = 0.16f),
                KnotsThemeColors.connectedMint.copy(alpha = 0.05f),
                Color.Transparent,
            )
        )
        ConnectButtonState.Connecting -> Brush.radialGradient(
            colors = listOf(
                KnotsThemeColors.accent.copy(alpha = 0.20f),
                KnotsThemeColors.accent.copy(alpha = 0.06f),
                Color.Transparent,
            )
        )
        ConnectButtonState.Error -> Brush.radialGradient(
            colors = listOf(
                KnotsThemeColors.danger.copy(alpha = 0.16f),
                KnotsThemeColors.danger.copy(alpha = 0.05f),
                Color.Transparent,
            )
        )
        ConnectButtonState.Disconnected -> Brush.radialGradient(
            colors = listOf(
                KnotsThemeColors.accent.copy(alpha = 0.12f),
                KnotsThemeColors.accent.copy(alpha = 0.04f),
                Color.Transparent,
            )
        )
    }

    val isConnected = state == ConnectButtonState.Connected
    val isConnecting = state == ConnectButtonState.Connecting

    val buttonScale by animateFloatAsState(
        targetValue = if (isConnecting) 0.97f else 1f,
        animationSpec = tween(durationMillis = 250, easing = CubicBezierEasing(0.4f, 1.4f, 0.6f, 1.0f)),
    )

    val statusDotAlpha by animateFloatAsState(
        targetValue = if (isConnected) 1f else 0f,
        animationSpec = tween(durationMillis = 300),
    )

    val infinite = rememberInfiniteTransition(label = "connect")

    val haloBreath by infinite.animateFloat(
        initialValue = 0.55f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = if (isConnecting) 1600 else 3000, easing = CubicBezierEasing(0.4f, 0f, 0.2f, 1f)),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "halo",
    )

    val ringRotation by infinite.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(
                durationMillis = when {
                    isConnecting -> 2500
                    isConnected -> 18000
                    else -> 60000
                },
                easing = LinearEasing,
            ),
            repeatMode = RepeatMode.Restart,
        ),
        label = "ring",
    )

    val dotPulse by infinite.animateFloat(
        initialValue = 1f,
        targetValue = 1.3f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 2000, easing = CubicBezierEasing(0.4f, 0f, 0.2f, 1f)),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "dot",
    )

    Box(
        modifier = modifier
            .size(buttonSize + 56.dp)
            .semantics {
                contentDescription = when (state) {
                    ConnectButtonState.Connected -> "Disconnect"
                    ConnectButtonState.Connecting -> "Connecting"
                    ConnectButtonState.Error -> "Retry"
                    ConnectButtonState.Disconnected -> "Connect"
                }
                stateDescription = when (state) {
                    ConnectButtonState.Connected -> "Connected"
                    ConnectButtonState.Connecting -> "Connecting"
                    ConnectButtonState.Error -> "Error"
                    ConnectButtonState.Disconnected -> "Disconnected"
                }
                onClick { onClick(); true }
            }
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = !isConnecting,
                onClick = onClick,
            ),
    ) {
        Box(
            modifier = Modifier
                .size(buttonSize + 44.dp)
                .align(Alignment.Center)
                .graphicsLayer(alpha = haloBreath * 0.85f)
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(
                            accentColor.copy(alpha = 0.18f),
                            accentColor.copy(alpha = 0.05f),
                            Color.Transparent,
                        )
                    ),
                    shape = CircleShape,
                ),
        )

        Canvas(
            modifier = Modifier
                .size(buttonSize + 20.dp)
                .align(Alignment.Center)
                .graphicsLayer(rotationZ = ringRotation),
        ) {
            val radius = this.size.minDimension / 2f - 2f
            drawCircle(
                color = accentColor.copy(alpha = if (isConnected) 0.38f else 0.28f),
                radius = radius,
                style = Stroke(
                    width = 1.5f,
                    cap = StrokeCap.Round,
                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(8f, 10f)),
                ),
            )
        }

        Box(
            modifier = Modifier
                .size(buttonSize)
                .align(Alignment.Center)
                .graphicsLayer(scaleX = buttonScale, scaleY = buttonScale)
                .shadow(
                    elevation = 14.dp,
                    shape = CircleShape,
                    ambientColor = KnotsThemeColors.glassShadow,
                    spotColor = KnotsThemeColors.glassShadow,
                )
                .clip(CircleShape)
                .background(
                    brush = Brush.horizontalGradient(
                        colors = listOf(
                            KnotsThemeColors.surface1.copy(alpha = 0.55f),
                            KnotsThemeColors.surface2.copy(alpha = 0.55f),
                        )
                    ),
                    shape = CircleShape,
                )
                .border(
                    width = 1.dp,
                    color = Color(0x1AFFFFFF),
                    shape = CircleShape,
                )
                .drawWithContent {
                    drawContent()
                    drawRect(
                        brush = Brush.horizontalGradient(
                            colors = listOf(
                                Color(0x14FFFFFF),
                                Color(0x0AFFFFFF),
                            )
                        ),
                        topLeft = Offset(0f, 0f),
                        size = androidx.compose.ui.geometry.Size(size.width, 1.dp.toPx()),
                    )
                }
                .background(innerBrush, shape = CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Canvas(modifier = Modifier.size(34.dp)) {
                drawKnotPath(
                    canvasWidth = this.size.width,
                    canvasHeight = this.size.height,
                    color = when (state) {
                        ConnectButtonState.Connected -> KnotsThemeColors.connectedMint
                        ConnectButtonState.Error -> KnotsThemeColors.danger
                        else -> Color.White
                    },
                )
            }

            Text(
                text = when (state) {
                    ConnectButtonState.Connected -> "Connected"
                    ConnectButtonState.Connecting -> "Connecting…"
                    ConnectButtonState.Error -> "Retry"
                    ConnectButtonState.Disconnected -> "Connect"
                },
                fontSize = 13.sp,
                fontWeight = FontWeight.W600,
                letterSpacing = 0.3.sp,
                color = KnotsThemeColors.textPrimary,
                modifier = Modifier.padding(top = 10.dp),
            )
        }

        if (isConnected) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 12.dp)
                    .size(7.dp)
                    .graphicsLayer(scaleX = dotPulse, scaleY = dotPulse, alpha = statusDotAlpha)
                    .background(
                        color = KnotsThemeColors.success,
                        shape = CircleShape,
                    ),
            )
        }
    }
}
