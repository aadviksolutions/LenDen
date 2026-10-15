package com.lenden.app.ui.billing

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lenden.app.data.local.db.entity.CachedCustomerEntity
import com.lenden.app.data.local.db.entity.CachedProductEntity
import com.lenden.app.data.remote.dto.InvoiceDto
import com.lenden.app.ui.components.LendenButton
import com.lenden.app.ui.components.LendenCard
import com.lenden.app.ui.components.LendenTextField
import com.lenden.app.ui.theme.*
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BillingScreen(
    viewModel: BillingViewModel,
    onNavigateBack: () -> Unit,
    onInvoiceCreated: (InvoiceDto) -> Unit
) {
    val state by viewModel.billingState.collectAsState()
    val availableCustomers by viewModel.availableCustomers.collectAsState(initial = emptyList())
    val availableProducts by viewModel.availableProducts.collectAsState(initial = emptyList())

    val inrFormat = remember {
        NumberFormat.getCurrencyInstance(Locale("en", "IN")).apply {
            maximumFractionDigits = 2
        }
    }

    var showCustomerPicker by remember { mutableStateOf(false) }
    var productPickerIndex by remember { mutableStateOf<Int?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Create GST Bill",
                        style = MaterialTheme.typography.titleLarge.copy(
                            color = Color.White,
                            fontSize = 18.sp
                        )
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = NavyPrimary,
                    titleContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(BackgroundPrimary)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            if (state.errorMessage != null) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = RoseContainer,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp)
                ) {
                    Text(
                        text = state.errorMessage!!,
                        style = MaterialTheme.typography.bodySmall.copy(color = RoseError),
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }

            // 1. Customer Section
            LendenCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Customer Details",
                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold)
                    )
                    TextButton(onClick = { showCustomerPicker = true }) {
                        Icon(Icons.Default.PersonSearch, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Select Saved Customer", fontSize = 12.sp)
                    }
                }

                LendenTextField(
                    value = state.customerName,
                    onValueChange = { viewModel.setCustomerManual(it, state.customerMobile) },
                    label = "Customer Name *",
                    placeholder = "e.g. Ramesh Verma or Walk-in"
                )

                Spacer(modifier = Modifier.height(8.dp))

                LendenTextField(
                    value = state.customerMobile,
                    onValueChange = { viewModel.setCustomerManual(state.customerName, it) },
                    label = "Mobile (for WhatsApp Bill)",
                    placeholder = "9876543210",
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone)
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // 2. GST Configuration Mode
            LendenCard {
                Text(
                    text = "Tax Settings",
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                    modifier = Modifier.padding(bottom = 8.dp)
                )

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = state.gstType == "CGST_SGST",
                        onClick = { viewModel.setGstType("CGST_SGST") },
                        label = { Text("Intra-State (CGST + SGST)") }
                    )
                    FilterChip(
                        selected = state.gstType == "IGST",
                        onClick = { viewModel.setGstType("IGST") },
                        label = { Text("Inter-State (IGST)") }
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // 3. Invoice Items
            Text(
                text = "Items & Charges",
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                modifier = Modifier.padding(bottom = 8.dp)
            )

            state.items.forEachIndexed { index, item ->
                LendenCard(modifier = Modifier.padding(bottom = 10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Item #${index + 1}",
                            style = MaterialTheme.typography.labelMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = NavyPrimary
                            )
                        )
                        Row {
                            TextButton(onClick = { productPickerIndex = index }) {
                                Icon(Icons.Default.Inventory2, contentDescription = null, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Pick Product", fontSize = 11.sp)
                            }
                            if (state.items.size > 1) {
                                IconButton(onClick = { viewModel.removeItem(index) }, modifier = Modifier.size(28.dp)) {
                                    Icon(Icons.Default.Delete, contentDescription = "Delete Item", tint = RoseError)
                                }
                            }
                        }
                    }

                    LendenTextField(
                        value = item.description,
                        onValueChange = { viewModel.updateItem(index, description = it) },
                        label = "Description / Item Name *",
                        placeholder = "e.g. Basmati Rice 5kg"
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        LendenTextField(
                            value = if (item.quantity == 0.0) "" else item.quantity.toString(),
                            onValueChange = {
                                val q = it.toDoubleOrNull() ?: 0.0
                                viewModel.updateItem(index, quantity = q)
                            },
                            label = "Qty",
                            placeholder = "1",
                            modifier = Modifier.weight(1f),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                        )

                        LendenTextField(
                            value = if (item.rate == 0.0) "" else item.rate.toString(),
                            onValueChange = {
                                val r = it.toDoubleOrNull() ?: 0.0
                                viewModel.updateItem(index, rate = r)
                            },
                            label = "Rate (₹)",
                            placeholder = "0.00",
                            modifier = Modifier.weight(1.2f),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                        )

                        LendenTextField(
                            value = item.taxRate.toInt().toString() + "%",
                            onValueChange = {},
                            label = "GST",
                            modifier = Modifier.weight(0.9f),
                            trailingIcon = {
                                TextButton(onClick = {
                                    val nextRate = when (item.taxRate) {
                                        0.0 -> 5.0
                                        5.0 -> 12.0
                                        12.0 -> 18.0
                                        18.0 -> 28.0
                                        else -> 0.0
                                    }
                                    viewModel.updateItem(index, taxRate = nextRate)
                                }) {
                                    Text("↻", fontWeight = FontWeight.Bold)
                                }
                            }
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Tax: ${inrFormat.format(item.calculation.totalTaxAmount)}",
                            style = MaterialTheme.typography.labelSmall.copy(color = TextSecondary)
                        )
                        Text(
                            text = "Total: ${inrFormat.format(item.calculation.lineTotal)}",
                            style = MaterialTheme.typography.titleSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = NavyPrimary
                            )
                        )
                    }
                }
            }

            OutlinedButton(
                onClick = { viewModel.addItem() },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Add Another Item")
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 4. Totals Calculation Card
            val totals = state.totals
            LendenCard(backgroundColor = SurfaceCard) {
                Text(
                    text = "Summary",
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                    modifier = Modifier.padding(bottom = 8.dp)
                )

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Taxable Subtotal", style = MaterialTheme.typography.bodyMedium)
                    Text(inrFormat.format(totals.subtotal), style = MaterialTheme.typography.bodyMedium)
                }

                if (state.gstType == "CGST_SGST") {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("CGST", style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary))
                        Text(inrFormat.format(totals.cgstTotal), style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary))
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("SGST", style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary))
                        Text(inrFormat.format(totals.sgstTotal), style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary))
                    }
                } else {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("IGST", style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary))
                        Text(inrFormat.format(totals.igstTotal), style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary))
                    }
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Round Off", style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary))
                    Text(inrFormat.format(totals.rounding), style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary))
                }

                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = BorderSubtle)

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Grand Total",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                    )
                    Text(
                        text = inrFormat.format(totals.finalTotal),
                        style = MaterialTheme.typography.headlineSmall.copy(
                            fontWeight = FontWeight.Black,
                            color = EmeraldPrimary
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 5. Payment Details
            LendenCard {
                Text(
                    text = "Payment Mode",
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                    modifier = Modifier.padding(bottom = 8.dp)
                )

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("CASH", "UPI", "CARD", "CREDIT").forEach { mode ->
                        FilterChip(
                            selected = state.paymentMethod == mode,
                            onClick = {
                                viewModel.setPaymentMethod(mode)
                                if (mode == "CREDIT") {
                                    viewModel.setFullyPaid(false)
                                    viewModel.setAmountPaid(0.0)
                                }
                            },
                            label = { Text(if (mode == "CREDIT") "Udhaar" else mode) }
                        )
                    }
                }

                if (state.paymentMethod != "CREDIT") {
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = state.isFullyPaid,
                            onCheckedChange = { viewModel.setFullyPaid(it) }
                        )
                        Text(
                            text = "Received Full Amount (${inrFormat.format(totals.finalTotal)})",
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }

                    if (!state.isFullyPaid) {
                        Spacer(modifier = Modifier.height(6.dp))
                        LendenTextField(
                            value = if (state.amountPaid == 0.0) "" else state.amountPaid.toString(),
                            onValueChange = {
                                val p = it.toDoubleOrNull() ?: 0.0
                                viewModel.setAmountPaid(p)
                            },
                            label = "Amount Paid (₹)",
                            placeholder = "0.00",
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                        )
                        Text(
                            text = "Balance Due (Udhaar): ${inrFormat.format(totals.balanceDue)}",
                            style = MaterialTheme.typography.bodySmall.copy(
                                color = AmberWarning,
                                fontWeight = FontWeight.Bold
                            ),
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                } else {
                    Text(
                        text = "Full amount (${inrFormat.format(totals.finalTotal)}) will be recorded as Udhaar receivable.",
                        style = MaterialTheme.typography.bodySmall.copy(color = AmberWarning),
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            LendenButton(
                text = "Generate & Save Invoice",
                onClick = { viewModel.createInvoice(onInvoiceCreated) },
                loading = state.isLoading,
                isEmerald = true,
                icon = Icons.Default.Check
            )

            Spacer(modifier = Modifier.height(32.dp))
        }
    }

    // Modal Sheet for Customer Picker
    if (showCustomerPicker) {
        AlertDialog(
            onDismissRequest = { showCustomerPicker = false },
            title = { Text("Select Customer", fontWeight = FontWeight.Bold) },
            text = {
                Column(modifier = Modifier.fillMaxWidth().heightIn(max = 350.dp).verticalScroll(rememberScrollState())) {
                    if (availableCustomers.isEmpty()) {
                        Text("No saved customers found. Enter customer details manually.")
                    } else {
                        availableCustomers.forEach { cust ->
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp)
                                    .clickable {
                                        viewModel.selectCustomer(cust)
                                        showCustomerPicker = false
                                    },
                                shape = RoundedCornerShape(8.dp),
                                border = BorderStroke(1.dp, BorderSubtle)
                            ) {
                                Column(modifier = Modifier.padding(10.dp)) {
                                    Text(cust.name, fontWeight = FontWeight.Bold, color = TextPrimary)
                                    Text(cust.mobile, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showCustomerPicker = false }) { Text("Close") }
            }
        )
    }

    // Modal Sheet for Product Picker
    if (productPickerIndex != null) {
        val targetIndex = productPickerIndex!!
        AlertDialog(
            onDismissRequest = { productPickerIndex = null },
            title = { Text("Select Product from Inventory", fontWeight = FontWeight.Bold) },
            text = {
                Column(modifier = Modifier.fillMaxWidth().heightIn(max = 350.dp).verticalScroll(rememberScrollState())) {
                    if (availableProducts.isEmpty()) {
                        Text("No inventory items found. You can add them under Stock Catalog.")
                    } else {
                        availableProducts.forEach { prod ->
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp)
                                    .clickable {
                                        viewModel.selectProductForItem(targetIndex, prod)
                                        productPickerIndex = null
                                    },
                                shape = RoundedCornerShape(8.dp),
                                border = BorderStroke(1.dp, BorderSubtle)
                            ) {
                                Row(
                                    modifier = Modifier.padding(10.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(prod.name, fontWeight = FontWeight.Bold, color = TextPrimary)
                                        Text("SKU: ${prod.sku} • Stock: ${prod.currentStock}", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                                    }
                                    Text(inrFormat.format(prod.sellingPrice), fontWeight = FontWeight.Bold, color = EmeraldPrimary)
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { productPickerIndex = null }) { Text("Close") }
            }
        )
    }
}
