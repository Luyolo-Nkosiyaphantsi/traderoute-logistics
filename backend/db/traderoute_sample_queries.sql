-- =============================================================
-- TRADEROUTE LOGISTICS - SAMPLE QUERIES
-- Compatible with all Oracle versions
-- =============================================================

-- =============================================================
-- SECTION 1: PARCEL TRACKING
-- =============================================================

-- 1.1 Track a specific parcel - full history
SELECT
    p.tracking_code,
    ps.status_name,
    c1.client_name  AS sender,
    c2.client_name  AS recipient,
    p.weight_kg,
    p.size_category,
    p.service_type,
    p.destination_address,
    de.event_type,
    de.outcome_code,
    TO_CHAR(de.event_timestamp,'YYYY-MM-DD HH24:MI:SS') AS event_time,
    de.recipient_name,
    de.location_notes,
    d.full_name      AS driver_name
FROM       PARCEL         p
JOIN       PARCEL_STATUS  ps  ON ps.status_id  = p.status_id
JOIN       CLIENT         c1  ON c1.client_id  = p.sender_id
JOIN       CLIENT         c2  ON c2.client_id  = p.recipient_id
LEFT JOIN  DELIVERY_EVENT de  ON de.parcel_id  = p.parcel_id
LEFT JOIN  ROUTE_ASSIGNMENT ra ON ra.assignment_id = de.assignment_id
LEFT JOIN  DRIVER          d  ON d.driver_id   = ra.driver_id
WHERE UPPER(p.tracking_code) = UPPER('TR-240601-10001')
ORDER BY de.event_timestamp ASC;

-- 1.2 All IN_TRANSIT parcels right now
SELECT
    p.tracking_code,
    p.destination_address,
    r.route_code,
    r.route_name,
    d.full_name    AS driver,
    v.registration AS vehicle
FROM       PARCEL         p
JOIN       PARCEL_STATUS  ps  ON ps.status_id = p.status_id AND ps.status_name = 'IN_TRANSIT'
LEFT JOIN  ROUTE          r   ON r.route_id   = p.route_id
LEFT JOIN  ROUTE_ASSIGNMENT ra ON ra.route_id = r.route_id
                              AND TRUNC(ra.assignment_date) = TRUNC(SYSDATE)
LEFT JOIN  DRIVER          d  ON d.driver_id  = ra.driver_id
LEFT JOIN  VEHICLE         v  ON v.vehicle_id = ra.vehicle_id;

-- 1.3 All FAILED deliveries in the last 7 days
SELECT
    p.tracking_code,
    de.outcome_code,
    de.location_notes,
    TO_CHAR(de.event_timestamp,'YYYY-MM-DD HH24:MI') AS failed_at,
    c2.client_name  AS recipient
FROM       DELIVERY_EVENT de
JOIN       PARCEL         p   ON p.parcel_id  = de.parcel_id
JOIN       CLIENT         c2  ON c2.client_id = p.recipient_id
WHERE  de.event_type = 'FAILED'
AND    de.event_timestamp >= SYSDATE - 7
ORDER BY de.event_timestamp DESC;

-- 1.4 Count of parcels by status
SELECT
    ps.status_name,
    COUNT(p.parcel_id) AS parcel_count
FROM       PARCEL_STATUS ps
LEFT JOIN  PARCEL        p  ON p.status_id = ps.status_id
GROUP BY   ps.status_name
ORDER BY   parcel_count DESC;

-- =============================================================
-- SECTION 2: ROUTE AND DRIVER OPERATIONS
-- =============================================================

-- 2.1 Todays full route schedule
SELECT
    r.route_code,
    r.route_name,
    sh.hub_name,
    d.full_name                                              AS driver,
    d.phone                                                  AS driver_phone,
    v.registration,
    v.make || ' ' || v.model                                 AS vehicle,
    v.capacity_kg,
    ra.total_load_kg,
    ROUND(ra.total_load_kg / v.capacity_kg * 100, 1)         AS utilisation_pct
