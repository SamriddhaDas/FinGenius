const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./utils/logger');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const chatRoutes = require('./routes/chat');
const dashboardRoutes = require('./routes/dashboard');
const portfolioRoutes = require('./routes/portfolio');
const taxRoutes = require('./routes/tax');
const goalRoutes = require('./routes/goals');
const healthScoreRoutes = require('./routes/healthScore');
const uploadRoutes = require('./routes/upload');

const app = express();

// ── Security headers ──────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true
}));

// ── Body parsing ─────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static uploads ────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Global rate limiter ───────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api', globalLimiter);

// ── Request logging ───────────────────────────────────────
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// ── Health check ─────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'fingenius-api' }));

// ── API routes ────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/tax', taxRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/health-score', healthScoreRoutes);
app.use('/api/upload', uploadRoutes);

// ── 404 handler ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ─────────────────────────────────
app.use((err, _req, res, _next) => {
  logger.error(err.stack || err.message);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

module.exports = app;
