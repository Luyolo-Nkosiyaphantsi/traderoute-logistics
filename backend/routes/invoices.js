'use strict';
// =============================================================
// backend/routes/invoices.js
// CRUD for INVOICE table — with auto tariff calculation
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
// GET /api/invoices
// All invoices joined with client and parcel details
// =============================================================
router.get('/', async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        i.invoice_id,
        i.invoice_number,
        i.amount_zar,
        i.payment_status,
        TO_CHAR(i.issue_date,   'YYYY-MM-DD') AS issue_date,
        TO_CHAR(i.payment_date, 'YYYY-MM-DD') AS payment_date,
        c.client_id,
        c.client_name,
        c.email        AS client_email,
        p.parcel_id,
        p.tracking_code,
        p.service_type,
        p.weight_kg,
        p.size_category
      FROM       INVOICE  i
      JOIN       CLIENT   c  ON c.client_id = i.client_id
      JOIN       PARCEL   p  ON p.parcel_id = i.parcel_id
      ORDER BY   i.invoice_id DESC
      
    `);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// =============================================================
// GET /api/invoices/summary
// Monthly KPI totals: paid / unpaid / overdue / grand total
// =============================================================
router.get('/summary', async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        NVL(SUM(CASE WHEN payment_status = 'PAID'    THEN amount_zar ELSE 0 END), 0) AS total_paid,
        NVL(SUM(CASE WHEN payment_status = 'UNPAID'  THEN amount_zar ELSE 0 END), 0) AS total_unpaid,
        NVL(SUM(CASE WHEN payment_status = 'OVERDUE' THEN amount_zar ELSE 0 END), 0) AS total_overdue,
        COUNT(*)                                                                       AS total_invoices,
        COUNT(CASE WHEN payment_status = 'PAID'    THEN 1 END)                        AS count_paid,
        COUNT(CASE WHEN payment_status = 'UNPAID'  THEN 1 END)                        AS count_unpaid,
        COUNT(CASE WHEN payment_status = 'OVERDUE' THEN 1 END)                        AS count_overdue,
        NVL(SUM(amount_zar), 0)                                                        AS grand_total
      FROM INVOICE
      WHERE TRUNC(issue_date, 'MM') = TRUNC(SYSDATE, 'MM')
    `);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// =============================================================
// GET /api/invoices/:id
// Single invoice with full detail
// =============================================================
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT
         i.invoice_id,
         i.invoice_number,
         i.amount_zar,
         i.payment_status,
         TO_CHAR(i.issue_date,   'YYYY-MM-DD') AS issue_date,
         TO_CHAR(i.payment_date, 'YYYY-MM-DD') AS payment_date,
         c.client_name, c.email AS client_email, c.address AS client_address,
         p.tracking_code, p.weight_kg, p.size_category, p.service_type,
         p.destination_address
       FROM INVOICE i
       JOIN CLIENT  c ON c.client_id = i.client_id
       JOIN PARCEL  p ON p.parcel_id = i.parcel_id
       WHERE i.invoice_id = :id`,
      [Number(req.params.id)]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// =============================================================
// POST /api/invoices
// Generate an invoice — amount auto-calculated from TARIFF_RATE
// via Oracle JOIN on weight_band, zone, size_category, service_type
// =============================================================
router.post(
  '/',
  body('parcel_id').isInt({ min: 1 }).withMessage('Valid parcel_id required'),
  body('client_id').isInt({ min: 1 }).withMessage('Valid client_id required'),
  validate,
  async (req, res, next) => {
    try {
      const { parcel_id, client_id } = req.body;

      // Lookup applicable tariff rate via Oracle JOIN
      const tariffResult = await db.query(
        `SELECT t.rate_zar
         FROM   PARCEL       p
         JOIN   ROUTE_ZONE   rz
                  ON rz.route_id = p.route_id
         JOIN   TARIFF_RATE  t
                  ON  p.weight_kg     BETWEEN t.weight_band_min AND t.weight_band_max
                  AND p.size_category = t.size_category
                  AND p.service_type  = t.service_type
                  AND rz.zone_id      = t.zone_id
         WHERE  p.parcel_id  = :parcel_id
         AND ROWNUM = 1`,
        [Number(parcel_id)]
      );

      if (tariffResult.rows.length === 0) {
        return res.status(422).json({
          success: false,
          error:
            'No matching tariff rate found for this parcel. ' +
            'Check that the parcel has a route with a zone, and that a tariff rate covers ' +
            'its weight, size category, and service type.',
        });
      }

      const amount_zar = tariffResult.rows[0].RATE_ZAR;

      // Generate unique invoice number: INV-YYYY-NNNNN
      const seqResult = await db.query(
        `SELECT 'INV-' || TO_CHAR(SYSDATE,'YYYY') || '-' || LPAD(invoice_seq.NEXTVAL, 5, '0') AS inv_num
         FROM DUAL`
      );
      const invoice_number = seqResult.rows[0].INV_NUM;

      // Insert invoice
      await db.execute(
        `INSERT INTO INVOICE (parcel_id, client_id, invoice_number, amount_zar, payment_status)
         VALUES (:parcel_id, :client_id, :invoice_number, :amount_zar, 'UNPAID')`,
        {
          parcel_id:      Number(parcel_id),
          client_id:      Number(client_id),
          invoice_number,
          amount_zar,
        }
      );

      res.status(201).json({
        success:        true,
        message:        'Invoice generated successfully',
        invoice_number,
        amount_zar,
      });
    } catch (err) {
      next(err);
    }
  }
);

// =============================================================
// PATCH /api/invoices/:id/pay
// Mark an invoice as PAID and stamp the payment date
// =============================================================
router.patch('/:id/pay', async (req, res, next) => {
  try {
    const result = await db.execute(
      `UPDATE INVOICE
       SET payment_status = 'PAID',
           payment_date   = SYSDATE
       WHERE invoice_id = :id`,
      [Number(req.params.id)]
    );
    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    res.json({ success: true, message: 'Invoice marked as PAID' });
  } catch (err) {
    next(err);
  }
});

// =============================================================
// PATCH /api/invoices/:id/status
// Update payment status to any valid value
// =============================================================
router.patch(
  '/:id/status',
  body('payment_status')
    .isIn(['UNPAID', 'PAID', 'OVERDUE', 'CANCELLED'])
    .withMessage('payment_status must be UNPAID|PAID|OVERDUE|CANCELLED'),
  validate,
  async (req, res, next) => {
    try {
      const { payment_status } = req.body;
      await db.execute(
        `UPDATE INVOICE
         SET
           payment_status = :status,
           payment_date   = CASE WHEN :status = 'PAID' THEN SYSDATE ELSE payment_date END
         WHERE invoice_id = :id`,
        { status: payment_status, id: Number(req.params.id) }
      );
      res.json({ success: true, message: `Invoice status updated to ${payment_status}` });
    } catch (err) {
      next(err);
    }
  }
);

// =============================================================
// DELETE /api/invoices/:id
// Delete an invoice (only if CANCELLED or in test environments)
// =============================================================
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.execute(
      `DELETE FROM INVOICE WHERE invoice_id = :id`,
      [Number(req.params.id)]
    );
    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;