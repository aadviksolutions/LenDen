package com.lenden.app

import android.app.Application
import com.lenden.app.data.local.SessionDataStore
import com.lenden.app.data.local.db.LendenDatabase
import com.lenden.app.data.remote.LendenApiService
import com.lenden.app.data.remote.RetrofitClient
import com.lenden.app.data.repository.*

class LendenApplication : Application() {

    lateinit var sessionDataStore: SessionDataStore
        private set
    lateinit var database: LendenDatabase
        private set
    lateinit var apiService: LendenApiService
        private set

    lateinit var authRepository: AuthRepository
        private set
    lateinit var dashboardRepository: DashboardRepository
        private set
    lateinit var billingRepository: BillingRepository
        private set
    lateinit var customerRepository: CustomerRepository
        private set
    lateinit var inventoryRepository: InventoryRepository
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this

        sessionDataStore = SessionDataStore(this)
        database = LendenDatabase.getInstance(this)
        apiService = RetrofitClient.create(this, sessionDataStore)

        authRepository = AuthRepository(apiService, sessionDataStore)
        dashboardRepository = DashboardRepository(apiService)
        billingRepository = BillingRepository(apiService, database.invoiceDraftDao())
        customerRepository = CustomerRepository(apiService, database.customerDao())
        inventoryRepository = InventoryRepository(apiService, database.productDao())
    }

    companion object {
        lateinit var instance: LendenApplication
            private set
    }
}
