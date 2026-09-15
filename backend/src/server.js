require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const itemsRouter = require('./routes/items');
const metricsRouter = require('./routes/metrics');
const stressRouter = require('./routes/stress');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/api/metrics' && req.path !== '/api/health') {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// Health check endpoint (for Docker / Load Balancers)
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({
      status: 'healthy',
      service: 'ramguard-backend',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      service: 'ramguard-backend',
      timestamp: new Date().toISOString(),
      database: err.message,
    });
  }
});

// Mount Routes
app.use('/api/items', itemsRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/stress', stressRouter);

// Root informational endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'RAMGuard 3-Tier Application API',
    status: 'running',
    version: '1.0.0',
    endpoints: [
      '/api/health',
      '/api/items',
      '/api/metrics',
      '/api/stress/status',
      '/api/stress/allocate',
      '/api/stress/leak-start',
      '/api/stress/leak-stop',
      '/api/stress/reset',
    ],
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Error Handler]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start server after ensuring DB connectivity
let server;
async function startServer() {
  try {
    await db.waitForDatabase(15, 2000);
    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Backend] RAMGuard API running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('[Backend] Startup failed:', err.message);
    process.exit(1);
  }
}

// Graceful shutdown handling
function gracefulShutdown(signal) {
  console.log(`[Backend] Received ${signal}. Initiating graceful shutdown...`);
  if (server) {
    server.close(async () => {
      console.log('[Backend] HTTP server closed.');
      try {
        await db.pool.end();
        console.log('[Backend] Database pool closed.');
      } catch (err) {
        console.error('[Backend] Error closing DB pool:', err.message);
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
