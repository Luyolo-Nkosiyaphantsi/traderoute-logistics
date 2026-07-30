-- =============================================================
-- TRADEROUTE LOGISTICS - DATABASE FIX
-- Fixes: SORTING_HUB delete issue + missing tariff rate
-- =============================================================

-- STEP 1: DELETE ROUTE first (it references SORTING_HUB)
-- then delete SORTING_HUB, then reinsert both cleanly

DELETE FROM INVOICE;
DELETE FROM DELIVERY_EVENT;
DELETE FROM ROUTE_ASSIGNMENT;
DELETE FROM TARIFF_RATE;
DELETE FROM PARCEL;
DELETE FROM ROUTE_ZONE;
DELETE FROM ROUTE;
DELETE FROM SORTING_HUB;
DELETE FROM PARCEL_STATUS;
DELETE FROM CLIENT;
DELETE FROM DRIVER;
DELETE FROM VEHICLE;
COMMIT;

-- STEP 2: RESET SEQUENCES
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
COMMIT;

-- STEP 3: PARCEL STATUSES
INSERT INTO PARCEL_STATUS (status_name, description) VALUES ('RECEIVED',   'Parcel checked in at sorting hub');
INSERT INTO PARCEL_STATUS (status_name, description) VALUES ('ASSIGNED',   'Parcel allocated to a delivery route');
INSERT INTO PARCEL_STATUS (status_name, description) VALUES ('IN_TRANSIT', 'Parcel out for delivery with driver');
INSERT INTO PARCEL_STATUS (status_name, description) VALUES ('DELIVERED',  'Proof of delivery signature collected');
INSERT INTO PARCEL_STATUS (status_name, description) VALUES ('FAILED',     'Delivery attempt unsuccessful');
INSERT INTO PARCEL_STATUS (status_name, description) VALUES ('RESCHEDULED','Failed delivery re-queued for next slot');
INSERT INTO PARCEL_STATUS (status_name, description) VALUES ('CANCELLED',  'Order cancelled by client or operations');
COMMIT;

-- STEP 4: SORTING HUBS
INSERT INTO SORTING_HUB (hub_name, address, city, province, capacity_parcels) VALUES ('Johannesburg Hub', '14 Industrial Rd',    'Johannesburg', 'Gauteng',       5000);
INSERT INTO SORTING_HUB (hub_name, address, city, province, capacity_parcels) VALUES ('Cape Town Hub',    '22 Paarden Eiland Rd','Cape Town',    'Western Cape',  3000);
INSERT INTO SORTING_HUB (hub_name, address, city, province, capacity_parcels) VALUES ('Durban Hub',       '5 Bayhead Rd',        'Durban',       'KwaZulu-Natal', 2500);
INSERT INTO SORTING_HUB (hub_name, address, city, province, capacity_parcels) VALUES ('Pretoria Hub',     '88 Rosslyn Industrial','Pretoria',     'Gauteng',       1800);
INSERT INTO SORTING_HUB (hub_name, address, city, province, capacity_parcels) VALUES ('PE Hub',           '30 Perseverance Rd',  'Gqeberha',     'Eastern Cape',  1200);
INSERT INTO SORTING_HUB (hub_name, address, city, province, capacity_parcels) VALUES ('Bloemfontein Hub', '12 Grootvlei Rd',     'Bloemfontein', 'Free State',     900);
COMMIT;

