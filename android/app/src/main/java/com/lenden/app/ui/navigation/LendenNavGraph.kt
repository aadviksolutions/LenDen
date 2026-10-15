package com.lenden.app.ui.navigation

import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.lenden.app.ui.auth.AuthViewModel
import com.lenden.app.ui.auth.LoginScreen
import com.lenden.app.ui.auth.RegisterScreen
import com.lenden.app.ui.billing.*
import com.lenden.app.ui.customers.CustomersScreen
import com.lenden.app.ui.customers.CustomersViewModel
import com.lenden.app.ui.dashboard.DashboardScreen
import com.lenden.app.ui.dashboard.DashboardViewModel
import com.lenden.app.ui.inventory.InventoryScreen
import com.lenden.app.ui.inventory.InventoryViewModel

@Composable
fun LendenNavGraph(
    navController: NavHostController = rememberNavController(),
    authViewModel: AuthViewModel,
    dashboardViewModel: DashboardViewModel,
    billingViewModel: BillingViewModel,
    customersViewModel: CustomersViewModel,
    inventoryViewModel: InventoryViewModel,
    modifier: Modifier = Modifier
) {
    val isLoggedIn by authViewModel.isLoggedIn.collectAsState(initial = false)
    val startDestination = if (isLoggedIn) NavRoutes.Dashboard.route else NavRoutes.Login.route

    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier
    ) {
        composable(NavRoutes.Login.route) {
            LoginScreen(
                viewModel = authViewModel,
                onNavigateToRegister = {
                    navController.navigate(NavRoutes.Register.route)
                },
                onLoginSuccess = {
                    navController.navigate(NavRoutes.Dashboard.route) {
                        popUpTo(NavRoutes.Login.route) { inclusive = true }
                    }
                }
            )
        }

        composable(NavRoutes.Register.route) {
            RegisterScreen(
                viewModel = authViewModel,
                onNavigateBack = { navController.popBackStack() },
                onRegisterSuccess = {
                    navController.navigate(NavRoutes.Dashboard.route) {
                        popUpTo(NavRoutes.Register.route) { inclusive = true }
                    }
                }
            )
        }

        composable(NavRoutes.Dashboard.route) {
            DashboardScreen(
                viewModel = dashboardViewModel,
                onNavigateToBilling = { navController.navigate(NavRoutes.Billing.route) },
                onNavigateToInvoices = { navController.navigate(NavRoutes.Invoices.route) },
                onNavigateToCustomers = { navController.navigate(NavRoutes.Customers.route) },
                onNavigateToInventory = { navController.navigate(NavRoutes.Inventory.route) },
                onLogout = {
                    authViewModel.logout {
                        navController.navigate(NavRoutes.Login.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                }
            )
        }

        composable(NavRoutes.Billing.route) {
            BillingScreen(
                viewModel = billingViewModel,
                onNavigateBack = { navController.popBackStack() },
                onInvoiceCreated = { invoice ->
                    billingViewModel.selectInvoiceForDetail(invoice)
                    navController.navigate(NavRoutes.InvoiceDetail.createRoute(invoice.id)) {
                        popUpTo(NavRoutes.Billing.route) { inclusive = true }
                    }
                }
            )
        }

        composable(NavRoutes.Invoices.route) {
            InvoiceListScreen(
                viewModel = billingViewModel,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToBilling = { navController.navigate(NavRoutes.Billing.route) },
                onSelectInvoice = { invoice ->
                    billingViewModel.selectInvoiceForDetail(invoice)
                    navController.navigate(NavRoutes.InvoiceDetail.createRoute(invoice.id))
                }
            )
        }

        composable(NavRoutes.InvoiceDetail.route) {
            val selectedInvoice by billingViewModel.selectedInvoice.collectAsState()
            selectedInvoice?.let { invoice ->
                InvoiceDetailScreen(
                    invoice = invoice,
                    viewModel = billingViewModel,
                    onNavigateBack = { navController.popBackStack() }
                )
            } ?: run {
                LaunchedEffect(Unit) {
                    navController.popBackStack()
                }
            }
        }

        composable(NavRoutes.Customers.route) {
            CustomersScreen(
                viewModel = customersViewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(NavRoutes.Inventory.route) {
            InventoryScreen(
                viewModel = inventoryViewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}
