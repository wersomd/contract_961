import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),

    // Database
    databaseUrl: process.env.DATABASE_URL!,

    // JWT
    jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
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
};
