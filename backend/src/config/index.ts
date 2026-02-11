import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Validate critical env vars in production
if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-me-in-production')) {
    throw new Error('JWT_SECRET must be set in production! Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
}

export const config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),

    // Database
    databaseUrl: process.env.DATABASE_URL!,

    // JWT
    jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

    // SMSC.kz
    smsc: {
        login: process.env.SMSC_LOGIN || '',
        password: process.env.SMSC_PASSWORD || '',
        sender: process.env.SMSC_SENDER || '961kz',
        apiUrl: 'https://smsc.kz/sys/send.php',
    },

    // URLs
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000',

    // File uploads
    uploadDir: process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB

    // OTP settings
    otp: {
        length: 6,
        ttlMinutes: 5,
        maxAttempts: 3,
        cooldownSeconds: 60,
    },

    // AWS S3
    s3: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        region: process.env.AWS_REGION || 'us-east-1',
        bucket: process.env.AWS_S3_BUCKET || '',
        enabled: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_S3_BUCKET),
    },
};

