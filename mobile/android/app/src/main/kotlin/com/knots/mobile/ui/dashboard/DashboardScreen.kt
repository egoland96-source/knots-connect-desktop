package com.knots.mobile.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.knots.mobile.R
import com.knots.mobile.data.model.ConnectionMetrics
import com.knots.mobile.data.model.ConnectionStatus
import com.knots.mobile.ui.components.GlassCard
import com.knots.mobile.ui.components.connectbutton.ConnectButton
import com.knots.mobile.ui.components.connectbutton.ConnectButtonState
import com.knots.mobile.ui.components.connectionborder.ConnectionBorder
import com.knots.mobile.ui.components.livingrope.LivingRope
import com.knots.mobile.ui.data.RopeMode
import com.knots.mobile.ui.data.RopeTelemetry
import com.knots.mobile.ui.theme.KnotsThemeColors
import kotlin.math.roundToInt

@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel = viewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val buttonState by viewModel.buttonState.collectAsState()

    val backgroundBrush = Brush.verticalGradient(
        colors = listOf(
            KnotsThemeColors.background,
            KnotsThemeColors.background1,
            KnotsThemeColors.background2,
        )
    )

    val isActive = uiState.connectionStatus is ConnectionStatus.Connected
    val isConnecting = uiState.connectionStatus is ConnectionStatus.Connecting

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(backgroundBrush)
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        Box(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(top = 40.dp, start = 8.dp)
                .size(280.dp)
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(
                            KnotsThemeColors.accent.copy(alpha = 0.045f),
                            Color.Transparent,
                        )
                    ),
                ),
        )
        Box(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(bottom = 120.dp, end = 8.dp)
                .size(320.dp)
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(
                            KnotsThemeColors.success.copy(alpha = 0.035f),
                            Color.Transparent,
                        )
                    ),
                ),
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            Column(modifier = Modifier.fillMaxWidth()) {
                HeaderSection(
                    connectionStatus = uiState.connectionStatus,
                )
                ModeSelector(
                    selectedMode = uiState.selectedRopeMode,
                    onSelect = viewModel::selectRopeMode,
                    modifier = Modifier.padding(top = 14.dp),
                )
            }

            RopeSection(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .heightIn(min = 120.dp)
                    .padding(top = 14.dp),
                mode = uiState.selectedRopeMode,
                active = isActive,
                connecting = isConnecting,
                telemetry = uiState.telemetry,
            )

            Column(modifier = Modifier.fillMaxWidth()) {
                ConnectButtonSection(
                    modifier = Modifier.padding(top = 4.dp, bottom = 16.dp),
                    buttonState = buttonState,
                    onClick = { viewModel.toggleConnection() },
                )
                StatusSection(
                    modifier = Modifier.padding(bottom = 16.dp),
                    connectionStatus = uiState.connectionStatus,
                    metrics = uiState.metrics,
                )
            }
        }
        ConnectionBorder(active = isActive, connecting = isConnecting)
    }
}

@Composable
private fun HeaderSection(
    connectionStatus: ConnectionStatus,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = stringResource(R.string.app_name_short),
            color = KnotsThemeColors.textPrimary,
            fontSize = 22.sp,
            fontWeight = FontWeight.W700,
            letterSpacing = (-0.3).sp,
        )

        val dotColor = when (connectionStatus) {
            is ConnectionStatus.Disconnected -> KnotsThemeColors.textMuted
            is ConnectionStatus.Connecting -> KnotsThemeColors.accent
            is ConnectionStatus.Connected -> KnotsThemeColors.success
            is ConnectionStatus.Error -> KnotsThemeColors.danger
        }
        val badgeText = when (connectionStatus) {
            is ConnectionStatus.Disconnected -> "IDLE"
            is ConnectionStatus.Connecting -> "CONNECTING"
            is ConnectionStatus.Connected -> "PROTECTED"
            is ConnectionStatus.Error -> "ERROR"
        }

        Row(
            modifier = Modifier
                .clip(RoundedCornerShape(999.dp))
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            KnotsThemeColors.glassCardBg,
                            KnotsThemeColors.glassBg,
                        )
                    )
                )
                .border(
                    width = 1.dp,
                    color = KnotsThemeColors.glassBorder,
                    shape = RoundedCornerShape(999.dp),
                )
                .padding(horizontal = 12.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(7.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(7.dp)
                    .background(color = dotColor, shape = RoundedCornerShape(999.dp)),
            )
            Text(
                text = badgeText,
                fontSize = 10.5.sp,
                fontWeight = FontWeight.W700,
                letterSpacing = 0.6.sp,
                color = KnotsThemeColors.textSecondary,
            )
        }
    }
}

