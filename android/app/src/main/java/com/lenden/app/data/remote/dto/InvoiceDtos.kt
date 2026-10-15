package com.lenden.app.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class InvoicesResponse(
    val success: Boolean = false,
    val invoices: List<InvoiceDto> = emptyList(),
    val error: String? = null
)

@Serializable
data class SingleInvoiceResponse(
    val success: Boolean = false,
    val invoice: InvoiceDto? = null,
    val error: String? = null
)

@Serializable
data class InvoiceDto(
    val id: String,
    val invoiceNumber: String,
    val customerName: String = "",
    val customerMobile: String = "",
    val invoiceDate: String,
    val dueDate: String? = null,
    val total: Double = 0.0,
    val paidAmount: Double = 0.0,
    val balanceDue: Double = 0.0,
    val status: String = "UNPAID",
    val items: List<InvoiceItemDto> = emptyList()
)

@Serializable
data class InvoiceItemDto(
    val id: String? = null,
    val productId: String? = null,
    val description: String,
    val quantity: Double,
    val unit: String = "Pcs",
    val rate: Double,
    val discount: Double = 0.0,
    val taxRate: Double = 18.0,
    val lineTotal: Double = 0.0
)

@Serializable
data class CreateInvoiceRequest(
    val customerId: String,
    val invoiceDate: String,
    val dueDate: String,
    val gstType: String = "CGST_SGST",
    val isTaxInclusive: Boolean = false,
    val isGstInvoice: Boolean = true,
    val items: List<CreateInvoiceItemRequest>,
    val paymentAmount: Double = 0.0,
    val paymentMethod: String = "CASH",
    val paymentReference: String? = null,
    val notes: String? = null
)

@Serializable
data class CreateInvoiceItemRequest(
    val productId: String? = null,
    val description: String,
    val quantity: Double,
    val unit: String = "Pcs",
    val rate: Double,
    val discount: Double = 0.0,
    val taxRate: Double = 18.0
)

@Serializable
data class RecordPaymentRequest(
    val amount: Double,
    val paymentMethod: String = "CASH",
    val referenceNumber: String? = null,
    val idempotencyKey: String,
    val notes: String? = null
)

@Serializable
data class StandardApiResponse(
    val success: Boolean = false,
    val message: String? = null,
    val error: String? = null
)
