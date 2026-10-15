package com.lenden.app.ui.billing

import android.content.Context
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lenden.app.data.remote.dto.InvoiceDto
import com.lenden.app.ui.components.LendenCard
import com.lenden.app.ui.components.LendenTopAppBar
import com.lenden.app.ui.components.StatusBadge
import com.lenden.app.ui.theme.*
import com.lenden.app.util.WhatsAppHelper
import java.text.NumberFormat
import java.util.Locale

@Composable
fun InvoiceListScreen(
    viewModel: BillingViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToBilling: () -> Unit,
    onSelectInvoice: (InvoiceDto) -> Unit
) {
    val state by viewModel.invoiceListState.collectAsState()
    val context = LocalContext.current
    var selectedTab by remember { mutableStateOf("ALL") }
    var searchQuery by remember { mutableStateOf("") }

    val inrFormat = remember {
        NumberFormat.getCurrencyInstance(Locale("en", "IN")).apply {
            maximumFractionDigits = 2
        }
    }

    Scaffold(
        topBar = {
            LendenTopAppBar(
                title = "Invoices & Bills",
                subtitle = "History and payment tracking",
                showBackButton = true,
                onBackClick = onNavigateBack,
                actions = {
                    IconButton(onClick = { viewModel.loadInvoices() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = Color.White)
                    }
                    IconButton(onClick = onNavigateToBilling) {
                        Icon(Icons.Default.Add, contentDescription = "New Bill", tint = Color.White)
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Search Input
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search by invoice # or customer") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = TextTertiary) },
                singleLine = true,
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            )

            // Status Filter Chips
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf("ALL", "PAID", "PARTIAL", "UNPAID").forEach { tab ->
                    FilterChip(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        label = { Text(tab, fontSize = 12.sp) }
                    )
                }
            }

            if (state.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = EmeraldPrimary)
            }

            val filteredInvoices = state.invoices.filter { inv ->
                val matchesTab = when (selectedTab) {
                    "ALL" -> true
                    "PAID" -> inv.status.uppercase() == "PAID"
                    "PARTIAL" -> inv.status.uppercase() == "PARTIAL"
                    "UNPAID" -> inv.status.uppercase() == "UNPAID" || inv.status.uppercase() == "OVERDUE"
                    else -> true
                }
                val matchesSearch = if (searchQuery.isBlank()) true else {
                    inv.invoiceNumber.contains(searchQuery, ignoreCase = true) ||
                            inv.customerName.contains(searchQuery, ignoreCase = true) ||
                            inv.customerMobile.contains(searchQuery, ignoreCase = true)
                }
                matchesTab && matchesSearch
            }

            if (filteredInvoices.isEmpty() && !state.isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "No invoices found",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Generate a new bill or change the filter",
                            style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(filteredInvoices, key = { it.id }) { invoice ->
                        InvoiceItemCard(
                            invoice = invoice,
                            inrFormat = inrFormat,
                            onClick = { onSelectInvoice(invoice) },
                            onShareWhatsApp = {
                                val message = WhatsAppHelper.buildInvoiceShareMessage(
                                    businessName = "Lenden Store",
                                    customerName = invoice.customerName,
                                    invoiceNumber = invoice.invoiceNumber,
                                    totalAmount = invoice.total,
                                    balanceDue = invoice.balanceDue,
                                    portalUrl = "https://lenden.app/invoices/${invoice.id}"
                                )
                                WhatsAppHelper.openWhatsAppChat(context, invoice.customerMobile, message)
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun InvoiceItemCard(
    invoice: InvoiceDto,
    inrFormat: NumberFormat,
    onClick: () -> Unit,
    onShareWhatsApp: () -> Unit
) {
    LendenCard(
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = invoice.invoiceNumber,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = NavyPrimary
                    )
                )
                Text(
                    text = invoice.customerName.ifBlank { "Walk-in Customer" },
                    style = MaterialTheme.typography.bodyMedium.copy(color = TextPrimary)
                )
            }
            StatusBadge(status = invoice.status)
        }

        Spacer(modifier = Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Date: ${invoice.invoiceDate.take(10)}",
                    style = MaterialTheme.typography.labelSmall.copy(color = TextSecondary)
                )
                if (invoice.balanceDue > 0.0) {
                    Text(
                        text = "Balance: ${inrFormat.format(invoice.balanceDue)}",
                        style = MaterialTheme.typography.labelSmall.copy(
                            color = RoseError,
                            fontWeight = FontWeight.Bold
                        )
                    )
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = inrFormat.format(invoice.total),
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.ExtraBold,
                        color = NavyPrimary
                    )
                )
                Spacer(modifier = Modifier.width(8.dp))
                IconButton(onClick = onShareWhatsApp, modifier = Modifier.size(32.dp)) {
                    Icon(
                        imageVector = Icons.Default.Share,
                        contentDescription = "Share on WhatsApp",
                        tint = EmeraldPrimary
                    )
                }
            }
        }
    }
}
