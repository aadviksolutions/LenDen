package com.lenden.app.ui.inventory

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lenden.app.data.remote.dto.ProductDto
import com.lenden.app.ui.components.LendenCard
import com.lenden.app.ui.components.LendenTextField
import com.lenden.app.ui.components.LendenTopAppBar
import com.lenden.app.ui.theme.*
import java.text.NumberFormat
import java.util.Locale

@Composable
fun InventoryScreen(
    viewModel: InventoryViewModel,
    onNavigateBack: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    var showAddDialog by remember { mutableStateOf(false) }

    val inrFormat = remember {
        NumberFormat.getCurrencyInstance(Locale("en", "IN")).apply {
            maximumFractionDigits = 2
        }
    }

    Scaffold(
        topBar = {
            LendenTopAppBar(
                title = "Stock & Inventory",
                subtitle = "Product catalog and low stock alerts",
                showBackButton = true,
                onBackClick = onNavigateBack,
                actions = {
                    IconButton(onClick = { viewModel.loadInventory() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = Color.White)
                    }
                }
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = EmeraldPrimary,
                contentColor = Color.White,
                icon = { Icon(Icons.Default.Add, contentDescription = "Add Product") },
                text = { Text("Add Product", fontWeight = FontWeight.Bold) }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(BackgroundPrimary)
        ) {
            // Valuation Summary Banner
            state.valuation?.let { valuation ->
                Surface(
                    color = NavyPrimary,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp, vertical = 14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "TOTAL STOCK VALUATION",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = TextTertiary,
                                    letterSpacing = 0.5.sp
                                )
                            )
                            Text(
                                text = inrFormat.format(valuation.totalValuationCost),
                                style = MaterialTheme.typography.titleLarge.copy(
                                    fontWeight = FontWeight.Black,
                                    color = Color.White
                                )
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "${valuation.totalItems} Items",
                                style = MaterialTheme.typography.bodySmall.copy(color = Color.White, fontWeight = FontWeight.Bold)
                            )
                            if (valuation.lowStockCount > 0) {
                                Text(
                                    text = "${valuation.lowStockCount} Low Stock",
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        color = AmberWarning,
                                        fontWeight = FontWeight.Bold
                                    )
                                )
                            }
                        }
                    }
                }
            }

            // Search Bar
            OutlinedTextField(
                value = state.searchQuery,
                onValueChange = { viewModel.setSearchQuery(it) },
                placeholder = { Text("Search product by name or SKU") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = TextTertiary) },
                singleLine = true,
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            )

            // Filter Chips
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 2.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = !state.lowStockOnly,
                    onClick = { viewModel.setLowStockFilter(false) },
                    label = { Text("All Products") }
                )
                FilterChip(
                    selected = state.lowStockOnly,
                    onClick = { viewModel.setLowStockFilter(true) },
                    label = { Text("Low Stock Alert Only") }
                )
            }

            if (state.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = EmeraldPrimary)
            }

            if (state.products.isEmpty() && !state.isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No products found",
                        style = MaterialTheme.typography.titleMedium.copy(color = TextSecondary)
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(state.products, key = { it.id }) { product ->
                        ProductItemCard(product = product, inrFormat = inrFormat)
                    }
                }
            }
        }
    }

    if (showAddDialog) {
        AddProductDialog(
            viewModel = viewModel,
            onDismiss = { showAddDialog = false }
        )
    }
}