FROM      ROUTE_ASSIGNMENT  ra
JOIN      ROUTE             r   ON r.route_id   = ra.route_id
JOIN      DRIVER            d   ON d.driver_id  = ra.driver_id
JOIN      VEHICLE           v   ON v.vehicle_id = ra.vehicle_id
LEFT JOIN SORTING_HUB       sh  ON sh.hub_id    = r.hub_id
WHERE     TRUNC(ra.assignment_date) = TRUNC(SYSDATE)
ORDER BY  r.route_code;

-- 2.2 Drivers available for assignment today
SELECT
    d.driver_id,
    d.full_name,
    d.license_number,
    TO_CHAR(d.license_expiry,'YYYY-MM-DD') AS license_expiry,
    d.phone
FROM   DRIVER d
WHERE  d.is_available  = 'Y'
AND    d.license_expiry > SYSDATE
AND    d.driver_id NOT IN (
         SELECT ra.driver_id
         FROM   ROUTE_ASSIGNMENT ra
         WHERE  TRUNC(ra.assignment_date) = TRUNC(SYSDATE)
       )
ORDER BY d.full_name;

-- 2.3 Driver performance this month
SELECT
    d.driver_id,
    d.full_name,
    COUNT(de.event_id)                                                    AS total_attempts,
    SUM(CASE WHEN de.outcome_code = 'SUCCESS'    THEN 1 ELSE 0 END)      AS delivered,
    SUM(CASE WHEN de.outcome_code LIKE 'FAILED%' THEN 1 ELSE 0 END)      AS failed
FROM       DRIVER           d
JOIN       ROUTE_ASSIGNMENT ra ON ra.driver_id    = d.driver_id
JOIN       DELIVERY_EVENT   de ON de.assignment_id = ra.assignment_id
WHERE      de.event_type     = 'DELIVERED'
AND        ra.assignment_date >= TRUNC(SYSDATE, 'MM')
GROUP BY   d.driver_id, d.full_name
ORDER BY   delivered DESC;

-- 2.4 All parcels on a specific route today
SELECT
    p.tracking_code,
    p.weight_kg,
    p.service_type,
    p.destination_address,
    ps.status_name
FROM   PARCEL        p
JOIN   PARCEL_STATUS ps ON ps.status_id = p.status_id
WHERE  p.route_id = 1
AND    TRUNC(p.intake_date) = TRUNC(SYSDATE)
ORDER BY p.parcel_id;

-- =============================================================
-- SECTION 3: BILLING AND INVOICING
-- =============================================================

-- 3.1 All outstanding invoices by client
SELECT
    c.client_name,
    c.email,
    i.invoice_number,
    i.amount_zar,
    TO_CHAR(i.issue_date,'YYYY-MM-DD') AS issue_date,
    i.payment_status
FROM   INVOICE  i
JOIN   CLIENT   c  ON c.client_id = i.client_id
WHERE  i.payment_status IN ('UNPAID','OVERDUE')
ORDER BY i.issue_date ASC;

-- 3.2 Monthly revenue summary
SELECT
    TO_CHAR(issue_date,'YYYY-MM')                                               AS month,
    COUNT(*)                                                                     AS invoice_count,
    SUM(CASE WHEN payment_status = 'PAID'    THEN amount_zar ELSE 0 END)        AS paid,
    SUM(CASE WHEN payment_status = 'UNPAID'  THEN amount_zar ELSE 0 END)        AS unpaid,
    SUM(amount_zar)                                                              AS total
FROM   INVOICE
GROUP BY TO_CHAR(issue_date,'YYYY-MM')
ORDER BY month DESC;

-- 3.3 Calculate tariff for a parcel
SELECT
    p.tracking_code,
    p.weight_kg,
    p.size_category,
    p.service_type,
    rz.zone_name,
    t.rate_zar  AS invoice_amount
FROM   PARCEL       p
JOIN   ROUTE_ZONE   rz ON rz.route_id = p.route_id
JOIN   TARIFF_RATE  t
           ON  p.weight_kg     BETWEEN t.weight_band_min AND t.weight_band_max
           AND p.size_category = t.size_category
           AND p.service_type  = t.service_type
           AND rz.zone_id      = t.zone_id
WHERE  p.parcel_id = 1;

-- 3.4 Full tariff rate schedule
SELECT
    rz.zone_name,
    t.size_category,
    t.weight_band_min || ' - ' || t.weight_band_max || ' kg' AS weight_band,
    t.service_type,
    t.rate_zar,
    TO_CHAR(t.effective_from,'YYYY-MM-DD') AS effective_from