-- STEP 5: CLIENTS
INSERT INTO CLIENT (client_name, client_type, email, phone, address) VALUES ('Sipho Nkosi',          'INDIVIDUAL', 'sipho.nkosi@gmail.com',         '+27 82 111 0001', '14 Vilakazi St, Orlando West, Soweto, 1804');
INSERT INTO CLIENT (client_name, client_type, email, phone, address) VALUES ('Priya Naidoo',         'INDIVIDUAL', 'priya.naidoo@gmail.com',         '+27 73 222 0033', '22 Umgeni Rd, Durban North, Durban, 4001');
INSERT INTO CLIENT (client_name, client_type, email, phone, address) VALUES ('Werner Botha',         'INDIVIDUAL', 'werner.botha@outlook.com',       '+27 83 030 0301', '5 Blouberg Rd, Table View, Cape Town, 7441');
INSERT INTO CLIENT (client_name, client_type, email, phone, address) VALUES ('Fatima Moosa',         'INDIVIDUAL', 'fatima.moosa@icloud.com',        '+27 81 443 2200', '88 Jan Smuts Ave, Parktown, Johannesburg, 2193');
INSERT INTO CLIENT (client_name, client_type, email, phone, address) VALUES ('Anele Van Wyk',        'INDIVIDUAL', 'anele.vanwyk@yahoo.com',         '+27 76 090 9091', '3 Church St, Bloemfontein, 9301');
INSERT INTO CLIENT (client_name, client_type, email, phone, address) VALUES ('James Pietersen',      'INDIVIDUAL', 'jpietersen@gmail.com',           '+27 79 554 7741', '15 Cape Rd, Newton Park, Gqeberha, 6045');
INSERT INTO CLIENT (client_name, client_type, email, phone, address) VALUES ('Zanele Khoza',         'INDIVIDUAL', 'z.khoza@gmail.com',              '+27 81 310 3113', '9 Madiba Dr, Arcadia, Pretoria, 0083');
INSERT INTO CLIENT (client_name, client_type, email, phone, address) VALUES ('Takealot Group',       'ECOMMERCE',  'dispatch@takealot.co.za',        '+27 21 507 7000', '1 Harrington St, Cape Town, 8001');
INSERT INTO CLIENT (client_name, client_type, email, phone, address) VALUES ('Builders Warehouse',   'CORPORATE',  'logistics@builders.co.za',       '+27 11 205 2000', '32 Aureus Ave, Randfontein, 1760');
INSERT INTO CLIENT (client_name, client_type, email, phone, address) VALUES ('Botha and Associates', 'CORPORATE',  'admin@botha-associates.co.za',   '+27 11 888 5500', '44 Rosebank Mall, Johannesburg, 2196');
INSERT INTO CLIENT (client_name, client_type, email, phone, address) VALUES ('Pick n Pay Online',    'ECOMMERCE',  'ecom@pnp.co.za',                 '+27 21 658 1000', '101 Rosmead Ave, Kenilworth, Cape Town, 7708');
INSERT INTO CLIENT (client_name, client_type, email, phone, address) VALUES ('Nompumelelo Cele',     'INDIVIDUAL', 'nompumelelo.cele@webmail.co.za', '+27 72 180 1800', '7 Umbilo Rd, Glenwood, Durban, 4022');
INSERT INTO CLIENT (client_name, client_type, email, phone, address) VALUES ('Raj Patel',            'INDIVIDUAL', 'raj.patel@gmail.com',            '+27 79 220 2210', '18 Greenacres Rd, Gqeberha, 6001');
INSERT INTO CLIENT (client_name, client_type, email, phone, address) VALUES ('Woolworths Logistics', 'CORPORATE',  'supply@woolworths.co.za',        '+27 21 407 9111', '93 Longmarket St, Cape Town, 8000');
INSERT INTO CLIENT (client_name, client_type, email, phone, address) VALUES ('Mpho Dlamini',         'INDIVIDUAL', 'mpho.dlamini@gmail.com',         '+27 83 771 4400', '20 Khumalo St, Tembisa, 1628');
COMMIT;

