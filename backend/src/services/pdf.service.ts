import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { PDFDocument, rgb, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import QRCode from 'qrcode';
import { config } from '../config/index.js';
import { downloadFromS3, uploadBufferToS3, isS3Path } from './storage.service.js';

// Font assets directory (relative to dist/services in production)
const FONTS_DIR = path.join(process.cwd(), 'src', 'assets', 'fonts');

interface StampOptions {
    originalPath: string;
    displayId: string;
    verifyToken: string; // Secure token for verification URL
    clientName: string;
    clientPhone: string;
    signedAt: Date;
    organizationName?: string;
}

interface StampResult {
    path: string;
    hash: string;
}

// Cache for font bytes
let cachedFontRegular: Uint8Array | null = null;
let cachedFontBold: Uint8Array | null = null;

// Company constants
const COMPANY_NAME = 'ТОО "961"';
const COMPANY_BIN = '211040031441';
const COMPANY_PHONE = '+7 707 798 3316';

/**
 * Load font from local file (cached)
 */
async function loadFont(fontName: string): Promise<Uint8Array> {
    if (fontName === 'regular' && cachedFontRegular) return cachedFontRegular;
    if (fontName === 'bold' && cachedFontBold) return cachedFontBold;

    const fontFileName = fontName === 'bold' ? 'Roboto-Bold.ttf' : 'Roboto-Regular.ttf';
    const fontPath = path.join(FONTS_DIR, fontFileName);

    const fontBytes = await fs.readFile(fontPath);
    const fontArray = new Uint8Array(fontBytes);

    if (fontName === 'regular') cachedFontRegular = fontArray;
    if (fontName === 'bold') cachedFontBold = fontArray;

    return fontArray;
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
 * Generate QR code as PNG bytes
 */
async function generateQRCode(data: string, size: number = 80): Promise<Uint8Array> {
    const qrDataUrl = await QRCode.toDataURL(data, {
        width: size,
        margin: 1,
    });
    const qrBase64 = qrDataUrl.split(',')[1];
    return Buffer.from(qrBase64, 'base64');
}

/**
 * Stamp PDF with signature block at bottom of first page
 */
export async function stampPdf(options: StampOptions): Promise<StampResult> {
    const { originalPath, displayId, verifyToken, clientName, clientPhone, signedAt, organizationName } = options;

    // Load original PDF (from S3 or local disk)
    let originalBytes: Buffer;
    if (isS3Path(originalPath)) {
        originalBytes = await downloadFromS3(originalPath);
    } else {
        originalBytes = await fs.readFile(originalPath) as Buffer;
    }
    const pdfDoc = await PDFDocument.load(originalBytes);

    // Register fontkit for custom fonts
    pdfDoc.registerFontkit(fontkit);

    // Load and embed fonts from local files
    const fontRegularBytes = await loadFont('regular');
    const fontBoldBytes = await loadFont('bold');

    const font = await pdfDoc.embedFont(fontRegularBytes);
    const fontBold = await pdfDoc.embedFont(fontBoldBytes);

    // Get first page or create new page if needed
    const pages = pdfDoc.getPages();
    let targetPage: PDFPage;
    let startY: number;

    const signatureBlockHeight = 280;

    if (pages.length > 0) {
        targetPage = pages[0];
        startY = 50 + signatureBlockHeight;
    } else {
        targetPage = pdfDoc.addPage([595, 842]);
        startY = 842 - 50;
    }

    const { width: pageWidth } = targetPage.getSize();

    // Verify URL using secure token (not displayId!)
    const verifyUrl = `${config.publicUrl}/verify/${verifyToken}`;
    const signedDocUrl = `${config.publicUrl}/download/${displayId}`;

    // Generate QR codes
    const mainQrBytes = await generateQRCode(verifyUrl, 100);
    const companyQrBytes = await generateQRCode(COMPANY_BIN, 70);
    const clientQrBytes = await generateQRCode(clientPhone, 70);

    const mainQrImage = await pdfDoc.embedPng(mainQrBytes);
    const companyQrImage = await pdfDoc.embedPng(companyQrBytes);
    const clientQrImage = await pdfDoc.embedPng(clientQrBytes);

    // Colors
    const textColor = rgb(0.2, 0.2, 0.2);
    const mutedColor = rgb(0.5, 0.5, 0.5);
    const accentColor = rgb(0.31, 0.27, 0.9);
    const linkColor = rgb(0.0, 0.4, 0.8);
    const borderColor = rgb(0.85, 0.85, 0.85);

    // ============================================
    // SECTION 1: Main info with QR (top of block)
    // ============================================
    let y = startY;
    const marginX = 50;
    const contentWidth = pageWidth - marginX * 2;

    // Horizontal divider line
    targetPage.drawLine({
        start: { x: marginX, y },
        end: { x: pageWidth - marginX, y },
        thickness: 1,
        color: borderColor,
    });
    y -= 15;

    // Main QR on left
    const mainQrSize = 80;
    targetPage.drawImage(mainQrImage, {
        x: marginX,
        y: y - mainQrSize,
        width: mainQrSize,
        height: mainQrSize,
    });

    // Text next to main QR
    const textX = marginX + mainQrSize + 15;
    let textY = y - 12;

    targetPage.drawText('Этот документ был подписан через систему Contract 961.', {
        x: textX,
        y: textY,
        size: 9,
        font,
        color: textColor,
    });
    textY -= 14;

    targetPage.drawText('Для проверки подлинности электронного документа', {
        x: textX,
        y: textY,
        size: 9,
        font,
        color: textColor,
    });
    textY -= 14;

    targetPage.drawText('сканируйте QR-код или перейдите на сайт 961.kz', {
        x: textX,
        y: textY,
        size: 9,
        font,
        color: mutedColor,
    });
    textY -= 20;

    // Info row: Sender, Receiver, Status
    targetPage.drawText('Отправитель:', { x: textX, y: textY, size: 8, font, color: mutedColor });
    targetPage.drawText(organizationName || COMPANY_NAME, { x: textX + 70, y: textY, size: 8, font, color: textColor });
    textY -= 12;

    targetPage.drawText('Получатель:', { x: textX, y: textY, size: 8, font, color: mutedColor });
    targetPage.drawText(clientName, { x: textX + 70, y: textY, size: 8, font, color: textColor });
    textY -= 12;

    targetPage.drawText('Статус:', { x: textX, y: textY, size: 8, font, color: mutedColor });
    targetPage.drawText('Подписан', { x: textX + 70, y: textY, size: 8, font: fontBold, color: rgb(0.1, 0.6, 0.3) });

    y -= mainQrSize + 45; // Extra spacing before next section

    // ============================================
    // SECTION 2: Two QR codes side by side
    // ============================================

    targetPage.drawLine({
        start: { x: marginX, y },
        end: { x: pageWidth - marginX, y },
        thickness: 0.5,
        color: borderColor,
    });
    y -= 15;

    const qrSize = 60;
    const columnWidth = (contentWidth - 30) / 2;

    // LEFT COLUMN: Company QR
    const leftX = marginX;
    targetPage.drawImage(companyQrImage, {
        x: leftX,
        y: y - qrSize,
        width: qrSize,
        height: qrSize,
    });

    let leftTextX = leftX + qrSize + 10;
    let leftTextY = y - 12;

    targetPage.drawText(COMPANY_NAME, { x: leftTextX, y: leftTextY, size: 10, font: fontBold, color: textColor });
    leftTextY -= 14;
    targetPage.drawText(`БИН: ${COMPANY_BIN}`, { x: leftTextX, y: leftTextY, size: 9, font, color: textColor });
    leftTextY -= 12;
    targetPage.drawText(COMPANY_PHONE, { x: leftTextX, y: leftTextY, size: 9, font, color: textColor });
    leftTextY -= 12;
    targetPage.drawText(`Дата подписи: ${formatDate(signedAt)}`, { x: leftTextX, y: leftTextY, size: 8, font, color: mutedColor });

    // RIGHT COLUMN: Client QR
    const rightX = marginX + columnWidth + 30;
    targetPage.drawImage(clientQrImage, {
        x: rightX,
        y: y - qrSize,
        width: qrSize,
        height: qrSize,
    });

    let rightTextX = rightX + qrSize + 10;
    let rightTextY = y - 12;

    targetPage.drawText(clientName, { x: rightTextX, y: rightTextY, size: 10, font: fontBold, color: textColor });
    rightTextY -= 14;
    targetPage.drawText(formatPhone(clientPhone), { x: rightTextX, y: rightTextY, size: 9, font, color: textColor });
    rightTextY -= 12;
    targetPage.drawText(`Дата подписи: ${formatDate(signedAt)}`, { x: rightTextX, y: rightTextY, size: 8, font, color: mutedColor });

    y -= qrSize + 25;

    // Footer
    targetPage.drawLine({
        start: { x: marginX, y },
        end: { x: pageWidth - marginX, y },
        thickness: 0.5,
        color: borderColor,
    });
    y -= 12;

    targetPage.drawText(`ID: ${displayId}  |  Платформа: 961.kz  |  Подписано электронно с SMS-подтверждением`, {
        x: marginX,
        y,
        size: 7,
        font,
        color: mutedColor,
    });

    // Save PDF
    const stampedBytes = await pdfDoc.save();
    const hash = crypto.createHash('sha256').update(stampedBytes).digest('hex');

    // Create signed directory if needed (local)
    const signedDir = path.join(config.uploadDir, 'signed');
    await fs.mkdir(signedDir, { recursive: true });

    // Save file locally first
    const filename = `${displayId.replace(/[^a-zA-Z0-9-]/g, '_')}_signed.pdf`;
    const signedPath = path.join(signedDir, filename);
    await fs.writeFile(signedPath, stampedBytes);

    // Upload to S3 if enabled
    let finalPath = signedPath;
    if (config.s3.enabled) {
        const s3Key = `signed/${filename}`;
        finalPath = await uploadBufferToS3(stampedBytes, s3Key);
        // Remove local copy — S3 is the source of truth
        await fs.unlink(signedPath).catch(() => { });
    }

    return {
        path: finalPath,
        hash,
    };
}
