package com.lenden.app.ui.billing

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lenden.app.data.local.db.entity.CachedCustomerEntity
import com.lenden.app.data.local.db.entity.CachedProductEntity
import com.lenden.app.data.local.db.entity.InvoiceDraftEntity
import com.lenden.app.data.remote.dto.*
import com.lenden.app.data.repository.BillingRepository
import com.lenden.app.data.repository.CustomerRepository
import com.lenden.app.data.repository.InventoryRepository
import com.lenden.app.util.DecimalCalculator
import com.lenden.app.util.Resource
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

data class BillingLineItem(
    val id: String = UUID.randomUUID().toString(),
    val productId: String? = null,
    val description: String = "",
    val quantity: Double = 1.0,
    val unit: String = "Pcs",
    val rate: Double = 0.0,
    val discount: Double = 0.0,
    val taxRate: Double = 18.0
) {
    val calculation: DecimalCalculator.LineCalculation
        get() = DecimalCalculator.calculateLineItem(
            quantity = quantity,
            rate = rate,
            discount = discount,
            taxRatePercent = taxRate
        )
}

data class BillingUiState(
    val customerId: String = "",
    val customerName: String = "",
    val customerMobile: String = "",
    val customerGstin: String = "",
    val gstType: String = "CGST_SGST", // "CGST_SGST" or "IGST"
    val isTaxInclusive: Boolean = false,
    val items: List<BillingLineItem> = listOf(BillingLineItem()),
    val paymentMethod: String = "CASH",
    val amountPaid: Double = 0.0,
    val isFullyPaid: Boolean = true,
    val notes: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val createdInvoice: InvoiceDto? = null
) {
    val totals: DecimalCalculator.InvoiceCalculation
        get() = DecimalCalculator.calculateInvoiceTotals(
            lines = items.map { it.calculation },
            paidAmount = if (isFullyPaid) {
                // If fully paid, calculate raw total
                var total = 0.0
                items.forEach { total += it.calculation.lineTotal.toDouble() }
                Math.round(total).toDouble()
            } else {
                amountPaid
            }
        )
}

