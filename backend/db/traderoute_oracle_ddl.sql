
-- =============================================================
-- TRADEROUTE LOGISTICS - COMPLETE SETUP
-- Compatible with ALL Oracle versions
-- =============================================================

-- STEP 1: DROP EXISTING OBJECTS
DROP TABLE INVOICE          CASCADE CONSTRAINTS;
DROP TABLE DELIVERY_EVENT   CASCADE CONSTRAINTS;
DROP TABLE ROUTE_ASSIGNMENT CASCADE CONSTRAINTS;
DROP TABLE TARIFF_RATE      CASCADE CONSTRAINTS;
DROP TABLE PARCEL           CASCADE CONSTRAINTS;
DROP TABLE ROUTE_ZONE       CASCADE CONSTRAINTS;
DROP TABLE ROUTE            CASCADE CONSTRAINTS;
DROP TABLE SORTING_HUB      CASCADE CONSTRAINTS;
DROP TABLE PARCEL_STATUS    CASCADE CONSTRAINTS;
DROP TABLE VEHICLE          CASCADE CONSTRAINTS;
DROP TABLE DRIVER           CASCADE CONSTRAINTS;
DROP TABLE CLIENT           CASCADE CONSTRAINTS;

DROP SEQUENCE sorting_hub_seq;
DROP SEQUENCE client_seq;
DROP SEQUENCE status_seq;
DROP SEQUENCE driver_seq;
DROP SEQUENCE vehicle_seq;
DROP SEQUENCE route_seq;
DROP SEQUENCE zone_seq;
DROP SEQUENCE parcel_seq;
DROP SEQUENCE assignment_seq;
DROP SEQUENCE event_seq;
DROP SEQUENCE tariff_seq;
DROP SEQUENCE invoice_seq;

-- STEP 2: CREATE SEQUENCES
CREATE SEQUENCE sorting_hub_seq  START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE client_seq       START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE status_seq       START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE driver_seq       START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE vehicle_seq      START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE route_seq        START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE zone_seq         START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE parcel_seq       START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE assignment_seq   START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE event_seq        START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE tariff_seq       START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE invoice_seq      START WITH 1 INCREMENT BY 1 NOCACHE;

-- STEP 3: CREATE TABLES
CREATE TABLE SORTING_HUB (
    hub_id           NUMBER         NOT NULL,
    hub_name         VARCHAR2(100)  NOT NULL,
    address          VARCHAR2(300),
    city             VARCHAR2(50),
    province         VARCHAR2(50),
    capacity_parcels NUMBER(6)      CONSTRAINT chk_hub_capacity CHECK (capacity_parcels > 0),
    CONSTRAINT pk_sorting_hub PRIMARY KEY (hub_id)
);

CREATE TABLE CLIENT (
    client_id       NUMBER         NOT NULL,
    client_name     VARCHAR2(100)  NOT NULL,
    client_type     VARCHAR2(20)   CONSTRAINT chk_client_type
                                     CHECK (client_type IN ('INDIVIDUAL','CORPORATE','ECOMMERCE')),
    email           VARCHAR2(150)  NOT NULL,
    phone           VARCHAR2(20),
    address         VARCHAR2(300)  NOT NULL,
    date_registered DATE           DEFAULT SYSDATE NOT NULL,
    CONSTRAINT pk_client       PRIMARY KEY (client_id),
    CONSTRAINT uq_client_email UNIQUE (email)
);

CREATE TABLE PARCEL_STATUS (
    status_id   NUMBER        NOT NULL,
    status_name VARCHAR2(30)  NOT NULL,
    description VARCHAR2(200),
    CONSTRAINT pk_parcel_status    PRIMARY KEY (status_id),
    CONSTRAINT uq_parcel_status_nm UNIQUE (status_name)
);

CREATE TABLE DRIVER (
    driver_id      NUMBER        NOT NULL,
    full_name      VARCHAR2(100) NOT NULL,
    license_number VARCHAR2(30)  NOT NULL,
    license_expiry DATE,
    is_available   CHAR(1)       DEFAULT 'Y'
                     CONSTRAINT chk_driver_avail CHECK (is_available IN ('Y','N')),
    phone          VARCHAR2(20),
    date_hired     DATE,
    CONSTRAINT pk_driver         PRIMARY KEY (driver_id),
    CONSTRAINT uq_driver_license UNIQUE (license_number)
);

