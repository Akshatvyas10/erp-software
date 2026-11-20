'use strict';

import PDFDocument from 'pdfkit';

/**
 * Generates an official Fee Payment Receipt PDF in A4 or 80mm POS Thermal format.
 * Returns a readable stream that can be piped directly into express response `res`.
 *
 * @param {Object} options
 * @param {Object} options.receipt - FeePayment record with nested associations
 * @param {Object} [options.schoolConfig] - School profile and metadata
 * @param {'A4'|'80mm'} [options.format='A4'] - Page format
 * @returns {PDFKit.PDFDocument}
 */
export const generateReceiptPdfStream = ({ receipt, schoolConfig = {}, format = 'A4' }) => {
    const isThermal = format === '80mm';

    // Page dimensions: 80mm = ~226.77 pt; A4 = [595.28, 841.89]
    const doc = new PDFDocument({
        size: isThermal ? [226.77, 600] : 'A4',
        margin: isThermal ? 14 : 36,
        autoFirstPage: true,
        info: {
            Title: `Fee_Receipt_${receipt.receiptNumber || 'Voucher'}`,
            Author: schoolConfig.schoolName || 'Academia ERP',
            Subject: 'Fee Payment Receipt Voucher',
            Keywords: 'School ERP, Fee Receipt, Tuition, Indian Education',
        },
    });

    const schoolName = schoolConfig.schoolName || 'ACADEMIA MODERN SCHOOL';
    const schoolTagline = schoolConfig.tagline || 'Affiliated with CBSE / State Board of Education';
    const schoolAddress = schoolConfig.address || 'Sector 12, Institutional Area, New Delhi - 110001';
    const schoolPhone = schoolConfig.primaryPhone || schoolConfig.secondaryPhone || '+91-9876543210';
    const schoolEmail = schoolConfig.email || 'accounts@academiaschool.edu.in';

    const invoice = receipt.invoice || {};
    const student = invoice.student || receipt.student || {};
    const account = student.account || {};
    const classroom = invoice.classroom || {};
    const academicYear = invoice.academicYear || {};
    const items = invoice.items || [];
    const collectedBy = receipt.collectedBy || {};

    const studentFullName = account.firstName
        ? `${account.firstName || ''} ${account.lastName || ''}`.trim()
        : student.studentId || 'N/A';

    const paidAmount = Number(receipt.amountPaid || 0);
    const invoiceTotal = Number(invoice.totalAmount || 0);
    const invoiceBalance = Number(invoice.balanceAmount || 0);
    const discountAmount = Number(invoice.discountAmount || 0);
    const fineAmount = Number(invoice.fineAmount || 0);

    if (isThermal) {
        // ─────────────────────────────────────────────────────────────────────
        // 80mm POS Thermal Receipt Layout
        // ─────────────────────────────────────────────────────────────────────
        doc.fontSize(11).font('Helvetica-Bold').text(schoolName, { align: 'center' });
        doc.fontSize(7).font('Helvetica').text(schoolAddress, { align: 'center' });
        doc.fontSize(7).text(`Ph: ${schoolPhone}`, { align: 'center' });
        doc.moveDown(0.4);

        doc.fontSize(8).font('Helvetica-Bold').text('------------------------------------------------', { align: 'center' });
        doc.fontSize(9).font('Helvetica-Bold').text('FEE PAYMENT RECEIPT', { align: 'center' });
        doc.fontSize(8).font('Helvetica').text('------------------------------------------------', { align: 'center' });
        doc.moveDown(0.3);

        doc.fontSize(7.5).font('Helvetica-Bold').text(`Receipt No: ${receipt.receiptNumber}`);
        doc.font('Helvetica').text(`Date: ${receipt.paymentDate || new Date().toISOString().split('T')[0]}`);
        doc.text(`Student: ${studentFullName} (${student.admissionNumber || student.studentId || 'N/A'})`);
        doc.text(`Class: ${classroom.name || 'N/A'} | Roll: ${student.rollNumber || '-'}`);
        doc.text(`Session: ${academicYear.name || 'Current Session'}`);
        doc.text(`Mode: ${receipt.paymentMode || 'CASH'}${receipt.referenceNumber ? ` (Ref: ${receipt.referenceNumber})` : ''}`);
        doc.moveDown(0.3);

        doc.fontSize(7.5).font('Helvetica-Bold').text('Item Description                 Amount (INR)');
        doc.fontSize(7).font('Helvetica').text('------------------------------------------------');

        items.forEach((it) => {
            const headName = (it.headName || it.feeHead?.name || 'Fee Head').substring(0, 20);
            const amtStr = Number(it.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
            const padding = Math.max(1, 40 - headName.length - amtStr.length);
            doc.text(`${headName}${' '.repeat(padding)}${amtStr}`);
        });

        doc.text('------------------------------------------------');
        if (discountAmount > 0) {
            doc.text(`Discount:                     (-) Rs. ${discountAmount.toFixed(2)}`);
        }
        if (fineAmount > 0) {
            doc.text(`Late Fine:                    (+) Rs. ${fineAmount.toFixed(2)}`);
        }
        doc.font('Helvetica-Bold').fontSize(8.5).text(`AMOUNT PAID:                  Rs. ${paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        doc.fontSize(7.5).font('Helvetica').text(`Balance Dues:                 Rs. ${invoiceBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        doc.moveDown(0.4);

        doc.fontSize(7).text(`Cashier: ${collectedBy.firstName || 'Accounts Office'}`);
        doc.text('------------------------------------------------', { align: 'center' });
        doc.fontSize(6.5).font('Helvetica-Oblique').text('This is a computer generated receipt.', { align: 'center' });
        doc.text('Thank you!', { align: 'center' });
    } else {
        // ─────────────────────────────────────────────────────────────────────
        // Standard A4 Voucher Layout
        // ─────────────────────────────────────────────────────────────────────
        // Decorative Header Band
        doc.rect(36, 36, 523, 75).fillAndStroke('#f8fafc', '#cbd5e1');

        doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text(schoolName, 50, 48);
        doc.fillColor('#475569').fontSize(8.5).font('Helvetica').text(schoolTagline, 50, 68);
        doc.fontSize(8).text(`${schoolAddress} | Ph: ${schoolPhone} | Email: ${schoolEmail}`, 50, 82);

        // Voucher Title Box (Right Aligned)
        doc.rect(400, 44, 150, 58).fillAndStroke('#eff6ff', '#bfdbfe');
        doc.fillColor('#1d4ed8').fontSize(9).font('Helvetica-Bold').text('FEE PAYMENT RECEIPT', 408, 52, { width: 134, align: 'center' });
        doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text(receipt.receiptNumber, 408, 66, { width: 134, align: 'center' });
        doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text(`Date: ${receipt.paymentDate || new Date().toISOString().split('T')[0]}`, 408, 80, { width: 134, align: 'center' });

        doc.moveDown(3);

        // Student & Invoice Metadata Grid
        const gridTop = 125;
        doc.rect(36, gridTop, 523, 85).fillAndStroke('#fcfdfd', '#e2e8f0');

        // Column 1: Student Details
        doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text('STUDENT INFORMATION', 50, gridTop + 10);
        doc.fillColor('#334155').fontSize(8).font('Helvetica');
        doc.text(`Student Name: ${studentFullName}`, 50, gridTop + 26);
        doc.text(`Admission / Scholar No: ${student.admissionNumber || student.studentId || 'N/A'}`, 50, gridTop + 40);
        doc.text(`Class & Section: ${classroom.name || 'N/A'} (Sec: ${classroom.section || '-'})`, 50, gridTop + 54);
        doc.text(`Parent / Guardian: ${student.guardianName || 'N/A'} (${student.guardianPhone || student.guardianEmail || '-'})`, 50, gridTop + 68);

        // Column 2: Invoice & Payment Metadata
        doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text('PAYMENT DETAILS', 310, gridTop + 10);
        doc.fillColor('#334155').fontSize(8).font('Helvetica');
        doc.text(`Invoice Reference: ${invoice.invoiceNumber || 'N/A'}`, 310, gridTop + 26);
        doc.text(`Academic Session: ${academicYear.name || 'Current Session'}`, 310, gridTop + 40);
        doc.text(`Payment Mode: ${receipt.paymentMode || 'CASH'}${receipt.referenceNumber ? ` | Ref: ${receipt.referenceNumber}` : ''}`, 310, gridTop + 54);
        doc.text(`Cashier / Operator: ${collectedBy.firstName ? `${collectedBy.firstName} ${collectedBy.lastName || ''}` : 'Accounts Office'}`, 310, gridTop + 68);

        // Line Items Table
        const tableTop = gridTop + 100;
        doc.rect(36, tableTop, 523, 20).fillAndStroke('#0f172a', '#0f172a');
        doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
        doc.text('#', 46, tableTop + 5);
        doc.text('Fee Head & Description', 70, tableTop + 5);
        doc.text('Category', 310, tableTop + 5);
        doc.text('Scheduled Dues', 450, tableTop + 5, { width: 100, align: 'right' });

        let currentY = tableTop + 22;
        doc.fillColor('#1e293b').font('Helvetica').fontSize(8);

        items.forEach((it, idx) => {
            const rowBg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
            doc.rect(36, currentY, 523, 20).fillAndStroke(rowBg, '#e2e8f0');
            doc.fillColor('#334155');
            doc.text(String(idx + 1), 46, currentY + 5);
            doc.text(it.headName || it.feeHead?.name || 'Fee Component', 70, currentY + 5);
            doc.text(it.feeHead?.category || 'TUITION', 310, currentY + 5);
            doc.text(`INR ${Number(it.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 450, currentY + 5, { width: 100, align: 'right' });
            currentY += 20;
        });

        // Summary Breakdown Box
        const summaryTop = currentY + 10;
        const summaryBoxWidth = 240;
        const summaryX = 36 + 523 - summaryBoxWidth;

        doc.rect(summaryX, summaryTop, summaryBoxWidth, 105).fillAndStroke('#f8fafc', '#cbd5e1');

        let sumY = summaryTop + 8;
        const addSummaryRow = (label, valStr, isBold = false, color = '#1e293b') => {
            doc.fillColor(color).font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(isBold ? 9 : 8);
            doc.text(label, summaryX + 12, sumY);
            doc.text(valStr, summaryX + 12, sumY, { width: summaryBoxWidth - 24, align: 'right' });
            sumY += 16;
        };

        addSummaryRow('Total Billed Amount:', `INR ${invoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        if (discountAmount > 0) {
            addSummaryRow('Concession / Discount:', `(-) INR ${discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, false, '#047857');
        }
        if (fineAmount > 0) {
            addSummaryRow('Late Fee Penalty:', `(+) INR ${fineAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, false, '#b91c1c');
        }
        addSummaryRow('AMOUNT RECEIVED:', `INR ${paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, true, '#1d4ed8');
        addSummaryRow('Remaining Balance:', `INR ${invoiceBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, false, invoiceBalance > 0 ? '#b91c1c' : '#059669');

        // Signatures and Legal Disclaimer
        const footerY = 720;
        doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(36, footerY).lineTo(559, footerY).stroke();

        doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Oblique').text(
            'Terms & Conditions: Fees once paid are non-refundable unless verified under official school refund policy. Cheque / UPI payments are subject to bank clearance.',
            36,
            footerY + 8,
            { width: 330 }
        );

        // Signatory box
        doc.strokeColor('#94a3b8').lineWidth(0.8).moveTo(410, footerY + 55).lineTo(545, footerY + 55).stroke();
        doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text('Authorised Signatory / Accounts Desk', 410, footerY + 60, { width: 135, align: 'center' });
    }

    doc.end();
    return doc;
};

export default {
    generateReceiptPdfStream,
};

