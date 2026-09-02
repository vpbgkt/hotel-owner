'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');

const { validateEnv, env } = require('./config/env');
const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { apiLimiter } = require('./middlewares/rateLimiter.middleware');
const { errorHandler } = require('./middlewares/errorHandler.middleware');
const routes = require('./routes');

// ── Validate env vars before anything else ──────────────────────────────────
validateEnv();

const app = express();

// ── Trust the Nginx reverse proxy in front of this container ────────────────
// Required so express-rate-limit and req.ip use the real client IP from
// X-Forwarded-For instead of the proxy's IP, and so `secure` cookies/redirects
// behave correctly behind TLS-terminating Nginx.
app.set('trust proxy', 1);

// ── Security & Utility Middleware ────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow no-origin requests (server-to-server, curl)
      if (!origin) return callback(null, true);
      const allowed = [
        env.FRONTEND_URL,
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ];
      // Allow any GitHub Codespaces or VS Code Dev Tunnels preview URL
      if (
        allowed.includes(origin) ||
        /^https:\/\/[^.]+-(3000|4000)\.app\.github\.dev$/.test(origin) ||
        /^https:\/\/[^.]+-(3000|4000)\.preview\.app\.github\.dev$/.test(origin) ||
        /^https:\/\/[^.]+-(3000|4000)\.[^.]+\.devtunnels\.ms$/.test(origin)
      ) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin not allowed — ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-hotel-id', 'x-api-key'],
    credentials: true,
    maxAge: 86400,
  })
);

app.use(compression());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Raw body for Razorpay webhook signature verification ─────────────────────
app.use('/api/webhooks', express.raw({ type: 'application/json' }));

// ── JSON & URL-encoded body parsing ─────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Static files — serve uploaded images ────────────────────────────────────
// Security headers prevent browsers from executing uploaded files as scripts
app.use('/uploads', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'");
  // Block directory traversal in URL
  if (req.path.includes('..') || req.path.includes('%2e')) {
    return res.status(400).json({ success: false, message: 'Invalid path' });
  }
  next();
}, express.static(path.join(__dirname, env.UPLOAD_DIR), {
  index: false,         // no directory listing
  dotfiles: 'deny',     // no hidden files
}));

// ── Global rate limiting ─────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ── Service status tracking ──────────────────────────────────────────────────
const serviceStatus = { db: false, redis: false };

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  const healthy = serviceStatus.db && serviceStatus.redis;
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    message: healthy ? 'All services healthy' : 'Some services degraded',
    data: {
      uptime: process.uptime(),
      db: serviceStatus.db ? 'connected' : 'disconnected',
      redis: serviceStatus.redis ? 'connected' : 'disconnected',
    },
  });
});

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', data: null });
});

// ── Global error handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

// ── Bootstrap ────────────────────────────────────────────────────────────────

// Auto-release: mark overdue CHECKED_IN bookings as CHECKED_OUT and restore inventory
async function autoReleaseOverdueBookings() {
  try {
    const { Booking } = require('./models');
    const roomService = require('./services/room.service');
    const { Op } = require('sequelize');
    const today = new Date().toISOString().split('T')[0];

    const overdue = await Booking.findAll({
      where: {
        status: 'CHECKED_IN',
        bookingType: 'DAILY',
        checkOutDate: { [Op.lt]: today },
      },
    });

    for (const booking of overdue) {
      await booking.update({ status: 'CHECKED_OUT' });
      const dates = roomService._getDateRange(booking.checkInDate, booking.checkOutDate);
      await roomService.restoreAvailability(booking.roomTypeId, dates, booking.numRooms);
    }

    if (overdue.length > 0) {
      console.log(`[AutoRelease] Released ${overdue.length} overdue booking(s)`);
    }
  } catch (err) {
    console.error('[AutoRelease] Error:', err.message);
  }
}

async function bootstrap() {
  try {
    // Connect DB first (may fall back to pg-mem in dev)
    await connectDatabase();
    serviceStatus.db = true;

    // Connect Redis (may fall back to ioredis-mock in dev)
    await connectRedis();
    serviceStatus.redis = true;

    const server = app.listen(env.PORT, () => {
      console.log(`[Server] Hotel API running on http://localhost:${env.PORT}`);
      console.log(`[Server] Environment: ${env.NODE_ENV}`);
      console.log(`[Server] Health: http://localhost:${env.PORT}/health`);
    });

    // Run auto-release on startup, then every hour
    autoReleaseOverdueBookings();
    setInterval(autoReleaseOverdueBookings, 60 * 60 * 1000);

    const shutdown = (signal) => {
      console.log(`\n[Server] ${signal} received — shutting down gracefully`);
      server.close(() => process.exit(0));
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));
  } catch (error) {
    console.error('[Server] Fatal startup error:', error.message);
    process.exit(1);
  }
}

bootstrap();

module.exports = app;

