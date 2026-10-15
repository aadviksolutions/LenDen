package com.lenden.app.util

import java.math.BigDecimal
import java.math.RoundingMode

object DecimalCalculator {

    data class LineCalculation(
        val baseTaxable: BigDecimal,
        val discountAmount: BigDecimal,
        val cgstRate: BigDecimal,
        val cgstAmount: BigDecimal,
        val sgstRate: BigDecimal,
        val sgstAmount: BigDecimal,
        val igstRate: BigDecimal,
        val igstAmount: BigDecimal,
        val totalTaxAmount: BigDecimal,
        val lineTotal: BigDecimal
    )

    data class InvoiceCalculation(
        val subtotal: BigDecimal,
        val discountTotal: BigDecimal,
        val taxTotal: BigDecimal,
        val cgstTotal: BigDecimal,
        val sgstTotal: BigDecimal,
        val igstTotal: BigDecimal,
        val rounding: BigDecimal,
        val finalTotal: BigDecimal,
        val balanceDue: BigDecimal
    )

    fun calculateLineItem(
        quantity: Double,
        rate: Double,
        discount: Double = 0.0,
        discountType: String = "AMOUNT", // "AMOUNT" or "PERCENT"
        taxRatePercent: Double = 18.0,
        gstType: String = "CGST_SGST",   // "CGST_SGST", "IGST", "EXEMPT"
        isTaxInclusive: Boolean = false
    ): LineCalculation {
        val qty = BigDecimal(quantity.toString())
        val unitPrice = BigDecimal(rate.toString())
        val gross = qty.multiply(unitPrice)

        val disc = if (discountType == "PERCENT") {
            gross.multiply(BigDecimal(discount.toString()))
                .divide(BigDecimal("100"), 2, RoundingMode.HALF_UP)
        } else {
            BigDecimal(discount.toString())
        }

        val taxableAfterDiscount = gross.subtract(disc).max(BigDecimal.ZERO)

        val taxRate = BigDecimal(taxRatePercent.toString())
        val hundred = BigDecimal("100")

        val baseTaxable: BigDecimal
        val totalTax: BigDecimal

        if (isTaxInclusive && taxRatePercent > 0.0 && gstType != "EXEMPT") {
            // baseTaxable = grossValue / (1 + rate/100)
            val divisor = BigDecimal.ONE.add(taxRate.divide(hundred, 4, RoundingMode.HALF_UP))
            baseTaxable = taxableAfterDiscount.divide(divisor, 2, RoundingMode.HALF_UP)
            totalTax = taxableAfterDiscount.subtract(baseTaxable)
        } else if (gstType == "EXEMPT" || taxRatePercent <= 0.0) {
            baseTaxable = taxableAfterDiscount
            totalTax = BigDecimal.ZERO
        } else {
            baseTaxable = taxableAfterDiscount
            totalTax = baseTaxable.multiply(taxRate).divide(hundred, 2, RoundingMode.HALF_UP)
        }

        var cgstRate = BigDecimal.ZERO
        var cgstAmount = BigDecimal.ZERO
        var sgstRate = BigDecimal.ZERO
        var sgstAmount = BigDecimal.ZERO
        var igstRate = BigDecimal.ZERO
        var igstAmount = BigDecimal.ZERO

        if (gstType == "CGST_SGST" && taxRatePercent > 0.0) {
            cgstRate = taxRate.divide(BigDecimal("2"), 2, RoundingMode.HALF_UP)
            sgstRate = cgstRate
            cgstAmount = totalTax.divide(BigDecimal("2"), 2, RoundingMode.HALF_UP)
            sgstAmount = totalTax.subtract(cgstAmount) // ensure no cent drift
        } else if (gstType == "IGST" && taxRatePercent > 0.0) {
            igstRate = taxRate
            igstAmount = totalTax
        }

        val lineTotal = baseTaxable.add(totalTax)

        return LineCalculation(
            baseTaxable = baseTaxable.setScale(2, RoundingMode.HALF_UP),
            discountAmount = disc.setScale(2, RoundingMode.HALF_UP),
            cgstRate = cgstRate,
            cgstAmount = cgstAmount.setScale(2, RoundingMode.HALF_UP),
            sgstRate = sgstRate,
            sgstAmount = sgstAmount.setScale(2, RoundingMode.HALF_UP),
            igstRate = igstRate,
            igstAmount = igstAmount.setScale(2, RoundingMode.HALF_UP),
            totalTaxAmount = totalTax.setScale(2, RoundingMode.HALF_UP),
            lineTotal = lineTotal.setScale(2, RoundingMode.HALF_UP)
        )
    }

    fun calculateInvoiceTotals(
        lines: List<LineCalculation>,
        paidAmount: Double = 0.0
    ): InvoiceCalculation {
        var subtotal = BigDecimal.ZERO
        var discountTotal = BigDecimal.ZERO
        var cgstTotal = BigDecimal.ZERO
        var sgstTotal = BigDecimal.ZERO
        var igstTotal = BigDecimal.ZERO
        var taxTotal = BigDecimal.ZERO
        var rawTotal = BigDecimal.ZERO

        lines.forEach { line ->
            subtotal = subtotal.add(line.baseTaxable)
            discountTotal = discountTotal.add(line.discountAmount)
            cgstTotal = cgstTotal.add(line.cgstAmount)
            sgstTotal = sgstTotal.add(line.sgstAmount)
            igstTotal = igstTotal.add(line.igstAmount)
            taxTotal = taxTotal.add(line.totalTaxAmount)
            rawTotal = rawTotal.add(line.lineTotal)
        }

        val roundedTotal = rawTotal.setScale(0, RoundingMode.HALF_UP)
        val rounding = roundedTotal.subtract(rawTotal)
        val paid = BigDecimal(paidAmount.toString()).setScale(2, RoundingMode.HALF_UP)
        val balanceDue = roundedTotal.subtract(paid).max(BigDecimal.ZERO)

        return InvoiceCalculation(
            subtotal = subtotal.setScale(2, RoundingMode.HALF_UP),
            discountTotal = discountTotal.setScale(2, RoundingMode.HALF_UP),
            taxTotal = taxTotal.setScale(2, RoundingMode.HALF_UP),
            cgstTotal = cgstTotal.setScale(2, RoundingMode.HALF_UP),
            sgstTotal = sgstTotal.setScale(2, RoundingMode.HALF_UP),
            igstTotal = igstTotal.setScale(2, RoundingMode.HALF_UP),
            rounding = rounding.setScale(2, RoundingMode.HALF_UP),
            finalTotal = roundedTotal.setScale(2, RoundingMode.HALF_UP),
            balanceDue = balanceDue.setScale(2, RoundingMode.HALF_UP)
        )
    }
}
