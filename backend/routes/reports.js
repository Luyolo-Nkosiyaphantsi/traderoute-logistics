'use strict';
// =============================================================
// backend/routes/reports.js
// Reporting and analytics endpoints for management views
// =============================================================

const express = require('express');
const db      = require('../db/pool');

const router = express.Router();

// =============================================================
// GET /api/reports/summary
// High-level system-wide counts for the dashboard KPI strip
// =============================================================
router.get('/summary', async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM PARCEL)                                           AS total_parcels,
        (SELECT COUNT(*) FROM PARCEL p JOIN PARCEL_STATUS ps
           ON ps.status_id = p.status_id WHERE ps.status_name = 'IN_TRANSIT')  AS in_transit,
        (SELECT COUNT(*) FROM PARCEL p JOIN PARCEL_STATUS ps
           ON ps.status_id = p.status_id WHERE ps.status_name = 'DELIVERED')   AS delivered,
        (SELECT COUNT(*) FROM PARCEL p JOIN PARCEL_STATUS ps
           ON ps.status_id = p.status_id WHERE ps.status_name = 'FAILED')      AS failed,
        (SELECT COUNT(*) FROM CLIENT)                                           AS total_clients,
        (SELECT COUNT(*) FROM DRIVER WHERE is_available = 'Y')                 AS available_drivers,
        (SELECT COUNT(*) FROM VEHICLE WHERE service_status = 'OPERATIONAL')    AS operational_vehicles,
        (SELECT COUNT(*) FROM ROUTE WHERE is_active = 'Y')                     AS active_routes,
        (SELECT COUNT(*) FROM ROUTE_ASSIGNMENT
           WHERE TRUNC(assignment_date) = TRUNC(SYSDATE))                      AS routes_today,
        (SELECT NVL(SUM(amount_zar),0) FROM INVOICE
           WHERE TRUNC(issue_date,'MM') = TRUNC(SYSDATE,'MM'))                 AS revenue_this_month,
        (SELECT NVL(SUM(amount_zar),0) FROM INVOICE
           WHERE payment_status = 'UNPAID')                                    AS outstanding_balance,
        (SELECT COUNT(*) FROM DRIVER
           WHERE license_expiry BETWEEN SYSDATE AND SYSDATE+30)               AS licenses_expiring_soon
      FROM DUAL
    `);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// =============================================================
// GET /api/reports/driver-performance
// Delivery success rates per driver for current month
// =============================================================
router.get('/driver-performance', async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        d.driver_id,
        d.full_name,
        d.phone,
        COUNT(de.event_id)                                                    AS total_deliveries,
        SUM(CASE WHEN de.outcome_code = 'SUCCESS'      THEN 1 ELSE 0 END)    AS successful,
        SUM(CASE WHEN de.outcome_code LIKE 'FAILED%'   THEN 1 ELSE 0 END)    AS failed,
        ROUND(
          SUM(CASE WHEN de.outcome_code = 'SUCCESS' THEN 1 ELSE 0 END)
          * 100.0 / DECODE(COUNT(de.event_id), 0, NULL, COUNT(de.event_id)), 1
        )                                                                     AS success_pct,
        MAX(TO_CHAR(ra.assignment_date,'YYYY-MM-DD'))                         AS last_active
      FROM       DRIVER           d
      LEFT JOIN  ROUTE_ASSIGNMENT ra ON ra.driver_id    = d.driver_id
      LEFT JOIN  DELIVERY_EVENT   de ON de.assignment_id = ra.assignment_id
                                    AND de.event_type   = 'DELIVERED'
      GROUP BY   d.driver_id, d.full_name, d.phone
      ORDER BY   success_pct DESC NULLS LAST
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// =============================================================
// GET /api/reports/route-performance
// Parcel counts, load utilisation, and on-time rate per route
// =============================================================
router.get('/route-performance', async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        r.route_id,
        r.route_code,
        r.route_name,
        r.max_capacity_kg,
        sh.hub_name,
        sh.city                                                        AS hub_city,
        COUNT(DISTINCT p.parcel_id)                                    AS total_parcels,
        COUNT(DISTINCT CASE WHEN ps.status_name = 'DELIVERED'
                            THEN p.parcel_id END)                      AS delivered,
        COUNT(DISTINCT CASE WHEN ps.status_name = 'FAILED'
                            THEN p.parcel_id END)                      AS failed,
        ROUND(
          COUNT(DISTINCT CASE WHEN ps.status_name = 'DELIVERED' THEN p.parcel_id END)
          * 100.0 / DECODE(COUNT(DISTINCT p.parcel_id), 0, NULL, COUNT(DISTINCT p.parcel_id)), 1
        )                                                              AS delivery_rate_pct
      FROM       ROUTE        r
      LEFT JOIN  SORTING_HUB  sh  ON sh.hub_id  = r.hub_id
      LEFT JOIN  PARCEL        p  ON p.route_id  = r.route_id
      LEFT JOIN  PARCEL_STATUS ps ON ps.status_id = p.status_id
      WHERE      r.is_active = 'Y'
      GROUP BY   r.route_id, r.route_code, r.route_name,
                 r.max_capacity_kg, sh.hub_name, sh.city
      ORDER BY   delivery_rate_pct DESC NULLS LAST
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// =============================================================
// GET /api/reports/exceptions
// All failed/rescheduled deliveries with full detail
// =============================================================
router.get('/exceptions', async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        p.parcel_id,
        p.tracking_code,
        p.destination_address,
        ps.status_name,
        de.outcome_code,
        TO_CHAR(de.event_timestamp,'YYYY-MM-DD HH24:MI') AS event_time,
        de.location_notes,
        c2.client_name   AS recipient,
        c2.phone         AS recipient_phone,
        r.route_code,
        d.full_name      AS driver_name
      FROM       DELIVERY_EVENT   de
      JOIN       PARCEL           p   ON p.parcel_id   = de.parcel_id
      JOIN       PARCEL_STATUS    ps  ON ps.status_id  = p.status_id
      JOIN       CLIENT           c2  ON c2.client_id  = p.recipient_id
      LEFT JOIN  ROUTE            r   ON r.route_id    = p.route_id
      LEFT JOIN  ROUTE_ASSIGNMENT ra  ON ra.assignment_id = de.assignment_id
      LEFT JOIN  DRIVER           d   ON d.driver_id   = ra.driver_id
      WHERE de.event_type IN ('FAILED','RESCHEDULED')
      ORDER BY de.event_timestamp DESC
      FETCH FIRST 100 ROWS ONLY
    `);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) { next(err); }
});

