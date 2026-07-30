'use strict';
// =============================================================
// backend/routes/routes.js
// CRUD for ROUTE, SORTING_HUB, and ROUTE_ASSIGNMENT tables
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
// GET /api/routes
// All routes with hub details and today's parcel count
// =============================================================
router.get('/', async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        r.route_id,
        r.route_code,
        r.route_name,
        r.max_capacity_kg,
        r.is_active,
        sh.hub_id,
        sh.hub_name,
        sh.city     AS hub_city,
        (
          SELECT COUNT(*)
          FROM   PARCEL p
          WHERE  p.route_id = r.route_id
          AND    TRUNC(p.intake_date) = TRUNC(SYSDATE)
        ) AS parcels_today,
        (
          SELECT NVL(SUM(p2.weight_kg), 0)
          FROM   PARCEL p2
          WHERE  p2.route_id = r.route_id
          AND    TRUNC(p2.intake_date) = TRUNC(SYSDATE)
        ) AS load_today_kg
      FROM  ROUTE        r
      LEFT JOIN SORTING_HUB sh ON sh.hub_id = r.hub_id
      ORDER BY r.route_code
    `);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// =============================================================
// GET /api/routes/today
// Today's route assignments — route + driver + vehicle details
// =============================================================
router.get('/today', async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        ra.assignment_id,
        TO_CHAR(ra.assignment_date, 'YYYY-MM-DD') AS assignment_date,
        r.route_id,
        r.route_code,
        r.route_name,
        d.driver_id,
        d.full_name                      AS driver_name,
        d.phone                          AS driver_phone,
        d.license_number,
        v.vehicle_id,
        v.registration,
        v.make || ' ' || v.model         AS vehicle_desc,
        v.capacity_kg,
        ra.total_load_kg,
        CASE
          WHEN v.capacity_kg > 0
          THEN ROUND(ra.total_load_kg / v.capacity_kg * 100, 1)
          ELSE 0
        END                              AS load_pct,
        sh.hub_name,
        sh.city                          AS hub_city
      FROM      ROUTE_ASSIGNMENT  ra
      JOIN      ROUTE             r   ON r.route_id   = ra.route_id
      JOIN      DRIVER            d   ON d.driver_id  = ra.driver_id
      JOIN      VEHICLE           v   ON v.vehicle_id = ra.vehicle_id
      LEFT JOIN SORTING_HUB       sh  ON sh.hub_id    = r.hub_id
      WHERE     TRUNC(ra.assignment_date) = TRUNC(SYSDATE)
      ORDER BY  r.route_code
    `);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// =============================================================