CREATE TABLE VEHICLE (
    vehicle_id        NUMBER        NOT NULL,
    registration      VARCHAR2(15)  NOT NULL,
    make              VARCHAR2(50),
    model             VARCHAR2(50),
    capacity_kg       NUMBER(8,2)   NOT NULL
                        CONSTRAINT chk_vehicle_cap CHECK (capacity_kg > 0),
    service_status    VARCHAR2(20)  DEFAULT 'OPERATIONAL'
                        CONSTRAINT chk_vehicle_status
                          CHECK (service_status IN ('OPERATIONAL','MAINTENANCE','DECOMMISSIONED')),
    last_service_date DATE,
    CONSTRAINT pk_vehicle     PRIMARY KEY (vehicle_id),
    CONSTRAINT uq_vehicle_reg UNIQUE (registration)
);

CREATE TABLE ROUTE (
    route_id        NUMBER        NOT NULL,
    route_code      VARCHAR2(10)  NOT NULL,
    route_name      VARCHAR2(100) NOT NULL,
    hub_id          NUMBER,
    max_capacity_kg NUMBER(8,2),
    is_active       CHAR(1)       DEFAULT 'Y'
                      CONSTRAINT chk_route_active CHECK (is_active IN ('Y','N')),
    CONSTRAINT pk_route      PRIMARY KEY (route_id),
    CONSTRAINT uq_route_code UNIQUE (route_code),
    CONSTRAINT fk_route_hub  FOREIGN KEY (hub_id)
                               REFERENCES SORTING_HUB(hub_id)
);

CREATE TABLE ROUTE_ZONE (
    zone_id      NUMBER        NOT NULL,
    route_id     NUMBER        NOT NULL,
    zone_name    VARCHAR2(100) NOT NULL,
    postal_codes VARCHAR2(500),
    province     VARCHAR2(50),
    city         VARCHAR2(50),
    CONSTRAINT pk_route_zone PRIMARY KEY (zone_id),
    CONSTRAINT fk_zone_route FOREIGN KEY (route_id)
                               REFERENCES ROUTE(route_id)
);

CREATE TABLE PARCEL (
    parcel_id           NUMBER        NOT NULL,
    tracking_code       VARCHAR2(25)  NOT NULL,
    sender_id           NUMBER        NOT NULL,
    recipient_id        NUMBER        NOT NULL,
    status_id           NUMBER        NOT NULL,
    route_id            NUMBER,
    weight_kg           NUMBER(6,2)   NOT NULL
                          CONSTRAINT chk_parcel_weight CHECK (weight_kg > 0),
    size_category       VARCHAR2(10)
                          CONSTRAINT chk_parcel_size
                            CHECK (size_category IN ('SMALL','MEDIUM','LARGE','OVERSIZED')),
    service_type        VARCHAR2(15)  DEFAULT 'STANDARD'
                          CONSTRAINT chk_parcel_service
                            CHECK (service_type IN ('STANDARD','EXPRESS')),
    intake_date         DATE          DEFAULT SYSDATE,
    destination_address VARCHAR2(300),
    CONSTRAINT pk_parcel           PRIMARY KEY (parcel_id),
    CONSTRAINT uq_parcel_tracking  UNIQUE (tracking_code),
    CONSTRAINT fk_parcel_sender    FOREIGN KEY (sender_id)
                                     REFERENCES CLIENT(client_id),
    CONSTRAINT fk_parcel_recipient FOREIGN KEY (recipient_id)
                                     REFERENCES CLIENT(client_id),
    CONSTRAINT fk_parcel_status    FOREIGN KEY (status_id)
                                     REFERENCES PARCEL_STATUS(status_id),
    CONSTRAINT fk_parcel_route     FOREIGN KEY (route_id)
                                     REFERENCES ROUTE(route_id)
);

