package com.lenden.app.data.remote

import android.content.Context
import android.os.Build
import com.lenden.app.BuildConfig
import com.lenden.app.data.local.SessionDataStore
import kotlinx.serialization.json.Json
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {

    private val isEmulator = Build.FINGERPRINT.startsWith("generic") ||
            Build.MODEL.contains("google_sdk") ||
            Build.MODEL.contains("Emulator") ||
            Build.HARDWARE.contains("goldfish") ||
            Build.HARDWARE.contains("ranchu")

    @Volatile
    var customBaseUrl: String = if (BuildConfig.DEBUG && !isEmulator) {
        "http://10.244.217.135:3000/"
    } else {
        BuildConfig.BASE_URL
    }

    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        isLenient = true
    }

    fun create(context: Context, sessionDataStore: SessionDataStore): LendenApiService {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

        val dynamicHostInterceptor = Interceptor { chain ->
            var request = chain.request()
            try {
                val configuredUrl = customBaseUrl.toHttpUrlOrNull()
                if (configuredUrl != null) {
                    val newUrl = request.url.newBuilder()
                        .scheme(configuredUrl.scheme)
                        .host(configuredUrl.host)
                        .port(configuredUrl.port)
                        .build()
                    request = request.newBuilder().url(newUrl).build()
                }
            } catch (_: Exception) {}
            chain.proceed(request)
        }

        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(dynamicHostInterceptor)
            .addInterceptor(AuthInterceptor(sessionDataStore))
            .addInterceptor(logging)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .build()

        val retrofit = Retrofit.Builder()
            .baseUrl("http://10.0.2.2:3000/")
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()

        return retrofit.create(LendenApiService::class.java)
    }
}
