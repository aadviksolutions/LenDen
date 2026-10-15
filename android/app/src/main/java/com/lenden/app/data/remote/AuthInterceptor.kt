package com.lenden.app.data.remote

import com.lenden.app.data.local.SessionDataStore
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor(private val sessionDataStore: SessionDataStore) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()

        val token = runBlocking {
            sessionDataStore.sessionToken.firstOrNull()
        }

        val requestBuilder = original.newBuilder()
            .header("Accept", "application/json")

        if (!token.isNullOrBlank()) {
            requestBuilder.header("Authorization", "Bearer $token")
            requestBuilder.header("x-session-token", token)
        }

        val request = requestBuilder.build()
        return chain.proceed(request)
    }
}
