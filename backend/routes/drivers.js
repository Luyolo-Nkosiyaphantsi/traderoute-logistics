'use strict';
// =============================================================
// backend/routes/drivers.js
// CRUD for DRIVER and VEHICLE tables
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
// GET /api/drivers
// All drivers with license status and today's route assignment
// =============================================================
router.get('/', async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        d.driver_id,
        d.full_name,
        d.license_number,
        TO_CHAR(d.license_expiry, 'YYYY-MM-DD') AS license_expiry,
        d.is_available,
        d.phone,
        TO_CHAR(d.date_hired, 'YYYY-MM-DD')     AS date_hired,
        CASE
          WHEN d.license_expiry < SYSDATE        THEN 'EXPIRED'
          WHEN d.license_expiry < SYSDATE + 30   THEN 'EXPIRING_SOON'
          ELSE                                        'VALID'
        END AS license_status,
        (
          SELECT r.route_code || ' — ' || r.route_name
          FROM   ROUTE_ASSIGNMENT ra
          JOIN   ROUTE r ON r.route_id = ra.route_id
          WHERE  ra.driver_id = d.driver_id
          AND    TRUNC(ra.assignment_date) = TRUNC(SYSDATE)
          AND ROWNUM = 1
        ) AS todays_route
      FROM   DRIVER d
      ORDER  BY d.full_name
    `);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// =============================================================
// GET /api/drivers/available
// Drivers available today — valid license, not yet assigned
// =============================================================
router.get('/available', async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        d.driver_id,
        d.full_name,
        d.license_number,
        TO_CHAR(d.license_expiry, 'YYYY-MM-DD') AS license_expiry,
        d.phone
      FROM   DRIVER d
      WHERE  d.is_available  = 'Y'
      AND    d.license_expiry > SYSDATE
      AND    d.driver_id NOT IN (
               SELECT ra.driver_id
               FROM   ROUTE_ASSIGNMENT ra
               WHERE  TRUNC(ra.assignment_date) = TRUNC(SYSDATE)
             )
      ORDER BY d.full_name
    `);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// =============================================================
// GET /api/drivers/vehicles
// All vehicles with current assignment status
// =============================================================
router.get('/vehicles', async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        v.vehicle_id,
        v.registration,
        v.make,
        v.model,
        v.make || ' ' || v.model                AS vehicle_desc,
        v.capacity_kg,
        v.service_status,
        TO_CHAR(v.last_service_date, 'YYYY-MM-DD') AS last_service_date,
        (
          SELECT d.full_name
          FROM   ROUTE_ASSIGNMENT ra
          JOIN   DRIVER d ON d.driver_id = ra.driver_id
          WHERE  ra.vehicle_id = v.vehicle_id
          AND    TRUNC(ra.assignment_date) = TRUNC(SYSDATE)
          AND ROWNUM = 1
        ) AS assigned_driver_today
      FROM   VEHICLE v
      ORDER  BY v.registration
    `);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// =============================================================
// GET /api/drivers/vehicles/available
// Vehicles that are OPERATIONAL and not assigned today
// =============================================================
router.get('/vehicles/available', async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        v.vehicle_id,
        v.registration,
        v.make || ' ' || v.model AS vehicle_desc,
        v.capacity_kg
      FROM   VEHICLE v
      WHERE  v.service_status = 'OPERATIONAL'
      AND    v.vehicle_id NOT IN (
               SELECT ra.vehicle_id
               FROM   ROUTE_ASSIGNMENT ra
               WHERE  TRUNC(ra.assignment_date) = TRUNC(SYSDATE)
             )
      ORDER BY v.registration
    `);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// =============================================================