// =============================================================
// GET /api/reports/revenue
// Monthly revenue breakdown for last 6 months
// =============================================================
router.get('/revenue', async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        TO_CHAR(issue_date,'YYYY-MM')                                          AS month,
        TO_CHAR(issue_date,'Mon YYYY')                                         AS month_label,
        COUNT(*)                                                                AS invoice_count,
        SUM(CASE WHEN payment_status = 'PAID'    THEN amount_zar ELSE 0 END)   AS paid,
        SUM(CASE WHEN payment_status = 'UNPAID'  THEN amount_zar ELSE 0 END)   AS unpaid,
        SUM(CASE WHEN payment_status = 'OVERDUE' THEN amount_zar ELSE 0 END)   AS overdue,
        SUM(amount_zar)                                                         AS total
      FROM INVOICE
      WHERE issue_date >= ADD_MONTHS(TRUNC(SYSDATE,'MM'), -5)
      GROUP BY TO_CHAR(issue_date,'YYYY-MM'), TO_CHAR(issue_date,'Mon YYYY')
      ORDER BY month ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// =============================================================
// GET /api/reports/tariffs
// Full tariff rate schedule
// =============================================================
router.get('/tariffs', async (_req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        t.tariff_id,
        rz.zone_name,
        rz.province,
        t.size_category,
        t.weight_band_min || ' – ' || t.weight_band_max || ' kg' AS weight_band,
        t.weight_band_min,
        t.weight_band_max,
        t.service_type,
        t.rate_zar,
        TO_CHAR(t.effective_from,'YYYY-MM-DD')                    AS effective_from
      FROM   TARIFF_RATE t
      JOIN   ROUTE_ZONE  rz ON rz.zone_id = t.zone_id
      ORDER BY rz.zone_name, t.size_category, t.weight_band_min, t.service_type
    `);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) { next(err); }
});

module.exports = router;