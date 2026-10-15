package com.lenden.app.ui.billing

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Payment
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lenden.app.data.remote.dto.InvoiceDto
import com.lenden.app.ui.components.LendenButton
import com.lenden.app.ui.components.LendenCard
import com.lenden.app.ui.components.LendenTextField
import com.lenden.app.ui.components.StatusBadge
import com.lenden.app.ui.print.LendenPrintAdapter
import com.lenden.app.ui.theme.*
import com.lenden.app.util.WhatsAppHelper
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvoiceDetailScreen(
    invoice: InvoiceDto,
    viewModel: BillingViewModel,
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current
    val inrFormat = remember {
        NumberFormat.getCurrencyInstance(Locale("en", "IN")).apply {
            maximumFractionDigits = 2
        }
    }

    var showPaymentDialog by remember { mutableStateOf(false) }
    var paymentAmount by remember { mutableStateOf(invoice.balanceDue.toString()) }
    var paymentMethod by remember { mutableStateOf("CASH") }
    var isSubmittingPayment by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        invoice.invoiceNumber,
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
                actions = {
                    IconButton(onClick = {
                        LendenPrintAdapter.print(context, invoice)
                    }) {
                        Icon(Icons.Default.Print, contentDescription = "Print Bill", tint = Color.White)
                    }
                    IconButton(onClick = {
                        val message = WhatsAppHelper.buildInvoiceShareMessage(
                            businessName = "Lenden Store",
                            customerName = invoice.customerName,
                            invoiceNumber = invoice.invoiceNumber,
                            totalAmount = invoice.total,
                            balanceDue = invoice.balanceDue,
                            portalUrl = "https://lenden.app/invoices/${invoice.id}"
                        )
                        WhatsAppHelper.openWhatsAppChat(context, invoice.customerMobile, message)
                    }) {
                        Icon(Icons.Default.Share, contentDescription = "WhatsApp Share", tint = EmeraldPrimary)
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
            // Header card
            LendenCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = invoice.invoiceNumber,
                            style = MaterialTheme.typography.titleLarge.copy(
                                fontWeight = FontWeight.ExtraBold,
                                color = NavyPrimary
                            )
                        )
                        Text(
                            text = "Date: ${invoice.invoiceDate.take(10)}",
                            style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
                        )
                    }
                    StatusBadge(status = invoice.status)
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Customer details card
            LendenCard {
                Text(
                    text = "Billed To",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontWeight = FontWeight.Bold,
                        color = TextSecondary
                    )
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = invoice.customerName.ifBlank { "Walk-in Customer" },
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                )
                if (invoice.customerMobile.isNotBlank()) {
                    Text(
                        text = "Phone: ${invoice.customerMobile}",
                        style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Items breakdown
            LendenCard {
                Text(
                    text = "Items Breakdown",
                    style = MaterialTheme.typography.titleSmall.copy(
                        fontWeight = FontWeight.Bold,
                        color = NavyPrimary
                    ),
                    modifier = Modifier.padding(bottom = 8.dp)
                )

                if (invoice.items.isEmpty()) {
                    Text("General Goods / Services", style = MaterialTheme.typography.bodyMedium)
                } else {
                    invoice.items.forEach { item ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = item.description,
                                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold)
                                )
                                Text(
                                    text = "${item.quantity} ${item.unit} @ ${inrFormat.format(item.rate)}",
                                    style = MaterialTheme.typography.labelSmall.copy(color = TextSecondary)
                                )
                            }
                            Text(
                                text = inrFormat.format(item.lineTotal),
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = NavyPrimary
                                )
                            )
                        }
                        HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp), color = BorderSubtle)
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Financial summary card
            LendenCard(backgroundColor = SurfaceCard) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Total Invoice Amount", style = MaterialTheme.typography.bodyMedium)
                    Text(
                        inrFormat.format(invoice.total),
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = NavyPrimary
                        )
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Amount Paid", style = MaterialTheme.typography.bodyMedium)
                    Text(
                        inrFormat.format(invoice.paidAmount),
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                            color = EmeraldPrimary
                        )
                    )
                }

                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = BorderSubtle)

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Balance Due", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                    Text(
                        inrFormat.format(invoice.balanceDue),
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.ExtraBold,
                            color = if (invoice.balanceDue > 0.0) RoseError else EmeraldPrimary
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Action Buttons
            if (invoice.balanceDue > 0.0) {
                LendenButton(
                    text = "Record Payment / Settle",
                    onClick = { showPaymentDialog = true },
                    isEmerald = true,
                    icon = Icons.Default.Payment
                )
                Spacer(modifier = Modifier.height(10.dp))
            }

            OutlinedButton(
                onClick = { LendenPrintAdapter.print(context, invoice) },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(8.dp)
            ) {
                Icon(Icons.Default.Print, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Print / Save as PDF", fontWeight = FontWeight.Bold)
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }

    if (showPaymentDialog) {
        AlertDialog(
            onDismissRequest = { showPaymentDialog = false },
            title = { Text("Record Payment", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text(
                        text = "Balance Due: ${inrFormat.format(invoice.balanceDue)}",
                        style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary),
                        modifier = Modifier.padding(bottom = 8.dp)
                    )

                    LendenTextField(
                        value = paymentAmount,
                        onValueChange = { paymentAmount = it },
                        label = "Amount Received (₹)",
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Text("Payment Method", style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("CASH", "UPI", "CARD").forEach { mode ->
                            FilterChip(
                                selected = paymentMethod == mode,
                                onClick = { paymentMethod = mode },
                                label = { Text(mode, fontSize = 11.sp) }
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val amount = paymentAmount.toDoubleOrNull() ?: 0.0
                        if (amount > 0.0) {
                            isSubmittingPayment = true
                            viewModel.recordPayment(invoice.id, amount, paymentMethod) {
                                isSubmittingPayment = false
                                showPaymentDialog = false
                                onNavigateBack()
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary)
                ) {
                    Text("Confirm Payment")
                }
            },
            dismissButton = {
                TextButton(onClick = { showPaymentDialog = false }) { Text("Cancel") }
            }
        )
    }
}
