-- =============================================================
-- TRADEROUTE LOGISTICS — STORED PROCEDURES, FUNCTIONS & TRIGGERS
-- Run in Oracle SQL Developer AFTER traderoute_oracle_ddl.sql
-- =============================================================

-- =============================================================
-- SECTION 1: STORED PROCEDURES
-- =============================================================

-- -------------------------------------------------------------
-- SP_INTAKE_PARCEL
-- Creates a new parcel record and immediately logs the INTAKE
-- delivery event in a single transaction.
-- Outputs the generated tracking code via OUT parameter.
-- -------------------------------------------------------------
CREATE OR REPLACE PROCEDURE SP_INTAKE_PARCEL (
    p_sender_id           IN  NUMBER,
    p_recipient_id        IN  NUMBER,
    p_weight_kg           IN  NUMBER,
    p_size_category       IN  VARCHAR2,
    p_service_type        IN  VARCHAR2,
    p_destination_address IN  VARCHAR2,
    p_route_id            IN  NUMBER   DEFAULT NULL,
    p_tracking_code       OUT VARCHAR2
)
AS
    v_status_id     NUMBER;
    v_parcel_id     NUMBER;
    v_date_part     VARCHAR2(6);
    v_rand_part     VARCHAR2(5);
BEGIN
    -- Generate tracking code: TR-YYMMDD-NNNNN
    v_date_part := TO_CHAR(SYSDATE, 'YYMMDD');
    SELECT LPAD(MOD(parcel_seq.NEXTVAL, 99999), 5, '0')
    INTO   v_rand_part
    FROM   DUAL;

    p_tracking_code := 'TR-' || v_date_part || '-' || v_rand_part;

    -- Get the RECEIVED status id
    SELECT status_id INTO v_status_id
    FROM   PARCEL_STATUS
    WHERE  status_name = 'RECEIVED';

    -- Insert parcel
    INSERT INTO PARCEL (
        tracking_code, sender_id, recipient_id, status_id, route_id,
        weight_kg, size_category, service_type, destination_address
    ) VALUES (
        p_tracking_code, p_sender_id, p_recipient_id, v_status_id, p_route_id,
        p_weight_kg, p_size_category, p_service_type, p_destination_address
    ) RETURNING parcel_id INTO v_parcel_id;

    -- Log INTAKE delivery event
    INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, location_notes)
    VALUES (v_parcel_id, 'INTAKE', 'PENDING', 'Parcel received at sorting hub');

    COMMIT;

    DBMS_OUTPUT.PUT_LINE('Parcel created: ' || p_tracking_code || ' (ID: ' || v_parcel_id || ')');

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        DBMS_OUTPUT.PUT_LINE('ERROR in SP_INTAKE_PARCEL: ' || SQLERRM);
        RAISE;
END SP_INTAKE_PARCEL;
/

-- Test SP_INTAKE_PARCEL:
-- DECLARE
--     v_code VARCHAR2(30);
-- BEGIN
--     SP_INTAKE_PARCEL(1, 2, 3.5, 'MEDIUM', 'STANDARD',
--                      '12 Test St, Sandton, 2196', 1, v_code);
--     DBMS_OUTPUT.PUT_LINE('Tracking code: ' || v_code);
-- END;
-- /


-- -------------------------------------------------------------
-- SP_UPDATE_PARCEL_STATUS
-- Updates a parcel status and logs the delivery event atomically.
-- -------------------------------------------------------------
CREATE OR REPLACE PROCEDURE SP_UPDATE_PARCEL_STATUS (
    p_parcel_id      IN NUMBER,
    p_new_status     IN VARCHAR2,   -- e.g. 'DELIVERED'
    p_event_type     IN VARCHAR2,   -- e.g. 'DELIVERED'
    p_outcome_code   IN VARCHAR2    DEFAULT 'PENDING',
    p_recipient_name IN VARCHAR2    DEFAULT NULL,
    p_location_notes IN VARCHAR2    DEFAULT NULL,
    p_assignment_id  IN NUMBER      DEFAULT NULL
)
AS
    v_status_id NUMBER;
