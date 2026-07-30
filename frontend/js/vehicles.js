// =============================================================
// frontend/js/vehicles.js
// Vehicle Fleet page controller
// =============================================================

Pages.vehicles = {

  async load() {
    const el = document.getElementById('vehiclesFullTable');
    UI.setLoading(el, true, 'Loading fleet…');
    try {
      const { data } = await API.vehicles.list();
      UI.buildTable(
        'vehiclesFullTable',
        [
          { key: 'VEHICLE_ID',            label: 'ID' },
          { key: 'REGISTRATION',          label: 'Registration',
            render: v => `<strong style="font-family:var(--ff-mono)">${v}</strong>` },
          { key: 'VEHICLE_DESC',          label: 'Make / Model' },
          { key: 'CAPACITY_KG',           label: 'Capacity kg',
            render: v => `${v} kg` },
          { key: 'SERVICE_STATUS',        label: 'Status',       render: v => UI.badge(v) },
          { key: 'LAST_SERVICE_DATE',     label: 'Last Serviced',render: UI.formatDate },
          { key: 'ASSIGNED_DRIVER_TODAY', label: 'Driver Today' },
          { key: 'ROUTE_TODAY',           label: 'Route Today' },
        ],
        data,
        [
          { label: 'Maintenance', type: 'default', handler: 'Pages.vehicles.setMaintenance' },
          { label: 'Operational', type: 'success',  handler: 'Pages.vehicles.setOperational' },
          { label: 'Remove',      type: 'danger',   handler: 'Pages.vehicles.deleteRow' },
        ]
      );
    } catch (err) {
      UI.setError(document.getElementById('vehiclesFullTable'), err.message);
    }
  },

  async create() {
    const data = UI.formData('vehicleFullForm');
    try {
      await API.vehicles.create(data);
      UI.toast('Vehicle added to fleet ✅', 'success');
      document.getElementById('vehicleFullForm').reset();
      this.load();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },

  async updateStatus() {
    const id  = document.getElementById('statusVehicleId')?.value;
    const val = document.getElementById('statusVehicleVal')?.value;
    if (!id) { UI.toast('Enter a Vehicle ID', 'warn'); return; }
    try {
      await API.vehicles.setStatus(id, { service_status: val });
      UI.toast(`Vehicle ${id} → ${val}`, 'success');
      this.load();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },

  async setMaintenance(row) {
    try {
      await API.vehicles.setStatus(row.VEHICLE_ID, { service_status: 'MAINTENANCE' });
      UI.toast(`${row.REGISTRATION} → MAINTENANCE`, 'info');
      Pages.vehicles.load();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  async setOperational(row) {
    try {
      await API.vehicles.setStatus(row.VEHICLE_ID, { service_status: 'OPERATIONAL' });
      UI.toast(`${row.REGISTRATION} → OPERATIONAL ✅`, 'success');
      Pages.vehicles.load();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  async deleteRow(row) {
    if (!UI.confirmDialog(`Remove vehicle ${row.REGISTRATION} from fleet? This cannot be undone.`)) return;
    try {
      await API.vehicles.delete(row.VEHICLE_ID);
      UI.toast(`${row.REGISTRATION} removed from fleet`, 'success');
      Pages.vehicles.load();
    } catch (err) { UI.toast(err.message, 'error'); }
  },
};