CREATE TABLE ROUTE_ASSIGNMENT (
    assignment_id   NUMBER     NOT NULL,
    route_id        NUMBER     NOT NULL,
    driver_id       NUMBER     NOT NULL,
    vehicle_id      NUMBER     NOT NULL,
    assignment_date DATE       NOT NULL,
    total_load_kg   NUMBER(8,2),
    CONSTRAINT pk_route_assignment PRIMARY KEY (assignment_id),
    CONSTRAINT fk_assign_route     FOREIGN KEY (route_id)
                                     REFERENCES ROUTE(route_id),
    CONSTRAINT fk_assign_driver    FOREIGN KEY (driver_id)
                                     REFERENCES DRIVER(driver_id),
    CONSTRAINT fk_assign_vehicle   FOREIGN KEY (vehicle_id)
                                     REFERENCES VEHICLE(vehicle_id),
    CONSTRAINT uq_driver_date      UNIQUE (driver_id, assignment_date),
    CONSTRAINT uq_vehicle_date     UNIQUE (vehicle_id, assignment_date),
    CONSTRAINT uq_route_date       UNIQUE (route_id, assignment_date)
);

CREATE TABLE DELIVERY_EVENT (
    event_id        NUMBER        NOT NULL,
    parcel_id       NUMBER        NOT NULL,
    assignment_id   NUMBER,
    event_type      VARCHAR2(30)  NOT NULL
                      CONSTRAINT chk_event_type
                        CHECK (event_type IN
                          ('INTAKE','ASSIGNED','DISPATCHED','IN_TRANSIT',
                           'DELIVERED','FAILED','RESCHEDULED')),
    outcome_code    VARCHAR2(20)
                      CONSTRAINT chk_outcome_code
                        CHECK (outcome_code IN
                          ('SUCCESS','FAILED_ADDRESS','FAILED_ABSENT',
                           'FAILED_REFUSED','PENDING')),
    event_timestamp TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
    recipient_name  VARCHAR2(100),
    location_notes  VARCHAR2(300),
    CONSTRAINT pk_delivery_event   PRIMARY KEY (event_id),
    CONSTRAINT fk_event_parcel     FOREIGN KEY (parcel_id)
                                     REFERENCES PARCEL(parcel_id),
    CONSTRAINT fk_event_assignment FOREIGN KEY (assignment_id)
                                     REFERENCES ROUTE_ASSIGNMENT(assignment_id)
);

CREATE TABLE TARIFF_RATE (
    tariff_id       NUMBER        NOT NULL,
    weight_band_min NUMBER(6,2)   NOT NULL,
    weight_band_max NUMBER(6,2)   NOT NULL,
    size_category   VARCHAR2(10)
                      CONSTRAINT chk_tariff_size
                        CHECK (size_category IN ('SMALL','MEDIUM','LARGE','OVERSIZED')),
    zone_id         NUMBER,
    service_type    VARCHAR2(15)
                      CONSTRAINT chk_tariff_service
                        CHECK (service_type IN ('STANDARD','EXPRESS')),
    rate_zar        NUMBER(8,2)   NOT NULL
                      CONSTRAINT chk_tariff_rate CHECK (rate_zar > 0),
    effective_from  DATE          DEFAULT SYSDATE,
    CONSTRAINT pk_tariff_rate  PRIMARY KEY (tariff_id),
    CONSTRAINT chk_weight_band CHECK (weight_band_max > weight_band_min),
    CONSTRAINT fk_tariff_zone  FOREIGN KEY (zone_id)
                                 REFERENCES ROUTE_ZONE(zone_id)
);

CREATE TABLE INVOICE (
    invoice_id     NUMBER        NOT NULL,
    parcel_id      NUMBER        NOT NULL,
    client_id      NUMBER        NOT NULL,
    invoice_number VARCHAR2(30)  NOT NULL,
    amount_zar     NUMBER(10,2)  NOT NULL
                     CONSTRAINT chk_invoice_amount CHECK (amount_zar > 0),
    payment_status VARCHAR2(15)  DEFAULT 'UNPAID'
                     CONSTRAINT chk_invoice_status
                       CHECK (payment_status IN ('UNPAID','PAID','OVERDUE','CANCELLED')),
    issue_date     DATE          DEFAULT SYSDATE,
    payment_date   DATE,
    CONSTRAINT pk_invoice        PRIMARY KEY (invoice_id),
    CONSTRAINT uq_invoice_number UNIQUE (invoice_number),
    CONSTRAINT fk_invoice_parcel FOREIGN KEY (parcel_id)
                                   REFERENCES PARCEL(parcel_id),
    CONSTRAINT fk_invoice_client FOREIGN KEY (client_id)
                                   REFERENCES CLIENT(client_id)
);

COMMIT;