BEGIN
    -- Validate status exists
    SELECT status_id INTO v_status_id
    FROM   PARCEL_STATUS
    WHERE  status_name = p_new_status;

    -- Update parcel status
    UPDATE PARCEL
    SET    status_id = v_status_id
    WHERE  parcel_id = p_parcel_id;

    IF SQL%ROWCOUNT = 0 THEN
        RAISE_APPLICATION_ERROR(-20001, 'Parcel ID ' || p_parcel_id || ' not found');
    END IF;

    -- Log delivery event
    INSERT INTO DELIVERY_EVENT (
        parcel_id, assignment_id, event_type,
        outcome_code, recipient_name, location_notes
    ) VALUES (
        p_parcel_id, p_assignment_id, p_event_type,
        p_outcome_code, p_recipient_name, p_location_notes
    );

    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Parcel ' || p_parcel_id || ' status → ' || p_new_status);

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        ROLLBACK;
        RAISE_APPLICATION_ERROR(-20002, 'Status "' || p_new_status || '" does not exist in PARCEL_STATUS');
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END SP_UPDATE_PARCEL_STATUS;
/


-- -------------------------------------------------------------
-- SP_ASSIGN_ROUTE
-- Assigns a driver + vehicle to a route for a given date.
-- Validates business rules before inserting:
--   1. Driver has valid (non-expired) license
--   2. Vehicle is OPERATIONAL
--   3. No duplicate assignment (driver/vehicle/route) that day
-- -------------------------------------------------------------
CREATE OR REPLACE PROCEDURE SP_ASSIGN_ROUTE (
    p_route_id        IN NUMBER,
    p_driver_id       IN NUMBER,
    p_vehicle_id      IN NUMBER,
    p_assignment_date IN DATE,
    p_total_load_kg   IN NUMBER DEFAULT NULL,
    p_assignment_id   OUT NUMBER
)
AS
    v_license_expiry  DATE;
    v_vehicle_status  VARCHAR2(20);
    v_max_capacity    NUMBER;
BEGIN
    -- Rule 1: Driver must have a valid (non-expired) license
    SELECT license_expiry INTO v_license_expiry
    FROM   DRIVER WHERE driver_id = p_driver_id;

    IF v_license_expiry <= TRUNC(p_assignment_date) THEN
        RAISE_APPLICATION_ERROR(-20010,
            'Driver ' || p_driver_id || ' has an expired license (' ||
            TO_CHAR(v_license_expiry,'YYYY-MM-DD') || ')');
    END IF;

    -- Rule 2: Vehicle must be OPERATIONAL
    SELECT service_status, capacity_kg
    INTO   v_vehicle_status, v_max_capacity
    FROM   VEHICLE WHERE vehicle_id = p_vehicle_id;

    IF v_vehicle_status != 'OPERATIONAL' THEN
        RAISE_APPLICATION_ERROR(-20011,
            'Vehicle ' || p_vehicle_id || ' is not operational (status: ' || v_vehicle_status || ')');
    END IF;

    -- Rule 3: Load cannot exceed vehicle capacity
    IF p_total_load_kg IS NOT NULL AND p_total_load_kg > v_max_capacity THEN
        RAISE_APPLICATION_ERROR(-20012,
            'Load (' || p_total_load_kg || ' kg) exceeds vehicle capacity (' || v_max_capacity || ' kg)');
    END IF;

    -- Insert assignment (UNIQUE constraints handle duplicate protection)
    INSERT INTO ROUTE_ASSIGNMENT (
        route_id, driver_id, vehicle_id, assignment_date, total_load_kg
    ) VALUES (
        p_route_id, p_driver_id, p_vehicle_id, TRUNC(p_assignment_date), p_total_load_kg
    ) RETURNING assignment_id INTO p_assignment_id;

    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Route assigned. Assignment ID: ' || p_assignment_id);

EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN
        ROLLBACK;
        RAISE_APPLICATION_ERROR(-20013,
            'Driver, vehicle, or route already assigned on ' ||
            TO_CHAR(p_assignment_date,'YYYY-MM-DD'));
    WHEN NO_DATA_FOUND THEN
        ROLLBACK;
        RAISE_APPLICATION_ERROR(-20014, 'Driver or Vehicle ID not found');
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END SP_ASSIGN_ROUTE;
/