-- STEP 6: DRIVERS
INSERT INTO DRIVER (full_name, license_number, license_expiry, phone, date_hired, is_available) VALUES ('Themba Nkosi',        'LIC-2019-04471', DATE '2026-03-01', '+27 82 700 0071', DATE '2019-06-01', 'Y');
INSERT INTO DRIVER (full_name, license_number, license_expiry, phone, date_hired, is_available) VALUES ('Bongani Dlamini',     'LIC-2020-08812', DATE '2025-11-30', '+27 73 140 0142', DATE '2020-02-15', 'Y');
INSERT INTO DRIVER (full_name, license_number, license_expiry, phone, date_hired, is_available) VALUES ('Werner Botha',        'LIC-2018-03302', DATE '2026-07-15', '+27 83 030 0301', DATE '2018-01-10', 'Y');
INSERT INTO DRIVER (full_name, license_number, license_expiry, phone, date_hired, is_available) VALUES ('Raj Patel',           'LIC-2021-22201', DATE '2027-01-22', '+27 79 220 2210', DATE '2021-05-01', 'Y');
INSERT INTO DRIVER (full_name, license_number, license_expiry, phone, date_hired, is_available) VALUES ('Anele Van Wyk',       'LIC-2019-09981', DATE '2025-06-30', '+27 76 090 9091', DATE '2019-09-01', 'Y');
INSERT INTO DRIVER (full_name, license_number, license_expiry, phone, date_hired, is_available) VALUES ('Zanele Khoza',        'LIC-2022-31113', DATE '2028-04-10', '+27 81 310 3113', DATE '2022-03-01', 'Y');
INSERT INTO DRIVER (full_name, license_number, license_expiry, phone, date_hired, is_available) VALUES ('Pieter De Wet',       'LIC-2023-45521', DATE '2028-09-01', '+27 83 451 1450', DATE '2023-01-16', 'Y');
INSERT INTO DRIVER (full_name, license_number, license_expiry, phone, date_hired, is_available) VALUES ('Nompumelelo Cele',    'LIC-2020-18002', DATE '2026-05-01', '+27 72 180 1800', DATE '2020-07-01', 'N');
INSERT INTO DRIVER (full_name, license_number, license_expiry, phone, date_hired, is_available) VALUES ('Siphamandla Mthembu', 'LIC-2021-55803', DATE '2026-12-01', '+27 74 558 0301', DATE '2021-11-01', 'Y');
INSERT INTO DRIVER (full_name, license_number, license_expiry, phone, date_hired, is_available) VALUES ('Charmaine Fourie',    'LIC-2022-67714', DATE '2027-08-15', '+27 82 677 1400', DATE '2022-08-01', 'Y');
COMMIT;

-- STEP 7: VEHICLES
INSERT INTO VEHICLE (registration, make, model, capacity_kg, service_status, last_service_date) VALUES ('JHB 482 GP', 'Toyota',     'Hilux 2.8 GD-6',   1200, 'OPERATIONAL',    DATE '2024-05-10');
INSERT INTO VEHICLE (registration, make, model, capacity_kg, service_status, last_service_date) VALUES ('GP 44 KZN',  'Isuzu',      'D-Max 3.0 DTi',    1500, 'OPERATIONAL',    DATE '2024-04-28');
INSERT INTO VEHICLE (registration, make, model, capacity_kg, service_status, last_service_date) VALUES ('CA 123 WP',  'Ford',       'Ranger XLT 2.0',    900, 'OPERATIONAL',    DATE '2024-05-20');
INSERT INTO VEHICLE (registration, make, model, capacity_kg, service_status, last_service_date) VALUES ('ND 885 DG',  'Mercedes',   'Sprinter 314 CDI', 2000, 'OPERATIONAL',    DATE '2024-03-15');
INSERT INTO VEHICLE (registration, make, model, capacity_kg, service_status, last_service_date) VALUES ('FS 201 BF',  'Nissan',     'NP300 Hardbody',    800, 'MAINTENANCE',    DATE '2024-06-11');
INSERT INTO VEHICLE (registration, make, model, capacity_kg, service_status, last_service_date) VALUES ('EC 774 PE',  'Volkswagen', 'Crafter 35',       1800, 'OPERATIONAL',    DATE '2024-05-01');
INSERT INTO VEHICLE (registration, make, model, capacity_kg, service_status, last_service_date) VALUES ('GP 010 TSH', 'Hino',       '300 Series 614',   3500, 'DECOMMISSIONED', DATE '2023-11-01');
INSERT INTO VEHICLE (registration, make, model, capacity_kg, service_status, last_service_date) VALUES ('WP 332 CT',  'Toyota',     'Land Cruiser 79',  1100, 'OPERATIONAL',    DATE '2024-06-01');
COMMIT;