-- STEP 4: CREATE TRIGGERS
CREATE OR REPLACE TRIGGER trg_sorting_hub_id
BEFORE INSERT ON SORTING_HUB FOR EACH ROW
BEGIN
  IF :NEW.hub_id IS NULL THEN
    SELECT sorting_hub_seq.NEXTVAL INTO :NEW.hub_id FROM DUAL;
  END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_client_id
BEFORE INSERT ON CLIENT FOR EACH ROW
BEGIN
  IF :NEW.client_id IS NULL THEN
    SELECT client_seq.NEXTVAL INTO :NEW.client_id FROM DUAL;
  END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_status_id
BEFORE INSERT ON PARCEL_STATUS FOR EACH ROW
BEGIN
  IF :NEW.status_id IS NULL THEN
    SELECT status_seq.NEXTVAL INTO :NEW.status_id FROM DUAL;
  END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_driver_id
BEFORE INSERT ON DRIVER FOR EACH ROW
BEGIN
  IF :NEW.driver_id IS NULL THEN
    SELECT driver_seq.NEXTVAL INTO :NEW.driver_id FROM DUAL;
  END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_vehicle_id
BEFORE INSERT ON VEHICLE FOR EACH ROW
BEGIN
  IF :NEW.vehicle_id IS NULL THEN
    SELECT vehicle_seq.NEXTVAL INTO :NEW.vehicle_id FROM DUAL;
  END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_route_id
BEFORE INSERT ON ROUTE FOR EACH ROW
BEGIN
  IF :NEW.route_id IS NULL THEN
    SELECT route_seq.NEXTVAL INTO :NEW.route_id FROM DUAL;
  END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_zone_id
BEFORE INSERT ON ROUTE_ZONE FOR EACH ROW
BEGIN
  IF :NEW.zone_id IS NULL THEN
    SELECT zone_seq.NEXTVAL INTO :NEW.zone_id FROM DUAL;
  END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_parcel_id
BEFORE INSERT ON PARCEL FOR EACH ROW
BEGIN
  IF :NEW.parcel_id IS NULL THEN
    SELECT parcel_seq.NEXTVAL INTO :NEW.parcel_id FROM DUAL;
  END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_assignment_id
BEFORE INSERT ON ROUTE_ASSIGNMENT FOR EACH ROW
BEGIN
  IF :NEW.assignment_id IS NULL THEN
    SELECT assignment_seq.NEXTVAL INTO :NEW.assignment_id FROM DUAL;
  END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_event_id
BEFORE INSERT ON DELIVERY_EVENT FOR EACH ROW
BEGIN
  IF :NEW.event_id IS NULL THEN
    SELECT event_seq.NEXTVAL INTO :NEW.event_id FROM DUAL;
  END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_tariff_id
BEFORE INSERT ON TARIFF_RATE FOR EACH ROW
BEGIN
  IF :NEW.tariff_id IS NULL THEN
    SELECT tariff_seq.NEXTVAL INTO :NEW.tariff_id FROM DUAL;
  END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_invoice_id
BEFORE INSERT ON INVOICE FOR EACH ROW
BEGIN
  IF :NEW.invoice_id IS NULL THEN
    SELECT invoice_seq.NEXTVAL INTO :NEW.invoice_id FROM DUAL;
  END IF;
END;
/

-- STEP 5: SEED DATA
INSERT INTO PARCEL_STATUS (status_name, description) VALUES ('RECEIVED',   'Parcel checked in at sorting hub');
INSERT INTO PARCEL_STATUS (status_name, description) VALUES ('ASSIGNED',   'Parcel allocated to a delivery route');
INSERT INTO PARCEL_STATUS (status_name, description) VALUES ('IN_TRANSIT', 'Parcel out for delivery with driver');
INSERT INTO PARCEL_STATUS (status_name, description) VALUES ('DELIVERED',  'Proof of delivery signature collected');
INSERT INTO PARCEL_STATUS (status_name, description) VALUES ('FAILED',     'Delivery attempt unsuccessful');
INSERT INTO PARCEL_STATUS (status_name, description) VALUES ('RESCHEDULED','Failed delivery re-queued for next slot');
INSERT INTO PARCEL_STATUS (status_name, description) VALUES ('CANCELLED',  'Order cancelled by client or operations');
COMMIT;

