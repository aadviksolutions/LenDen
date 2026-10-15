package com.lenden.app.data.local.db.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "invoice_drafts")
data class InvoiceDraftEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val customerId: String,
    val customerName: String,
    val customerMobile: String,
    val invoiceDate: String,
    val dueDate: String,
    val gstType: String,
    val isTaxInclusive: Boolean,
    val itemsJson: String,
    val paidAmount: Double,
    val paymentMethod: String,
    val notes: String?,
    val isSynced: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "cached_customers")
data class CachedCustomerEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val mobile: String,
    val email: String?,
    val billingAddress: String?,
    val gstin: String?,
    val totalOutstanding: Double
)

@Entity(tableName = "cached_products")
data class CachedProductEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val sku: String,
    val unit: String,
    val sellingPrice: Double,
    val taxRate: Double,
    val currentStock: Double,
    val lowStockAlert: Double
)
