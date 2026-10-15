package com.lenden.app.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class WhatsAppHelperTest {

    @Test
    fun testPhoneSanitization() {
        assertEquals("919876543210", WhatsAppHelper.sanitizeIndianPhoneNumber("9876543210"))
        assertEquals("919876543210", WhatsAppHelper.sanitizeIndianPhoneNumber("+91 98765 43210"))
        assertEquals("919876543210", WhatsAppHelper.sanitizeIndianPhoneNumber("098765-43210"))
        assertEquals("919876543210", WhatsAppHelper.sanitizeIndianPhoneNumber("919876543210"))
    }

    @Test
    fun testBuildInvoiceShareMessage() {
        val msg = WhatsAppHelper.buildInvoiceShareMessage(
            businessName = "Laxmi General Store",
            customerName = "Ramesh Verma",
            invoiceNumber = "INV-2024-25-0012",
            totalAmount = 1500.0,
            balanceDue = 500.0,
            portalUrl = "https://lenden.app/invoices/test123"
        )

        assertTrue(msg.contains("Laxmi General Store"))
        assertTrue(msg.contains("Ramesh Verma"))
        assertTrue(msg.contains("INV-2024-25-0012"))
        assertTrue(msg.contains("1,500"))
        assertTrue(msg.contains("500"))
        assertTrue(msg.contains("https://lenden.app/invoices/test123"))
    }

    @Test
    fun testBuildKhataReminderMessage() {
        val msg = WhatsAppHelper.buildKhataReminderMessage(
            businessName = "Laxmi General Store",
            customerName = "Ramesh Verma",
            balanceDue = 2500.0
        )

        assertTrue(msg.contains("Namaste Ramesh Verma"))
        assertTrue(msg.contains("2,500"))
        assertTrue(msg.contains("Laxmi General Store"))
    }
}
