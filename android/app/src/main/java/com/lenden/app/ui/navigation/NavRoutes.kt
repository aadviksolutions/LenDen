package com.lenden.app.ui.navigation

sealed class NavRoutes(val route: String) {
    object Login : NavRoutes("login")
    object Register : NavRoutes("register")
    object Dashboard : NavRoutes("dashboard")
    object Billing : NavRoutes("billing")
    object Invoices : NavRoutes("invoices")
    object InvoiceDetail : NavRoutes("invoice_detail/{invoiceId}") {
        fun createRoute(invoiceId: String) = "invoice_detail/$invoiceId"
    }
    object Customers : NavRoutes("customers")
    object CustomerDetail : NavRoutes("customer_detail/{customerId}") {
        fun createRoute(customerId: String) = "customer_detail/$customerId"
    }
    object Inventory : NavRoutes("inventory")
    object Reports : NavRoutes("reports")
    object Settings : NavRoutes("settings")
}
