package com.lenden.app.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(
    val email: String,
    val password: String
)

@Serializable
data class RegisterRequest(
    val name: String,
    val email: String,
    val password: String,
    val phone: String? = null,
    val businessName: String,
    val tradeType: String = "Retail & Wholesale",
    val city: String = "Raipur",
    val state: String = "Chhattisgarh",
    val gstin: String? = null
)

@Serializable
data class AuthResponse(
    val success: Boolean = false,
    val sessionToken: String? = null,
    val token: String? = null,
    val user: UserDto? = null,
    val business: BusinessDto? = null,
    val error: String? = null
)

@Serializable
data class UserDto(
    val id: String,
    val email: String,
    val name: String,
    val phone: String? = null,
    val platformRole: String = "USER"
)

@Serializable
data class BusinessDto(
    val id: String,
    val name: String,
    val legalName: String? = null,
    val tradeType: String? = null,
    val gstin: String? = null,
    val city: String? = null,
    val state: String? = null,
    val currency: String? = "INR"
)

@Serializable
data class SessionMeResponse(
    val success: Boolean = false,
    val user: UserDto? = null,
    val activeBusiness: BusinessDto? = null,
    val error: String? = null
)
