package com.lenden.app.data.repository

import com.lenden.app.data.local.SessionDataStore
import com.lenden.app.data.remote.LendenApiService
import com.lenden.app.data.remote.dto.*
import com.lenden.app.util.Resource
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

class AuthRepository(
    private val api: LendenApiService,
    private val sessionDataStore: SessionDataStore
) {
    val isLoggedIn: Flow<Boolean> = sessionDataStore.isLoggedIn

    fun login(email: String, password: String): Flow<Resource<AuthResponse>> = flow {
        emit(Resource.Loading())
        try {
            val response = api.login(LoginRequest(email, password))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.success && body.sessionToken != null) {
                    sessionDataStore.saveSession(
                        token = body.sessionToken,
                        userId = body.user?.id ?: "",
                        userName = body.user?.name ?: "",
                        userEmail = body.user?.email ?: "",
                        businessId = body.business?.id,
                        businessName = body.business?.name,
                        businessGstin = body.business?.gstin
                    )
                    emit(Resource.Success(body))
                } else {
                    emit(Resource.Error(body.error ?: "Invalid credentials"))
                }
            } else {
                emit(Resource.Error("Authentication failed (${response.code()})"))
            }
        } catch (e: Exception) {
            emit(Resource.Error(e.localizedMessage ?: "Network connection error"))
        }
    }

    fun register(request: RegisterRequest): Flow<Resource<AuthResponse>> = flow {
        emit(Resource.Loading())
        try {
            val response = api.register(request)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.success && body.sessionToken != null) {
                    sessionDataStore.saveSession(
                        token = body.sessionToken,
                        userId = body.user?.id ?: "",
                        userName = body.user?.name ?: "",
                        userEmail = body.user?.email ?: "",
                        businessId = body.business?.id,
                        businessName = body.business?.name,
                        businessGstin = body.business?.gstin
                    )
                    emit(Resource.Success(body))
                } else {
                    emit(Resource.Error(body.error ?: "Registration failed"))
                }
            } else {
                emit(Resource.Error("Registration failed (${response.code()})"))
            }
        } catch (e: Exception) {
            emit(Resource.Error(e.localizedMessage ?: "Network connection error"))
        }
    }

    suspend fun logout() {
        try {
            api.logout()
        } catch (_: Exception) {}
        sessionDataStore.clearSession()
    }
}
