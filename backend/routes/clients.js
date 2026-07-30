'use strict';
// =============================================================
// backend/routes/clients.js
// Full CRUD for the CLIENT table
// =============================================================

const express                         = require('express');
const { body, validationResult }      = require('express-validator');
const db                              = require('../db/pool');

const router = express.Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

// =============================================================
// GET /api/clients
// List all clients ordered by most recently registered
// =============================================================
router.get('/', async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        client_id,
        client_name,
        client_type,
        email,
        phone,
        address,
        TO_CHAR(date_registered, 'YYYY-MM-DD') AS date_registered
      FROM   CLIENT
      ORDER  BY client_id DESC
    `);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// =============================================================
// GET /api/clients/:id
// Single client by primary key
// =============================================================
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT
         client_id,
         client_name,
         client_type,
         email,
         phone,
         address,
         TO_CHAR(date_registered, 'YYYY-MM-DD') AS date_registered
       FROM   CLIENT
       WHERE  client_id = :id`,
      [Number(req.params.id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// =============================================================
// POST /api/clients
// Create a new client
// =============================================================
router.post(
  '/',
  body('client_name')
    .trim()
    .notEmpty()
    .withMessage('client_name is required')
    .isLength({ max: 100 })
    .withMessage('client_name max 100 characters'),
  body('email')
    .isEmail()
    .withMessage('Valid email required')
    .normalizeEmail(),
  body('client_type')
    .isIn(['INDIVIDUAL', 'CORPORATE', 'ECOMMERCE'])
    .withMessage('client_type must be INDIVIDUAL|CORPORATE|ECOMMERCE'),
  body('address')
    .trim()
    .notEmpty()
    .withMessage('address is required'),
  body('phone')
    .optional({ nullable: true })
    .trim(),
  validate,
  async (req, res, next) => {
    try {
      const { client_name, client_type, email, phone, address } = req.body;

      await db.execute(
        `INSERT INTO CLIENT (client_name, client_type, email, phone, address)
         VALUES (:client_name, :client_type, :email, :phone, :address)`,
        {
          client_name,
          client_type,
          email,
          phone:   phone || null,
          address,
        }
      );

      res.status(201).json({
        success: true,
        message: 'Client created successfully',
      });
    } catch (err) {
      // ORA-00001 = unique constraint violated (duplicate email)
      if (err.errorNum === 1) {
        return res.status(409).json({
          success: false,
          error:   'A client with this email address already exists',
        });
      }
      next(err);
    }
  }
);

// =============================================================
// PUT /api/clients/:id
// Update client details (all fields optional — only update what's sent)
// =============================================================
router.put(
  '/:id',
  body('client_name').optional().trim().notEmpty().withMessage('client_name cannot be blank'),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional({ nullable: true }).trim(),
  body('address').optional().trim().notEmpty().withMessage('address cannot be blank'),
  body('client_type')
    .optional()
    .isIn(['INDIVIDUAL', 'CORPORATE', 'ECOMMERCE']),
  validate,
  async (req, res, next) => {
    try {
      const { client_name, email, phone, address, client_type } = req.body;

      await db.execute(
        `UPDATE CLIENT
         SET
           client_name = NVL(:client_name, client_name),
           email       = NVL(:email,       email),
           phone       = NVL(:phone,       phone),
           address     = NVL(:address,     address),
           client_type = NVL(:client_type, client_type)
         WHERE client_id = :id`,
        {
          client_name:  client_name  || null,
          email:        email        || null,
          phone:        phone        || null,
          address:      address      || null,
          client_type:  client_type  || null,
          id:           Number(req.params.id),
        }
      );

      res.json({ success: true, message: 'Client updated successfully' });
    } catch (err) {
      if (err.errorNum === 1) {
        return res.status(409).json({ success: false, error: 'Email already in use by another client' });
      }
      next(err);
    }
  }
);

// =============================================================
// DELETE /api/clients/:id
// Delete client — blocked if client has parcels (FK constraint)
// =============================================================
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.execute(
      `DELETE FROM CLIENT WHERE client_id = :id`,
      [Number(req.params.id)]
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    res.json({ success: true, message: 'Client deleted successfully' });
  } catch (err) {
    // ORA-02292 = FK constraint violated (client has child records)
    if (err.errorNum === 2292) {
      return res.status(409).json({
        success: false,
        error:   'Cannot delete client: they have existing parcels or invoices on record',
      });
    }
    next(err);
  }
});

module.exports = router;