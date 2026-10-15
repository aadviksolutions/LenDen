package com.lenden.app.data.repository

import com.lenden.app.data.local.db.dao.ProductDao
import com.lenden.app.data.local.db.entity.CachedProductEntity
import com.lenden.app.data.remote.LendenApiService
import com.lenden.app.data.remote.dto.*
import com.lenden.app.util.Resource
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

class InventoryRepository(
    private val api: LendenApiService,
    private val productDao: ProductDao
) {
    val cachedProducts: Flow<List<CachedProductEntity>> = productDao.getAllProducts()

    fun getInventory(query: String? = null, lowStockOnly: Boolean = false): Flow<Resource<InventoryResponse>> = flow {
        emit(Resource.Loading())
        try {
            val response = api.getInventory(query = query, lowStockOnly = lowStockOnly)
            if (response.isSuccessful && response.body() != null) {
                val data = response.body()!!
                // Cache products locally
                productDao.insertProducts(data.products.map {
                    CachedProductEntity(
                        id = it.id,
                        name = it.name,
                        sku = it.sku,
                        unit = it.unit,
                        sellingPrice = it.sellingPrice,
                        taxRate = it.taxRate,
                        currentStock = it.currentStock,
                        lowStockAlert = it.lowStockAlert
                    )
                })
                emit(Resource.Success(data))
            } else {
                emit(Resource.Error(response.body()?.error ?: "Failed to fetch inventory"))
            }
        } catch (e: Exception) {
            emit(Resource.Error(e.localizedMessage ?: "Network connection error"))
        }
    }

    fun createProduct(request: CreateProductRequest): Flow<Resource<Boolean>> = flow {
        emit(Resource.Loading())
        try {
            val response = api.createProduct(request)
            if (response.isSuccessful && response.body()?.success == true) {
                emit(Resource.Success(true))
            } else {
                emit(Resource.Error(response.body()?.error ?: "Failed to add product"))
            }
        } catch (e: Exception) {
            emit(Resource.Error(e.localizedMessage ?: "Network connection error"))
        }
    }
}
