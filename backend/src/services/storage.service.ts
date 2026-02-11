import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config/index.js';
import fs from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';

// Initialize S3 client (lazy — only if enabled)
let s3Client: S3Client | null = null;

function getS3(): S3Client {
    if (!s3Client) {
        s3Client = new S3Client({
            region: config.s3.region,
            credentials: {
                accessKeyId: config.s3.accessKeyId,
                secretAccessKey: config.s3.secretAccessKey,
            },
        });
    }
    return s3Client;
}

/**
 * Generate S3 key from file path.
 * Example: uploads/documents/abc.pdf -> documents/abc.pdf
 *          uploads/signed/REQ-2026-001_signed.pdf -> signed/REQ-2026-001_signed.pdf
 */
function pathToS3Key(filePath: string): string {
    // Extract the relative part after 'uploads/'
    const uploadsIdx = filePath.replace(/\\/g, '/').indexOf('uploads/');
    if (uploadsIdx !== -1) {
        return filePath.replace(/\\/g, '/').substring(uploadsIdx + 'uploads/'.length);
    }
    // Fallback: use basename
    return path.basename(filePath);
}

/**
 * Upload a file to S3
 */
export async function uploadToS3(filePath: string, s3Key?: string): Promise<string> {
    const key = s3Key || pathToS3Key(filePath);
    const fileContent = await fs.readFile(filePath);

    await getS3().send(new PutObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
        Body: fileContent,
        ContentType: 'application/pdf',
    }));

    return `s3://${config.s3.bucket}/${key}`;
}

/**
 * Upload buffer directly to S3
 */
export async function uploadBufferToS3(buffer: Uint8Array, s3Key: string): Promise<string> {
    await getS3().send(new PutObjectCommand({
        Bucket: config.s3.bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: 'application/pdf',
    }));

    return `s3://${config.s3.bucket}/${s3Key}`;
}

/**
 * Get a presigned URL for downloading a file (valid for 1 hour)
 */
export async function getPresignedUrl(s3KeyOrPath: string, expiresInSeconds: number = 3600): Promise<string> {
    const key = s3KeyOrPath.startsWith('s3://')
        ? s3KeyOrPath.replace(`s3://${config.s3.bucket}/`, '')
        : pathToS3Key(s3KeyOrPath);

    const command = new GetObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
    });

    return getSignedUrl(getS3(), command, { expiresIn: expiresInSeconds });
}

/**
 * Download file from S3 as buffer
 */
export async function downloadFromS3(s3KeyOrPath: string): Promise<Buffer> {
    const key = s3KeyOrPath.startsWith('s3://')
        ? s3KeyOrPath.replace(`s3://${config.s3.bucket}/`, '')
        : pathToS3Key(s3KeyOrPath);

    const response = await getS3().send(new GetObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
    }));

    // Convert stream to buffer
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(s3KeyOrPath: string): Promise<void> {
    const key = s3KeyOrPath.startsWith('s3://')
        ? s3KeyOrPath.replace(`s3://${config.s3.bucket}/`, '')
        : pathToS3Key(s3KeyOrPath);

    await getS3().send(new DeleteObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
    }));
}

/**
 * Check if a storage path is an S3 path
 */
export function isS3Path(storagePath: string): boolean {
    return storagePath.startsWith('s3://');
}

/**
 * Helper: serve a file from either local disk or S3 by streaming through backend
 */
export async function serveFile(
    res: any,
    storagePath: string,
    filename: string,
    disposition: 'inline' | 'attachment' = 'inline'
): Promise<void> {
    const encodedFilename = encodeURIComponent(filename);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${encodedFilename}`);

    if (isS3Path(storagePath)) {
        // Stream from S3 through backend (avoids CORS issues)
        const buffer = await downloadFromS3(storagePath);
        res.setHeader('Content-Length', buffer.length);
        res.end(buffer);
    } else {
        // Serve from local disk
        res.sendFile(storagePath);
    }
}
