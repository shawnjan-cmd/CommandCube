# React Native core
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Expo
-keep class expo.modules.** { *; }
-keep class host.exp.exponent.** { *; }

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Reanimated
-keep class com.swmansion.reanimated.** { *; }

# Gesture Handler
-keep class com.swmansion.gesturehandler.** { *; }

# Camera / QR
-keep class androidx.camera.** { *; }

# WebSocket (core functionality)
-keep class okhttp3.** { *; }

# Keep BuildConfig
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
