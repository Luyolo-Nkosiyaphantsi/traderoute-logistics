'use strict';
// =============================================================
// backend/middleware/errorHandler.js
// Centralised error handling for Oracle errors and validation
// =============================================================

// Oracle error code → user-friendly message map
const ORACLE_ERRORS = {
  1:    { status: 409, message: 'Duplicate value — a record with this unique field already exists.' },
  2291: { status: 400, message: 'Invalid reference — the foreign key value does not exist.' },
  2292: { status: 409, message: 'Cannot delete — this record is referenced by other records.' },
  1400: { status: 400, message: 'Missing required field — a NOT NULL column has no value.' },
  12899: { status: 400, message: 'Value too long — data exceeds the column maximum length.' },
  2290: { status: 400, message: 'Constraint violated — a CHECK constraint rejected this value.' },
};

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const ts = new Date().toISOString();

  // Log full error for debugging
  console.error(`[ERROR ${ts}] ${req.method} ${req.url}`);
  console.error(`  Code: ${err.errorNum || 'N/A'}`);
  console.error(`  Message: ${err.message}`);

  // Oracle-specific error
  if (err.errorNum && ORACLE_ERRORS[err.errorNum]) {
    const mapped = ORACLE_ERRORS[err.errorNum];
    return res.status(mapped.status).json({
      success: false,
      error:   mapped.message,
      oracle:  `ORA-${String(err.errorNum).padStart(5, '0')}`,
    });
  }

  // Generic Oracle error (not in our map)
  if (err.errorNum) {
    return res.status(500).json({
      success: false,
      error:   `Database error: ${err.message}`,
      oracle:  `ORA-${String(err.errorNum).padStart(5, '0')}`,
    });
  }

  // Express-validator or application-level error
  if (err.status) {
    return res.status(err.status).json({
      success: false,
      error:   err.message,
    });
  }

  // Unknown error
  res.status(500).json({
    success: false,
    error:   process.env.NODE_ENV === 'development'
               ? err.message
               : 'An unexpected error occurred. Please try again.',
  });
}

module.exports = errorHandler;