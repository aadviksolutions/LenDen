package com.lenden.app.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class ReportsSummaryResponse(
    val summary: ReportSummaryDto? = null,
    val error: String? = null
)

@Serializable
data class ReportSummaryDto(
    val totalSalesTurnover: Double = 0.0,
    val taxableSalesValue: Double = 0.0,
    val totalSalesTax: Double = 0.0,
    val totalCgst: Double = 0.0,
    val totalSgst: Double = 0.0,
    val totalIgst: Double = 0.0,
    val totalPaidCollections: Double = 0.0,
    val totalUdhaarDue: Double = 0.0,
    val totalProcurement: Double = 0.0,
    val totalItcTax: Double = 0.0,
    val netGstPayable: Double = 0.0,
    val totalOverheads: Double = 0.0,
    val grossProfit: Double = 0.0,
    val netProfit: Double = 0.0,
    val todaysSales: Double = 0.0,
    val todaysBillsCount: Int = 0,
    val overdueAmount: Double = 0.0,
    val invoiceCount: Int = 0,
    val purchaseCount: Int = 0,
    val expenseCount: Int = 0
)
