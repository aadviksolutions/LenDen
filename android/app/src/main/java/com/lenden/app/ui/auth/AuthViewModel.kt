package com.lenden.app.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lenden.app.data.remote.dto.RegisterRequest
import com.lenden.app.data.repository.AuthRepository
import com.lenden.app.util.Resource
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class LoginUiState(
    val email: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val isSuccess: Boolean = false
)

data class RegisterUiState(
    val name: String = "",
    val email: String = "",
    val password: String = "",
    val phone: String = "",
    val businessName: String = "",
    val tradeType: String = "Retail & Wholesale",
    val city: String = "Raipur",
    val state: String = "Chhattisgarh",
    val gstin: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val isSuccess: Boolean = false
)

class AuthViewModel(
    private val authRepository: AuthRepository
) : ViewModel() {

    val isLoggedIn = authRepository.isLoggedIn

    private val _loginState = MutableStateFlow(LoginUiState())
    val loginState: StateFlow<LoginUiState> = _loginState.asStateFlow()

    private val _registerState = MutableStateFlow(RegisterUiState())
    val registerState: StateFlow<RegisterUiState> = _registerState.asStateFlow()

    fun updateLoginEmail(email: String) {
        _loginState.value = _loginState.value.copy(email = email, errorMessage = null)
    }

    fun updateLoginPassword(password: String) {
        _loginState.value = _loginState.value.copy(password = password, errorMessage = null)
    }

    fun prefillDemoCredentials() {
        _loginState.value = _loginState.value.copy(
            email = "owner@laxmistores.com",
            password = "Password123!",
            errorMessage = null
        )
    }

    fun login(onSuccess: () -> Unit) {
        val email = _loginState.value.email.trim()
        val password = _loginState.value.password
        if (email.isBlank() || password.isBlank()) {
            _loginState.value = _loginState.value.copy(errorMessage = "Please enter email and password")
            return
        }

        viewModelScope.launch {
            authRepository.login(email, password).collect { resource ->
                when (resource) {
                    is Resource.Loading -> {
                        _loginState.value = _loginState.value.copy(isLoading = true, errorMessage = null)
                    }
                    is Resource.Success -> {
                        _loginState.value = _loginState.value.copy(isLoading = false, isSuccess = true)
                        onSuccess()
                    }
                    is Resource.Error -> {
                        _loginState.value = _loginState.value.copy(
                            isLoading = false,
                            errorMessage = resource.message ?: "Login failed"
                        )
                    }
                }
            }
        }
    }

    fun updateRegisterField(
        name: String? = null,
        email: String? = null,
        password: String? = null,
        phone: String? = null,
        businessName: String? = null,
        tradeType: String? = null,
        city: String? = null,
        state: String? = null,
        gstin: String? = null
    ) {
        _registerState.value = _registerState.value.copy(
            name = name ?: _registerState.value.name,
            email = email ?: _registerState.value.email,
            password = password ?: _registerState.value.password,
            phone = phone ?: _registerState.value.phone,
            businessName = businessName ?: _registerState.value.businessName,
            tradeType = tradeType ?: _registerState.value.tradeType,
            city = city ?: _registerState.value.city,
            state = state ?: _registerState.value.state,
            gstin = gstin?.uppercase() ?: _registerState.value.gstin,
            errorMessage = null
        )
    }

    fun register(onSuccess: () -> Unit) {
        val state = _registerState.value
        if (state.name.isBlank() || state.email.isBlank() || state.password.isBlank() || state.businessName.isBlank()) {
            _registerState.value = _registerState.value.copy(errorMessage = "Please fill in all mandatory fields")
            return
        }
        if (state.password.length < 6) {
            _registerState.value = _registerState.value.copy(errorMessage = "Password must be at least 6 characters")
            return
        }
        if (state.gstin.isNotBlank() && state.gstin.length != 15) {
            _registerState.value = _registerState.value.copy(errorMessage = "GSTIN must be 15 alphanumeric characters")
            return
        }

        viewModelScope.launch {
            val request = RegisterRequest(
                name = state.name.trim(),
                email = state.email.trim(),
                password = state.password,
                phone = state.phone.trim().ifBlank { null },
                businessName = state.businessName.trim(),
                tradeType = state.tradeType,
                city = state.city.trim(),
                state = state.state.trim(),
                gstin = state.gstin.trim().ifBlank { null }
            )

            authRepository.register(request).collect { resource ->
                when (resource) {
                    is Resource.Loading -> {
                        _registerState.value = _registerState.value.copy(isLoading = true, errorMessage = null)
                    }
                    is Resource.Success -> {
                        _registerState.value = _registerState.value.copy(isLoading = false, isSuccess = true)
                        onSuccess()
                    }
                    is Resource.Error -> {
                        _registerState.value = _registerState.value.copy(
                            isLoading = false,
                            errorMessage = resource.message ?: "Registration failed"
                        )
                    }
                }
            }
        }
    }

    fun logout(onLoggedOut: () -> Unit) {
        viewModelScope.launch {
            authRepository.logout()
            _loginState.value = LoginUiState()
            _registerState.value = RegisterUiState()
            onLoggedOut()
        }
    }

    class Factory(private val authRepository: AuthRepository) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(AuthViewModel::class.java)) {
                return AuthViewModel(authRepository) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
