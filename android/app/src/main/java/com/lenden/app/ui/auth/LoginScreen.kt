package com.lenden.app.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lenden.app.ui.components.LendenButton
import com.lenden.app.ui.components.LendenCard
import com.lenden.app.ui.components.LendenTextField
import com.lenden.app.ui.theme.*

@Composable
fun LoginScreen(
    viewModel: AuthViewModel,
    onNavigateToRegister: () -> Unit,
    onLoginSuccess: () -> Unit
) {
    val state by viewModel.loginState.collectAsState()
    val focusManager = LocalFocusManager.current
    var isPasswordVisible by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundPrimary)
            .verticalScroll(rememberScrollState())
    ) {
        // Top Branding Header
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(NavyPrimary)
                .padding(vertical = 40.dp, horizontal = 24.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = EmeraldPrimary,
                    modifier = Modifier.size(60.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = "₹",
                            style = MaterialTheme.typography.headlineLarge.copy(
                                color = Color.White,
                                fontWeight = FontWeight.Black
                            )
                        )
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Lenden",
                    style = MaterialTheme.typography.headlineMedium.copy(
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Har Hisab, Ab Aasaan",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        color = TextTertiary,
                        fontWeight = FontWeight.Medium
                    )
                )
                Text(
                    text = "GST Billing & Business Management",
                    style = MaterialTheme.typography.labelSmall.copy(
                        color = EmeraldContainer,
                        fontSize = 11.sp
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Main Login Card
        Column(modifier = Modifier.padding(horizontal = 20.dp)) {
            LendenCard {
                Text(
                    text = "Welcome Back",
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                )
                Text(
                    text = "Log in to manage your bills, stock and udhaar",
                    style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary),
                    modifier = Modifier.padding(bottom = 20.dp)
                )

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

                LendenTextField(
                    value = state.email,
                    onValueChange = { viewModel.updateLoginEmail(it) },
                    label = "Email Address",
                    placeholder = "owner@laxmistores.com",
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Email,
                        imeAction = ImeAction.Next
                    ),
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Email,
                            contentDescription = "Email",
                            tint = TextTertiary
                        )
                    }
                )

                Spacer(modifier = Modifier.height(14.dp))

                LendenTextField(
                    value = state.password,
                    onValueChange = { viewModel.updateLoginPassword(it) },
                    label = "Password",
                    placeholder = "••••••••",
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Done
                    ),
                    keyboardActions = KeyboardActions(
                        onDone = {
                            focusManager.clearFocus()
                            viewModel.login(onLoginSuccess)
                        }
                    ),
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = "Password",
                            tint = TextTertiary
                        )
                    },
                    trailingIcon = {
                        IconButton(onClick = { isPasswordVisible = !isPasswordVisible }) {
                            Icon(
                                imageVector = if (isPasswordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                contentDescription = "Toggle password visibility",
                                tint = TextTertiary
                            )
                        }
                    }
                )

                Spacer(modifier = Modifier.height(24.dp))

                LendenButton(
                    text = "Log In",
                    onClick = {
                        focusManager.clearFocus()
                        viewModel.login(onLoginSuccess)
                    },
                    loading = state.isLoading,
                    isEmerald = true
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedButton(
                    onClick = { viewModel.prefillDemoCredentials() },
                    modifier = Modifier.fillMaxWidth().height(42.dp),
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = NavyPrimary
                    )
                ) {
                    Text(
                        text = "Fill Demo Credentials (Laxmi Stores)",
                        style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold)
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Navigation to Register
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "New to Lenden? ",
                    style = MaterialTheme.typography.bodyMedium.copy(color = TextSecondary)
                )
                TextButton(onClick = onNavigateToRegister) {
                    Text(
                        text = "Register Business",
                        style = MaterialTheme.typography.titleSmall.copy(
                            color = EmeraldPrimary,
                            fontWeight = FontWeight.Bold
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            var showServerConfigDialog by remember { mutableStateOf(false) }
            var currentServerUrl by remember { mutableStateOf(com.lenden.app.data.remote.RetrofitClient.customBaseUrl) }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center
            ) {
                TextButton(onClick = { showServerConfigDialog = true }) {
                    Text(
                        text = "⚙ Server: $currentServerUrl",
                        style = MaterialTheme.typography.labelSmall.copy(color = TextTertiary, fontSize = 11.sp)
                    )
                }
            }

            if (showServerConfigDialog) {
                var inputUrl by remember { mutableStateOf(currentServerUrl) }
                AlertDialog(
                    onDismissRequest = { showServerConfigDialog = false },
                    title = { Text("Server Backend URL", fontWeight = FontWeight.Bold) },
                    text = {
                        Column {
                            Text("If Wi-Fi changes, update host IP:", style = MaterialTheme.typography.bodySmall)
                            Spacer(modifier = Modifier.height(8.dp))
                            LendenTextField(
                                value = inputUrl,
                                onValueChange = { inputUrl = it },
                                label = "Base URL",
                                placeholder = "http://10.244.217.135:3000/"
                            )
                        }
                    },
                    confirmButton = {
                        Button(
                            onClick = {
                                val formatted = if (!inputUrl.endsWith("/")) "$inputUrl/" else inputUrl
                                com.lenden.app.data.remote.RetrofitClient.customBaseUrl = formatted
                                currentServerUrl = formatted
                                showServerConfigDialog = false
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary)
                        ) {
                            Text("Save")
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { showServerConfigDialog = false }) { Text("Cancel") }
                    }
                )
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
