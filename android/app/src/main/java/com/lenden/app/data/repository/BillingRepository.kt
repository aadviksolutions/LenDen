package com.lenden.app.data.repository

import com.lenden.app.data.local.db.dao.InvoiceDraftDao
import com.lenden.app.data.local.db.entity.InvoiceDraftEntity
import com.lenden.app.data.remote.LendenApiService
import com.lenden.app.data.remote.dto.*
import com.lenden.app.util.Resource
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

class BillingRepository(
    private val api: LendenApiService,
    private val draftDao: InvoiceDraftDao
) {
    val offlineDrafts: Flow<List<InvoiceDraftEntity>> = draftDao.getAllDrafts()

    fun getInvoices(status: String? = null, search: String? = null): Flow<Resource<List<InvoiceDto>>> = flow {
        emit(Resource.Loading())
        try {
            val response = api.getInvoices(status = status, search = search)
            if (response.isSuccessful && response.body() != null) {
                emit(Resource.Success(response.body()!!.invoices))
            } else {
                emit(Resource.Error(response.body()?.error ?: "Failed to fetch invoices"))
            }
        } catch (e: Exception) {
            emit(Resource.Error(e.localizedMessage ?: "Network connection error"))
        }
    }

    fun createInvoice(request: CreateInvoiceRequest): Flow<Resource<InvoiceDto>> = flow {
        emit(Resource.Loading())
        try {
            val response = api.createInvoice(request)
            if (response.isSuccessful && response.body()?.invoice != null) {
                emit(Resource.Success(response.body()!!.invoice!!))
            } else {
                emit(Resource.Error(response.body()?.error ?: "Failed to create invoice"))
            }
        } catch (e: Exception) {
            emit(Resource.Error(e.localizedMessage ?: "Network connection error"))
        }
    }

    fun recordPayment(invoiceId: String, request: RecordPaymentRequest): Flow<Resource<Boolean>> = flow {
        emit(Resource.Loading())
        try {
            val response = api.recordInvoicePayment(invoiceId, request)
            if (response.isSuccessful && response.body()?.success == true) {
                emit(Resource.Success(true))
            } else {
                emit(Resource.Error(response.body()?.error ?: "Failed to record payment"))
            }
        } catch (e: Exception) {
            emit(Resource.Error(e.localizedMessage ?: "Network connection error"))
        }
    }

    suspend fun saveOfflineDraft(draft: InvoiceDraftEntity): Long {
        return draftDao.insertDraft(draft)
    }

    suspend fun deleteDraft(id: Long) {
        draftDao.deleteDraftById(id)
    }
}
