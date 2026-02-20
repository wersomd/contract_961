import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import zlib from 'zlib';
import { PDFDocument, rgb, PDFPage, PDFName, PDFRawStream, PDFArray } from 'pdf-lib';
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
 * Decompress PDF stream bytes based on the Filter entry in its dictionary.
 * Handles FlateDecode (most common). Returns raw bytes if uncompressed.
 */
function decompressStreamBytes(stream: PDFRawStream): Uint8Array | null {
    try {
        const rawBytes = stream.contents;
        const dict = stream.dict;
        const filterEntry = dict.get(PDFName.of('Filter'));
        const filterStr = filterEntry ? filterEntry.toString() : '';

        if (filterStr.includes('FlateDecode')) {
            return new Uint8Array(zlib.inflateSync(Buffer.from(rawBytes)));
        }

        // Uncompressed or unknown filter — return raw
        return rawBytes;
    } catch {
        return null;
    }
}

/**
 * Analyze the content stream of a PDF page to find the lowest Y coordinate
 * used by any drawing operation. Returns the lowest Y value found.
 * If parsing fails, returns 0 (meaning "no space available" → add new page).
 */
function getLowestContentY(page: PDFPage, pageHeight: number): number {
    try {
        const node = page.node;
        const contentsRef = node.get(PDFName.of('Contents'));

        if (!contentsRef) return pageHeight; // Empty page — all space available

        const context = node.context;
        let allText = '';

        const collectStreamText = (ref: any): void => {
            const obj = context.lookup(ref);
            if (!obj) return;

            if (obj instanceof PDFArray) {
                for (let i = 0; i < obj.size(); i++) {
                    collectStreamText(obj.get(i));
                }
                return;
            }

            if (obj instanceof PDFRawStream) {
                const decoded = decompressStreamBytes(obj);
                if (decoded && decoded.length > 0) {
                    allText += new TextDecoder('latin1').decode(decoded) + '\n';
                }
            }
        };

        collectStreamText(contentsRef);

        if (allText.length === 0) {
            // Could not decode any content stream — assume page is full
            return 0;
        }

        // Find Y coordinates from PDF text and graphics operators
        let lowestY = pageHeight;

        let match;

        // Pattern: "x y Td" or "x y TD" — text position operators
        const tdPattern = /([\d.\-]+)\s+([\d.\-]+)\s+T[dD]/g;
        while ((match = tdPattern.exec(allText)) !== null) {
            const y = parseFloat(match[2]);
            if (!isNaN(y) && y >= 0 && y < lowestY) {
                lowestY = y;
            }
        }

        // Pattern: "a b c d e f Tm" — text matrix (f is Y position)
        const tmPattern = /([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+Tm/g;
        while ((match = tmPattern.exec(allText)) !== null) {
            const y = parseFloat(match[6]);
            if (!isNaN(y) && y >= 0 && y < lowestY) {
                lowestY = y;
            }
        }

        // Pattern: "a b c d e f cm" — concat matrix (f is Y translation)
        const cmPattern = /([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+cm/g;
        while ((match = cmPattern.exec(allText)) !== null) {
            const y = parseFloat(match[6]);
            if (!isNaN(y) && y >= 0 && y < lowestY) {
                lowestY = y;
            }
        }

        // Pattern: "x y w h re" — rectangle operator
        const rePattern = /([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+re/g;
        while ((match = rePattern.exec(allText)) !== null) {
            const y = parseFloat(match[2]);
            const h = parseFloat(match[4]);
            if (!isNaN(y) && !isNaN(h)) {
                const bottomY = Math.min(y, y + h);
                if (bottomY >= 0 && bottomY < lowestY) {
                    lowestY = bottomY;
                }
            }
        }

        // Pattern: "x y m" or "x y l" — moveto / lineto
        const mlPattern = /([\d.\-]+)\s+([\d.\-]+)\s+[ml]/g;
        while ((match = mlPattern.exec(allText)) !== null) {
            const y = parseFloat(match[2]);
            if (!isNaN(y) && y >= 0 && y < lowestY) {
                lowestY = y;
            }
        }

        // If no Y coordinates found, assume page is full
        if (lowestY >= pageHeight) return 0;

        return lowestY;
    } catch (err) {
        console.warn('Could not analyze page content stream:', err);
        return 0; // Fallback: assume no space → add new page
    }
}

/**
 * Stamp PDF with signature block — placed after content if space allows,
 * otherwise on a new page.
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

    // Signature block requires ~250pt of vertical space
    const signatureBlockHeight = 250;
    const bottomMargin = 40;

    // Determine where to place the signature block
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { height: lastPageHeight } = lastPage.getSize();

    // Analyze content stream to find lowest Y coordinate on the last page
    const lowestContentY = getLowestContentY(lastPage, lastPageHeight);
    const availableSpace = lowestContentY - bottomMargin;

    let targetPage: PDFPage;
    let startY: number;

    if (availableSpace >= signatureBlockHeight) {
        // Enough space on the last page — place signature block here
        targetPage = lastPage;
        startY = lowestContentY - 15; // 15pt gap below content
    } else {
        // Not enough space — add a new page
        targetPage = pdfDoc.addPage([595, 842]); // A4 size
        startY = 842 - 50; // Start from top with margin
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
