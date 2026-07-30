'use strict';
// =============================================================
// backend/routes/parcels.js
// CRUD + tracking for PARCEL and DELIVERY_EVENT tables
// =============================================================

const express                         = require('express');
const { body, param, validationResult } = require('express-validator');
const db                              = require('../db/pool');

const router = express.Router();

// ── Validation middleware helper ──────────────────────────────
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

// ── Generate a unique tracking code ──────────────────────────
function generateTrackingCode() {
  const now   = new Date();
  const yy    = now.getFullYear().toString().slice(2);
  const mm    = String(now.getMonth() + 1).padStart(2, '0');
  const dd    = String(now.getDate()).padStart(2, '0');
  const rand  = Math.floor(10000 + Math.random() * 90000);
  return `TR-${yy}${mm}${dd}-${rand}`;
}

// =============================================================
// GET /api/parcels
// List all parcels with current status, sender, recipient, route
// =============================================================
router.get('/', async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        p.parcel_id,
        p.tracking_code,
        p.weight_kg,
        p.size_category,
        p.service_type,
        TO_CHAR(p.intake_date, 'YYYY-MM-DD')  AS intake_date,
        p.destination_address,
        ps.status_name,
        c1.client_name  AS sender_name,
        c1.email        AS sender_email,
        c2.client_name  AS recipient_name,
        c2.email        AS recipient_email,
        r.route_code,
        r.route_name
      FROM       PARCEL         p
      JOIN       PARCEL_STATUS  ps  ON ps.status_id  = p.status_id
      JOIN       CLIENT         c1  ON c1.client_id  = p.sender_id
      JOIN       CLIENT         c2  ON c2.client_id  = p.recipient_id
      LEFT JOIN  ROUTE          r   ON r.route_id    = p.route_id
      ORDER BY   p.parcel_id DESC
      
    `);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// =============================================================
// GET /api/parcels/track/:code
// Full tracking history — parcel details + all delivery events
// =============================================================
router.get(
  '/track/:code',
  param('code').trim().notEmpty().withMessage('Tracking code is required'),
  validate,
  async (req, res, next) => {
    try {
      const { code } = req.params;

      // Fetch parcel with all joined details
      const parcelResult = await db.query(
        `SELECT
           p.parcel_id,
           p.tracking_code,
           p.weight_kg,
           p.size_category,
           p.service_type,
           TO_CHAR(p.intake_date, 'YYYY-MM-DD HH24:MI') AS intake_date,
           p.destination_address,
           ps.status_name,
           c1.client_name  AS sender_name,
           c1.phone        AS sender_phone,
           c1.address      AS sender_address,
           c2.client_name  AS recipient_name,
           c2.phone        AS recipient_phone,
           c2.address      AS recipient_address,
           r.route_code,
           r.route_name,
           sh.hub_name,
           sh.city         AS hub_city
         FROM       PARCEL         p
         JOIN       PARCEL_STATUS  ps  ON ps.status_id = p.status_id
         JOIN       CLIENT         c1  ON c1.client_id = p.sender_id
         JOIN       CLIENT         c2  ON c2.client_id = p.recipient_id
         LEFT JOIN  ROUTE          r   ON r.route_id   = p.route_id
         LEFT JOIN  SORTING_HUB   sh  ON sh.hub_id     = r.hub_id
         WHERE UPPER(p.tracking_code) = UPPER(:code)`,
        [code]
      );

      if (parcelResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error:   `No parcel found with tracking code: ${code}`,
        });
      }

      const parcel = parcelResult.rows[0];

      // Fetch all delivery events for this parcel (chronological order)
      const eventsResult = await db.query(
        `SELECT
           de.event_id,
           de.event_type,
           de.outcome_code,
           TO_CHAR(de.event_timestamp, 'YYYY-MM-DD HH24:MI:SS') AS event_timestamp,
           de.recipient_name,
           de.location_notes,
           d.full_name        AS driver_name,
           d.phone            AS driver_phone,
           v.registration     AS vehicle_reg,
           r.route_code,
           r.route_name
         FROM       DELIVERY_EVENT   de
         LEFT JOIN  ROUTE_ASSIGNMENT ra ON ra.assignment_id = de.assignment_id
         LEFT JOIN  DRIVER           d  ON d.driver_id      = ra.driver_id
         LEFT JOIN  VEHICLE          v  ON v.vehicle_id     = ra.vehicle_id
         LEFT JOIN  ROUTE            r  ON r.route_id       = ra.route_id
         WHERE de.parcel_id = :id
         ORDER BY de.event_timestamp ASC`,
        [parcel.PARCEL_ID]
      );

      res.json({
        success: true,
        parcel,
        events:  eventsResult.rows,
      });
    } catch (err) {
      next(err);
    }
  }
);

// =============================================================
// GET /api/parcels/:id
// Single parcel by ID
// =============================================================
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT
         p.parcel_id,
         p.tracking_code,
         p.weight_kg,
         p.size_category,
         p.service_type,
         TO_CHAR(p.intake_date, 'YYYY-MM-DD') AS intake_date,
         p.destination_address,
         ps.status_name,
         c1.client_name AS sender_name,
         c2.client_name AS recipient_name,
         r.route_code,
         r.route_name
       FROM       PARCEL         p
       JOIN       PARCEL_STATUS  ps ON ps.status_id = p.status_id
       JOIN       CLIENT         c1 ON c1.client_id = p.sender_id
       JOIN       CLIENT         c2 ON c2.client_id = p.recipient_id
       LEFT JOIN  ROUTE          r  ON r.route_id   = p.route_id
       WHERE p.parcel_id = :id`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Parcel not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// =============================================================
// POST /api/parcels
// Create a new parcel (intake) — auto-generates tracking code
// =============================================================
router.post(
  '/',
  body('sender_id').isInt({ min: 1 }).withMessage('Valid sender_id required'),
  body('recipient_id').isInt({ min: 1 }).withMessage('Valid recipient_id required'),
  body('weight_kg').isFloat({ min: 0.01 }).withMessage('weight_kg must be > 0'),
  body('size_category')
    .isIn(['SMALL', 'MEDIUM', 'LARGE', 'OVERSIZED'])
    .withMessage('size_category must be SMALL|MEDIUM|LARGE|OVERSIZED'),
  body('service_type')
    .isIn(['STANDARD', 'EXPRESS'])
    .withMessage('service_type must be STANDARD|EXPRESS'),
  body('destination_address').trim().notEmpty().withMessage('destination_address is required'),
  body('route_id').optional({ nullable: true }).isInt({ min: 1 }),
  validate,
  async (req, res, next) => {
    try {
      const {
        sender_id,
        recipient_id,
        weight_kg,
        size_category,
        service_type,
        destination_address,
        route_id,
      } = req.body;

      const tracking_code = generateTrackingCode();

      // Insert parcel — status defaults to 'RECEIVED'
      await db.execute(
        `INSERT INTO PARCEL (
           tracking_code, sender_id, recipient_id,
           status_id, route_id,
           weight_kg, size_category, service_type, destination_address
         )
         SELECT
           :tracking_code, :sender_id, :recipient_id,
           ps.status_id, :route_id,
           :weight_kg, :size_category, :service_type, :destination_address
         FROM PARCEL_STATUS ps
         WHERE ps.status_name = 'RECEIVED'`,
        {
          tracking_code,
          sender_id:           Number(sender_id),
          recipient_id:        Number(recipient_id),
          route_id:            route_id ? Number(route_id) : null,
          weight_kg:           Number(weight_kg),
          size_category,
          service_type,
          destination_address,
        }
      );

      // Log the INTAKE delivery event automatically
      await db.execute(
        `INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, location_notes)
         SELECT p.parcel_id, 'INTAKE', 'PENDING', 'Parcel received at sorting hub'
         FROM   PARCEL p
         WHERE  p.tracking_code = :tracking_code`,
        [tracking_code]
      );

      res.status(201).json({
        success:       true,
        message:       'Parcel created successfully',
        tracking_code,
      });
    } catch (err) {
      next(err);
    }
  }
);

// =============================================================
// PATCH /api/parcels/:id/status
// Update parcel status and log a delivery event
// =============================================================
router.patch(
  '/:id/status',
  body('status')
    .isIn(['RECEIVED', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RESCHEDULED', 'CANCELLED'])
    .withMessage('Invalid status value'),
  body('event_type')
    .isIn(['INTAKE', 'ASSIGNED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RESCHEDULED'])
    .withMessage('Invalid event_type value'),
  body('outcome_code')
    .optional()
    .isIn(['SUCCESS', 'FAILED_ADDRESS', 'FAILED_ABSENT', 'FAILED_REFUSED', 'PENDING']),
  body('recipient_name').optional().trim(),
  body('location_notes').optional().trim(),
  body('assignment_id').optional().isInt({ min: 1 }),
  validate,
  async (req, res, next) => {
    try {
      const { status, event_type, outcome_code, recipient_name, location_notes, assignment_id } =
        req.body;

      // Update parcel status
      await db.execute(
        `UPDATE PARCEL
         SET status_id = (
           SELECT status_id FROM PARCEL_STATUS WHERE status_name = :status
         )
         WHERE parcel_id = :id`,
        { status, id: Number(req.params.id) }
      );

      // Log delivery event
      await db.execute(
        `INSERT INTO DELIVERY_EVENT
           (parcel_id, assignment_id, event_type, outcome_code, recipient_name, location_notes)
         VALUES
           (:id, :assignment_id, :event_type, :outcome_code, :recipient_name, :location_notes)`,
        {
          id:             Number(req.params.id),
          assignment_id:  assignment_id ? Number(assignment_id) : null,
          event_type,
          outcome_code:   outcome_code   || 'PENDING',
          recipient_name: recipient_name || null,
          location_notes: location_notes || null,
        }
      );

      res.json({ success: true, message: 'Parcel status updated' });
    } catch (err) {
      next(err);
    }
  }
);

// =============================================================
// PUT /api/parcels/:id
// Update parcel details (route, destination)
// =============================================================
router.put(
  '/:id',
  body('destination_address').optional().trim().notEmpty(),
  body('route_id').optional().isInt({ min: 1 }),
  body('service_type').optional().isIn(['STANDARD', 'EXPRESS']),
  validate,
  async (req, res, next) => {
    try {
      const { destination_address, route_id, service_type } = req.body;
      await db.execute(
        `UPDATE PARCEL
         SET
           destination_address = NVL(:destination_address, destination_address),
           route_id            = NVL(:route_id,            route_id),
           service_type        = NVL(:service_type,        service_type)
         WHERE parcel_id = :id`,
        {
          destination_address: destination_address || null,
          route_id:            route_id ? Number(route_id) : null,
          service_type:        service_type || null,
          id:                  Number(req.params.id),
        }
      );
      res.json({ success: true, message: 'Parcel updated' });
    } catch (err) {
      next(err);
    }
  }
);

// =============================================================
// DELETE /api/parcels/:id
// Delete parcel (removes delivery events first due to FK)
// =============================================================
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    // Remove child records first
    await db.execute(`DELETE FROM DELIVERY_EVENT WHERE parcel_id = :id`, [id]);
    await db.execute(`DELETE FROM INVOICE        WHERE parcel_id = :id`, [id]);
    const del = await db.execute(`DELETE FROM PARCEL WHERE parcel_id = :id`, [id]);

    if (del.rowsAffected === 0) {
      return res.status(404).json({ success: false, error: 'Parcel not found' });
    }
    res.json({ success: true, message: 'Parcel deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;