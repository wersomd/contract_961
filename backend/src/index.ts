import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { authRouter } from './routes/auth.routes.js';
import { requestsRouter } from './routes/requests.routes.js';
import { clientsRouter } from './routes/clients.routes.js';
import { signRouter } from './routes/sign.routes.js';
import { verifyRouter } from './routes/verify.routes.js';
import { dashboardRouter } from './routes/dashboard.routes.js';
import { auditRouter } from './routes/audit.routes.js';
import { settingsRouter } from './routes/settings.routes.js';

const app = express();

// Trust first proxy (nginx) for X-Forwarded-For headers
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(config.uploadDir));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes (Protected - require JWT)
app.use('/api/auth', authRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/settings', settingsRouter);

// Public Routes (for signing flow)
app.use('/sign', signRouter);
app.use('/verify', verifyRouter);

// Error handler
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
    console.log(`🚀 Server running on port ${config.port}`);
    console.log(`📄 API: http://localhost:${config.port}/api`);
    console.log(`🔗 Sign: http://localhost:${config.port}/sign/:token`);
});

export default app;
