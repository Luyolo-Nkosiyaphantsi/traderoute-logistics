'use strict';
// =============================================================
// backend/routes/search.js
// Global search endpoint — searches across parcels, clients,
// drivers, and routes in a single query
// =============================================================

const express = require('express');
const db      = require('../db/pool');

const router = express.Router();

// =============================================================
// GET /api/search?q=<term>
// Searches parcels (tracking code), clients (name/email),
// drivers (name/license), routes (code/name)
// =============================================================
router.get('/', async (req, res, next) => {
  const q = (req.query.q || '').trim();

  if (!q || q.length < 2) {
    return res.status(400).json({
      success: false,
      error:   'Search query must be at least 2 characters',
    });
  }

  const term = '%' + q.toUpperCase() + '%';

  try {
    // Run all four searches in parallel
    const [parcelsRes, clientsRes, driversRes, routesRes] = await Promise.all([

      // Parcels — by tracking code or destination
      db.query(
        `SELECT 'parcel' AS result_type,
                p.parcel_id   AS id,
                p.tracking_code AS label,
                ps.status_name  AS sublabel,
                p.destination_address AS detail
         FROM   PARCEL        p
         JOIN   PARCEL_STATUS ps ON ps.status_id = p.status_id
         WHERE  UPPER(p.tracking_code)       LIKE :term
         OR     UPPER(p.destination_address) LIKE :term
         AND ROWNUM <= 10`,
        { term }
      ),

      // Clients — by name or email
      db.query(
        `SELECT 'client' AS result_type,
                client_id   AS id,
                client_name AS label,
                client_type AS sublabel,
                email       AS detail
         FROM   CLIENT
         WHERE  UPPER(client_name) LIKE :term
         OR     UPPER(email)       LIKE :term
         AND ROWNUM <= 10`,
        { term }
      ),

      // Drivers — by name or license
      db.query(
        `SELECT 'driver' AS result_type,
                driver_id      AS id,
                full_name      AS label,
                license_number AS sublabel,
                phone          AS detail
         FROM   DRIVER
         WHERE  UPPER(full_name)      LIKE :term
         OR     UPPER(license_number) LIKE :term
         AND ROWNUM <= 10`,
        { term }
      ),

      // Routes — by code or name
      db.query(
        `SELECT 'route' AS result_type,
                r.route_id   AS id,
                r.route_code AS label,
                r.route_name AS sublabel,
                sh.city      AS detail
         FROM   ROUTE r
         LEFT JOIN SORTING_HUB sh ON sh.hub_id = r.hub_id
         WHERE  UPPER(r.route_code) LIKE :term
         OR     UPPER(r.route_name) LIKE :term
         AND ROWNUM <= 10`,
        { term }
      ),
    ]);

    res.json({
      success: true,
      query:   q,
      results: {
        parcels: parcelsRes.rows,
        clients: clientsRes.rows,
        drivers: driversRes.rows,
        routes:  routesRes.rows,
      },
      total:
        parcelsRes.rows.length +
        clientsRes.rows.length +
        driversRes.rows.length +
        routesRes.rows.length,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;