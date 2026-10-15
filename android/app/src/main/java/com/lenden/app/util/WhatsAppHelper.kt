package com.lenden.app.util

import android.content.Context
import android.content.Intent
import android.net.Uri
import java.net.URLEncoder
import java.text.NumberFormat
import java.util.Locale

object WhatsAppHelper {

    fun sanitizeIndianPhoneNumber(rawPhone: String): String {
        val digitsOnly = rawPhone.replace(Regex("[^0-9]"), "")
        return when {
            digitsOnly.length == 10 -> "91$digitsOnly"
            digitsOnly.length == 11 && digitsOnly.startsWith("0") -> "91${digitsOnly.substring(1)}"
            digitsOnly.length == 12 && digitsOnly.startsWith("91") -> digitsOnly
            else -> digitsOnly
        }
    }

    fun sanitizeIndianPhone(rawPhone: String): String? {
        val s = sanitizeIndianPhoneNumber(rawPhone)
        return if (s.length == 12 && s.startsWith("91")) s else null
    }

    fun buildInvoiceShareMessage(
        businessName: String,
        customerName: String,
        invoiceNumber: String,
        totalAmount: Double,
        balanceDue: Double,
        portalUrl: String? = null
    ): String {
        val inrFormat = NumberFormat.getCurrencyInstance(Locale("en", "IN"))
        return buildString {
            append("Namaste *$customerName* ji,\n\n")
            append("Here is your invoice *$invoiceNumber* from *$businessName*.\n")
            append("• *Total Amount:* ${inrFormat.format(totalAmount)}\n")
            if (balanceDue > 0) {
                append("• *Balance Due:* ${inrFormat.format(balanceDue)}\n\n")
                append("Please clear the outstanding balance at your earliest convenience.\n")
            } else {
                append("• *Status:* Fully Paid (Thank you!)\n\n")
            }
            if (!portalUrl.isNullOrBlank()) {
                append("View or download your digital bill here:\n$portalUrl\n\n")
            }
            append("Thank you for your business!\n— _$businessName via Lenden_")
        }
    }

    fun buildKhataReminderMessage(
        businessName: String,
        customerName: String,
        balanceDue: Double
    ): String {
        val inrFormat = NumberFormat.getCurrencyInstance(Locale("en", "IN"))
        return buildString {
            append("Namaste $customerName ji,\n\n")
            append("This is a gentle payment reminder from *$businessName*.\n")
            append("Your pending Udhaar balance is: *${inrFormat.format(balanceDue)}*.\n\n")
            append("Kindly arrange payment via UPI / Cash at your earliest.\n\n")
            append("Thank you!\n— _$businessName (via Lenden)_")
        }
    }

    fun openWhatsAppChat(
        context: Context,
        rawPhone: String,
        message: String
    ) {
        val sanitized = sanitizeIndianPhoneNumber(rawPhone)
        val encoded = try {
            URLEncoder.encode(message, "UTF-8")
        } catch (_: Exception) {
            message
        }

        val intent = if (sanitized.isNotBlank() && sanitized.length >= 10) {
            Intent(Intent.ACTION_VIEW).apply {
                data = Uri.parse("https://wa.me/$sanitized?text=$encoded")
            }
        } else {
            Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, message)
                setPackage("com.whatsapp")
            }
        }

        try {
            context.startActivity(intent)
        } catch (_: Exception) {
            val chooser = Intent.createChooser(Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, message)
            }, "Share via")
            context.startActivity(chooser)
        }
    }

    fun shareInvoiceOnWhatsApp(
        context: Context,
        customerName: String,
        customerPhone: String,
        businessName: String,
        invoiceNumber: String,
        invoiceTotal: Double,
        balanceDue: Double,
        shareUrl: String? = null
    ) {
        val msg = buildInvoiceShareMessage(businessName, customerName, invoiceNumber, invoiceTotal, balanceDue, shareUrl)
        openWhatsAppChat(context, customerPhone, msg)
    }
}
