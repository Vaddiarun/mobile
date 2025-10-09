# ===== Core behavior =====
# TEMPORARY: Disable obfuscation to debug release crash
# Re-enable after confirming the app works
-dontobfuscate
-dontoptimize
# -dontshrink

# Keep line numbers & annotations for stacktraces
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*,Signature,Exceptions,InnerClasses,EnclosingMethod

# ===== Critical: Keep all serialization attributes =====
-keepattributes *Annotation*,Signature,Exception,InnerClasses,EnclosingMethod
-keepattributes JavascriptInterface
-keepattributes RuntimeVisibleAnnotations
-keepattributes RuntimeInvisibleAnnotations
-keepattributes RuntimeVisibleParameterAnnotations
-keepattributes RuntimeInvisibleParameterAnnotations
-keepattributes AnnotationDefault

# ===== React Native / Hermes =====
-keep class com.facebook.react.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.hermes.** { *; }
-dontwarn com.facebook.hermes.**

# React Native Bridge
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod <methods>;
}
-keep,allowobfuscation @interface com.facebook.react.bridge.ReactMethod
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}
-keepclassmembers @com.facebook.proguard.annotations.KeepGettersAndSetters class * {
    void set*(***);
    *** get*();
}

# JSI (JavaScript Interface)
-keep class com.facebook.jsi.** { *; }
-keep class com.facebook.react.bridge.CatalystInstance { *; }
-keep class com.facebook.react.bridge.JavaScriptModule { *; }
-keep class com.facebook.react.bridge.NativeModule { *; }
-keep class com.facebook.react.bridge.ReactContext { *; }
-keep class com.facebook.react.bridge.ReadableArray { *; }
-keep class com.facebook.react.bridge.ReadableMap { *; }
-keep class com.facebook.react.bridge.WritableArray { *; }
-keep class com.facebook.react.bridge.WritableMap { *; }

# ===== VisionCamera & Frame Processors =====
-keep class com.mrousavy.camera.** { *; }
-keep class com.mrousavy.camera.frameprocessor.** { *; }
-dontwarn com.mrousavy.camera.**

# If you have your own frame processor plugin, keep its package too:
# -keep class your.package.frameprocessor.** { *; }

# Reanimated (often used with VisionCamera frame processors)
-keep class com.swmansion.reanimated.** { *; }
-dontwarn com.swmansion.reanimated.**

# ===== ML Kit / Google Play Services for barcodes =====
# (cover both ML Kit and GMS wrappers; harmless if unused)
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_barcode.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_common.** { *; }
-dontwarn com.google.mlkit.**
-dontwarn com.google.android.gms.**

# ===== BLE (react-native-ble-plx) =====
-keep class com.polidea.** { *; }
-keepclassmembers class com.polidea.** { *; }
-keepnames class com.polidea.** { *; }
-dontwarn com.polidea.**

# BLE PLX - Critical fix for promise rejection crash
-keep class com.bleplx.** { *; }
-keepclassmembers class com.bleplx.** { *; }
-keep class com.bleplx.utils.SafePromise { *; }
-keep class com.bleplx.adapter.** { *; }
-keepclassmembers class com.bleplx.adapter.** { *; }

# Android Bluetooth types & scan callbacks
-keep class android.bluetooth.** { *; }
-keepclassmembers class android.bluetooth.** { *; }
-dontwarn android.bluetooth.**
-keep class * extends android.bluetooth.le.ScanCallback { *; }
-keepclassmembers class * extends android.bluetooth.le.ScanCallback {
    public void onScanResult(int, android.bluetooth.le.ScanResult);
    public void onBatchScanResults(java.util.List);
    public void onScanFailed(int);
}

# ===== Rx (if used by BLE libs) =====
-keep class io.reactivex.** { *; }
-keep class rx.** { *; }
-dontwarn io.reactivex.**
-dontwarn rx.**

# ===== Native methods, enums, threading =====
-keepclasseswithmembernames class * { native <methods>; }
-keepclassmembers enum * { public static **[] values(); public static ** valueOf(java.lang.String); }
-keep class java.util.concurrent.** { *; }
-keep class java.util.UUID { *; }
-keep class android.os.Handler { *; }
-keep class android.os.Looper { *; }

# ===== Expo Router & Navigation =====
-keep class expo.modules.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.views.** { *; }
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
    @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;
}

# ===== Buffer & Node.js polyfills =====
-keep class com.craftzdog.** { *; }
-keep class org.nodejs.** { *; }
-dontwarn org.nodejs.**

# ===== MMKV Storage =====
-keep class com.tencent.mmkv.** { *; }
-dontwarn com.tencent.mmkv.**

# ===== Geolocation & Geocoding =====
-keep class com.agontuk.** { *; }
-dontwarn com.agontuk.**

# ===== Axios & Network =====
-keepattributes Signature
-keepattributes *Annotation*
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# ===== Noise suppression =====
-dontwarn java.nio.file.*
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn javax.annotation.**
-dontwarn kotlin.Unit
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
