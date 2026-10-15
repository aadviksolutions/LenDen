package com.lenden.app.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class InventoryResponse(
    val success: Boolean = false,
    val products: List<ProductDto> = emptyList(),
    val valuation: ValuationDto? = null,
    val error: String? = null
)

@Serializable
data class ProductDto(
    val id: String,
    val name: String,
    val sku: String,
    val barcode: String? = null,
    val category: String = "General",
    val unit: String = "Pcs",
    val purchasePrice: Double = 0.0,
    val sellingPrice: Double = 0.0,
    val taxRate: Double = 0.0,
    val currentStock: Double = 0.0,
    val openingStock: Double = 0.0,
    val lowStockAlert: Double = 10.0,
    val description: String? = null,
    val isActive: Boolean = true
)

@Serializable
data class ValuationDto(
    val totalItems: Int = 0,
    val totalStockUnits: Double = 0.0,
    val totalValuationCost: Double = 0.0,
    val potentialProfit: Double = 0.0,
    val lowStockCount: Int = 0
)

@Serializable
data class CreateProductRequest(
    val name: String,
    val sku: String,
    val barcode: String? = null,
    val category: String = "General",
    val unit: String = "Pcs",
    val purchasePrice: Double = 0.0,
    val sellingPrice: Double = 0.0,
    val taxRate: Double = 0.0,
    val openingStock: Double = 0.0,
    val lowStockAlert: Double = 10.0,
    val description: String? = null
)