// GET /api/routes/hubs
// All sorting hubs
// =============================================================
router.get('/hubs', async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        hub_id,
        hub_name,
        address,
        city,
        capacity_parcels
      FROM   SORTING_HUB
      ORDER  BY hub_name
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// =============================================================
// GET /api/routes/:id
// Single route by ID
// =============================================================
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT
         r.route_id, r.route_code, r.route_name,
         r.max_capacity_kg, r.is_active,
         sh.hub_name, sh.city AS hub_city
       FROM  ROUTE r
       LEFT JOIN SORTING_HUB sh ON sh.hub_id = r.hub_id
       WHERE r.route_id = :id`,
      [Number(req.params.id)]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Route not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// =============================================================
// POST /api/routes
// Create a new route
// =============================================================
router.post(
  '/',
  body('route_code').trim().notEmpty().withMessage('route_code is required'),
  body('route_name').trim().notEmpty().withMessage('route_name is required'),
  body('max_capacity_kg').isFloat({ min: 1 }).withMessage('max_capacity_kg must be > 0'),
  body('hub_id').optional({ nullable: true }).isInt({ min: 1 }),
  validate,
  async (req, res, next) => {
    try {
      const { route_code, route_name, max_capacity_kg, hub_id } = req.body;
      await db.execute(
        `INSERT INTO ROUTE (route_code, route_name, max_capacity_kg, hub_id)
         VALUES (:route_code, :route_name, :max_capacity_kg, :hub_id)`,
        {
          route_code,
          route_name,
          max_capacity_kg: Number(max_capacity_kg),
          hub_id:          hub_id ? Number(hub_id) : null,
        }
      );
      res.status(201).json({ success: true, message: 'Route created successfully' });
    } catch (err) {
      if (err.errorNum === 1) {
        return res.status(409).json({ success: false, error: 'Route code already exists' });
      }
      next(err);
    }
  }
);

// =============================================================
// POST /api/routes/assign
// Assign a driver + vehicle to a route for a specific date
// Business rules enforced at DB level:
//   - UNIQUE(driver_id, assignment_date)
//   - UNIQUE(vehicle_id, assignment_date)
//   - UNIQUE(route_id,   assignment_date)
// =============================================================
router.post(
  '/assign',
  body('route_id').isInt({ min: 1 }).withMessage('Valid route_id required'),
  body('driver_id').isInt({ min: 1 }).withMessage('Valid driver_id required'),
  body('vehicle_id').isInt({ min: 1 }).withMessage('Valid vehicle_id required'),
  body('assignment_date').isISO8601().withMessage('assignment_date must be YYYY-MM-DD'),
  body('total_load_kg').optional({ nullable: true }).isFloat({ min: 0 }),
  validate,
  async (req, res, next) => {
    try {
      const { route_id, driver_id, vehicle_id, assignment_date, total_load_kg } = req.body;

      await db.execute(
        `INSERT INTO ROUTE_ASSIGNMENT
           (route_id, driver_id, vehicle_id, assignment_date, total_load_kg)
         VALUES
           (:route_id, :driver_id, :vehicle_id,
            TO_DATE(:assignment_date, 'YYYY-MM-DD'),
            :total_load_kg)`,
        {
          route_id:       Number(route_id),
          driver_id:      Number(driver_id),
          vehicle_id:     Number(vehicle_id),
          assignment_date,
          total_load_kg:  total_load_kg ? Number(total_load_kg) : null,
        }
      );

      res.status(201).json({ success: true, message: 'Route assigned successfully' });
    } catch (err) {
      if (err.errorNum === 1) {
        return res.status(409).json({
          success: false,
          error:   'Conflict: driver, vehicle, or route already assigned on this date',
        });
      }
      next(err);
    }
  }
);

// =============================================================
// PUT /api/routes/:id
// Update route details
// =============================================================
router.put(
  '/:id',
  body('route_name').optional().trim().notEmpty(),
  body('max_capacity_kg').optional().isFloat({ min: 1 }),
  body('is_active').optional().isIn(['Y', 'N']),
  validate,
  async (req, res, next) => {
    try {
      const { route_name, max_capacity_kg, is_active } = req.body;
      await db.execute(
        `UPDATE ROUTE
         SET
           route_name      = NVL(:route_name,      route_name),
           max_capacity_kg = NVL(:max_capacity_kg, max_capacity_kg),
           is_active       = NVL(:is_active,       is_active)
         WHERE route_id = :id`,
        {
          route_name:      route_name      || null,
          max_capacity_kg: max_capacity_kg ? Number(max_capacity_kg) : null,
          is_active:       is_active       || null,
          id:              Number(req.params.id),
        }
      );
      res.json({ success: true, message: 'Route updated successfully' });
    } catch (err) {
      next(err);
    }
  }
);

// =============================================================
// DELETE /api/routes/:id
// Soft-delete — sets is_active = 'N' (preserves history)
// =============================================================
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.execute(
      `UPDATE ROUTE SET is_active = 'N' WHERE route_id = :id`,
      [Number(req.params.id)]
    );
    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, error: 'Route not found' });
    }
    res.json({ success: true, message: 'Route deactivated (soft delete)' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;