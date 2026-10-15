package com.lenden.app.data.repository

import com.lenden.app.data.remote.LendenApiService
import com.lenden.app.data.remote.dto.ReportSummaryDto
import com.lenden.app.util.Resource
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

class DashboardRepository(
    private val api: LendenApiService
) {
    fun getDashboardSummary(): Flow<Resource<ReportSummaryDto>> = flow {
        emit(Resource.Loading())
        try {
            val response = api.getReportsSummary()
            if (response.isSuccessful && response.body()?.summary != null) {
                emit(Resource.Success(response.body()!!.summary!!))
            } else {
                emit(Resource.Error(response.body()?.error ?: "Failed to fetch dashboard metrics"))
            }
        } catch (e: Exception) {
            emit(Resource.Error(e.localizedMessage ?: "Network connection error"))
        }
    }
}