-- -------------------------------------------------------------
-- SP_GENERATE_INVOICE
-- Looks up the applicable tariff rate for a parcel and
-- creates the invoice automatically.
-- Returns the invoice number and calculated amount.
-- -------------------------------------------------------------
CREATE OR REPLACE PROCEDURE SP_GENERATE_INVOICE (
    p_parcel_id      IN  NUMBER,
    p_client_id      IN  NUMBER,
    p_invoice_number OUT VARCHAR2,
    p_amount_zar     OUT NUMBER
)
AS
    v_invoice_id NUMBER;
BEGIN
    -- Lookup tariff rate via zone JOIN
    SELECT t.rate_zar
    INTO   p_amount_zar
    FROM   PARCEL       p
    JOIN   ROUTE_ZONE   rz ON rz.route_id = p.route_id
    JOIN   TARIFF_RATE  t
               ON  p.weight_kg     BETWEEN t.weight_band_min AND t.weight_band_max
               AND p.size_category = t.size_category
               AND p.service_type  = t.service_type
               AND rz.zone_id      = t.zone_id
    WHERE  p.parcel_id  = p_parcel_id
    FETCH FIRST 1 ROWS ONLY;

    -- Generate invoice number
    SELECT 'INV-' || TO_CHAR(SYSDATE,'YYYY') || '-' || LPAD(invoice_seq.NEXTVAL,5,'0')
    INTO   p_invoice_number
    FROM   DUAL;

    -- Insert invoice
    INSERT INTO INVOICE (parcel_id, client_id, invoice_number, amount_zar, payment_status)
    VALUES (p_parcel_id, p_client_id, p_invoice_number, p_amount_zar, 'UNPAID')
    RETURNING invoice_id INTO v_invoice_id;

    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Invoice: ' || p_invoice_number || '  Amount: R' || p_amount_zar);

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        ROLLBACK;
        RAISE_APPLICATION_ERROR(-20020,
            'No matching tariff rate found for parcel ' || p_parcel_id ||
            '. Ensure the parcel has a route with a zone and the tariff rate table is populated.');
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END SP_GENERATE_INVOICE;
/


-- =============================================================
-- SECTION 2: FUNCTIONS
-- =============================================================

-- -------------------------------------------------------------
-- FN_GET_PARCEL_STATUS
-- Returns the current status name for a given tracking code.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION FN_GET_PARCEL_STATUS (
    p_tracking_code IN VARCHAR2
) RETURN VARCHAR2
AS
    v_status VARCHAR2(30);
BEGIN
    SELECT ps.status_name
    INTO   v_status
    FROM   PARCEL        p
    JOIN   PARCEL_STATUS ps ON ps.status_id = p.status_id
    WHERE  UPPER(p.tracking_code) = UPPER(p_tracking_code);

    RETURN v_status;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN 'NOT_FOUND';
END FN_GET_PARCEL_STATUS;
/

-- Test: SELECT FN_GET_PARCEL_STATUS('TR-240601-10001') FROM DUAL;


-- -------------------------------------------------------------
-- FN_CALC_TARIFF
-- Returns the applicable tariff rate for a given parcel ID.
-- Returns -1 if no matching rate found.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION FN_CALC_TARIFF (
    p_parcel_id IN NUMBER
) RETURN NUMBER
AS
    v_rate NUMBER;
BEGIN
    SELECT t.rate_zar
    INTO   v_rate
    FROM   PARCEL       p
    JOIN   ROUTE_ZONE   rz ON rz.route_id = p.route_id
    JOIN   TARIFF_RATE  t
               ON  p.weight_kg     BETWEEN t.weight_band_min AND t.weight_band_max
               AND p.size_category = t.size_category
               AND p.service_type  = t.service_type
               AND rz.zone_id      = t.zone_id
    WHERE  p.parcel_id  = p_parcel_id
    FETCH FIRST 1 ROWS ONLY;

    RETURN v_rate;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN -1;
END FN_CALC_TARIFF;
/

-- Test: SELECT FN_CALC_TARIFF(1) FROM DUAL;


