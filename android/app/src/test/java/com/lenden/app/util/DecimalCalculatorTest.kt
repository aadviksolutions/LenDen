package com.lenden.app.util

import org.junit.Assert.assertEquals
import org.junit.Test
import java.math.BigDecimal

class DecimalCalculatorTest {

    @Test
    fun testStandardGstCalculation() {
        // 2 items @ 500 = 1000, 18% GST (9% CGST + 9% SGST)
        val calc = DecimalCalculator.calculateLineItem(
            quantity = 2.0,
            rate = 500.0,
            discount = 0.0,
            taxRatePercent = 18.0,
            gstType = "CGST_SGST",
            isTaxInclusive = false
        )

        assertEquals(BigDecimal("1000.00"), calc.baseTaxable)
        assertEquals(BigDecimal("90.00"), calc.cgstAmount)
        assertEquals(BigDecimal("90.00"), calc.sgstAmount)
        assertEquals(BigDecimal("180.00"), calc.totalTaxAmount)
        assertEquals(BigDecimal("1180.00"), calc.lineTotal)
    }

    @Test
    fun testTaxInclusiveReverseCalculation() {
        // Total price is 1180 inclusive of 18% GST
        // Taxable should be exactly 1000.00, Tax = 180.00
        val calc = DecimalCalculator.calculateLineItem(
            quantity = 1.0,
            rate = 1180.0,
            discount = 0.0,
            taxRatePercent = 18.0,
            gstType = "CGST_SGST",
            isTaxInclusive = true
        )

        assertEquals(BigDecimal("1000.00"), calc.baseTaxable)
        assertEquals(BigDecimal("90.00"), calc.cgstAmount)
        assertEquals(BigDecimal("90.00"), calc.sgstAmount)
        assertEquals(BigDecimal("180.00"), calc.totalTaxAmount)
        assertEquals(BigDecimal("1180.00"), calc.lineTotal)
    }

    @Test
    fun testIgstCalculation() {
        // Inter-state item: 1000 @ 18% IGST
        val calc = DecimalCalculator.calculateLineItem(
            quantity = 1.0,
            rate = 1000.0,
            discount = 0.0,
            taxRatePercent = 18.0,
            gstType = "IGST",
            isTaxInclusive = false
        )

        assertEquals(BigDecimal("1000.00"), calc.baseTaxable)
        assertEquals(BigDecimal("0.00"), calc.cgstAmount)
        assertEquals(BigDecimal("0.00"), calc.sgstAmount)
        assertEquals(BigDecimal("180.00"), calc.igstAmount)
        assertEquals(BigDecimal("1180.00"), calc.lineTotal)
    }

    @Test
    fun testInvoiceTotalsAndRounding() {
        // Line with 10.33 total, Line with 20.33 total = 30.66 -> Rounded to 31.00
        val line1 = DecimalCalculator.calculateLineItem(quantity = 1.0, rate = 10.33, taxRatePercent = 0.0)
        val line2 = DecimalCalculator.calculateLineItem(quantity = 1.0, rate = 20.33, taxRatePercent = 0.0)

        val totals = DecimalCalculator.calculateInvoiceTotals(
            lines = listOf(line1, line2),
            paidAmount = 20.0
        )

        assertEquals(BigDecimal("30.66"), totals.subtotal)
        assertEquals(BigDecimal("31.00"), totals.finalTotal)
        assertEquals(BigDecimal("0.34"), totals.rounding)
        assertEquals(BigDecimal("11.00"), totals.balanceDue)
    }
}
