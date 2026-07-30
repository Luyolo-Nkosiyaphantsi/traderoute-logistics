'use strict';
// =============================================================
// backend/server.js
// TradeRoute Logistics — Express API Server
// =============================================================
 
const express      = require('express');
const cors         = require('cors');
require('dotenv').config();
 
const { initPool, closePool } = require('./db/pool');
const logger       = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
 
// Route modules
const parcelsRouter  = require('./routes/parcels');
const clientsRouter  = require('./routes/clients');
const routesRouter   = require('./routes/routes');
const driversRouter  = require('./routes/drivers');
const vehiclesRouter = require('./routes/vehicles');
const invoicesRouter = require('./routes/invoices');
const searchRouter   = require('./routes/search');
const reportsRouter  = require('./routes/reports');
 
const app  = express();
const PORT = process.env.PORT || 3000;
 
// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);
 
// ── API Routes ────────────────────────────────────────────────
app.use('/api/parcels',  parcelsRouter);
app.use('/api/clients',  clientsRouter);
app.use('/api/routes',   routesRouter);
app.use('/api/drivers',  driversRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/search',   searchRouter);
app.use('/api/reports',  reportsRouter);
 
// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    service:   'TradeRoute Logistics API',
    version:   '1.0.0',
  });
});
 
// Root info
app.get('/', (_req, res) => {
  res.json({
    name:      'TradeRoute Logistics API',
    project:   'CMPG311 Database Project',
    endpoints: [
      'GET  /api/health',
      'GET  /api/parcels',
      'GET  /api/parcels/track/:code',
      'POST /api/parcels',
      'GET  /api/clients',
      'POST /api/clients',
      'GET  /api/routes',
      'GET  /api/routes/today',
      'POST /api/routes/assign',
      'GET  /api/drivers',
      'GET  /api/drivers/available',
      'GET  /api/invoices',
      'GET  /api/invoices/summary',
      'POST /api/invoices',
    ],
  });
});
 
// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});
 
// Centralised error handler (must be last middleware)
app.use(errorHandler);
 
// ── Startup ───────────────────────────────────────────────────
async function start() {
  try {
    await initPool();
    app.listen(PORT, () => {
      console.log('===============================================');
      console.log(' TradeRoute Logistics API — CMPG311');
      console.log(`  Running on: http://localhost:${PORT}`);
      console.log(`  Health:     http://localhost:${PORT}/api/health`);
      console.log('===============================================');
    });
  } catch (err) {
    console.error('[FATAL] Cannot start server:', err.message);
    process.exit(1);
  }
}
 
// Graceful shutdown on Ctrl+C or termination signal
process.on('SIGINT',  async () => { console.log('\n[SERVER] Shutting down…'); await closePool(); process.exit(0); });
process.on('SIGTERM', async () => { console.log('\n[SERVER] Shutting down…'); await closePool(); process.exit(0); });
 
start();