'use strict';
// =============================================================
// backend/middleware/logger.js
// HTTP request logger — colour-coded by method
// =============================================================

const COLORS = {
  GET:    '\x1b[32m',  // green
  POST:   '\x1b[34m',  // blue
  PUT:    '\x1b[33m',  // yellow
  PATCH:  '\x1b[35m',  // magenta
  DELETE: '\x1b[31m',  // red
  RESET:  '\x1b[0m',
};

function logger(req, res, next) {
  const start  = Date.now();
  const ts     = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const color  = COLORS[req.method] || COLORS.RESET;

  res.on('finish', () => {
    const ms         = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
    console.log(
      `${color}${req.method}${COLORS.RESET} ${ts} ` +
      `${statusColor}${res.statusCode}${COLORS.RESET} ` +
      `${req.url} ${ms}ms`
    );
  });

  next();
}

module.exports = logger;