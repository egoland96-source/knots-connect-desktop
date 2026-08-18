package com.knots.mobile.ui.settings

import androidx.lifecycle.ViewModel
import com.knots.mobile.data.model.EngineMode
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update

data class SettingsUiState(
    val engineMode: EngineMode = EngineMode.AUTO,
    val autoConnect: Boolean = false,
    val notifications: Boolean = true,
    val obfuscation: Boolean = false,
    val splitTunnel: Boolean = false,
    val blockAds: Boolean = true,
    val killSwitch: Boolean = true,
    val dnsProtection: Boolean = true,
)

class SettingsViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState

    fun toggleAutoConnect() {
        _uiState.update { it.copy(autoConnect = !it.autoConnect) }
    }

    fun toggleNotifications() {
        _uiState.update { it.copy(notifications = !it.notifications) }
    }

    fun toggleObfuscation() {
        _uiState.update { it.copy(obfuscation = !it.obfuscation) }
    }

    fun toggleSplitTunnel() {
        _uiState.update { it.copy(splitTunnel = !it.splitTunnel) }
    }

    fun toggleBlockAds() {
        _uiState.update { it.copy(blockAds = !it.blockAds) }
    }

    fun toggleKillSwitch() {
        _uiState.update { it.copy(killSwitch = !it.killSwitch) }
    }

    fun toggleDnsProtection() {
        _uiState.update { it.copy(dnsProtection = !it.dnsProtection) }
    }

    fun setEngineMode(mode: EngineMode) {
        _uiState.update { it.copy(engineMode = mode) }
    }
}