// GET /api/drivers/:id
// Single driver
// =============================================================
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT
         driver_id, full_name, license_number,
         TO_CHAR(license_expiry, 'YYYY-MM-DD') AS license_expiry,
         is_available, phone,
         TO_CHAR(date_hired, 'YYYY-MM-DD') AS date_hired
       FROM DRIVER WHERE driver_id = :id`,
      [Number(req.params.id)]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// =============================================================
// POST /api/drivers
// Add a new driver
// =============================================================
router.post(
  '/',
  body('full_name').trim().notEmpty().withMessage('full_name is required'),
  body('license_number').trim().notEmpty().withMessage('license_number is required'),
  body('license_expiry').isISO8601().withMessage('license_expiry must be YYYY-MM-DD'),
  body('phone').optional({ nullable: true }).trim(),
  body('date_hired').optional({ nullable: true }).isISO8601(),
  validate,
  async (req, res, next) => {
    try {
      const { full_name, license_number, license_expiry, phone, date_hired } = req.body;
      await db.execute(
        `INSERT INTO DRIVER (full_name, license_number, license_expiry, phone, date_hired)
         VALUES (
           :full_name, :license_number,
           TO_DATE(:license_expiry, 'YYYY-MM-DD'),
           :phone,
           TO_DATE(:date_hired, 'YYYY-MM-DD')
         )`,
        {
          full_name,
          license_number,
          license_expiry,
          phone:       phone      || null,
          date_hired:  date_hired || null,
        }
      );
      res.status(201).json({ success: true, message: 'Driver added successfully' });
    } catch (err) {
      if (err.errorNum === 1) {
        return res.status(409).json({ success: false, error: 'License number already exists' });
      }
      next(err);
    }
  }
);

// =============================================================
// POST /api/drivers/vehicles
// Add a new vehicle to the fleet
// =============================================================
router.post(
  '/vehicles',
  body('registration').trim().notEmpty().withMessage('registration is required'),
  body('capacity_kg').isFloat({ min: 1 }).withMessage('capacity_kg must be > 0'),
  body('make').optional().trim(),
  body('model').optional().trim(),
  body('service_status').optional().isIn(['OPERATIONAL', 'MAINTENANCE', 'DECOMMISSIONED']),
  validate,
  async (req, res, next) => {
    try {
      const { registration, capacity_kg, make, model, service_status } = req.body;
      await db.execute(
        `INSERT INTO VEHICLE (registration, capacity_kg, make, model, service_status)
         VALUES (:registration, :capacity_kg, :make, :model, :service_status)`,
        {
          registration,
          capacity_kg:    Number(capacity_kg),
          make:           make           || null,
          model:          model          || null,
          service_status: service_status || 'OPERATIONAL',
        }
      );
      res.status(201).json({ success: true, message: 'Vehicle added successfully' });
    } catch (err) {
      if (err.errorNum === 1) {
        return res.status(409).json({ success: false, error: 'Registration number already exists' });
      }
      next(err);
    }
  }
);

// =============================================================
// PUT /api/drivers/:id
// Update driver — availability, phone, license expiry
// =============================================================
router.put(
  '/:id',
  body('full_name').optional().trim().notEmpty(),
  body('license_expiry').optional().isISO8601(),
  body('phone').optional({ nullable: true }).trim(),
  body('is_available').optional().isIn(['Y', 'N']),
  validate,
  async (req, res, next) => {
    try {
      const { full_name, license_expiry, phone, is_available } = req.body;
      await db.execute(
        `UPDATE DRIVER
         SET
           full_name      = NVL(:full_name,     full_name),
           license_expiry = CASE
                              WHEN :license_expiry IS NOT NULL
                              THEN TO_DATE(:license_expiry, 'YYYY-MM-DD')
                              ELSE license_expiry
                            END,
           phone          = NVL(:phone,         phone),
           is_available   = NVL(:is_available,  is_available)
         WHERE driver_id = :id`,
        {
          full_name:      full_name      || null,
          license_expiry: license_expiry || null,
          phone:          phone          || null,
          is_available:   is_available   || null,
          id:             Number(req.params.id),
        }
      );
      res.json({ success: true, message: 'Driver updated successfully' });
    } catch (err) {
      next(err);
    }
  }
);

// =============================================================
// DELETE /api/drivers/:id
// Remove a driver (blocked if they have route assignments)
// =============================================================
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.execute(
      `DELETE FROM DRIVER WHERE driver_id = :id`,
      [Number(req.params.id)]
    );
    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }
    res.json({ success: true, message: 'Driver removed successfully' });
  } catch (err) {
    if (err.errorNum === 2292) {
      return res.status(409).json({
        success: false,
        error:   'Cannot delete driver: they have existing route assignment records',
      });
    }
    next(err);
  }
});

module.exports = router;