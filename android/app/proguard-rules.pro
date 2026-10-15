# ProGuard rules for Lenden
-keepattributes *Annotation*
-keepclassmembers class * {
    @org.jetbrains.annotations.Nullable *;
    @org.jetbrains.annotations.NotNull *;
}
-keepclassmembers enum * { *; }
-keepclassmembers class * implements java.io.Serializable { *; }
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn retrofit2.**
