// =============================================================
// frontend/js/app.js
// Page controllers + navigation + API wiring
// All 4 modules: Parcel Tracking, Clients, Routes, Drivers+Fleet,
// Invoices
// =============================================================

// ── Navigation ────────────────────────────────────────────────
function initNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      if (!page) return;

      // Update active nav item
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      // Show selected page, hide others
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      const target = document.getElementById(`page-${page}`);
      if (target) target.classList.add('active');

      // Load page data
      if (Pages[page] && typeof Pages[page].load === 'function') {
        Pages[page].load();
      }
    });
  });
}

// ── API Health Check ──────────────────────────────────────────
async function checkApiHealth() {
  const dot   = document.getElementById('apiDot');
  const label = document.getElementById('apiLabel');
  try {
    await API.health();
    if (dot)   dot.className   = 'api-dot online';
    if (label) label.textContent = 'API ONLINE';
  } catch {
    if (dot)   dot.className   = 'api-dot offline';
    if (label) label.textContent = 'API OFFLINE';
  }
}

// ── Set today's date in all date inputs ───────────────────────
function setDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(input => {
    if (!input.value) input.value = today;
  });
}

// =============================================================
// PAGE CONTROLLERS
// =============================================================
const Pages = {};

// ╔═══════════════════════════════════════════════════════════╗
// ║  MODULE 01 — PARCEL TRACKING                              ║
// ╚═══════════════════════════════════════════════════════════╝
Pages.track = {
  async load() {
    const el = document.getElementById('parcelsTable');
    UI.setLoading(el, true, 'Loading all parcels…');
    try {
      const { data } = await API.parcels.list();
      UI.buildTable(
        'parcelsTable',
        [
          { key: 'TRACKING_CODE', label: 'Tracking Code',
            render: (v) => `<strong style="font-family:var(--ff-mono);color:var(--navy)">${v}</strong>` },
          { key: 'STATUS_NAME',    label: 'Status',    render: v => UI.badge(v) },
          { key: 'SENDER_NAME',    label: 'Sender' },
          { key: 'RECIPIENT_NAME', label: 'Recipient' },
          { key: 'ROUTE_CODE',     label: 'Route' },
          { key: 'SERVICE_TYPE',   label: 'Service',   render: v => UI.badge(v) },
          { key: 'SIZE_CATEGORY',  label: 'Size',      render: v => UI.badge(v) },
          { key: 'WEIGHT_KG',      label: 'Weight',    render: v => `${v} kg` },
          { key: 'INTAKE_DATE',    label: 'Intake',    render: UI.formatDate },
        ],
        data,
        [
          { label: 'Track',  type: 'default', handler: 'Pages.track.trackFromRow' },
          { label: 'Delete', type: 'danger',  handler: 'Pages.track.deleteRow' },
        ]
      );
    } catch (err) {
      UI.setError(document.getElementById('parcelsTable'), err.message);
    }
  },

  async search() {
    const code = (document.getElementById('trackInput')?.value || '').trim();
    if (!code) {
      UI.toast('Please enter a tracking code', 'warn');
      return;
    }
    const resultEl = document.getElementById('trackResult');
    resultEl.innerHTML = `<div class="loading-row"><span class="spinner"></span>Searching for ${code}…</div>`;

    try {
      const { parcel: p, events } = await API.parcels.track(code);

      const metaItems = [
        { label: 'Tracking Code',  value: p.TRACKING_CODE },
        { label: 'Status',         value: UI.badge(p.STATUS_NAME) },
        { label: 'Service Type',   value: UI.badge(p.SERVICE_TYPE) },
        { label: 'Size Category',  value: UI.badge(p.SIZE_CATEGORY) },
        { label: 'Weight',         value: `${p.WEIGHT_KG} kg` },
        { label: 'Sender',         value: p.SENDER_NAME },
        { label: 'Recipient',      value: p.RECIPIENT_NAME },
        { label: 'Route',          value: p.ROUTE_NAME || '—' },
        { label: 'Hub',            value: p.HUB_CITY   || '—' },
        { label: 'Destination',    value: p.DESTINATION_ADDRESS || '—' },
        { label: 'Intake Date',    value: UI.formatDate(p.INTAKE_DATE) },
      ];

      const metaHtml = metaItems.map(m => `
        <div class="meta-item">
          <span class="meta-label">${m.label}</span>
          <span class="meta-value">${m.value}</span>
        </div>`
      ).join('');

      const eventsHtml = events.length === 0
        ? '<li class="tl-item"><div class="tl-dot"></div><div class="tl-body"><div class="tl-event">No delivery events recorded yet</div></div></li>'
        : events.map(e => {
            const failed = e.OUTCOME_CODE === 'FAILED_ADDRESS' || e.OUTCOME_CODE === 'FAILED_ABSENT' || e.OUTCOME_CODE === 'FAILED_REFUSED';
            const done   = e.OUTCOME_CODE === 'SUCCESS';
            return `
              <li class="tl-item">
                <div class="tl-dot ${done ? 'done' : ''} ${failed ? 'failed' : ''}"></div>
                <div class="tl-body">
                  <div class="tl-event">${e.EVENT_TYPE}${e.LOCATION_NOTES ? ' — ' + e.LOCATION_NOTES : ''}</div>
                  <div class="tl-sub">
                    ${e.OUTCOME_CODE ? UI.badge(e.OUTCOME_CODE) : ''}
                    ${e.RECIPIENT_NAME ? ' · Signed by ' + e.RECIPIENT_NAME : ''}
                    ${e.DRIVER_NAME    ? ' · Driver: '   + e.DRIVER_NAME    : ''}
                    ${e.VEHICLE_REG    ? ' · Vehicle: '  + e.VEHICLE_REG    : ''}
                  </div>
                  <div class="tl-time">${e.EVENT_TIMESTAMP || '—'}</div>
                </div>
              </li>`;
          }).join('');

      resultEl.innerHTML = `
        <div class="timeline-wrap">
          <div class="parcel-meta-grid">${metaHtml}</div>
          <ul class="timeline">${eventsHtml}</ul>
        </div>`;

    } catch (err) {
      resultEl.innerHTML = `
        <div class="timeline-wrap">
          <div class="empty-state" style="color:var(--danger)">
            <span class="empty-icon">🔍</span>
            ${err.message}
          </div>
        </div>`;
    }
  },

  trackFromRow(row) {
    const input = document.getElementById('trackInput');
    if (input) input.value = row.TRACKING_CODE;
    Pages.track.search();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  async deleteRow(row) {
    if (!UI.confirmDialog(`Delete parcel ${row.TRACKING_CODE}? This cannot be undone.`)) return;
    try {
      await API.parcels.delete(row.PARCEL_ID);
      UI.toast(`Parcel ${row.TRACKING_CODE} deleted`, 'success');
      Pages.track.load();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },

  showCreateForm() {
    const panel = document.getElementById('createParcelPanel');
    if (panel) {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
  },

  async create() {
    const data = UI.formData('parcelForm');
    try {
      const res = await API.parcels.create(data);
      UI.toast(`✅ Parcel created — ${res.tracking_code}`, 'success');
      document.getElementById('parcelForm').reset();
      document.getElementById('createParcelPanel').style.display = 'none';
      Pages.track.load();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },

  async updateStatus() {
    const data = UI.formData('statusForm');
    const id = document.getElementById('statusParcelId')?.value;
    if (!id) { UI.toast('Enter a Parcel ID first', 'warn'); return; }
    try {
      await API.parcels.updateStatus(id, data);
      UI.toast('Status updated successfully', 'success');
      document.getElementById('statusForm').reset();
      Pages.track.load();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },
};

// Expose for onclick handlers
window.Pages = Pages;

// ╔═══════════════════════════════════════════════════════════╗
// ║  MODULE 02 — CLIENT MANAGEMENT                            ║
// ╚═══════════════════════════════════════════════════════════╝
Pages.clients = {
  async load() {
    const el = document.getElementById('clientsTable');
    UI.setLoading(el, true, 'Loading clients…');
    try {
      const { data } = await API.clients.list();
      UI.buildTable(
        'clientsTable',
        [
          { key: 'CLIENT_ID',       label: 'ID' },
          { key: 'CLIENT_NAME',     label: 'Name',
            render: v => `<strong>${v}</strong>` },
          { key: 'CLIENT_TYPE',     label: 'Type',       render: v => UI.badge(v) },
          { key: 'EMAIL',           label: 'Email' },
          { key: 'PHONE',           label: 'Phone' },
          { key: 'ADDRESS',         label: 'Address',
            render: v => `<span title="${v}" style="max-width:200px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${v}</span>` },
          { key: 'DATE_REGISTERED', label: 'Registered', render: UI.formatDate },
        ],
        data,
        [
          { label: 'Delete', type: 'danger', handler: 'Pages.clients.deleteRow' },
        ]
      );
    } catch (err) {
      UI.setError(document.getElementById('clientsTable'), err.message);
    }
  },

  async create() {
    const data = UI.formData('clientForm');
    try {
      await API.clients.create(data);
      UI.toast('Client created successfully ✅', 'success');
      document.getElementById('clientForm').reset();
      Pages.clients.load();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },

  async deleteRow(row) {
    if (!UI.confirmDialog(`Delete client "${row.CLIENT_NAME}"? This cannot be undone.`)) return;
    try {
      await API.clients.delete(row.CLIENT_ID);
      UI.toast('Client deleted', 'success');
      Pages.clients.load();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },
};

// ╔═══════════════════════════════════════════════════════════╗
// ║  MODULE 03 — ROUTE MANAGEMENT                             ║
// ╚═══════════════════════════════════════════════════════════╝
Pages.routes = {
  async load() {
    this.loadTodaySchedule();
    this.loadAllRoutes();
  },

  async loadTodaySchedule() {
    const el = document.getElementById('todayRoutesTable');
    UI.setLoading(el, true, 'Loading today\'s schedule…');
    try {
      const { data } = await API.routes.today();
      if (data.length === 0) {
        UI.setEmpty(el, 'No routes assigned for today', '🗺️');
        return;
      }
      UI.buildTable(
        'todayRoutesTable',
        [
          { key: 'ROUTE_CODE',    label: 'Code' },
          { key: 'ROUTE_NAME',    label: 'Route Name' },
          { key: 'DRIVER_NAME',   label: 'Driver' },
          { key: 'DRIVER_PHONE',  label: 'Driver Phone' },
          { key: 'REGISTRATION',  label: 'Vehicle' },
          { key: 'VEHICLE_DESC',  label: 'Make/Model' },
          { key: 'CAPACITY_KG',   label: 'Capacity kg' },
          { key: 'TOTAL_LOAD_KG', label: 'Load kg' },
          { key: 'LOAD_PCT',      label: 'Utilisation',
            render: v => {
              if (v === null || v === undefined) return '—';
              const pct = Number(v);
              const color = pct >= 100 ? 'var(--danger)' : pct >= 80 ? 'var(--warn)' : 'var(--success)';
              return `<span style="color:${color};font-weight:800">${pct}%</span>`;
            }},
          { key: 'HUB_NAME', label: 'Hub' },
        ],
        data
      );
    } catch (err) {
      UI.setError(document.getElementById('todayRoutesTable'), err.message);
    }
  },

  async loadAllRoutes() {
    const el = document.getElementById('allRoutesTable');
    UI.setLoading(el, true, 'Loading routes…');
    try {
      const { data } = await API.routes.list();
      UI.buildTable(
        'allRoutesTable',
        [
          { key: 'ROUTE_CODE',      label: 'Code' },
          { key: 'ROUTE_NAME',      label: 'Route Name' },
          { key: 'HUB_NAME',        label: 'Sorting Hub' },
          { key: 'HUB_CITY',        label: 'City' },
          { key: 'MAX_CAPACITY_KG', label: 'Max Capacity kg' },
          { key: 'PARCELS_TODAY',   label: 'Parcels Today' },
          { key: 'LOAD_TODAY_KG',   label: 'Load Today kg' },
          { key: 'IS_ACTIVE',       label: 'Active', render: v => UI.badge(v) },
        ],
        data,
        [
          { label: 'Deactivate', type: 'danger', handler: 'Pages.routes.deactivate' },
        ]
      );
    } catch (err) {
      UI.setError(document.getElementById('allRoutesTable'), err.message);
    }
  },

  async assign() {
    const data = UI.formData('assignForm');
    try {
      await API.routes.assign(data);
      UI.toast('Route assigned successfully ✅', 'success');
      document.getElementById('assignForm').reset();
      setDefaultDates();
      this.loadTodaySchedule();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },

  async createRoute() {
    const data = UI.formData('routeForm');
    try {
      await API.routes.create(data);
      UI.toast('Route created ✅', 'success');
      document.getElementById('routeForm').reset();
      this.loadAllRoutes();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },

  async deactivate(row) {
    if (!UI.confirmDialog(`Deactivate route ${row.ROUTE_CODE} — ${row.ROUTE_NAME}?`)) return;
    try {
      await API.routes.deactivate(row.ROUTE_ID);
      UI.toast(`Route ${row.ROUTE_CODE} deactivated`, 'success');
      Pages.routes.loadAllRoutes();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },
};

// ╔═══════════════════════════════════════════════════════════╗
// ║  MODULE 04 — DRIVERS & FLEET                              ║
// ╚═══════════════════════════════════════════════════════════╝
Pages.drivers = {
  async load() {
    this.loadDrivers();
    this.loadVehicles();
  },

  async loadDrivers() {
    const el = document.getElementById('driversTable');
    UI.setLoading(el, true, 'Loading drivers…');
    try {
      const { data } = await API.drivers.list();
      UI.buildTable(
        'driversTable',
        [
          { key: 'DRIVER_ID',      label: 'ID' },
          { key: 'FULL_NAME',      label: 'Full Name',
            render: v => `<strong>${v}</strong>` },
          { key: 'LICENSE_NUMBER', label: 'License No.' },
          { key: 'LICENSE_EXPIRY', label: 'Expiry',       render: UI.formatDate },
          { key: 'LICENSE_STATUS', label: 'License',      render: v => UI.badge(v) },
          { key: 'IS_AVAILABLE',   label: 'Available',    render: v => UI.badge(v) },
          { key: 'PHONE',          label: 'Phone' },
          { key: 'TODAYS_ROUTE',   label: 'Route Today' },
          { key: 'DATE_HIRED',     label: 'Hired',        render: UI.formatDate },
        ],
        data,
        [
          { label: 'Toggle Availability', type: 'default', handler: 'Pages.drivers.toggleAvailability' },
          { label: 'Remove',              type: 'danger',  handler: 'Pages.drivers.deleteRow' },
        ]
      );
    } catch (err) {
      UI.setError(document.getElementById('driversTable'), err.message);
    }
  },

  async loadVehicles() {
    const el = document.getElementById('vehiclesTable');
    UI.setLoading(el, true, 'Loading vehicles…');
    try {
      const { data } = await API.drivers.vehicles();
      UI.buildTable(
        'vehiclesTable',
        [
          { key: 'VEHICLE_ID',            label: 'ID' },
          { key: 'REGISTRATION',          label: 'Registration',
            render: v => `<strong style="font-family:var(--ff-mono)">${v}</strong>` },
          { key: 'VEHICLE_DESC',          label: 'Make / Model' },
          { key: 'CAPACITY_KG',           label: 'Capacity kg' },
          { key: 'SERVICE_STATUS',        label: 'Status',       render: v => UI.badge(v) },
          { key: 'LAST_SERVICE_DATE',     label: 'Last Serviced',render: UI.formatDate },
          { key: 'ASSIGNED_DRIVER_TODAY', label: 'Assigned To Today' },
        ],
        data
      );
    } catch (err) {
      UI.setError(document.getElementById('vehiclesTable'), err.message);
    }
  },

  async addDriver() {
    const data = UI.formData('driverForm');
    try {
      await API.drivers.create(data);
      UI.toast('Driver added ✅', 'success');
      document.getElementById('driverForm').reset();
      setDefaultDates();
      this.loadDrivers();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },

  async addVehicle() {
    const data = UI.formData('vehicleForm');
    try {
      await API.drivers.addVehicle(data);
      UI.toast('Vehicle added to fleet ✅', 'success');
      document.getElementById('vehicleForm').reset();
      this.loadVehicles();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },

  async toggleAvailability(row) {
    const newVal = row.IS_AVAILABLE === 'Y' ? 'N' : 'Y';
    try {
      await API.drivers.update(row.DRIVER_ID, { is_available: newVal });
      UI.toast(`${row.FULL_NAME} marked ${newVal === 'Y' ? 'Available' : 'Unavailable'}`, 'success');
      Pages.drivers.loadDrivers();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },

  async deleteRow(row) {
    if (!UI.confirmDialog(`Remove driver "${row.FULL_NAME}"? This cannot be undone.`)) return;
    try {
      await API.drivers.delete(row.DRIVER_ID);
      UI.toast('Driver removed', 'success');
      Pages.drivers.loadDrivers();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },
};

// ╔═══════════════════════════════════════════════════════════╗
// ║  MODULE 05 — INVOICES & BILLING                           ║
// ╚═══════════════════════════════════════════════════════════╝
Pages.invoices = {
  async load() {
    this.loadSummary();
    this.loadInvoices();
  },

  async loadSummary() {
    try {
      const { data } = await API.invoices.summary();
      const kpis = document.querySelectorAll('#invoiceKpis .kpi-val');
      if (kpis[0]) kpis[0].textContent = UI.formatZAR(data.GRAND_TOTAL);
      if (kpis[1]) kpis[1].textContent = UI.formatZAR(data.TOTAL_PAID);
      if (kpis[2]) kpis[2].textContent = UI.formatZAR(data.TOTAL_UNPAID);
      if (kpis[3]) kpis[3].textContent = UI.formatZAR(data.TOTAL_OVERDUE);
    } catch {
      // Summary is non-critical — fail silently
    }
  },

  async loadInvoices() {
    const el = document.getElementById('invoicesTable');
    UI.setLoading(el, true, 'Loading invoices…');
    try {
      const { data } = await API.invoices.list();
      UI.buildTable(
        'invoicesTable',
        [
          { key: 'INVOICE_NUMBER', label: 'Invoice No.',
            render: v => `<strong style="font-family:var(--ff-mono)">${v}</strong>` },
          { key: 'TRACKING_CODE',  label: 'Parcel',
            render: v => `<span style="font-family:var(--ff-mono)">${v}</span>` },
          { key: 'CLIENT_NAME',    label: 'Client' },
          { key: 'CLIENT_EMAIL',   label: 'Email' },
          { key: 'AMOUNT_ZAR',     label: 'Amount',
            render: v => `<strong>${UI.formatZAR(v)}</strong>` },
          { key: 'SERVICE_TYPE',   label: 'Service',  render: v => UI.badge(v) },
          { key: 'WEIGHT_KG',      label: 'Weight',   render: v => `${v} kg` },
          { key: 'PAYMENT_STATUS', label: 'Status',   render: v => UI.badge(v) },
          { key: 'ISSUE_DATE',     label: 'Issued',   render: UI.formatDate },
          { key: 'PAYMENT_DATE',   label: 'Paid',     render: UI.formatDate },
        ],
        data,
        [
          { label: 'Mark Paid', type: 'success', handler: 'Pages.invoices.markPaid' },
          { label: 'Delete',    type: 'danger',  handler: 'Pages.invoices.deleteRow' },
        ]
      );
    } catch (err) {
      UI.setError(document.getElementById('invoicesTable'), err.message);
    }
  },

  async generate() {
    const data = UI.formData('invoiceForm');
    try {
      const res = await API.invoices.create(data);
      UI.toast(`Invoice ${res.invoice_number} generated — ${UI.formatZAR(res.amount_zar)} ✅`, 'success');
      document.getElementById('invoiceForm').reset();
      Pages.invoices.load();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },

  async markPaid(row) {
    if (row.PAYMENT_STATUS === 'PAID') {
      UI.toast('Invoice is already marked PAID', 'info');
      return;
    }
    try {
      await API.invoices.pay(row.INVOICE_ID);
      UI.toast(`${row.INVOICE_NUMBER} marked as PAID ✅`, 'success');
      Pages.invoices.load();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },

  async deleteRow(row) {
    if (!UI.confirmDialog(`Delete invoice ${row.INVOICE_NUMBER}?`)) return;
    try {
      await API.invoices.delete(row.INVOICE_ID);
      UI.toast('Invoice deleted', 'success');
      Pages.invoices.load();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },
};

// =============================================================
// INITIALISATION
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Wire up navigation
  initNav();

  // Set default dates in forms
  setDefaultDates();

  // Check API health immediately and then every 30 seconds
  checkApiHealth();
  setInterval(checkApiHealth, 30000);

  // Load the default page (track)
  Pages.track.load();
});