-- -------------------------------------------------------------
-- FN_DRIVER_ON_TIME_RATE
-- Returns the on-time delivery percentage for a driver
-- in the current calendar month.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION FN_DRIVER_ON_TIME_RATE (
    p_driver_id IN NUMBER
) RETURN NUMBER
AS
    v_total     NUMBER := 0;
    v_success   NUMBER := 0;
BEGIN
    SELECT COUNT(*),
           SUM(CASE WHEN de.outcome_code = 'SUCCESS' THEN 1 ELSE 0 END)
    INTO   v_total, v_success
    FROM   ROUTE_ASSIGNMENT ra
    JOIN   DELIVERY_EVENT   de ON de.assignment_id = ra.assignment_id
    WHERE  ra.driver_id       = p_driver_id
    AND    ra.assignment_date >= TRUNC(SYSDATE,'MM')
    AND    de.event_type      = 'DELIVERED';

    IF v_total = 0 THEN
        RETURN NULL;
    END IF;

    RETURN ROUND(v_success * 100.0 / v_total, 1);
END FN_DRIVER_ON_TIME_RATE;
/

-- Test: SELECT FN_DRIVER_ON_TIME_RATE(1) FROM DUAL;


-- =============================================================
-- SECTION 3: TRIGGERS
-- =============================================================

-- -------------------------------------------------------------
-- TRG_PARCEL_AUDIT
-- Automatically logs a DELIVERY_EVENT whenever a parcel's
-- status_id changes — provides a complete audit trail.
-- -------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_PARCEL_AUDIT
AFTER UPDATE OF status_id ON PARCEL
FOR EACH ROW
WHEN (OLD.status_id != NEW.status_id)
DECLARE
    v_new_status VARCHAR2(30);
    v_event_type VARCHAR2(30);
BEGIN
    -- Get the new status name
    SELECT status_name INTO v_new_status
    FROM   PARCEL_STATUS
    WHERE  status_id = :NEW.status_id;

    -- Map status to event type
    v_event_type := CASE v_new_status
        WHEN 'RECEIVED'    THEN 'INTAKE'
        WHEN 'ASSIGNED'    THEN 'ASSIGNED'
        WHEN 'IN_TRANSIT'  THEN 'IN_TRANSIT'
        WHEN 'DELIVERED'   THEN 'DELIVERED'
        WHEN 'FAILED'      THEN 'FAILED'
        WHEN 'RESCHEDULED' THEN 'RESCHEDULED'
        WHEN 'CANCELLED'   THEN 'RESCHEDULED'
        ELSE 'INTAKE'
    END;

    -- Insert audit event
    INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, location_notes)
    VALUES (
        :NEW.parcel_id,
        v_event_type,
        CASE WHEN v_new_status = 'DELIVERED' THEN 'SUCCESS'
             WHEN v_new_status = 'FAILED'    THEN 'FAILED_ADDRESS'
             ELSE 'PENDING'
        END,
        'Status changed from ' ||
        (SELECT status_name FROM PARCEL_STATUS WHERE status_id = :OLD.status_id) ||
        ' to ' || v_new_status || ' (system trigger)'
    );
END TRG_PARCEL_AUDIT;
/


-- -------------------------------------------------------------
-- TRG_INVOICE_ON_DELIVERY
-- When a parcel status changes to DELIVERED, automatically
-- checks if an invoice already exists. If not, generates one.
-- -------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_INVOICE_ON_DELIVERY
AFTER UPDATE OF status_id ON PARCEL
FOR EACH ROW
DECLARE
    v_new_status    VARCHAR2(30);
    v_invoice_count NUMBER;
    v_rate          NUMBER;
    v_inv_number    VARCHAR2(30);
