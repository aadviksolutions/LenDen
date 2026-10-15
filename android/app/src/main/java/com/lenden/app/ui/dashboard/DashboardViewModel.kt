package com.lenden.app.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lenden.app.data.local.SessionDataStore
import com.lenden.app.data.remote.dto.ReportSummaryDto
import com.lenden.app.data.repository.DashboardRepository
import com.lenden.app.util.Resource
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class DashboardUiState(
    val isLoading: Boolean = false,
    val summary: ReportSummaryDto? = null,
    val businessName: String = "Lenden Store",
    val businessGstin: String? = null,
    val errorMessage: String? = null
)

class DashboardViewModel(
    private val dashboardRepository: DashboardRepository,
    private val sessionDataStore: SessionDataStore
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        observeBusinessDetails()
        loadSummary()
    }

    private fun observeBusinessDetails() {
        viewModelScope.launch {
            sessionDataStore.businessName.collect { name ->
                if (!name.isNullOrBlank()) {
                    _uiState.value = _uiState.value.copy(businessName = name)
                }
            }
        }
        viewModelScope.launch {
            sessionDataStore.businessGstin.collect { gstin ->
                _uiState.value = _uiState.value.copy(businessGstin = gstin)
            }
        }
    }

    fun loadSummary() {
        viewModelScope.launch {
            dashboardRepository.getDashboardSummary().collect { resource ->
                when (resource) {
                    is Resource.Loading -> {
                        _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
                    }
                    is Resource.Success -> {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            summary = resource.data,
                            errorMessage = null
                        )
                    }
                    is Resource.Error -> {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            errorMessage = resource.message
                        )
                    }
                }
            }
        }
    }

    class Factory(
        private val dashboardRepository: DashboardRepository,
        private val sessionDataStore: SessionDataStore
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(DashboardViewModel::class.java)) {
                return DashboardViewModel(dashboardRepository, sessionDataStore) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
