plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
}

task<Delete>("clean") {
    delete = setOf(layout.buildDirectory.get().asFile)
    delete(rootProject.layout.buildDirectory.get().asFile)
}