-- STEP 8: ROUTES
INSERT INTO ROUTE (route_code, route_name, hub_id, max_capacity_kg, is_active) VALUES ('R-04', 'Johannesburg to Sandton',       1, 1200, 'Y');
INSERT INTO ROUTE (route_code, route_name, hub_id, max_capacity_kg, is_active) VALUES ('R-07', 'Johannesburg to Pretoria',       1, 1500, 'Y');
INSERT INTO ROUTE (route_code, route_name, hub_id, max_capacity_kg, is_active) VALUES ('R-01', 'Cape Town to Atlantic Seaboard', 2,  900, 'Y');
INSERT INTO ROUTE (route_code, route_name, hub_id, max_capacity_kg, is_active) VALUES ('R-12', 'Durban to Umhlanga',             3, 2000, 'Y');
INSERT INTO ROUTE (route_code, route_name, hub_id, max_capacity_kg, is_active) VALUES ('R-15', 'Bloemfontein Central',           6,  800, 'Y');
INSERT INTO ROUTE (route_code, route_name, hub_id, max_capacity_kg, is_active) VALUES ('R-09', 'Gqeberha South',                 5, 1800, 'Y');
COMMIT;

-- STEP 9: ROUTE ZONES
INSERT INTO ROUTE_ZONE (route_id, zone_name, postal_codes, province, city) VALUES (1, 'Sandton CBD',        '2196,2146,2191', 'Gauteng',       'Sandton');
INSERT INTO ROUTE_ZONE (route_id, zone_name, postal_codes, province, city) VALUES (2, 'Tshwane Metro',      '0001,0002,0083', 'Gauteng',       'Pretoria');
INSERT INTO ROUTE_ZONE (route_id, zone_name, postal_codes, province, city) VALUES (3, 'Atlantic Seaboard',  '8001,8005,8060', 'Western Cape',  'Cape Town');
INSERT INTO ROUTE_ZONE (route_id, zone_name, postal_codes, province, city) VALUES (4, 'KZN North Coast',    '4319,4320,4051', 'KwaZulu-Natal', 'Umhlanga');
INSERT INTO ROUTE_ZONE (route_id, zone_name, postal_codes, province, city) VALUES (5, 'Free State Metro',   '9301,9302,9303', 'Free State',    'Bloemfontein');
INSERT INTO ROUTE_ZONE (route_id, zone_name, postal_codes, province, city) VALUES (6, 'Eastern Cape South', '6001,6045,6070', 'Eastern Cape',  'Gqeberha');
COMMIT;

