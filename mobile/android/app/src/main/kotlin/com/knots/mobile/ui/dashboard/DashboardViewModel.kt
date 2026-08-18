package com.knots.mobile.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.knots.mobile.data.model.ConnectionMetrics
import com.knots.mobile.data.model.ConnectionStatus
import com.knots.mobile.data.model.EngineMode
import com.knots.mobile.data.model.MockMetrics
import com.knots.mobile.ui.components.connectbutton.ConnectButtonState
import com.knots.mobile.ui.components.livingrope.RopeShapeId
import com.knots.mobile.ui.data.RopeMode
import com.knots.mobile.ui.data.RopeTelemetry
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class DashboardUiState(
    val connectionStatus: ConnectionStatus = ConnectionStatus.Disconnected,
    val metrics: ConnectionMetrics = ConnectionMetrics(),
    val engineMode: EngineMode = EngineMode.AUTO,
    val selectedRopeMode: RopeMode = RopeMode.VPN,
    val telemetry: RopeTelemetry = RopeTelemetry(),
)

class DashboardViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState

    val buttonState: StateFlow<ConnectButtonState> = _uiState
        .map { uiState ->
            when (uiState.connectionStatus) {
                is ConnectionStatus.Disconnected -> ConnectButtonState.Disconnected
                is ConnectionStatus.Connecting -> ConnectButtonState.Connecting
                is ConnectionStatus.Connected -> ConnectButtonState.Connected
                is ConnectionStatus.Error -> ConnectButtonState.Error
            }
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.Eagerly,
            initialValue = ConnectButtonState.Disconnected,
        )

    val ropeShapeId: StateFlow<RopeShapeId> = _uiState
        .map { uiState ->
            when (uiState.selectedRopeMode) {
                RopeMode.VPN -> RopeShapeId.Knot
                RopeMode.DPI -> RopeShapeId.Graph
            }
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.Eagerly,
            initialValue = RopeShapeId.Knot,
        )

    init {
        _uiState.value = DashboardUiState(
            connectionStatus = ConnectionStatus.Disconnected,
            metrics = MockMetrics,
            engineMode = EngineMode.AUTO,
            selectedRopeMode = RopeMode.VPN,
            telemetry = RopeTelemetry(
                latencyMs = MockMetrics.latencyMs,
                avgPing = MockMetrics.latencyMs * 1.3f,
                packetLoss = MockMetrics.packetLoss,
                jitter = MockMetrics.jitter,
            ),
        )
    }

    fun toggleConnection() {
        viewModelScope.launch {
            val current = _uiState.value.connectionStatus
            _uiState.update { state ->
                val newStatus = when (current) {
                    is ConnectionStatus.Connected -> ConnectionStatus.Disconnected
                    is ConnectionStatus.Disconnected -> ConnectionStatus.Connecting
                    is ConnectionStatus.Connecting -> ConnectionStatus.Disconnected
                    is ConnectionStatus.Error -> ConnectionStatus.Connecting
                }
                state.copy(connectionStatus = newStatus)
            }
        }
    }

    fun selectRopeMode(mode: RopeMode) {
        _uiState.update { it.copy(selectedRopeMode = mode) }
    }

    fun selectEngineMode(mode: EngineMode) {
        _uiState.update { it.copy(engineMode = mode) }
    }
}
