import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { config } from '../config/index.js';

interface StampOptions {
    originalPath: string;
    displayId: string;
    clientName: string;
    clientPhone: string;
    signedAt: Date;
}

interface StampResult {
    path: string;
    hash: string;
}

/**
 * Format phone for display: +77070001234 -> +7 707 000 1234
 */
function formatPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) {
        return `+${digits[0]} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }
    return phone;
}

/**
 * Format date for display: 06.02.2026 14:30
 */
function formatDate(date: Date): string {
    const d = date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
    const t = date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    });
    return `${d} ${t}`;
}

/**
 * Transliterate Cyrillic to Latin (for PDF standard fonts)
 */
function transliterate(text: string): string {
    const map: Record<string, string> = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
        'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
        'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
        'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
        'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
        // Kazakh special characters
        'ә': 'a', 'ғ': 'g', 'қ': 'q', 'ң': 'n', 'ө': 'o', 'ұ': 'u', 'ү': 'u', 'һ': 'h', 'і': 'i',
        'Ә': 'A', 'Ғ': 'G', 'Қ': 'Q', 'Ң': 'N', 'Ө': 'O', 'Ұ': 'U', 'Ү': 'U', 'Һ': 'H', 'І': 'I',
    };
    return text.split('').map(char => map[char] || char).join('');
}

/**
 * Stamp PDF with compact signature block at bottom of new page
 */
export async function stampPdf(options: StampOptions): Promise<StampResult> {
    const { originalPath, displayId, clientName, clientPhone, signedAt } = options;

    // Load original PDF
    const originalBytes = await fs.readFile(originalPath);
    const pdfDoc = await PDFDocument.load(originalBytes);

    // Embed font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Add new page for stamp (A4 size)
    const pageWidth = 595;
    const pageHeight = 842;
    const stampPage = pdfDoc.addPage([pageWidth, pageHeight]);

    // Generate smaller QR code
    const verifyUrl = `${config.publicUrl}/verify/${displayId}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 80,
        margin: 1,
    });

    // Convert data URL to bytes
    const qrBase64 = qrDataUrl.split(',')[1];
    const qrBytes = Buffer.from(qrBase64, 'base64');
    const qrImage = await pdfDoc.embedPng(qrBytes);

    // Colors
    const textColor = rgb(0.2, 0.2, 0.2);
    const mutedColor = rgb(0.5, 0.5, 0.5);
    const accentColor = rgb(0.31, 0.27, 0.9);
    const borderColor = rgb(0.85, 0.85, 0.85);

    // Signature block position - centered with margin from top
    const blockWidth = 400;
    const blockHeight = 180;
    const blockX = (pageWidth - blockWidth) / 2;
    const blockY = pageHeight - 150; // Top margin

    // Draw border rectangle
    stampPage.drawRectangle({
        x: blockX,
        y: blockY - blockHeight,
        width: blockWidth,
        height: blockHeight,
        borderColor: borderColor,
        borderWidth: 1,
    });

    // Title
    stampPage.drawText('DOKUMENT PODPISAN ELEKTRONNO', {
        x: blockX + 15,
        y: blockY - 25,
        size: 11,
        font: fontBold,
        color: textColor,
    });

    // Divider
    stampPage.drawLine({
        start: { x: blockX + 15, y: blockY - 35 },
        end: { x: blockX + blockWidth - 15, y: blockY - 35 },
        thickness: 0.5,
        color: borderColor,
    });

    // Info rows - compact
    let infoY = blockY - 55;
    const labelX = blockX + 15;
    const valueX = blockX + 85;
    const lineHeight = 18;

    // Date
    stampPage.drawText('Data:', { x: labelX, y: infoY, size: 9, font, color: mutedColor });
    stampPage.drawText(formatDate(signedAt), { x: valueX, y: infoY, size: 9, font, color: textColor });
    infoY -= lineHeight;

    // Signer
    stampPage.drawText('Podpisano:', { x: labelX, y: infoY, size: 9, font, color: mutedColor });
    stampPage.drawText(transliterate(clientName), { x: valueX, y: infoY, size: 9, font, color: textColor });
    infoY -= lineHeight;

    // Phone
    stampPage.drawText('Telefon:', { x: labelX, y: infoY, size: 9, font, color: mutedColor });
    stampPage.drawText(formatPhone(clientPhone), { x: valueX, y: infoY, size: 9, font, color: textColor });
    infoY -= lineHeight;

    // Request ID
    stampPage.drawText('ID:', { x: labelX, y: infoY, size: 9, font, color: mutedColor });
    stampPage.drawText(displayId, { x: valueX, y: infoY, size: 9, font, color: textColor });

    // QR code on the right side - smaller
    const qrSize = 70;
    const qrX = blockX + blockWidth - qrSize - 20;
    const qrY = blockY - 45 - qrSize;
    stampPage.drawImage(qrImage, {
        x: qrX,
        y: qrY,
        width: qrSize,
        height: qrSize,
    });

    // QR label
    stampPage.drawText('Proverka', {
        x: qrX + 12,
        y: qrY - 12,
        size: 7,
        font,
        color: mutedColor,
    });

    // Platform branding
    stampPage.drawText('961.kz', {
        x: blockX + blockWidth - 50,
        y: blockY - blockHeight + 10,
        size: 10,
        font: fontBold,
        color: accentColor,
    });

    // Footer at bottom of page
    stampPage.drawText(
        'Dokument podpisan cherez platformu 961.kz s podtverzhdeniem po SMS-kodu.',
        {
            x: 50,
            y: 40,
            size: 8,
            font,
            color: mutedColor,
        }
    );

    // Save PDF
    const stampedBytes = await pdfDoc.save();
    const hash = crypto.createHash('sha256').update(stampedBytes).digest('hex');

    // Create signed directory if needed
    const signedDir = path.join(config.uploadDir, 'signed');
    await fs.mkdir(signedDir, { recursive: true });

    // Save file
    const filename = `${displayId.replace(/[^a-zA-Z0-9-]/g, '_')}_signed.pdf`;
    const signedPath = path.join(signedDir, filename);
    await fs.writeFile(signedPath, stampedBytes);

    return {
        path: signedPath,
        hash,
    };
}