BEGIN
    -- Only fire when new status is DELIVERED
    SELECT status_name INTO v_new_status
    FROM   PARCEL_STATUS
    WHERE  status_id = :NEW.status_id;

    IF v_new_status != 'DELIVERED' THEN
        RETURN;
    END IF;

    -- Check if invoice already exists
    SELECT COUNT(*) INTO v_invoice_count
    FROM   INVOICE
    WHERE  parcel_id = :NEW.parcel_id;

    IF v_invoice_count > 0 THEN
        RETURN;  -- Invoice already generated
    END IF;

    -- Calculate tariff rate
    BEGIN
        SELECT t.rate_zar INTO v_rate
        FROM   ROUTE_ZONE   rz
        JOIN   TARIFF_RATE  t
                   ON  :NEW.weight_kg    BETWEEN t.weight_band_min AND t.weight_band_max
                   AND :NEW.size_category = t.size_category
                   AND :NEW.service_type  = t.service_type
                   AND rz.zone_id         = t.zone_id
        WHERE  rz.route_id = :NEW.route_id
        FETCH FIRST 1 ROWS ONLY;

        -- Generate invoice number
        SELECT 'INV-' || TO_CHAR(SYSDATE,'YYYY') || '-' || LPAD(invoice_seq.NEXTVAL,5,'0')
        INTO   v_inv_number FROM DUAL;

        -- Insert invoice
        INSERT INTO INVOICE (parcel_id, client_id, invoice_number, amount_zar, payment_status)
        VALUES (:NEW.parcel_id, :NEW.sender_id, v_inv_number, v_rate, 'UNPAID');

    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            -- No tariff rate found — log but don't block the update
            NULL;
    END;
END TRG_INVOICE_ON_DELIVERY;
/


-- -------------------------------------------------------------
-- TRG_DRIVER_AVAILABILITY
-- Automatically sets is_available = 'N' when a driver is
-- assigned to a route today, and 'Y' when no assignment exists.
-- Fires on INSERT into ROUTE_ASSIGNMENT.
-- -------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_DRIVER_AVAILABILITY
AFTER INSERT ON ROUTE_ASSIGNMENT
FOR EACH ROW
BEGIN
    -- Mark driver as unavailable when assigned
    UPDATE DRIVER
    SET    is_available = 'N'
    WHERE  driver_id = :NEW.driver_id;
END TRG_DRIVER_AVAILABILITY;
/


-- -------------------------------------------------------------
-- TRG_PREVENT_EXPIRED_LICENSE
-- Prevents assignment of a driver whose license has expired.
-- Fires BEFORE INSERT on ROUTE_ASSIGNMENT.
-- -------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_PREVENT_EXPIRED_LICENSE
BEFORE INSERT ON ROUTE_ASSIGNMENT
FOR EACH ROW
DECLARE
    v_expiry DATE;
    v_name   VARCHAR2(100);
BEGIN
    SELECT license_expiry, full_name
    INTO   v_expiry, v_name
    FROM   DRIVER
    WHERE  driver_id = :NEW.driver_id;

    IF v_expiry < TRUNC(:NEW.assignment_date) THEN
        RAISE_APPLICATION_ERROR(-20030,
            'Cannot assign driver "' || v_name || '" — license expired on ' ||
            TO_CHAR(v_expiry,'DD Mon YYYY'));
    END IF;
END TRG_PREVENT_EXPIRED_LICENSE;
/


-- -------------------------------------------------------------
-- TRG_PREVENT_OVERLOADED_ROUTE
-- Prevents assigning a load that exceeds vehicle capacity.
-- -------------------------------------------------------------
CREATE OR REPLACE TRIGGER TRG_PREVENT_OVERLOADED_ROUTE
BEFORE INSERT OR UPDATE ON ROUTE_ASSIGNMENT
FOR EACH ROW
DECLARE
    v_capacity NUMBER;
BEGIN
    IF :NEW.total_load_kg IS NULL THEN
        RETURN;  -- No load specified — skip check
    END IF;

    SELECT capacity_kg INTO v_capacity
    FROM   VEHICLE
    WHERE  vehicle_id = :NEW.vehicle_id;

    IF :NEW.total_load_kg > v_capacity THEN
        RAISE_APPLICATION_ERROR(-20031,
            'Load ' || :NEW.total_load_kg || ' kg exceeds vehicle capacity ' ||
            v_capacity || ' kg');
    END IF;
END TRG_PREVENT_OVERLOADED_ROUTE;
/


-- =============================================================
-- SECTION 4: VERIFY — List all created objects
-- =============================================================
SELECT object_name, object_type, status
FROM   user_objects
WHERE  object_type IN ('PROCEDURE','FUNCTION','TRIGGER')
ORDER BY object_type, object_name;