package com.lenden.app.data.local.db.dao

import androidx.room.*
import com.lenden.app.data.local.db.entity.*
import kotlinx.coroutines.flow.Flow

@Dao
interface InvoiceDraftDao {
    @Query("SELECT * FROM invoice_drafts ORDER BY createdAt DESC")
    fun getAllDrafts(): Flow<List<InvoiceDraftEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDraft(draft: InvoiceDraftEntity): Long

    @Delete
    suspend fun deleteDraft(draft: InvoiceDraftEntity)

    @Query("DELETE FROM invoice_drafts WHERE id = :id")
    suspend fun deleteDraftById(id: Long)
}

@Dao
interface CustomerDao {
    @Query("SELECT * FROM cached_customers ORDER BY name ASC")
    fun getAllCustomers(): Flow<List<CachedCustomerEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCustomers(customers: List<CachedCustomerEntity>)

    @Query("DELETE FROM cached_customers")
    suspend fun clearAll()
}

@Dao
interface ProductDao {
    @Query("SELECT * FROM cached_products ORDER BY name ASC")
    fun getAllProducts(): Flow<List<CachedProductEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProducts(products: List<CachedProductEntity>)

    @Query("DELETE FROM cached_products")
    suspend fun clearAll()
}
