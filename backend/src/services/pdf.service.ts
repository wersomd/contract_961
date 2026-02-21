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
 * Tokenize a PDF content stream into numbers and operator names,
 * properly skipping over string literals (...), hex strings <...>,
 * name objects /Name, and comments %.
 */
function tokenizePdfStream(raw: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    const len = raw.length;

    while (i < len) {
        const ch = raw[i];

        // Skip whitespace
        if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t' || ch === '\0' || ch === '\f') {
            i++;
            continue;
        }

        // Skip PDF comments: % ... newline
        if (ch === '%') {
            while (i < len && raw[i] !== '\n' && raw[i] !== '\r') i++;
            continue;
        }

        // Skip string literals: (...) with nested parens and escapes
        if (ch === '(') {
            let depth = 1;
            i++;
            while (i < len && depth > 0) {
                if (raw[i] === '\\') {
                    i += 2; // skip escaped char
                    continue;
                }
                if (raw[i] === '(') depth++;
                if (raw[i] === ')') depth--;
                i++;
            }
            continue;
        }

        // Skip hex strings: <...>  (but not dict markers <<...>>)
        if (ch === '<' && i + 1 < len && raw[i + 1] !== '<') {
            i++;
            while (i < len && raw[i] !== '>') i++;
            if (i < len) i++;
            continue;
        }

        // Skip dict markers << and >>
        if (ch === '<' && i + 1 < len && raw[i + 1] === '<') { i += 2; continue; }
        if (ch === '>' && i + 1 < len && raw[i + 1] === '>') { i += 2; continue; }
        if (ch === '>') { i++; continue; }

        // Skip array markers [ ]
        if (ch === '[' || ch === ']') { i++; continue; }

        // Skip PDF name objects: /Name
        if (ch === '/') {
            i++;
            while (i < len && !(' \n\r\t\0\f/<>[]()%'.includes(raw[i]))) i++;
            continue;
        }

        // Number: optional sign, digits, optional decimal
        if (ch === '-' || ch === '+' || ch === '.' || (ch >= '0' && ch <= '9')) {
            const start = i;
            if (ch === '-' || ch === '+') i++;
            while (i < len && ((raw[i] >= '0' && raw[i] <= '9') || raw[i] === '.')) i++;
            tokens.push(raw.substring(start, i));
            continue;
        }

        // Operator: alphabetic chars or * or '
        if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '*' || ch === "'") {
            const start = i;
            i++;
            while (i < len && ((raw[i] >= 'a' && raw[i] <= 'z') || (raw[i] >= 'A' && raw[i] <= 'Z') || raw[i] === '*')) i++;
            tokens.push(raw.substring(start, i));
            continue;
        }

        // Skip unknown bytes
        i++;
    }

    return tokens;
}

