package com.lenden.app.ui.print

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.os.Bundle
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.print.PageRange
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintDocumentInfo
import android.print.PrintManager
import com.lenden.app.data.remote.dto.InvoiceDto
import java.io.FileOutputStream
import java.io.IOException
import java.text.NumberFormat
import java.util.Locale

class LendenPrintAdapter(
    private val invoice: InvoiceDto,
    private val businessName: String = "Lenden Store"
) : PrintDocumentAdapter() {

    private var pdfDocument: PdfDocument? = null
    private val pageHeight = 842 // A4 standard point height
    private val pageWidth = 595  // A4 standard point width

    override fun onLayout(
        oldAttributes: PrintAttributes?,
        newAttributes: PrintAttributes?,
        cancellationSignal: CancellationSignal?,
        callback: LayoutResultCallback?,
        extras: Bundle?
    ) {
        if (cancellationSignal?.isCanceled == true) {
            callback?.onLayoutCancelled()
            return
        }

        val info = PrintDocumentInfo.Builder("Lenden_${invoice.invoiceNumber}.pdf")
            .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
            .setPageCount(1)
            .build()

        callback?.onLayoutFinished(info, true)
    }

    override fun onWrite(
        pages: Array<out PageRange>?,
        destination: ParcelFileDescriptor?,
        cancellationSignal: CancellationSignal?,
        callback: WriteResultCallback?
    ) {
        pdfDocument = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, 1).create()
        val page = pdfDocument!!.startPage(pageInfo)

        if (cancellationSignal?.isCanceled == true) {
            callback?.onWriteCancelled()
            pdfDocument?.close()
            return
        }

        drawInvoice(page.canvas)
        pdfDocument!!.finishPage(page)

        try {
            destination?.let {
                FileOutputStream(it.fileDescriptor).use { output ->
                    pdfDocument!!.writeTo(output)
                }
            }
            callback?.onWriteFinished(arrayOf(PageRange.ALL_PAGES))
        } catch (e: IOException) {
            callback?.onWriteFailed(e.message)
        } finally {
            pdfDocument?.close()
            pdfDocument = null
        }
    }

    private fun drawInvoice(canvas: Canvas) {
        val titlePaint = Paint().apply {
            color = Color.rgb(15, 23, 42) // Navy
            textSize = 20f
            isFakeBoldText = true
        }
        val subPaint = Paint().apply {
            color = Color.rgb(71, 85, 105)
            textSize = 10f
        }
        val boldPaint = Paint().apply {
            color = Color.rgb(15, 23, 42)
            textSize = 12f
            isFakeBoldText = true
        }
        val regularPaint = Paint().apply {
            color = Color.rgb(30, 41, 59)
            textSize = 11f
        }
        val linePaint = Paint().apply {
            color = Color.rgb(226, 232, 240)
            strokeWidth = 1f
        }

        val inrFormat = NumberFormat.getCurrencyInstance(Locale("en", "IN"))

        var y = 50f
        val left = 40f
        val right = 555f

        // Header
        canvas.drawText(businessName, left, y, titlePaint)
        y += 18f
        canvas.drawText("TAX INVOICE / BILL OF SUPPLY", left, y, subPaint)

        // Invoice Number and Date (Right side)
        boldPaint.textAlign = Paint.Align.RIGHT
        regularPaint.textAlign = Paint.Align.RIGHT
        canvas.drawText(invoice.invoiceNumber, right, 50f, boldPaint)
        canvas.drawText("Date: ${invoice.invoiceDate.take(10)}", right, 68f, regularPaint)
        boldPaint.textAlign = Paint.Align.LEFT
        regularPaint.textAlign = Paint.Align.LEFT

        y += 24f
        canvas.drawLine(left, y, right, y, linePaint)
        y += 20f

        // Customer details
        canvas.drawText("Billed To:", left, y, boldPaint)
        y += 16f
        canvas.drawText(invoice.customerName.ifBlank { "Walk-in Customer" }, left, y, regularPaint)
        if (invoice.customerMobile.isNotBlank()) {
            y += 14f
            canvas.drawText("Mobile: ${invoice.customerMobile}", left, y, regularPaint)
        }

        y += 24f
        canvas.drawLine(left, y, right, y, linePaint)
        y += 16f

        // Table Header
        canvas.drawText("Item / Description", left, y, boldPaint)
        boldPaint.textAlign = Paint.Align.RIGHT
        canvas.drawText("Qty", 380f, y, boldPaint)
        canvas.drawText("Rate", 460f, y, boldPaint)
        canvas.drawText("Total", right, y, boldPaint)
        boldPaint.textAlign = Paint.Align.LEFT

        y += 8f
        canvas.drawLine(left, y, right, y, linePaint)
        y += 18f

        // Items list
        if (invoice.items.isEmpty()) {
            canvas.drawText("General Goods / Services", left, y, regularPaint)
            regularPaint.textAlign = Paint.Align.RIGHT
            canvas.drawText("1", 380f, y, regularPaint)
            canvas.drawText(inrFormat.format(invoice.total), 460f, y, regularPaint)
            canvas.drawText(inrFormat.format(invoice.total), right, y, regularPaint)
            regularPaint.textAlign = Paint.Align.LEFT
            y += 18f
        } else {
            invoice.items.forEach { item ->
                canvas.drawText(item.description, left, y, regularPaint)
                regularPaint.textAlign = Paint.Align.RIGHT
                canvas.drawText("${item.quantity} ${item.unit}", 380f, y, regularPaint)
                canvas.drawText(inrFormat.format(item.rate), 460f, y, regularPaint)
                canvas.drawText(inrFormat.format(item.lineTotal), right, y, regularPaint)
                regularPaint.textAlign = Paint.Align.LEFT
                y += 18f
            }
        }

        y += 10f
        canvas.drawLine(left, y, right, y, linePaint)
        y += 24f

        // Totals section (right aligned)
        val amountX = right
        val labelX = 400f
        regularPaint.textAlign = Paint.Align.RIGHT

        canvas.drawText("Grand Total:", labelX, y, boldPaint)
        boldPaint.textAlign = Paint.Align.RIGHT
        canvas.drawText(inrFormat.format(invoice.total), amountX, y, boldPaint)
        boldPaint.textAlign = Paint.Align.LEFT
        y += 18f

        canvas.drawText("Amount Paid:", labelX, y, regularPaint)
        canvas.drawText(inrFormat.format(invoice.paidAmount), amountX, y, regularPaint)
        y += 18f

        boldPaint.textAlign = Paint.Align.RIGHT
        canvas.drawText("Balance Due:", labelX, y, boldPaint)
        canvas.drawText(inrFormat.format(invoice.balanceDue), amountX, y, boldPaint)
        boldPaint.textAlign = Paint.Align.LEFT
        regularPaint.textAlign = Paint.Align.LEFT

        y += 40f
        canvas.drawLine(left, y, right, y, linePaint)
        y += 20f

        subPaint.textAlign = Paint.Align.CENTER
        canvas.drawText("Thank you for your business! Powered by Lenden", pageWidth / 2f, y, subPaint)
        subPaint.textAlign = Paint.Align.LEFT
    }

    companion object {
        fun print(context: Context, invoice: InvoiceDto, businessName: String = "Lenden Store") {
            val printManager = context.getSystemService(Context.PRINT_SERVICE) as? PrintManager
            val jobName = "Lenden_${invoice.invoiceNumber}"
            printManager?.print(jobName, LendenPrintAdapter(invoice, businessName), null)
        }
    }
}
