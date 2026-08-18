# proguard

# Keep Kotlin metadata
-keepattributes KotlinInlinedAnnotations
-keepattributes KotlinMetadata

# Keep Compose
-keep class androidx.compose.runtime.** { *; }