@Composable
private fun ProductItemCard(
    product: ProductDto,
    inrFormat: NumberFormat
) {
    val isLowStock = product.currentStock <= product.lowStockAlert

    LendenCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = product.name,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = NavyPrimary
                    )
                )
                Text(
                    text = "SKU: ${product.sku} • Category: ${product.category}",
                    style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
                )
            }

            Surface(
                color = if (isLowStock) RoseContainer else EmeraldContainer,
                shape = RoundedCornerShape(6.dp),
                border = BorderStroke(1.dp, if (isLowStock) Color(0xFFFECDD3) else Color(0xFFA7F3D0))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (isLowStock) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = "Low Stock",
                            tint = RoseError,
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                    }
                    Text(
                        text = "Stock: ${product.currentStock} ${product.unit}",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = if (isLowStock) RoseError else EmeraldPrimary
                        )
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Sale Price", style = MaterialTheme.typography.labelSmall.copy(color = TextSecondary))
                Text(
                    text = inrFormat.format(product.sellingPrice),
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = NavyPrimary
                    )
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text("Purchase Cost", style = MaterialTheme.typography.labelSmall.copy(color = TextSecondary))
                Text(
                    text = inrFormat.format(product.purchasePrice),
                    style = MaterialTheme.typography.bodyMedium.copy(color = TextSecondary)
                )
            }

            Surface(
                color = BackgroundPrimary,
                shape = RoundedCornerShape(4.dp),
                border = BorderStroke(1.dp, BorderSubtle)
            ) {
                Text(
                    text = "GST: ${product.taxRate.toInt()}%",
                    style = MaterialTheme.typography.labelSmall.copy(
                        color = TextSecondary,
                        fontWeight = FontWeight.SemiBold
                    ),
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
        }
    }
}

@Composable
private fun AddProductDialog(
    viewModel: InventoryViewModel,
    onDismiss: () -> Unit
) {
    var name by remember { mutableStateOf("") }
    var sku by remember { mutableStateOf("") }
    var unit by remember { mutableStateOf("Pcs") }
    var sellingPrice by remember { mutableStateOf("") }
    var purchasePrice by remember { mutableStateOf("") }
    var taxRate by remember { mutableStateOf("18") }
    var openingStock by remember { mutableStateOf("0") }
    var lowStockAlert by remember { mutableStateOf("10") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add New Product", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                LendenTextField(
                    value = name,
                    onValueChange = {
                        name = it
                        if (sku.isBlank()) {
                            sku = it.take(4).uppercase() + "-" + (100..999).random()
                        }
                    },
                    label = "Product Name *"
                )
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    LendenTextField(
                        value = sku,
                        onValueChange = { sku = it.uppercase() },
                        label = "SKU Code *",
                        modifier = Modifier.weight(1f)
                    )
                    LendenTextField(
                        value = unit,
                        onValueChange = { unit = it },
                        label = "Unit (Pcs/Kg/Box)",
                        modifier = Modifier.weight(1f)
                    )
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    LendenTextField(
                        value = sellingPrice,
                        onValueChange = { sellingPrice = it },
                        label = "Sale Price (₹) *",
                        modifier = Modifier.weight(1f),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                    )
                    LendenTextField(
                        value = purchasePrice,
                        onValueChange = { purchasePrice = it },
                        label = "Cost Price (₹)",
                        modifier = Modifier.weight(1f),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                    )
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    LendenTextField(
                        value = openingStock,
                        onValueChange = { openingStock = it },
                        label = "Opening Stock",
                        modifier = Modifier.weight(1f),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                    )
                    LendenTextField(
                        value = lowStockAlert,
                        onValueChange = { lowStockAlert = it },
                        label = "Alert Level",
                        modifier = Modifier.weight(1f),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val sp = sellingPrice.toDoubleOrNull() ?: 0.0
                    val pp = purchasePrice.toDoubleOrNull() ?: 0.0
                    val tr = taxRate.toDoubleOrNull() ?: 18.0
                    val os = openingStock.toDoubleOrNull() ?: 0.0
                    val lsa = lowStockAlert.toDoubleOrNull() ?: 10.0

                    viewModel.createProduct(
                        name = name,
                        sku = sku,
                        unit = unit,
                        sellingPrice = sp,
                        purchasePrice = pp,
                        taxRate = tr,
                        openingStock = os,
                        lowStockAlert = lsa
                    ) {
                        onDismiss()
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary)
            ) {
                Text("Save Product")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}
