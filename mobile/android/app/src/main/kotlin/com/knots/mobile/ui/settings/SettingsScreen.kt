package com.knots.mobile.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.knots.mobile.R
import com.knots.mobile.data.model.EngineMode
import com.knots.mobile.ui.components.GlassCard
import com.knots.mobile.ui.components.SectionHeader
import com.knots.mobile.ui.components.SettingRow
import com.knots.mobile.ui.components.ToggleItem
import com.knots.mobile.ui.theme.KnotsSpacing
import com.knots.mobile.ui.theme.KnotsThemeColors

@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel = viewModel(),
    onBack: () -> Unit = {},
) {
    val uiState = viewModel.uiState.collectAsState().value

    val backgroundBrush = Brush.verticalGradient(
        colors = listOf(
            KnotsThemeColors.background,
            KnotsThemeColors.background1,
            KnotsThemeColors.background2,
        )
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(backgroundBrush)
            .verticalScroll(rememberScrollState())
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.spacedBy(KnotsSpacing.s4),
    ) {
        SettingsHeader()

        GlassCard {
            Column {
                SectionHeader(title = "Engine Mode")
                EngineModeSelector(
                    currentMode = uiState.engineMode,
                    onModeSelected = { viewModel.setEngineMode(it) },
                )
            }
        }

        GlassCard {
            Column(
                verticalArrangement = Arrangement.spacedBy(KnotsSpacing.s1),
            ) {
                SectionHeader(title = "Features")
                ToggleItem(
                    icon = painterResource(R.drawable.ic_adblock),
                    title = "Block Ads",
                    desc = "Block ads and trackers",
                    checked = uiState.blockAds,
                    onCheckedChange = { viewModel.toggleBlockAds() },
                )
                ToggleItem(
                    icon = painterResource(R.drawable.ic_dns),
                    title = "DNS Protection",
                    desc = "Encrypted DNS filtering",
                    checked = uiState.dnsProtection,
                    onCheckedChange = { viewModel.toggleDnsProtection() },
                )
                ToggleItem(
                    icon = painterResource(R.drawable.ic_lock),
                    title = "Kill Switch",
                    desc = "Block traffic when VPN drops",
                    checked = uiState.killSwitch,
                    onCheckedChange = { viewModel.toggleKillSwitch() },
                )
                ToggleItem(
                    icon = painterResource(R.drawable.ic_obfuscate),
                    title = "Obfuscation",
                    desc = "Hide VPN traffic",
                    checked = uiState.obfuscation,
                    onCheckedChange = { viewModel.toggleObfuscation() },
                )
                ToggleItem(
                    icon = painterResource(R.drawable.ic_split),
                    title = "Split Tunneling",
                    desc = "Exclude selected apps",
                    checked = uiState.splitTunnel,
                    onCheckedChange = { viewModel.toggleSplitTunnel() },
                )
            }
        }

        GlassCard {
            Column(
                verticalArrangement = Arrangement.spacedBy(KnotsSpacing.s1),
            ) {
                SectionHeader(title = "Notifications")
                ToggleItem(
                    icon = painterResource(R.drawable.ic_notif),
                    title = "Push Notifications",
                    desc = "Connection state alerts",
                    checked = uiState.notifications,
                    onCheckedChange = { viewModel.toggleNotifications() },
                )
            }
        }

        GlassCard {
            Column(
                verticalArrangement = Arrangement.spacedBy(KnotsSpacing.s1),
            ) {
                SectionHeader(title = "Connection")
                ToggleItem(
                    icon = painterResource(R.drawable.ic_autoconnect),
                    title = "Auto-Connect",
                    desc = "Connect on device startup",
                    checked = uiState.autoConnect,
                    onCheckedChange = { viewModel.toggleAutoConnect() },
                )
                SettingRow(
                    icon = painterResource(R.drawable.ic_language),
                    title = "Protocol",
                    desc = "WireGuard",
                    control = {
                        Text(
                            text = "Auto",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.W600,
                            color = KnotsThemeColors.textMuted,
                        )
                    },
                )
            }
        }
    }
}

@Composable
private fun SettingsHeader() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 8.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(
            text = stringResource(R.string.settings_title),
            fontSize = 28.sp,
            fontWeight = FontWeight.W700,
            color = KnotsThemeColors.textPrimary,
        )
        Text(
            text = stringResource(R.string.settings_subtitle),
            fontSize = 13.sp,
            fontWeight = FontWeight.W500,
            color = KnotsThemeColors.textSecondary,
        )
    }
}

@Composable
private fun EngineModeSelector(
    currentMode: EngineMode,
    onModeSelected: (EngineMode) -> Unit,
) {
    val modes = listOf(EngineMode.AUTO, EngineMode.VPN, EngineMode.DPI, EngineMode.DISABLED)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = KnotsSpacing.s2),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        modes.forEach { mode ->
            val isSelected = mode == currentMode
            val bg = if (isSelected) {
                Brush.horizontalGradient(
                    colors = listOf(
                        KnotsThemeColors.accent.copy(alpha = 0.15f),
                        KnotsThemeColors.accent.copy(alpha = 0.06f),
                    )
                )
            } else {
                Brush.horizontalGradient(
                    colors = listOf(
                        KnotsThemeColors.surface1.copy(alpha = 0.3f),
                        KnotsThemeColors.surface2.copy(alpha = 0.2f),
                    )
                )
            }

            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(48.dp)
                    .background(bg, shape = RoundedCornerShape(10.dp))
                    .border(
                        width = if (isSelected) 1.5f.dp else 1f.dp,
                        color = if (isSelected) KnotsThemeColors.borderAccent else KnotsThemeColors.borderSubtle,
                        shape = RoundedCornerShape(10.dp),
                    )
                    .clickable(onClick = { onModeSelected(mode) })
                    .padding(horizontal = 12.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = mode.label,
                    fontSize = 12.5.sp,
                    fontWeight = if (isSelected) FontWeight.W700 else FontWeight.W600,
                    color = if (isSelected) KnotsThemeColors.connectedGlow else KnotsThemeColors.textSecondary,
                )
            }
        }
    }
}