data class InvoiceListUiState(
    val invoices: List<InvoiceDto> = emptyList(),
    val filterStatus: String? = null,
    val searchQuery: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

class BillingViewModel(
    private val billingRepository: BillingRepository,
    private val customerRepository: CustomerRepository,
    private val inventoryRepository: InventoryRepository
) : ViewModel() {

    private val _billingState = MutableStateFlow(BillingUiState())
    val billingState: StateFlow<BillingUiState> = _billingState.asStateFlow()

    private val _invoiceListState = MutableStateFlow(InvoiceListUiState())
    val invoiceListState: StateFlow<InvoiceListUiState> = _invoiceListState.asStateFlow()

    private val _selectedInvoice = MutableStateFlow<InvoiceDto?>(null)
    val selectedInvoice: StateFlow<InvoiceDto?> = _selectedInvoice.asStateFlow()

    val availableCustomers = customerRepository.cachedCustomers
    val availableProducts = inventoryRepository.cachedProducts

    fun selectInvoiceForDetail(invoice: InvoiceDto) {
        _selectedInvoice.value = invoice
    }

    init {
        loadInvoices()
        refreshCustomerAndProductCaches()
    }

    private fun refreshCustomerAndProductCaches() {
        viewModelScope.launch {
            customerRepository.getCustomers().collect {}
        }
        viewModelScope.launch {
            inventoryRepository.getInventory().collect {}
        }
    }

    fun selectCustomer(customer: CachedCustomerEntity) {
        _billingState.value = _billingState.value.copy(
            customerId = customer.id,
            customerName = customer.name,
            customerMobile = customer.mobile,
            customerGstin = customer.gstin ?: ""
        )
    }

    fun setCustomerManual(name: String, mobile: String) {
        _billingState.value = _billingState.value.copy(
            customerId = "",
            customerName = name,
            customerMobile = mobile
        )
    }

    fun setGstType(type: String) {
        _billingState.value = _billingState.value.copy(gstType = type)
    }

    fun addItem() {
        val currentList = _billingState.value.items.toMutableList()
        currentList.add(BillingLineItem())
        _billingState.value = _billingState.value.copy(items = currentList)
    }

    fun removeItem(index: Int) {
        val currentList = _billingState.value.items.toMutableList()
        if (currentList.size > 1 && index in currentList.indices) {
            currentList.removeAt(index)
            _billingState.value = _billingState.value.copy(items = currentList)
        }
    }

    fun updateItem(
        index: Int,
        description: String? = null,
        quantity: Double? = null,
        rate: Double? = null,
        taxRate: Double? = null,
        unit: String? = null
    ) {
        val currentList = _billingState.value.items.toMutableList()
        if (index in currentList.indices) {
            val item = currentList[index]
            currentList[index] = item.copy(
                description = description ?: item.description,
                quantity = quantity ?: item.quantity,
                rate = rate ?: item.rate,
                taxRate = taxRate ?: item.taxRate,
                unit = unit ?: item.unit
            )
            _billingState.value = _billingState.value.copy(items = currentList)
        }
    }

    fun selectProductForItem(index: Int, product: CachedProductEntity) {
        val currentList = _billingState.value.items.toMutableList()
        if (index in currentList.indices) {
            val item = currentList[index]
            currentList[index] = item.copy(
                productId = product.id,
                description = product.name,
                rate = product.sellingPrice,
                taxRate = product.taxRate,
                unit = product.unit
            )
            _billingState.value = _billingState.value.copy(items = currentList)
        }
    }

    fun setPaymentMethod(method: String) {
        _billingState.value = _billingState.value.copy(paymentMethod = method)
    }

    fun setFullyPaid(fullyPaid: Boolean) {
        _billingState.value = _billingState.value.copy(isFullyPaid = fullyPaid)
    }

    fun setAmountPaid(amount: Double) {
        _billingState.value = _billingState.value.copy(amountPaid = amount)
    }

    fun createInvoice(onSuccess: (InvoiceDto) -> Unit) {
        val state = _billingState.value

        if (state.customerName.isBlank()) {
            _billingState.value = state.copy(errorMessage = "Please enter or select a customer name")
            return
        }

        val validItems = state.items.filter { it.description.isNotBlank() && it.quantity > 0 && it.rate > 0 }
        if (validItems.isEmpty()) {
            _billingState.value = state.copy(errorMessage = "Please add at least one item with valid quantity and rate")
            return
        }

        val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        val nowIso = dateFormat.format(Date())

        viewModelScope.launch {
            _billingState.value = state.copy(isLoading = true, errorMessage = null)

            // If customerId is empty, first create the customer
            var targetCustomerId = state.customerId
            if (targetCustomerId.isBlank()) {
                val createCustReq = CreateCustomerRequest(
                    name = state.customerName.trim(),
                    mobile = state.customerMobile.trim().ifBlank { "9999999999" },
                    gstin = state.customerGstin.trim().ifBlank { null }
                )
                customerRepository.createCustomer(createCustReq).collect { custRes ->
                    // Proceed with customer created
                }
                // Refresh list to find id
                customerRepository.getCustomers(state.customerName.trim()).collect { res ->
                    if (res is Resource.Success && res.data?.isNotEmpty() == true) {
                        targetCustomerId = res.data.first().id
                    }
                }
            }

            val request = CreateInvoiceRequest(
                customerId = targetCustomerId.ifBlank { "walk_in_customer" },
                invoiceDate = nowIso,
                dueDate = nowIso,
                gstType = state.gstType,
                isTaxInclusive = state.isTaxInclusive,
                isGstInvoice = true,
                items = validItems.map { item ->
                    CreateInvoiceItemRequest(
                        productId = item.productId,
                        description = item.description,
                        quantity = item.quantity,
                        unit = item.unit,
                        rate = item.rate,
                        discount = item.discount,
                        taxRate = item.taxRate
                    )
                },
                paymentAmount = if (state.isFullyPaid) state.totals.finalTotal.toDouble() else state.amountPaid,
                paymentMethod = state.paymentMethod,
                notes = state.notes.ifBlank { null }
            )

            billingRepository.createInvoice(request).collect { res ->
                when (res) {
                    is Resource.Loading -> {
                        _billingState.value = _billingState.value.copy(isLoading = true)
                    }
                    is Resource.Success -> {
                        _billingState.value = BillingUiState(createdInvoice = res.data)
                        loadInvoices()
                        res.data?.let { onSuccess(it) }
                    }
                    is Resource.Error -> {
                        _billingState.value = _billingState.value.copy(
                            isLoading = false,
                            errorMessage = res.message ?: "Failed to generate invoice"
                        )
                    }
                }
            }
        }
    }

    fun loadInvoices(status: String? = null, search: String? = null) {
        viewModelScope.launch {
            billingRepository.getInvoices(status, search).collect { resource ->
                when (resource) {
                    is Resource.Loading -> {
                        _invoiceListState.value = _invoiceListState.value.copy(isLoading = true)
                    }
                    is Resource.Success -> {
                        _invoiceListState.value = _invoiceListState.value.copy(
                            isLoading = false,
                            invoices = resource.data ?: emptyList(),
                            errorMessage = null
                        )
                    }
                    is Resource.Error -> {
                        _invoiceListState.value = _invoiceListState.value.copy(
                            isLoading = false,
                            errorMessage = resource.message
                        )
                    }
                }
            }
        }
    }

    fun recordPayment(invoiceId: String, amount: Double, method: String, onDone: () -> Unit) {
        viewModelScope.launch {
            val req = RecordPaymentRequest(
                amount = amount,
                paymentMethod = method,
                idempotencyKey = UUID.randomUUID().toString()
            )
            billingRepository.recordPayment(invoiceId, req).collect { res ->
                if (res is Resource.Success) {
                    loadInvoices()
                    onDone()
                }
            }
        }
    }

    class Factory(
        private val billingRepository: BillingRepository,
        private val customerRepository: CustomerRepository,
        private val inventoryRepository: InventoryRepository
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(BillingViewModel::class.java)) {
                return BillingViewModel(billingRepository, customerRepository, inventoryRepository) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
