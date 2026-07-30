'use strict';
// =============================================================
// backend/routes/vehicles.js
// Full CRUD for the VEHICLE table
// =============================================================

const express                    = require('express');
const { body, validationResult } = require('express-validator');
const db                         = require('../db/pool');

const router = express.Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
}

// =============================================================
// GET /api/vehicles
// All vehicles with today's assignment info
// =============================================================
router.get('/', async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        v.vehicle_id,
        v.registration,
        v.make,
        v.model,
        v.make || ' ' || v.model                                  AS vehicle_desc,
        v.capacity_kg,
        v.service_status,
        TO_CHAR(v.last_service_date,'YYYY-MM-DD')                 AS last_service_date,
        (
          SELECT d.full_name
          FROM   ROUTE_ASSIGNMENT ra
          JOIN   DRIVER d ON d.driver_id = ra.driver_id
          WHERE  ra.vehicle_id = v.vehicle_id
          AND    TRUNC(ra.assignment_date) = TRUNC(SYSDATE)
          AND ROWNUM = 1
        ) AS assigned_driver_today,
        (
          SELECT r.route_code
          FROM   ROUTE_ASSIGNMENT ra
          JOIN   ROUTE r ON r.route_id = ra.route_id
          WHERE  ra.vehicle_id = v.vehicle_id
          AND    TRUNC(ra.assignment_date) = TRUNC(SYSDATE)
          AND ROWNUM = 1
        ) AS route_today
      FROM   VEHICLE v
      ORDER  BY v.registration
    `);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) { next(err); }
});

// =============================================================
// GET /api/vehicles/available
// OPERATIONAL vehicles not assigned today
// =============================================================
router.get('/available', async (_req, res, next) => {
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
  } catch (err) { next(err); }
});

// =============================================================
// GET /api/vehicles/:id
// Single vehicle by ID
// =============================================================
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT
         vehicle_id, registration, make, model,
         make || ' ' || model                        AS vehicle_desc,
         capacity_kg, service_status,
         TO_CHAR(last_service_date,'YYYY-MM-DD')     AS last_service_date
       FROM VEHICLE WHERE vehicle_id = :id`,
      [Number(req.params.id)]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Vehicle not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// =============================================================
// POST /api/vehicles
// Add a new vehicle to the fleet
// =============================================================
router.post('/',
  body('registration').trim().notEmpty().withMessage('registration is required'),
  body('capacity_kg').isFloat({ min: 1 }).withMessage('capacity_kg must be > 0'),
  body('make').optional().trim(),
  body('model').optional().trim(),
  body('service_status').optional().isIn(['OPERATIONAL','MAINTENANCE','DECOMMISSIONED']),
  body('last_service_date').optional().isISO8601(),
  validate,
  async (req, res, next) => {
    try {
      const { registration, capacity_kg, make, model, service_status, last_service_date } = req.body;
      await db.execute(
        `INSERT INTO VEHICLE (registration, capacity_kg, make, model, service_status, last_service_date)
         VALUES (:registration, :capacity_kg, :make, :model, :service_status,
                 TO_DATE(:last_service_date,'YYYY-MM-DD'))`,
        {
          registration,
          capacity_kg:      Number(capacity_kg),
          make:             make             || null,
          model:            model            || null,
          service_status:   service_status   || 'OPERATIONAL',
          last_service_date: last_service_date || null,
        }
      );
      res.status(201).json({ success: true, message: 'Vehicle added to fleet' });
    } catch (err) {
      if (err.errorNum === 1) return res.status(409).json({ success: false, error: 'Registration number already exists' });
      next(err);
    }
  }
);

// =============================================================
// PUT /api/vehicles/:id
// Update vehicle details
// =============================================================
router.put('/:id',
  body('make').optional().trim(),
  body('model').optional().trim(),
  body('capacity_kg').optional().isFloat({ min: 1 }),
  body('service_status').optional().isIn(['OPERATIONAL','MAINTENANCE','DECOMMISSIONED']),
  body('last_service_date').optional().isISO8601(),
  validate,
  async (req, res, next) => {
    try {
      const { make, model, capacity_kg, service_status, last_service_date } = req.body;
      await db.execute(
        `UPDATE VEHICLE SET
           make              = NVL(:make,            make),
           model             = NVL(:model,           model),
           capacity_kg       = NVL(:capacity_kg,     capacity_kg),
           service_status    = NVL(:service_status,  service_status),
           last_service_date = CASE WHEN :last_service_date IS NOT NULL
                                    THEN TO_DATE(:last_service_date,'YYYY-MM-DD')
                                    ELSE last_service_date END
         WHERE vehicle_id = :id`,
        {
          make:             make             || null,
          model:            model            || null,
          capacity_kg:      capacity_kg ? Number(capacity_kg) : null,
          service_status:   service_status   || null,
          last_service_date: last_service_date || null,
          id:               Number(req.params.id),
        }
      );
      res.json({ success: true, message: 'Vehicle updated' });
    } catch (err) { next(err); }
  }
);

// =============================================================
// PATCH /api/vehicles/:id/status
// Quickly change service status
// =============================================================
router.patch('/:id/status',
  body('service_status').isIn(['OPERATIONAL','MAINTENANCE','DECOMMISSIONED'])
    .withMessage('service_status must be OPERATIONAL|MAINTENANCE|DECOMMISSIONED'),
  validate,
  async (req, res, next) => {
    try {
      await db.execute(
        `UPDATE VEHICLE SET service_status = :status WHERE vehicle_id = :id`,
        { status: req.body.service_status, id: Number(req.params.id) }
      );
      res.json({ success: true, message: `Vehicle status set to ${req.body.service_status}` });
    } catch (err) { next(err); }
  }
);

// =============================================================
// DELETE /api/vehicles/:id
// Remove a vehicle (blocked if it has route assignments)
// =============================================================
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.execute(
      `DELETE FROM VEHICLE WHERE vehicle_id = :id`,
      [Number(req.params.id)]
    );
    if (result.rowsAffected === 0) return res.status(404).json({ success: false, error: 'Vehicle not found' });
    res.json({ success: true, message: 'Vehicle removed from fleet' });
  } catch (err) {
    if (err.errorNum === 2292) return res.status(409).json({ success: false, error: 'Cannot delete — vehicle has existing route assignments' });
    next(err);
  }
});

module.exports = router;