-- STEP 10: TARIFF RATES (all 31 including the missing one)
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (0,   1,   'SMALL',     1, 'STANDARD',   85.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (0,   1,   'SMALL',     1, 'EXPRESS',   145.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (1,   5,   'MEDIUM',    1, 'STANDARD',  185.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (1,   5,   'MEDIUM',    1, 'EXPRESS',   295.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (5,   15,  'LARGE',     1, 'STANDARD',  420.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (5,   15,  'LARGE',     1, 'EXPRESS',   680.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (15,  999, 'OVERSIZED', 1, 'STANDARD',  950.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (15,  999, 'OVERSIZED', 1, 'EXPRESS',  1450.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (0,   1,   'SMALL',     2, 'STANDARD',   95.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (0,   1,   'SMALL',     2, 'EXPRESS',   160.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (1,   5,   'MEDIUM',    2, 'STANDARD',  210.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (1,   5,   'MEDIUM',    2, 'EXPRESS',   340.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (5,   15,  'LARGE',     2, 'STANDARD',  480.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (5,   15,  'LARGE',     2, 'EXPRESS',   750.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (0,   1,   'SMALL',     3, 'STANDARD',  110.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (0,   1,   'SMALL',     3, 'EXPRESS',   185.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (1,   5,   'MEDIUM',    3, 'STANDARD',  245.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (1,   5,   'MEDIUM',    3, 'EXPRESS',   390.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (5,   15,  'LARGE',     3, 'STANDARD',  540.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (5,   15,  'LARGE',     3, 'EXPRESS',   860.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (0,   1,   'SMALL',     4, 'STANDARD',  120.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (1,   5,   'MEDIUM',    4, 'STANDARD',  265.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (1,   5,   'MEDIUM',    4, 'EXPRESS',   420.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (5,   15,  'LARGE',     4, 'STANDARD',  580.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (0,   1,   'SMALL',     5, 'STANDARD',  100.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (1,   5,   'MEDIUM',    5, 'STANDARD',  220.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (5,   15,  'LARGE',     5, 'STANDARD',  490.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (0,   1,   'SMALL',     6, 'STANDARD',  115.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (1,   5,   'MEDIUM',    6, 'STANDARD',  255.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (5,   15,  'LARGE',     6, 'STANDARD',  560.00);
INSERT INTO TARIFF_RATE (weight_band_min, weight_band_max, size_category, zone_id, service_type, rate_zar) VALUES (15,  999, 'OVERSIZED', 6, 'STANDARD',  950.00);
COMMIT;

-- STEP 11: PARCELS
INSERT INTO PARCEL (tracking_code, sender_id, recipient_id, status_id, route_id, weight_kg, size_category, service_type, destination_address) VALUES ('TR-240601-10001', 8,  1,  4, 1,  0.8, 'SMALL',     'EXPRESS',  '14 Vilakazi St, Soweto, 1804');
INSERT INTO PARCEL (tracking_code, sender_id, recipient_id, status_id, route_id, weight_kg, size_category, service_type, destination_address) VALUES ('TR-240601-10002', 8,  2,  4, 4,  3.2, 'MEDIUM',    'STANDARD', '22 Umgeni Rd, Durban, 4001');
INSERT INTO PARCEL (tracking_code, sender_id, recipient_id, status_id, route_id, weight_kg, size_category, service_type, destination_address) VALUES ('TR-240602-10003', 9,  3,  4, 3, 12.0, 'LARGE',     'STANDARD', '5 Blouberg Rd, Cape Town, 7441');
INSERT INTO PARCEL (tracking_code, sender_id, recipient_id, status_id, route_id, weight_kg, size_category, service_type, destination_address) VALUES ('TR-240603-10004', 10, 4,  4, 1,  1.5, 'SMALL',     'EXPRESS',  '88 Jan Smuts Ave, Johannesburg, 2193');
INSERT INTO PARCEL (tracking_code, sender_id, recipient_id, status_id, route_id, weight_kg, size_category, service_type, destination_address) VALUES ('TR-240604-10005', 11, 5,  3, 3,  4.7, 'MEDIUM',    'STANDARD', '3 Church St, Bloemfontein, 9301');
INSERT INTO PARCEL (tracking_code, sender_id, recipient_id, status_id, route_id, weight_kg, size_category, service_type, destination_address) VALUES ('TR-240605-10006', 8,  6,  3, 6,  2.1, 'SMALL',     'EXPRESS',  '15 Cape Rd, Gqeberha, 6045');
INSERT INTO PARCEL (tracking_code, sender_id, recipient_id, status_id, route_id, weight_kg, size_category, service_type, destination_address) VALUES ('TR-240606-10007', 14, 7,  3, 2,  8.5, 'LARGE',     'STANDARD', '9 Madiba Dr, Pretoria, 0083');
INSERT INTO PARCEL (tracking_code, sender_id, recipient_id, status_id, route_id, weight_kg, size_category, service_type, destination_address) VALUES ('TR-240607-10008', 9,  12, 5, 4,  1.0, 'SMALL',     'STANDARD', '7 Umbilo Rd, Durban, 4022');
INSERT INTO PARCEL (tracking_code, sender_id, recipient_id, status_id, route_id, weight_kg, size_category, service_type, destination_address) VALUES ('TR-240608-10009', 11, 13, 1, 6,  3.8, 'MEDIUM',    'EXPRESS',  '18 Greenacres Rd, Gqeberha, 6001');
INSERT INTO PARCEL (tracking_code, sender_id, recipient_id, status_id, route_id, weight_kg, size_category, service_type, destination_address) VALUES ('TR-240609-10010', 8,  15, 1, 1,  0.5, 'SMALL',     'EXPRESS',  '20 Khumalo St, Tembisa, 1628');
INSERT INTO PARCEL (tracking_code, sender_id, recipient_id, status_id, route_id, weight_kg, size_category, service_type, destination_address) VALUES ('TR-240610-10011', 10, 1,  2, 2,  6.0, 'LARGE',     'STANDARD', '14 Vilakazi St, Soweto, 1804');
INSERT INTO PARCEL (tracking_code, sender_id, recipient_id, status_id, route_id, weight_kg, size_category, service_type, destination_address) VALUES ('TR-240611-10012', 14, 3,  6, 3, 18.0, 'OVERSIZED', 'STANDARD', '5 Blouberg Rd, Cape Town, 7441');
COMMIT;

-- STEP 12: ROUTE ASSIGNMENTS
INSERT INTO ROUTE_ASSIGNMENT (route_id, driver_id, vehicle_id, assignment_date, total_load_kg) VALUES (1, 1, 1, TRUNC(SYSDATE), 1172.0);
INSERT INTO ROUTE_ASSIGNMENT (route_id, driver_id, vehicle_id, assignment_date, total_load_kg) VALUES (2, 2, 2, TRUNC(SYSDATE), 1110.0);
INSERT INTO ROUTE_ASSIGNMENT (route_id, driver_id, vehicle_id, assignment_date, total_load_kg) VALUES (3, 3, 3, TRUNC(SYSDATE),  549.0);
INSERT INTO ROUTE_ASSIGNMENT (route_id, driver_id, vehicle_id, assignment_date, total_load_kg) VALUES (4, 4, 4, TRUNC(SYSDATE), 1122.0);
COMMIT;

-- STEP 13: DELIVERY EVENTS
INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, event_timestamp, location_notes) VALUES (1, 'INTAKE',     'PENDING',        SYSTIMESTAMP - INTERVAL '5' DAY,                        'Received at Johannesburg Hub');
INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, event_timestamp, location_notes) VALUES (1, 'DISPATCHED', 'PENDING',        SYSTIMESTAMP - INTERVAL '4' DAY,                        'Loaded onto JHB 482 GP');
INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, event_timestamp, recipient_name, location_notes) VALUES (1, 'DELIVERED', 'SUCCESS', SYSTIMESTAMP - INTERVAL '4' DAY + INTERVAL '4' HOUR, 'S. Nkosi', 'Delivered signed at door');
INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, event_timestamp, location_notes) VALUES (2, 'INTAKE',     'PENDING',        SYSTIMESTAMP - INTERVAL '3' DAY,                        'Received at Durban Hub');
INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, event_timestamp, location_notes) VALUES (2, 'DISPATCHED', 'PENDING',        SYSTIMESTAMP - INTERVAL '2' DAY,                        'Loaded onto ND 885 DG');
INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, event_timestamp, recipient_name, location_notes) VALUES (2, 'DELIVERED', 'SUCCESS', SYSTIMESTAMP - INTERVAL '2' DAY + INTERVAL '3' HOUR, 'P. Naidoo', 'Delivered to reception');
INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, event_timestamp, location_notes) VALUES (3, 'INTAKE',     'PENDING',        SYSTIMESTAMP - INTERVAL '4' DAY,                        'Received at Cape Town Hub');
INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, event_timestamp, recipient_name, location_notes) VALUES (3, 'DELIVERED', 'SUCCESS', SYSTIMESTAMP - INTERVAL '3' DAY + INTERVAL '5' HOUR, 'W. Botha', 'Left with security');
INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, event_timestamp, location_notes) VALUES (4, 'INTAKE',     'PENDING',        SYSTIMESTAMP - INTERVAL '2' DAY,                        'Received at Johannesburg Hub');
INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, event_timestamp, recipient_name, location_notes) VALUES (4, 'DELIVERED', 'SUCCESS', SYSTIMESTAMP - INTERVAL '1' DAY + INTERVAL '2' HOUR, 'F. Moosa', 'Delivered hand to hand');
INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, event_timestamp, location_notes) VALUES (5, 'INTAKE',     'PENDING',        SYSTIMESTAMP - INTERVAL '1' DAY,                        'Received at Cape Town Hub');
INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, event_timestamp, location_notes) VALUES (5, 'IN_TRANSIT', 'PENDING',        SYSTIMESTAMP - INTERVAL '2' HOUR,                       'Out for delivery on Route R-01');
INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, event_timestamp, location_notes) VALUES (6, 'INTAKE',     'PENDING',        SYSTIMESTAMP - INTERVAL '1' DAY,                        'Received at PE Hub');
INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, event_timestamp, location_notes) VALUES (6, 'IN_TRANSIT', 'PENDING',        SYSTIMESTAMP - INTERVAL '1' HOUR,                       'Out for delivery');
INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, event_timestamp, location_notes) VALUES (7, 'INTAKE',     'PENDING',        SYSTIMESTAMP - INTERVAL '12' HOUR,                      'Received at Johannesburg Hub');
INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, event_timestamp, location_notes) VALUES (7, 'IN_TRANSIT', 'PENDING',        SYSTIMESTAMP - INTERVAL '3' HOUR,                       'Loaded and dispatched');
INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, event_timestamp, location_notes) VALUES (8, 'INTAKE',     'PENDING',        SYSTIMESTAMP - INTERVAL '3' DAY,                        'Received at Durban Hub');
INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, event_timestamp, location_notes) VALUES (8, 'FAILED',     'FAILED_ADDRESS', SYSTIMESTAMP - INTERVAL '2' DAY,                        'Address does not exist returned to hub');
INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, event_timestamp, location_notes) VALUES (9,  'INTAKE', 'PENDING', SYSTIMESTAMP - INTERVAL '2' HOUR,   'Received at PE Hub');
INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, event_timestamp, location_notes) VALUES (10, 'INTAKE', 'PENDING', SYSTIMESTAMP - INTERVAL '30' MINUTE, 'Received at Johannesburg Hub');
INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, event_timestamp, location_notes) VALUES (11, 'INTAKE', 'PENDING', SYSTIMESTAMP - INTERVAL '6' HOUR,   'Received at Johannesburg Hub');
INSERT INTO DELIVERY_EVENT (parcel_id, event_type, outcome_code, event_timestamp, location_notes) VALUES (12, 'INTAKE', 'PENDING', SYSTIMESTAMP - INTERVAL '8' HOUR,   'Received at Cape Town Hub');
COMMIT;

-- STEP 14: INVOICES
INSERT INTO INVOICE (parcel_id, client_id, invoice_number, amount_zar, payment_status, issue_date, payment_date) VALUES (1, 8,  'INV-2024-00001', 145.00, 'PAID',    DATE '2024-06-01', DATE '2024-06-03');
INSERT INTO INVOICE (parcel_id, client_id, invoice_number, amount_zar, payment_status, issue_date)              VALUES (2, 8,  'INV-2024-00002', 265.00, 'PAID',    DATE '2024-06-01');
INSERT INTO INVOICE (parcel_id, client_id, invoice_number, amount_zar, payment_status, issue_date)              VALUES (3, 9,  'INV-2024-00003', 540.00, 'UNPAID',  DATE '2024-06-02');
INSERT INTO INVOICE (parcel_id, client_id, invoice_number, amount_zar, payment_status, issue_date)              VALUES (4, 10, 'INV-2024-00004', 295.00, 'OVERDUE', DATE '2024-06-03');
COMMIT;

-- VERIFY
SELECT 'CLIENT'           AS tbl, COUNT(*) AS cnt FROM CLIENT           UNION ALL
SELECT 'DRIVER'           AS tbl, COUNT(*) AS cnt FROM DRIVER           UNION ALL
SELECT 'VEHICLE'          AS tbl, COUNT(*) AS cnt FROM VEHICLE          UNION ALL
SELECT 'SORTING_HUB'      AS tbl, COUNT(*) AS cnt FROM SORTING_HUB      UNION ALL
SELECT 'PARCEL_STATUS'    AS tbl, COUNT(*) AS cnt FROM PARCEL_STATUS    UNION ALL
SELECT 'ROUTE'            AS tbl, COUNT(*) AS cnt FROM ROUTE            UNION ALL
SELECT 'ROUTE_ZONE'       AS tbl, COUNT(*) AS cnt FROM ROUTE_ZONE       UNION ALL
SELECT 'TARIFF_RATE'      AS tbl, COUNT(*) AS cnt FROM TARIFF_RATE      UNION ALL
SELECT 'PARCEL'           AS tbl, COUNT(*) AS cnt FROM PARCEL           UNION ALL
SELECT 'ROUTE_ASSIGNMENT' AS tbl, COUNT(*) AS cnt FROM ROUTE_ASSIGNMENT UNION ALL
SELECT 'DELIVERY_EVENT'   AS tbl, COUNT(*) AS cnt FROM DELIVERY_EVENT   UNION ALL
SELECT 'INVOICE'          AS tbl, COUNT(*) AS cnt FROM INVOICE
ORDER BY tbl;