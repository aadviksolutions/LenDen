package com.lenden.app.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lenden.app.ui.components.LendenButton
import com.lenden.app.ui.components.LendenCard
import com.lenden.app.ui.components.LendenTextField
import com.lenden.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(
    viewModel: AuthViewModel,
    onNavigateBack: () -> Unit,
    onRegisterSuccess: () -> Unit
) {
    val state by viewModel.registerState.collectAsState()
    val focusManager = LocalFocusManager.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Register New Business",
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
                        .padding(bottom = 16.dp)
                ) {
                    Text(
                        text = state.errorMessage!!,
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = RoseError,
                            fontWeight = FontWeight.Medium
                        ),
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }

            // Section 1: Business Details
            LendenCard {
                Text(
                    text = "1. Business Details",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = NavyPrimary
                    ),
                    modifier = Modifier.padding(bottom = 12.dp)
                )

                LendenTextField(
                    value = state.businessName,
                    onValueChange = { viewModel.updateRegisterField(businessName = it) },
                    label = "Business / Shop Name *",
                    placeholder = "e.g. Laxmi Kirana & General Store",
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next)
                )

                Spacer(modifier = Modifier.height(12.dp))

                LendenTextField(
                    value = state.gstin,
                    onValueChange = { viewModel.updateRegisterField(gstin = it) },
                    label = "GSTIN (Optional)",
                    placeholder = "22AAAAA0000A1Z5",
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next)
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    LendenTextField(
                        value = state.city,
                        onValueChange = { viewModel.updateRegisterField(city = it) },
                        label = "City",
                        placeholder = "Raipur",
                        modifier = Modifier.weight(1f),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next)
                    )
                    LendenTextField(
                        value = state.state,
                        onValueChange = { viewModel.updateRegisterField(state = it) },
                        label = "State",
                        placeholder = "Chhattisgarh",
                        modifier = Modifier.weight(1f),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Section 2: Owner Account
            LendenCard {
                Text(
                    text = "2. Owner Account",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = NavyPrimary
                    ),
                    modifier = Modifier.padding(bottom = 12.dp)
                )

                LendenTextField(
                    value = state.name,
                    onValueChange = { viewModel.updateRegisterField(name = it) },
                    label = "Your Full Name *",
                    placeholder = "e.g. Rajesh Kumar",
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next)
                )

                Spacer(modifier = Modifier.height(12.dp))

                LendenTextField(
                    value = state.email,
                    onValueChange = { viewModel.updateRegisterField(email = it) },
                    label = "Email Address *",
                    placeholder = "rajesh@example.com",
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Email,
                        imeAction = ImeAction.Next
                    )
                )

                Spacer(modifier = Modifier.height(12.dp))

                LendenTextField(
                    value = state.phone,
                    onValueChange = { viewModel.updateRegisterField(phone = it) },
                    label = "Phone / WhatsApp (Optional)",
                    placeholder = "9876543210",
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Phone,
                        imeAction = ImeAction.Next
                    )
                )

                Spacer(modifier = Modifier.height(12.dp))

                LendenTextField(
                    value = state.password,
                    onValueChange = { viewModel.updateRegisterField(password = it) },
                    label = "Create Password * (min. 6 characters)",
                    placeholder = "••••••••",
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Done
                    )
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            LendenButton(
                text = "Register & Open Store",
                onClick = {
                    focusManager.clearFocus()
                    viewModel.register(onRegisterSuccess)
                },
                loading = state.isLoading,
                isEmerald = true
            )

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
