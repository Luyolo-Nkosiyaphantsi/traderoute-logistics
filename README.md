# TradeRoute Logistics — Full-Stack Application
## CMPG311 Database Project · Node.js + Express + Oracle + Vanilla JS SPA

---

## Quick Start

```bash
# 1. Run Oracle DDL
#    Open backend/db/traderoute_oracle_ddl.sql in Oracle SQL Developer → Run Script

# 2. Configure environment
cd backend
cp .env.example .env
# Edit .env with your Oracle credentials

# 3. Install dependencies and start API
npm install
npm run dev        # development (nodemon hot-reload)
# OR
npm start          # production

# 4. Open frontend
# In VSCode → right-click frontend/index.html → Open with Live Server
# URL: http://localhost:5500
```

---

## File Structure

```
traderoute-final/
│
├── backend/
│   ├── server.js                  ← Express entry point + middleware + routing
│   ├── package.json               ← npm dependencies
│   ├── .env.example               ← Copy to .env
│   ├── db/
│   │   ├── pool.js                ← Oracle oracledb connection pool
│   │   └── traderoute_oracle_ddl.sql  ← Complete Oracle DDL
│   └── routes/
│       ├── parcels.js             ← /api/parcels — full CRUD + tracking
│       ├── clients.js             ← /api/clients — full CRUD
│       ├── routes.js              ← /api/routes  — routes + assignment
│       ├── drivers.js             ← /api/drivers — drivers + vehicles
│       └── invoices.js            ← /api/invoices — billing + tariffs
│
└── frontend/
    ├── index.html                 ← Single-page app (all 5 modules)
    ├── Logo.jpeg                  ← TradeRoute Logistics brand logo
    ├── css/
    │   └── app.css                ← Full brand stylesheet
    └── js/
        ├── api.js                 ← All API calls (fetch wrapper)
        ├── ui.js                  ← toast, buildTable, badge, formData
        └── app.js                 ← Page controllers for all 5 modules
```

---

## Database — 12 Tables (3NF)

| Table              | Description |
|--------------------|-------------|
| `SORTING_HUB`      | Physical sorting/distribution hubs |
| `CLIENT`           | Senders and recipients (POPIA-protected) |
| `PARCEL_STATUS`    | Lookup — status values |
| `DRIVER`           | Driver registry (operational, not HR) |
| `VEHICLE`          | Fleet management |
| `ROUTE`            | Delivery routes per hub |
| `ROUTE_ZONE`       | Geographic zones per route |
| `PARCEL`           | Core entity — every tracked parcel |
| `ROUTE_ASSIGNMENT` | Driver + vehicle assigned to route per day |
| `DELIVERY_EVENT`   | Full delivery history / event log |
| `TARIFF_RATE`      | Rate schedule by weight/zone/size/service |
| `INVOICE`          | Auto-calculated billing |

---

## API Endpoints

### Health
```
GET  /api/health
```

### Parcels
```
GET    /api/parcels                  List all parcels
GET    /api/parcels/:id              Single parcel
GET    /api/parcels/track/:code      Full tracking history + events
POST   /api/parcels                  Create parcel (auto tracking code)
PUT    /api/parcels/:id              Update parcel details
PATCH  /api/parcels/:id/status       Update status + log delivery event
DELETE /api/parcels/:id              Delete parcel
```

### Clients
```
GET    /api/clients          List all clients
GET    /api/clients/:id      Single client
POST   /api/clients          Create client
PUT    /api/clients/:id      Update client
DELETE /api/clients/:id      Delete client
```

### Routes
```
GET    /api/routes           All routes with parcel counts
GET    /api/routes/today     Today's full schedule (driver + vehicle)
GET    /api/routes/hubs      All sorting hubs
GET    /api/routes/:id       Single route
POST   /api/routes           Create route
POST   /api/routes/assign    Assign driver + vehicle to route
PUT    /api/routes/:id       Update route
DELETE /api/routes/:id       Soft-deactivate route
```

### Drivers & Vehicles
```
GET    /api/drivers                    All drivers with license status
GET    /api/drivers/available          Available drivers (not assigned today)
GET    /api/drivers/vehicles           All vehicles
GET    /api/drivers/vehicles/available Available OPERATIONAL vehicles
GET    /api/drivers/:id                Single driver
POST   /api/drivers                    Add driver
POST   /api/drivers/vehicles           Add vehicle
PUT    /api/drivers/:id                Update driver
DELETE /api/drivers/:id                Remove driver
```

### Invoices
```
GET    /api/invoices          All invoices
GET    /api/invoices/summary  Monthly KPI totals
GET    /api/invoices/:id      Single invoice
POST   /api/invoices          Generate invoice (auto-calculates tariff)
PATCH  /api/invoices/:id/pay  Mark as PAID
PATCH  /api/invoices/:id/status  Update payment status
DELETE /api/invoices/:id      Delete invoice
```

---

## Business Rules (DB-Enforced)

| Rule | Constraint |
|------|-----------|
| One driver per route per day | `UNIQUE(driver_id, assignment_date)` |
| One vehicle per day | `UNIQUE(vehicle_id, assignment_date)` |
| One assignment per route per day | `UNIQUE(route_id, assignment_date)` |
| Parcel weight > 0 | `CHECK (weight_kg > 0)` |
| Invoice amount > 0 | `CHECK (amount_zar > 0)` |
| Valid status values | `CHECK` on all status/type columns |
| Email uniqueness | `UNIQUE (email)` on CLIENT |
| License uniqueness | `UNIQUE (license_number)` on DRIVER |
| Tracking code uniqueness | `UNIQUE (tracking_code)` on PARCEL |

---

## Oracle Error Mapping

| Oracle Error | HTTP Status | Message |
|-------------|-------------|---------|
| ORA-00001 (UNIQUE violated) | 409 Conflict | Duplicate email / license / code |
| ORA-02292 (FK child exists) | 409 Conflict | Cannot delete — has child records |
| Other | 500 Internal | Generic error |

---

## Environment Variables (.env)

```env
DB_USER=traderoute_admin
DB_PASSWORD=your_password_here
DB_CONNECTION_STRING=localhost:1521/XEPDB1
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5500
```

---

## Oracle Views Created

| View | Purpose | Access |
|------|---------|--------|
| `VW_PARCEL_TRACKING` | Tracking without PII | Operations staff |
| `VW_CLIENT_INVOICES` | Invoice summaries | Finance team |
| `VW_TODAYS_ROUTES` | Today's driver schedule | Drivers |
| `VW_DRIVER_PERFORMANCE` | Delivery success rates | Management |

---

## CMPG311 Compliance Notes

- **3NF** — All 12 tables are in Third Normal Form (no transitive dependencies)
- **Referential integrity** — All FK constraints enforced at Oracle DB level
- **Check constraints** — All domain values validated in DDL
- **POPIA** — Sensitive data accessible only via restricted VIEWs
- **Soft delete** — Routes deactivated (IS_ACTIVE='N'), not hard-deleted
- **Audit trail** — Every delivery event logged in DELIVERY_EVENT
- **Auto-billing** — Invoice amounts calculated via Oracle tariff JOIN