'use strict';
// =============================================================
// backend/db/pool.js
// Oracle DB connection pool — using the oracledb npm package
// =============================================================

const oracledb = require('oracledb');
require('dotenv').config();

// Use Thick mode if Oracle Client libraries are installed.
// Remove or comment out the line below to use Thin mode (no client needed).
try {
  oracledb.initOracleClient();
} catch (err) {
  // Thick mode unavailable — running in Thin mode
  console.warn('[DB] Thin mode active (no Oracle Client libraries found)');
}

// Return rows as plain JS objects (column names as keys)
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let pool = null;

// ----------------------------------------------------------
// initPool — create the connection pool at startup
// ----------------------------------------------------------
async function initPool() {
  try {
    pool = await oracledb.createPool({
      user:          process.env.DB_USER,
      password:      process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECTION_STRING,
      poolMin:       2,
      poolMax:       10,
      poolIncrement: 1,
      poolTimeout:   60,
      stmtCacheSize: 30,
    });
    console.log('[DB] Oracle connection pool created successfully');
  } catch (err) {
    console.error('[DB] Failed to create connection pool:', err.message);
    throw err;
  }
}

// ----------------------------------------------------------
// getConnection — borrow a connection from the pool
// ----------------------------------------------------------
async function getConnection() {
  if (!pool) {
    throw new Error('Pool not initialised. Call initPool() first.');
  }
  return pool.getConnection();
}

// ----------------------------------------------------------
// query — run a SELECT and return the result object
// Callers use result.rows for the data.
// ----------------------------------------------------------
async function query(sql, binds = [], opts = {}) {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(sql, binds, {
      outFormat:  oracledb.OUT_FORMAT_OBJECT,
      autoCommit: false,
      ...opts,
    });
    return result;
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}

// ----------------------------------------------------------
// execute — run INSERT / UPDATE / DELETE with autoCommit
// ----------------------------------------------------------
async function execute(sql, binds = []) {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(sql, binds, {
      outFormat:  oracledb.OUT_FORMAT_OBJECT,
      autoCommit: true,
    });
    return result;
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}

// ----------------------------------------------------------
// closePool — graceful shutdown
// ----------------------------------------------------------
async function closePool() {
  if (pool) {
    await pool.close(0);
    pool = null;
    console.log('[DB] Pool closed');
  }
}

module.exports = { initPool, getConnection, query, execute, closePool };