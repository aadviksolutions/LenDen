package com.lenden.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.lenden.app.ui.auth.AuthViewModel
import com.lenden.app.ui.billing.BillingViewModel
import com.lenden.app.ui.customers.CustomersViewModel
import com.lenden.app.ui.dashboard.DashboardViewModel
import com.lenden.app.ui.inventory.InventoryViewModel
import com.lenden.app.ui.navigation.LendenNavGraph
import com.lenden.app.ui.theme.BackgroundPrimary
import com.lenden.app.ui.theme.LendenTheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val app = application as LendenApplication

        val authViewModel: AuthViewModel by viewModels {
            AuthViewModel.Factory(app.authRepository)
        }

        val dashboardViewModel: DashboardViewModel by viewModels {
            DashboardViewModel.Factory(app.dashboardRepository, app.sessionDataStore)
        }

        val billingViewModel: BillingViewModel by viewModels {
            BillingViewModel.Factory(app.billingRepository, app.customerRepository, app.inventoryRepository)
        }

        val customersViewModel: CustomersViewModel by viewModels {
            CustomersViewModel.Factory(app.customerRepository)
        }

        val inventoryViewModel: InventoryViewModel by viewModels {
            InventoryViewModel.Factory(app.inventoryRepository)
        }

        setContent {
            LendenTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = BackgroundPrimary
                ) {
                    LendenNavGraph(
                        authViewModel = authViewModel,
                        dashboardViewModel = dashboardViewModel,
                        billingViewModel = billingViewModel,
                        customersViewModel = customersViewModel,
                        inventoryViewModel = inventoryViewModel
                    )
                }
            }
        }
    }
}
