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
 * Format date for display: 06.02.2026 в 14:30
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
 * Stamp PDF with signature page containing:
 * - Title
 * - Signed date/time
 * - Signer name
 * - Signer phone
 * - QR code linking to verification page
 * - Request ID
 */
export async function stampPdf(options: StampOptions): Promise<StampResult> {
    const { originalPath, displayId, clientName, clientPhone, signedAt } = options;

    // Load original PDF
    const originalBytes = await fs.readFile(originalPath);
    const pdfDoc = await PDFDocument.load(originalBytes);

    // Embed font (Helvetica for Cyrillic support is limited, but works for basic text)
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Add new page for stamp (A4 size)
    const pageWidth = 595;
    const pageHeight = 842;
    const stampPage = pdfDoc.addPage([pageWidth, pageHeight]);

    // Generate QR code
    const verifyUrl = `${config.publicUrl}/verify/${displayId}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 150,
        margin: 1,
    });

    // Convert data URL to bytes
    const qrBase64 = qrDataUrl.split(',')[1];
    const qrBytes = Buffer.from(qrBase64, 'base64');
    const qrImage = await pdfDoc.embedPng(qrBytes);

    // Colors
    const textColor = rgb(0.2, 0.2, 0.2);
    const mutedColor = rgb(0.5, 0.5, 0.5);
    const accentColor = rgb(0.31, 0.27, 0.9); // Primary indigo

    // Draw content
    let y = pageHeight - 80;

    // Title
    stampPage.drawText('DOKUMENT PODPISANY ELEKTRONNO', {
        x: 50,
        y,
        size: 18,
        font,
        color: textColor,
    });
    y -= 40;

    // Divider line
    stampPage.drawLine({
        start: { x: 50, y },
        end: { x: pageWidth - 50, y },
        thickness: 1,
        color: mutedColor,
    });
    y -= 30;

    // Signed date
    stampPage.drawText('Podpisano:', { x: 50, y, size: 12, font, color: mutedColor });
    stampPage.drawText(formatDate(signedAt), { x: 150, y, size: 12, font, color: textColor });
    y -= 25;

    // Signer name
    stampPage.drawText('Kem:', { x: 50, y, size: 12, font, color: mutedColor });
    stampPage.drawText(transliterate(clientName), { x: 150, y, size: 12, font, color: textColor });
    y -= 25;

    // Phone
    stampPage.drawText('Telefon:', { x: 50, y, size: 12, font, color: mutedColor });
    stampPage.drawText(formatPhone(clientPhone), { x: 150, y, size: 12, font, color: textColor });
    y -= 50;

    // QR Code
    stampPage.drawImage(qrImage, {
        x: 50,
        y: y - 150,
        width: 150,
        height: 150,
    });

    // QR label
    stampPage.drawText('Skaniruyte dlya proverki', {
        x: 50,
        y: y - 170,
        size: 10,
        font,
        color: mutedColor,
    });

    // Right side info
    const infoX = 250;
    stampPage.drawText('ID zayavki:', { x: infoX, y: y - 50, size: 12, font, color: mutedColor });
    stampPage.drawText(displayId, { x: infoX + 80, y: y - 50, size: 12, font, color: textColor });

    stampPage.drawText('Platforma:', { x: infoX, y: y - 75, size: 12, font, color: mutedColor });
    stampPage.drawText('961.kz', { x: infoX + 80, y: y - 75, size: 14, font, color: accentColor });

    stampPage.drawText('URL:', { x: infoX, y: y - 100, size: 10, font, color: mutedColor });
    stampPage.drawText(verifyUrl, { x: infoX + 30, y: y - 100, size: 9, font, color: mutedColor });

    // Footer
    stampPage.drawText(
        'Etot dokument podpisan cherez platformu 961.kz s podtverzhdeniyem po SMS-kodu.',
        {
            x: 50,
            y: 50,
            size: 9,
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
