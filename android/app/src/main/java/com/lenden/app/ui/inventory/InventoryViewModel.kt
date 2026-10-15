package com.lenden.app.ui.inventory

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lenden.app.data.remote.dto.CreateProductRequest
import com.lenden.app.data.remote.dto.ProductDto
import com.lenden.app.data.remote.dto.ValuationDto
import com.lenden.app.data.repository.InventoryRepository
import com.lenden.app.util.Resource
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class InventoryUiState(
    val products: List<ProductDto> = emptyList(),
    val valuation: ValuationDto? = null,
    val searchQuery: String = "",
    val lowStockOnly: Boolean = false,
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val isCreatingProduct: Boolean = false
)

class InventoryViewModel(
    private val inventoryRepository: InventoryRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(InventoryUiState())
    val uiState: StateFlow<InventoryUiState> = _uiState.asStateFlow()

    init {
        loadInventory()
    }

    fun loadInventory(query: String? = null, lowStockOnly: Boolean = false) {
        viewModelScope.launch {
            inventoryRepository.getInventory(query, lowStockOnly).collect { resource ->
                when (resource) {
                    is Resource.Loading -> {
                        _uiState.value = _uiState.value.copy(isLoading = true)
                    }
                    is Resource.Success -> {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            products = resource.data?.products ?: emptyList(),
                            valuation = resource.data?.valuation,
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

    fun setSearchQuery(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
        loadInventory(query.ifBlank { null }, _uiState.value.lowStockOnly)
    }

    fun setLowStockFilter(lowStock: Boolean) {
        _uiState.value = _uiState.value.copy(lowStockOnly = lowStock)
        loadInventory(_uiState.value.searchQuery.ifBlank { null }, lowStock)
    }

    fun createProduct(
        name: String,
        sku: String,
        unit: String,
        sellingPrice: Double,
        purchasePrice: Double,
        taxRate: Double,
        openingStock: Double,
        lowStockAlert: Double,
        onSuccess: () -> Unit
    ) {
        if (name.isBlank() || sku.isBlank()) {
            _uiState.value = _uiState.value.copy(errorMessage = "Product name and SKU are required")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isCreatingProduct = true, errorMessage = null)
            val request = CreateProductRequest(
                name = name.trim(),
                sku = sku.trim(),
                unit = unit.trim().ifBlank { "Pcs" },
                sellingPrice = sellingPrice,
                purchasePrice = purchasePrice,
                taxRate = taxRate,
                openingStock = openingStock,
                lowStockAlert = lowStockAlert
            )

            inventoryRepository.createProduct(request).collect { res ->
                when (res) {
                    is Resource.Loading -> {
                        _uiState.value = _uiState.value.copy(isCreatingProduct = true)
                    }
                    is Resource.Success -> {
                        _uiState.value = _uiState.value.copy(isCreatingProduct = false)
                        loadInventory(_uiState.value.searchQuery.ifBlank { null }, _uiState.value.lowStockOnly)
                        onSuccess()
                    }
                    is Resource.Error -> {
                        _uiState.value = _uiState.value.copy(
                            isCreatingProduct = false,
                            errorMessage = res.message ?: "Failed to add product"
                        )
                    }
                }
            }
        }
    }

    class Factory(private val inventoryRepository: InventoryRepository) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(InventoryViewModel::class.java)) {
                return InventoryViewModel(inventoryRepository) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