@Composable
private fun ModeSelector(
    selectedMode: RopeMode,
    onSelect: (RopeMode) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(
                brush = Brush.horizontalGradient(
                    colors = listOf(
                        KnotsThemeColors.glassCardBg.copy(alpha = 0.8f),
                        KnotsThemeColors.glassCardBg.copy(alpha = 0.5f),
                        KnotsThemeColors.glassCardBg.copy(alpha = 0.8f),
                    )
                )
            )
            .border(
                width = 1.dp,
                color = KnotsThemeColors.glassBorder,
                shape = RoundedCornerShape(14.dp),
            )
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        RopeMode.entries.forEach { mode ->
            val selected = mode == selectedMode
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(40.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(
                        brush = if (selected) {
                            Brush.horizontalGradient(
                                colors = listOf(
                                    KnotsThemeColors.accent.copy(alpha = 0.16f),
                                    KnotsThemeColors.accent.copy(alpha = 0.08f),
                                )
                            )
                        } else {
                            Brush.verticalGradient(
                                colors = listOf(Color.Transparent, Color.Transparent)
                            )
                        }
                    )
                    .border(
                        width = if (selected) 1.dp else 0.dp,
                        color = KnotsThemeColors.accent.copy(alpha = 0.35f),
                        shape = RoundedCornerShape(10.dp),
                    )
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = { onSelect(mode) },
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = mode.name,
                    fontSize = 12.5.sp,
                    fontWeight = FontWeight.W700,
                    letterSpacing = 0.5.sp,
                    color = if (selected) KnotsThemeColors.connectedGlow else KnotsThemeColors.textMuted,
                )
            }
        }
    }
}

@Composable
private fun RopeSection(
    modifier: Modifier = Modifier,
    mode: RopeMode = RopeMode.VPN,
    active: Boolean = false,
    connecting: Boolean = false,
    telemetry: RopeTelemetry = RopeTelemetry(),
) {
    GlassCard(modifier = modifier) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(vertical = 8.dp),
            contentAlignment = Alignment.Center,
        ) {
            LivingRope(
                mode = mode,
                active = active,
                connecting = connecting,
                telemetry = telemetry,
            )
        }
    }
}

@Composable
private fun ConnectButtonSection(
    modifier: Modifier = Modifier,
    buttonState: ConnectButtonState = ConnectButtonState.Disconnected,
    onClick: () -> Unit,
) {
    Box(
        modifier = modifier.fillMaxWidth(),
        contentAlignment = Alignment.Center,
    ) {
        ConnectButton(
            state = buttonState,
            buttonSize = 160.dp,
            onClick = onClick,
        )
    }
}

@Composable
private fun StatusSection(
    modifier: Modifier = Modifier,
    connectionStatus: ConnectionStatus,
    metrics: ConnectionMetrics,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        val statusText = when (connectionStatus) {
            is ConnectionStatus.Disconnected -> stringResource(R.string.status_disconnected)
            is ConnectionStatus.Connecting -> stringResource(R.string.status_connecting)
            is ConnectionStatus.Connected -> stringResource(R.string.status_connected)
            is ConnectionStatus.Error -> stringResource(R.string.status_error)
        }
        val statusColor = when (connectionStatus) {
            is ConnectionStatus.Disconnected -> KnotsThemeColors.textMuted
            is ConnectionStatus.Connecting -> KnotsThemeColors.accent
            is ConnectionStatus.Connected -> KnotsThemeColors.success
            is ConnectionStatus.Error -> KnotsThemeColors.danger
        }

        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(7.dp)
                    .background(color = statusColor, shape = RoundedCornerShape(999.dp)),
            )
            Text(
                text = statusText,
                fontSize = 13.5.sp,
                fontWeight = FontWeight.W600,
                color = KnotsThemeColors.textSecondary,
            )
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            MiniStat(
                modifier = Modifier.weight(1f),
                label = stringResource(R.string.stat_latency),
                value = "${metrics.latencyMs.roundToInt()} ms",
            )
            MiniStat(
                modifier = Modifier.weight(1f),
                label = stringResource(R.string.stat_uptime),
                value = formatUptime(metrics.uptimeSeconds),
            )
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            MiniStat(
                modifier = Modifier.weight(1f),
                label = stringResource(R.string.stat_download),
                value = String.format("%.1f", metrics.downloadSpeed) + " Mbps",
            )
            MiniStat(
                modifier = Modifier.weight(1f),
                label = stringResource(R.string.stat_upload),
                value = String.format("%.1f", metrics.uploadSpeed) + " Mbps",
            )
        }
    }
}

@Composable
private fun MiniStat(
    modifier: Modifier = Modifier,
    label: String,
    value: String,
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        KnotsThemeColors.glassCardBg.copy(alpha = 0.7f),
                        KnotsThemeColors.glassBg.copy(alpha = 0.7f),
                    )
                )
            )
            .border(
                width = 1.dp,
                color = KnotsThemeColors.glassBorder,
                shape = RoundedCornerShape(12.dp),
            )
            .padding(horizontal = 12.dp, vertical = 9.dp),
    ) {
        Text(
            text = label.uppercase(),
            fontSize = 9.5.sp,
            fontWeight = FontWeight.W600,
            letterSpacing = 0.5.sp,
            color = KnotsThemeColors.textMuted,
        )
        Text(
            text = value,
            fontSize = 14.sp,
            fontWeight = FontWeight.W700,
            letterSpacing = (-0.2).sp,
            color = KnotsThemeColors.textPrimary,
            modifier = Modifier.padding(top = 3.dp),
        )
    }
}

private fun formatUptime(seconds: Int): String {
    val h = seconds / 3600
    val m = (seconds % 3600) / 60
    val s = seconds % 60
    return if (h > 0) "${h}h ${m}m" else "${m}m ${s}s"
}