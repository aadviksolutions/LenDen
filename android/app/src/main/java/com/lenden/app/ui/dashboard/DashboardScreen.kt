package com.lenden.app.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lenden.app.ui.components.LendenCard
import com.lenden.app.ui.components.LendenTopAppBar
import com.lenden.app.ui.theme.*
import java.text.NumberFormat
import java.util.Locale

@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel,
    onNavigateToBilling: () -> Unit,
    onNavigateToInvoices: () -> Unit,
    onNavigateToCustomers: () -> Unit,
    onNavigateToInventory: () -> Unit,
    onLogout: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    val inrFormat = remember {
        NumberFormat.getCurrencyInstance(Locale("en", "IN")).apply {
            maximumFractionDigits = 2
        }
    }

    Scaffold(
        topBar = {
            LendenTopAppBar(
                title = state.businessName,
                subtitle = state.businessGstin?.let { "GSTIN: $it" } ?: "Har Hisab, Ab Aasaan",
                actions = {
                    IconButton(onClick = { viewModel.loadSummary() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh",
                            tint = Color.White
                        )
                    }
                    IconButton(onClick = onLogout) {
                        Icon(
                            imageVector = Icons.Default.ExitToApp,
                            contentDescription = "Logout",
                            tint = Color.White
                        )
                    }
                }
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onNavigateToBilling,
                containerColor = EmeraldPrimary,
                contentColor = Color.White,
                icon = { Icon(Icons.Default.Add, contentDescription = "New Bill") },
                text = { Text("New Bill", fontWeight = FontWeight.Bold) }
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
            if (state.isLoading) {
                LinearProgressIndicator(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp),
                    color = EmeraldPrimary
                )
            }

            if (state.errorMessage != null) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = RoseContainer,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp)
                ) {
                    Text(
                        text = state.errorMessage!!,
                        style = MaterialTheme.typography.bodySmall.copy(color = RoseError),
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }

            val summary = state.summary

            // 1. Primary Highlight Card: Today's Sales
            LendenCard(
                backgroundColor = NavyPrimary,
                borderColor = Color.Transparent
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "TODAY'S SALES",
                            style = MaterialTheme.typography.labelMedium.copy(
                                color = TextTertiary,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 0.5.sp
                            )
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = inrFormat.format(summary?.todaysSales ?: 0.0),
                            style = MaterialTheme.typography.headlineMedium.copy(
                                color = Color.White,
                                fontWeight = FontWeight.ExtraBold
                            )
                        )
                    }
                    Surface(
                        color = Color.White.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.padding(4.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "${summary?.todaysBillsCount ?: 0}",
                                style = MaterialTheme.typography.titleLarge.copy(
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold
                                )
                            )
                            Text(
                                text = "Bills Today",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    color = TextTertiary,
                                    fontSize = 10.sp
                                )
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // 2. Udhaar & Receivables Card
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                LendenCard(
                    modifier = Modifier.weight(1f),
                    backgroundColor = SurfaceCard
                ) {
                    Text(
                        text = "Udhaar (Due)",
                        style = MaterialTheme.typography.labelSmall.copy(
                            color = TextSecondary,
                            fontWeight = FontWeight.SemiBold
                        )
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = inrFormat.format(summary?.totalUdhaarDue ?: 0.0),
                        style = MaterialTheme.typography.titleMedium.copy(
                            color = AmberWarning,
                            fontWeight = FontWeight.Bold
                        )
                    )
                }

                LendenCard(
                    modifier = Modifier.weight(1f),
                    backgroundColor = SurfaceCard
                ) {
                    Text(
                        text = "Overdue Bills",
                        style = MaterialTheme.typography.labelSmall.copy(
                            color = TextSecondary,
                            fontWeight = FontWeight.SemiBold
                        )
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = inrFormat.format(summary?.overdueAmount ?: 0.0),
                        style = MaterialTheme.typography.titleMedium.copy(
                            color = RoseError,
                            fontWeight = FontWeight.Bold
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // 3. Tax & Turnover Overview
            LendenCard {
                Text(
                    text = "Financial Snapshot",
                    style = MaterialTheme.typography.titleSmall.copy(
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    ),
                    modifier = Modifier.padding(bottom = 8.dp)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("Total Turnover", style = MaterialTheme.typography.labelSmall.copy(color = TextSecondary))
                        Text(
                            inrFormat.format(summary?.totalSalesTurnover ?: 0.0),
                            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold)
                        )
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text("Collections", style = MaterialTheme.typography.labelSmall.copy(color = TextSecondary))
                        Text(
                            inrFormat.format(summary?.totalPaidCollections ?: 0.0),
                            style = MaterialTheme.typography.bodyMedium.copy(
                                fontWeight = FontWeight.SemiBold,
                                color = EmeraldPrimary
                            )
                        )
                    }
                }

                HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp), color = BorderSubtle)

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("Net GST Payable", style = MaterialTheme.typography.labelSmall.copy(color = TextSecondary))
                        Text(
                            inrFormat.format(summary?.netGstPayable ?: 0.0),
                            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold)
                        )
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text("Gross Profit", style = MaterialTheme.typography.labelSmall.copy(color = TextSecondary))
                        Text(
                            inrFormat.format(summary?.grossProfit ?: 0.0),
                            style = MaterialTheme.typography.bodyMedium.copy(
                                fontWeight = FontWeight.SemiBold,
                                color = EmeraldPrimary
                            )
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Quick Actions Grid
            Text(
                text = "Quick Actions",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                ),
                modifier = Modifier.padding(bottom = 12.dp)
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                QuickActionCard(
                    title = "New Bill",
                    subtitle = "Fast GST Invoicing",
                    icon = Icons.Default.Receipt,
                    color = EmeraldPrimary,
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateToBilling
                )
                QuickActionCard(
                    title = "Udhaar Khata",
                    subtitle = "Customer Ledgers",
                    icon = Icons.Default.AccountBalanceWallet,
                    color = AmberWarning,
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateToCustomers
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                QuickActionCard(
                    title = "Stock Catalog",
                    subtitle = "Inventory & Alerts",
                    icon = Icons.Default.Inventory2,
                    color = Color(0xFF2563EB),
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateToInventory
                )
                QuickActionCard(
                    title = "All Invoices",
                    subtitle = "History & Payments",
                    icon = Icons.Default.ListAlt,
                    color = NavyPrimary,
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateToInvoices
                )
            }

            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}

@Composable
private fun QuickActionCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceCard),
        border = androidx.compose.foundation.BorderStroke(1.dp, BorderSubtle),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Surface(
                color = color.copy(alpha = 0.12f),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.size(38.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(imageVector = icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
                }
            }
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold, color = TextPrimary)
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.labelSmall.copy(color = TextSecondary, fontSize = 10.sp)
            )
        }
    }
}
