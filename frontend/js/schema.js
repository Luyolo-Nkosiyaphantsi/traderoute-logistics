// =============================================================
// frontend/js/schema.js
// DB Schema page — renders entity cards and nav setup
// =============================================================

Pages.schema = {
  load() {
    this.renderEntityCards();
  },

  renderEntityCards() {
    const grid = document.getElementById('schemaGrid');
    if (!grid) return;

    const entities = [
      {
        name: 'SORTING_HUB',
        pk:   'hub_id',
        fields: [
          { name: 'hub_id',           type: 'NUMBER PK',       kind: 'pk' },
          { name: 'hub_name',         type: 'VARCHAR2(100) NN' },
          { name: 'address',          type: 'VARCHAR2(300)' },
          { name: 'city',             type: 'VARCHAR2(50)' },
          { name: 'province',         type: 'VARCHAR2(50)' },
          { name: 'capacity_parcels', type: 'NUMBER(6) CHK>0' },
        ],
      },
      {
        name: 'CLIENT',
        pk:   'client_id',
        fields: [
          { name: 'client_id',       type: 'NUMBER PK',            kind: 'pk' },
          { name: 'client_name',     type: 'VARCHAR2(100) NN' },
          { name: 'client_type',     type: 'VARCHAR2(20) CHK' },
          { name: 'email',           type: 'VARCHAR2(150) UQ NN' },
          { name: 'phone',           type: 'VARCHAR2(20)' },
          { name: 'address',         type: 'VARCHAR2(300) NN' },
          { name: 'date_registered', type: 'DATE DEFAULT SYSDATE' },
        ],
      },
      {
        name: 'PARCEL_STATUS',
        pk:   'status_id',
        fields: [
          { name: 'status_id',   type: 'NUMBER PK',         kind: 'pk' },
          { name: 'status_name', type: 'VARCHAR2(30) UQ NN' },
          { name: 'description', type: 'VARCHAR2(200)' },
        ],
      },
      {
        name: 'DRIVER',
        pk:   'driver_id',
        fields: [
          { name: 'driver_id',      type: 'NUMBER PK',        kind: 'pk' },
          { name: 'full_name',      type: 'VARCHAR2(100) NN' },
          { name: 'license_number', type: 'VARCHAR2(30) UQ NN' },
          { name: 'license_expiry', type: 'DATE' },
          { name: 'is_available',   type: "CHAR(1) CHK('Y','N')" },
          { name: 'phone',          type: 'VARCHAR2(20)' },
          { name: 'date_hired',     type: 'DATE' },
        ],
      },
      {
        name: 'VEHICLE',
        pk:   'vehicle_id',
        fields: [
          { name: 'vehicle_id',        type: 'NUMBER PK',        kind: 'pk' },
          { name: 'registration',      type: 'VARCHAR2(15) UQ NN' },
          { name: 'make',              type: 'VARCHAR2(50)' },
          { name: 'model',             type: 'VARCHAR2(50)' },
          { name: 'capacity_kg',       type: 'NUMBER(8,2) NN CHK>0' },
          { name: 'service_status',    type: 'VARCHAR2(20) CHK' },
          { name: 'last_service_date', type: 'DATE' },
        ],
      },
      {
        name: 'ROUTE',
        pk:   'route_id',
        fields: [
          { name: 'route_id',        type: 'NUMBER PK',        kind: 'pk' },
          { name: 'route_code',      type: 'VARCHAR2(10) UQ NN' },
          { name: 'route_name',      type: 'VARCHAR2(100) NN' },
          { name: 'hub_id',          type: 'NUMBER FK→SORTING_HUB', kind: 'fk' },
          { name: 'max_capacity_kg', type: 'NUMBER(8,2)' },
          { name: 'is_active',       type: "CHAR(1) DEFAULT 'Y'" },
        ],
      },
      {
        name: 'ROUTE_ZONE',
        pk:   'zone_id',
        fields: [
          { name: 'zone_id',      type: 'NUMBER PK',       kind: 'pk' },
          { name: 'route_id',     type: 'NUMBER FK→ROUTE', kind: 'fk' },
          { name: 'zone_name',    type: 'VARCHAR2(100) NN' },
          { name: 'postal_codes', type: 'VARCHAR2(500)' },
          { name: 'province',     type: 'VARCHAR2(50)' },
          { name: 'city',         type: 'VARCHAR2(50)' },
        ],
      },
      {
        name: 'PARCEL',
        pk:   'parcel_id',
        fields: [
          { name: 'parcel_id',           type: 'NUMBER PK',             kind: 'pk' },
          { name: 'tracking_code',       type: 'VARCHAR2(25) UQ NN' },
          { name: 'sender_id',           type: 'NUMBER FK→CLIENT',       kind: 'fk' },
          { name: 'recipient_id',        type: 'NUMBER FK→CLIENT',       kind: 'fk' },
          { name: 'status_id',           type: 'NUMBER FK→PARCEL_STATUS',kind: 'fk' },
          { name: 'route_id',            type: 'NUMBER FK→ROUTE',        kind: 'fk' },
          { name: 'weight_kg',           type: 'NUMBER(6,2) NN CHK>0' },
          { name: 'size_category',       type: 'VARCHAR2(10) CHK' },
          { name: 'service_type',        type: 'VARCHAR2(15) CHK' },
          { name: 'intake_date',         type: 'DATE DEFAULT SYSDATE' },
          { name: 'destination_address', type: 'VARCHAR2(300)' },
        ],
      },
      {
        name: 'ROUTE_ASSIGNMENT',
        pk:   'assignment_id',
        fields: [
          { name: 'assignment_id',   type: 'NUMBER PK',        kind: 'pk' },
          { name: 'route_id',        type: 'NUMBER FK→ROUTE',  kind: 'fk' },
          { name: 'driver_id',       type: 'NUMBER FK→DRIVER', kind: 'fk' },
          { name: 'vehicle_id',      type: 'NUMBER FK→VEHICLE',kind: 'fk' },
          { name: 'assignment_date', type: 'DATE NN' },
          { name: 'total_load_kg',   type: 'NUMBER(8,2)' },
          { name: 'UQ(driver_id,date)',  type: 'UNIQUE CONSTRAINT' },
          { name: 'UQ(vehicle_id,date)', type: 'UNIQUE CONSTRAINT' },
          { name: 'UQ(route_id,date)',   type: 'UNIQUE CONSTRAINT' },
        ],
      },
      {
        name: 'DELIVERY_EVENT',
        pk:   'event_id',
        fields: [
          { name: 'event_id',        type: 'NUMBER PK',                kind: 'pk' },
          { name: 'parcel_id',       type: 'NUMBER FK→PARCEL',         kind: 'fk' },
          { name: 'assignment_id',   type: 'NUMBER FK→ROUTE_ASSIGNMENT',kind: 'fk' },
          { name: 'event_type',      type: 'VARCHAR2(30) NN CHK' },
          { name: 'outcome_code',    type: 'VARCHAR2(20) CHK' },
          { name: 'event_timestamp', type: 'TIMESTAMP DEFAULT SYSTIMESTAMP' },
          { name: 'recipient_name',  type: 'VARCHAR2(100)' },
          { name: 'location_notes',  type: 'VARCHAR2(300)' },
        ],
      },
      {
        name: 'TARIFF_RATE',
        pk:   'tariff_id',
        fields: [
          { name: 'tariff_id',       type: 'NUMBER PK',           kind: 'pk' },
          { name: 'weight_band_min', type: 'NUMBER(6,2) NN' },
          { name: 'weight_band_max', type: 'NUMBER(6,2) NN' },
          { name: 'size_category',   type: 'VARCHAR2(10) CHK' },
          { name: 'zone_id',         type: 'NUMBER FK→ROUTE_ZONE', kind: 'fk' },
          { name: 'service_type',    type: 'VARCHAR2(15) CHK' },
          { name: 'rate_zar',        type: 'NUMBER(8,2) NN CHK>0' },
          { name: 'effective_from',  type: 'DATE DEFAULT SYSDATE' },
        ],
      },
      {
        name: 'INVOICE',
        pk:   'invoice_id',
        fields: [
          { name: 'invoice_id',     type: 'NUMBER PK',       kind: 'pk' },
          { name: 'parcel_id',      type: 'NUMBER FK→PARCEL',kind: 'fk' },
          { name: 'client_id',      type: 'NUMBER FK→CLIENT',kind: 'fk' },
          { name: 'invoice_number', type: 'VARCHAR2(30) UQ NN' },
          { name: 'amount_zar',     type: 'NUMBER(10,2) NN CHK>0' },
          { name: 'payment_status', type: 'VARCHAR2(15) CHK' },
          { name: 'issue_date',     type: 'DATE DEFAULT SYSDATE' },
          { name: 'payment_date',   type: 'DATE' },
        ],
      },
    ];

    grid.innerHTML = entities.map(entity => `
      <div class="entity-card">
        <div class="entity-card-head">
          <span class="entity-card-name">${entity.name}</span>
          <span class="entity-card-pk">PK: ${entity.pk}</span>
        </div>
        <div class="entity-card-body">
          ${entity.fields.map(f => `
            <div class="entity-field">
              <span class="field-name ${f.kind || ''}">${f.name}</span>
              <span class="field-type">${f.type}</span>
            </div>`
          ).join('')}
        </div>
      </div>`
    ).join('');

    // Legend
    grid.insertAdjacentHTML('afterend', `
      <div style="
        display:flex; gap:1.5rem; flex-wrap:wrap;
        font-family:var(--ff-mono); font-size:10px;
        color:var(--muted); margin-bottom:1.5rem;
      ">
        <span><span style="color:var(--orange)">■</span> PK — Primary Key</span>
        <span><span style="color:var(--blue)">■</span> FK — Foreign Key</span>
        <span>NN — NOT NULL &nbsp;|&nbsp; UQ — UNIQUE &nbsp;|&nbsp; CHK — CHECK constraint</span>
      </div>`
    );
  },
};