package com.knots.mobile.data.model

enum class EngineMode {
    VPN,
    DPI,
    DISABLED,
    AUTO,
    ;

    val label: String
        get() = when (this) {
            VPN -> "VPN"
            DPI -> "DPI"
            DISABLED -> "Disabled"
            AUTO -> "Auto"
        }
}