INSERT INTO SORTING_HUB (hub_name, address, city, province, capacity_parcels) VALUES ('Johannesburg Hub', '14 Industrial Rd', 'Johannesburg', 'Gauteng', 5000);
INSERT INTO SORTING_HUB (hub_name, address, city, province, capacity_parcels) VALUES ('Cape Town Hub', '22 Paarden Eiland Rd', 'Cape Town', 'Western Cape', 3000);
INSERT INTO SORTING_HUB (hub_name, address, city, province, capacity_parcels) VALUES ('Durban Hub', '5 Bayhead Rd', 'Durban', 'KwaZulu-Natal', 2500);
INSERT INTO SORTING_HUB (hub_name, address, city, province, capacity_parcels) VALUES ('Pretoria Hub', '88 Rosslyn Industrial', 'Pretoria', 'Gauteng', 1800);
INSERT INTO SORTING_HUB (hub_name, address, city, province, capacity_parcels) VALUES ('PE Hub', '30 Perseverance Rd', 'Gqeberha', 'Eastern Cape', 1200);
INSERT INTO SORTING_HUB (hub_name, address, city, province, capacity_parcels) VALUES ('Bloemfontein Hub', '12 Grootvlei Rd', 'Bloemfontein', 'Free State', 900);
COMMIT;

-- STEP 6: VIEWS
CREATE OR REPLACE VIEW VW_PARCEL_TRACKING AS
SELECT
    p.parcel_id,
    p.tracking_code,
    p.weight_kg,
    p.size_category,
    p.service_type,
    TO_CHAR(p.intake_date, 'YYYY-MM-DD HH24:MI') AS intake_date,
    ps.status_name,
    r.route_code,
    r.route_name,
    sh.hub_name,
    sh.city AS hub_city
FROM       PARCEL        p
JOIN       PARCEL_STATUS ps ON ps.status_id = p.status_id
LEFT JOIN  ROUTE         r  ON r.route_id   = p.route_id
LEFT JOIN  SORTING_HUB  sh  ON sh.hub_id    = r.hub_id;

CREATE OR REPLACE VIEW VW_CLIENT_INVOICES AS
SELECT
    c.client_name,
    i.invoice_number,
    i.amount_zar,
    i.payment_status,
    TO_CHAR(i.issue_date,   'YYYY-MM-DD') AS issue_date,
    TO_CHAR(i.payment_date, 'YYYY-MM-DD') AS payment_date,
    p.tracking_code,
    p.service_type
FROM  INVOICE i
JOIN  CLIENT  c ON c.client_id = i.client_id
JOIN  PARCEL  p ON p.parcel_id = i.parcel_id;

CREATE OR REPLACE VIEW VW_TODAYS_ROUTES AS
SELECT
    r.route_code,
    r.route_name,
    d.full_name       AS driver_name,
    d.phone           AS driver_phone,
    v.registration,
    v.make || ' ' || v.model AS vehicle_desc,
    v.capacity_kg,
    ra.total_load_kg
FROM      ROUTE_ASSIGNMENT ra
JOIN      ROUTE            r  ON r.route_id   = ra.route_id
JOIN      DRIVER           d  ON d.driver_id  = ra.driver_id
JOIN      VEHICLE          v  ON v.vehicle_id = ra.vehicle_id
WHERE     TRUNC(ra.assignment_date) = TRUNC(SYSDATE);

CREATE OR REPLACE VIEW VW_DRIVER_PERFORMANCE AS
SELECT 
    d.driver_id,
    d.full_name,
    COUNT(de.event_id) AS "TOTAL_DELIVERIES",
    SUM(CASE WHEN de.outcome_code = 'SUCCESS' THEN 1 ELSE 0 END) AS "SUCCESS_COUNT",
    SUM(CASE WHEN de.outcome_code LIKE 'FAILED%' THEN 1 ELSE 0 END) AS "FAILED_COUNT"
FROM DRIVER d
LEFT JOIN ROUTE_ASSIGNMENT ra ON ra.driver_id = d.driver_id
LEFT JOIN DELIVERY_EVENT de ON de.assignment_id = ra.assignment_id 
    AND de.event_type = 'DELIVERED'
GROUP BY d.driver_id, d.full_name;

COMMIT;

-- VERIFY
SELECT table_name   FROM user_tables   ORDER BY table_name;
SELECT view_name    FROM user_views    ORDER BY view_name;
SELECT trigger_name FROM user_triggers ORDER BY trigger_name;