FROM   TARIFF_RATE  t
JOIN   ROUTE_ZONE   rz ON rz.zone_id = t.zone_id
ORDER BY rz.zone_name, t.size_category, t.weight_band_min, t.service_type;

-- =============================================================
-- SECTION 4: ADMIN AND MAINTENANCE
-- =============================================================

-- 4.1 Drivers with expiring licenses in next 60 days
SELECT
    driver_id,
    full_name,
    license_number,
    TO_CHAR(license_expiry,'YYYY-MM-DD') AS license_expiry,
    ROUND(license_expiry - SYSDATE)       AS days_remaining
FROM   DRIVER
WHERE  license_expiry BETWEEN SYSDATE AND SYSDATE + 60
ORDER BY license_expiry ASC;

-- 4.2 Vehicles not serviced in more than 90 days
SELECT
    vehicle_id,
    registration,
    make || ' ' || model                           AS vehicle,
    service_status,
    TO_CHAR(last_service_date,'YYYY-MM-DD')        AS last_service,
    ROUND(SYSDATE - last_service_date)             AS days_since_service
FROM   VEHICLE
WHERE  last_service_date < SYSDATE - 90
ORDER BY days_since_service DESC;

-- 4.3 Routes with capacity exceeded today
SELECT
    r.route_code,
    r.route_name,
    r.max_capacity_kg,
    ra.total_load_kg,
    ROUND((ra.total_load_kg - r.max_capacity_kg), 1) AS over_by_kg
FROM   ROUTE_ASSIGNMENT  ra
JOIN   ROUTE             r  ON r.route_id = ra.route_id
WHERE  TRUNC(ra.assignment_date) = TRUNC(SYSDATE)
AND    ra.total_load_kg > r.max_capacity_kg;

-- 4.4 Clients with most parcels (top 10 using ROWNUM)
SELECT * FROM (
    SELECT
        c.client_name,
        c.client_type,
        COUNT(p.parcel_id)    AS total_parcels,
        COUNT(CASE WHEN ps.status_name = 'DELIVERED' THEN 1 END) AS delivered
    FROM       CLIENT  c
    LEFT JOIN  PARCEL  p   ON p.sender_id = c.client_id
    LEFT JOIN  PARCEL_STATUS ps ON ps.status_id = p.status_id
    GROUP BY   c.client_name, c.client_type
    ORDER BY   total_parcels DESC
) WHERE ROWNUM <= 10;

-- =============================================================
-- SECTION 5: INSERT / UPDATE / DELETE EXAMPLES
-- =============================================================

-- 5.1 Insert new client (using unique email)
INSERT INTO CLIENT (client_name, client_type, email, phone, address)
VALUES ('New Test Client', 'INDIVIDUAL', 'newtestclient@example.co.za', '+27 82 000 0000', '1 Test St, Johannesburg, 2000');
COMMIT;

-- 5.2 Update client address
UPDATE CLIENT
SET   address = '99 New Address, Sandton, 2196',
      phone   = '+27 83 999 1111'
WHERE client_id = 1;
COMMIT;

-- 5.3 Update parcel status to DELIVERED and log event
UPDATE PARCEL
SET status_id = (SELECT status_id FROM PARCEL_STATUS WHERE status_name = 'DELIVERED')
WHERE parcel_id = 9;

INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, recipient_name, location_notes)
VALUES (9, 'DELIVERED', 'SUCCESS', 'J. Pietersen', 'Delivered signed at front door');
COMMIT;

-- 5.4 Mark an invoice as paid
UPDATE INVOICE
SET payment_status = 'PAID',
    payment_date   = SYSDATE
WHERE invoice_number = 'INV-2024-00003';
COMMIT;

-- 5.5 Deactivate a route (soft delete)
UPDATE ROUTE SET is_active = 'N' WHERE route_code = 'R-09';
COMMIT;

-- 5.6 Reactivate the route
UPDATE ROUTE SET is_active = 'Y' WHERE route_code = 'R-09';
COMMIT;

-- 5.7 Delete the test client we inserted in 5.1
DELETE FROM CLIENT WHERE email = 'newtestclient@example.co.za';
COMMIT;