/**
 * Analyze the content stream of a PDF page to find the lowest Y coordinate
 * used by any visible drawing operation. Returns the lowest Y value found.
 * If parsing fails, returns 0 (meaning "no space available" → add new page).
 *
 * Key design decisions:
 * 1. `Td`/`TD` use RELATIVE offsets — we track text line matrix state.
 * 2. Path operators (`re`, `m`, `l`, `c`) buffer Y values; only commit
 *    when a PAINT operator (`f`, `S`, `B`, etc.) is seen.
 *    Clipping-only paths (`W n`) are discarded — prevents full-page
 *    clipping rectangles from falsely indicating content at Y=0.
 * 3. Tokenizer skips `(...)` strings and `<...>` hex strings so
 *    embedded text doesn't create false operators.
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
            return 0;
        }

        let lowestY = pageHeight;

        const trackY = (y: number): void => {
            if (!isNaN(y) && y >= 0 && y < lowestY) {
                lowestY = y;
            }
        };

        // ── Text state machine ──
        let inTextBlock = false;
        let tlmY = 0;

        // ── Path state ──
        // Buffer Y values from path construction operators.
        // Only commit to lowestY when a PAINT operator is seen.
        // Discard on clip-only paths (W/W* followed by n).
        let pendingPathYs: number[] = [];
        let clipPending = false;

        const commitPathYs = (): void => {
            for (const py of pendingPathYs) trackY(py);
            pendingPathYs = [];
            clipPending = false;
        };

        const discardPathYs = (): void => {
            pendingPathYs = [];
            clipPending = false;
        };

        // Tokenize with proper string/hex skipping
        const tokens = tokenizePdfStream(allText);
        const numStack: number[] = [];

        for (let i = 0; i < tokens.length; i++) {
            const tok = tokens[i];
            const num = parseFloat(tok);

            if (!isNaN(num) && /^[+\-.\d]/.test(tok)) {
                numStack.push(num);
                continue;
            }

            switch (tok) {
                // ── Text block ──
                case 'BT':
                    inTextBlock = true;
                    tlmY = 0;
                    numStack.length = 0;
                    break;

                case 'ET':
                    inTextBlock = false;
                    numStack.length = 0;
                    break;

                // ── Tm: set text matrix (absolute) — 6 args ──
                case 'Tm':
                    if (numStack.length >= 6) {
                        tlmY = numStack[numStack.length - 1];
                        trackY(tlmY);
                    }
                    numStack.length = 0;
                    break;

                // ── Td: relative text position — 2 args ──
                case 'Td':
                    if (numStack.length >= 2) {
                        tlmY += numStack[numStack.length - 1];
                        trackY(tlmY);
                    }
                    numStack.length = 0;
                    break;

                // ── TD: same as Td + set leading ──
                case 'TD':
                    if (numStack.length >= 2) {
                        tlmY += numStack[numStack.length - 1];
                        trackY(tlmY);
                    }
                    numStack.length = 0;
                    break;

                case 'T*':
                    numStack.length = 0;
                    break;

                // ── Text showing operators ──
                case 'Tj':
                case 'TJ':
                case "'":
                    if (inTextBlock) trackY(tlmY);
                    numStack.length = 0;
                    break;

                // ── cm: concat matrix — 6 args ──
                case 'cm':
                    if (numStack.length >= 6) {
                        trackY(numStack[numStack.length - 1]);
                    }
                    numStack.length = 0;
                    break;

                // ── PATH CONSTRUCTION (buffer Y, don't commit yet) ──
                case 're':
                    if (numStack.length >= 4) {
                        const h = numStack[numStack.length - 1];
                        const y = numStack[numStack.length - 3];
                        pendingPathYs.push(Math.min(y, y + h));
                    }
                    numStack.length = 0;
                    break;

                case 'm':
                    if (numStack.length >= 2) {
                        pendingPathYs.push(numStack[numStack.length - 1]);
                    }
                    numStack.length = 0;
                    break;

                case 'l':
                    if (numStack.length >= 2) {
                        pendingPathYs.push(numStack[numStack.length - 1]);
                    }
                    numStack.length = 0;
                    break;

                case 'c':
                    if (numStack.length >= 6) {
                        pendingPathYs.push(numStack[numStack.length - 1]);
                        pendingPathYs.push(numStack[numStack.length - 3]);
                        pendingPathYs.push(numStack[numStack.length - 5]);
                    }
                    numStack.length = 0;
                    break;

                case 'v':
                    if (numStack.length >= 4) {
                        pendingPathYs.push(numStack[numStack.length - 1]);
                        pendingPathYs.push(numStack[numStack.length - 3]);
                    }
                    numStack.length = 0;
                    break;

                // ── PAINT operators — commit buffered path Y values ──
                case 'f': case 'F': case 'f*':
                case 'S': case 's':
                case 'B': case 'B*': case 'b': case 'b*':
                    commitPathYs();
                    numStack.length = 0;
                    break;

                // ── CLIP operators ──
                case 'W': case 'W*':
                    clipPending = true;
                    numStack.length = 0;
                    break;

                // ── n: end path without painting ──
                case 'n':
                    // W n or W* n = clip only → discard path Y values
                    // n alone = invisible path → also discard
                    discardPathYs();
                    numStack.length = 0;
                    break;

                default:
                    numStack.length = 0;
                    break;
            }
        }

        console.log(`[PDF] getLowestContentY: pageHeight=${pageHeight}, lowestY=${lowestY}, tokens=${tokens.length}`);

        if (lowestY >= pageHeight) return 0;

        return lowestY;
    } catch (err) {
        console.warn('Could not analyze page content stream:', err);
        return 0;
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

    console.log(`[PDF] stampPdf: lowestContentY=${lowestContentY}, availableSpace=${availableSpace}, signatureBlockHeight=${signatureBlockHeight}`);

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
