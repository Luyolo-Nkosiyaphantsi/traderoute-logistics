// =============================================================
// frontend/js/dashboard.js
// Dashboard page — loads KPIs, charts and summary widgets
// from multiple API endpoints
// =============================================================

Pages.dashboard = {

  async load() {
    await Promise.all([
      this.loadKpis(),
      this.loadTransit(),
      this.loadExceptions(),
      this.loadTodayRoutes(),
      this.loadFleetStatus(),
      this.loadInvoiceSummary(),
    ]);
  },

  // ── KPI strip ─────────────────────────────────────────────
  async loadKpis() {
    try {
      const [parcelsRes, routesRes, invoicesRes] = await Promise.all([
        API.parcels.list(),
        API.routes.today(),
        API.invoices.summary(),
      ]);

      const activeParcels = parcelsRes.data.filter(p =>
        ['RECEIVED','ASSIGNED','IN_TRANSIT'].includes(p.STATUS_NAME)
      ).length;

      const failedToday = parcelsRes.data.filter(p =>
        p.STATUS_NAME === 'FAILED'
      ).length;

      const driversOnRoute = routesRes.data.length;
      const revenue = invoicesRes.data.GRAND_TOTAL || 0;

      const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };

      set('dk-parcels', activeParcels.toLocaleString());
      set('dk-drivers', driversOnRoute);
      set('dk-failed',  failedToday);
      set('dk-revenue', UI.formatZAR(revenue));
    } catch (err) {
      console.warn('Dashboard KPI load failed:', err.message);
    }
  },

  // ── In-transit parcels table ───────────────────────────────
  async loadTransit() {
    const el = document.getElementById('dashTransitTable');
    UI.setLoading(el, true, 'Loading in-transit parcels…');
    try {
      const { data } = await API.parcels.list();
      const transit = data.filter(p =>
        ['IN_TRANSIT','ASSIGNED','RECEIVED'].includes(p.STATUS_NAME)
      );

      if (transit.length === 0) {
        UI.setEmpty(el, 'No active parcels right now', '✅');
        return;
      }

      UI.buildTable('dashTransitTable', [
        { key: 'TRACKING_CODE',  label: 'Tracking Code',
          render: v => `<strong style="font-family:var(--ff-mono)">${v}</strong>` },
        { key: 'STATUS_NAME',    label: 'Status',   render: v => UI.badge(v) },
        { key: 'SENDER_NAME',    label: 'Sender' },
        { key: 'RECIPIENT_NAME', label: 'Recipient' },
        { key: 'ROUTE_CODE',     label: 'Route' },
        { key: 'SERVICE_TYPE',   label: 'Service',  render: v => UI.badge(v) },
        { key: 'INTAKE_DATE',    label: 'Intake',   render: UI.formatDate },
      ], transit);
    } catch (err) {
      UI.setError(el, err.message);
    }
  },

  // ── Failed/exception deliveries ───────────────────────────
  async loadExceptions() {
    const el = document.getElementById('dashExceptionsTable');
    UI.setLoading(el, true, 'Loading exceptions…');
    try {
      const { data } = await API.parcels.list();
      const failed = data.filter(p =>
        ['FAILED','RESCHEDULED'].includes(p.STATUS_NAME)
      );

      if (failed.length === 0) {
        UI.setEmpty(el, 'No delivery exceptions recorded', '🎉');
        return;
      }

      UI.buildTable('dashExceptionsTable', [
        { key: 'TRACKING_CODE',  label: 'Tracking Code',
          render: v => `<strong style="font-family:var(--ff-mono)">${v}</strong>` },
        { key: 'STATUS_NAME',    label: 'Status',    render: v => UI.badge(v) },
        { key: 'RECIPIENT_NAME', label: 'Recipient' },
        { key: 'ROUTE_CODE',     label: 'Route' },
        { key: 'INTAKE_DATE',    label: 'Date',      render: UI.formatDate },
      ], failed, [
        { label: 'Track', type: 'default', handler: 'Pages.dashboard.trackParcel' },
      ]);
    } catch (err) {
      UI.setError(el, err.message);
    }
  },

  trackParcel(row) {
    // Switch to tracking page and search
    document.querySelector('[data-page="track"]').click();
    const input = document.getElementById('trackInput');
    if (input) input.value = row.TRACKING_CODE;
    setTimeout(() => Pages.track.search(), 200);
  },

  // ── Today's routes summary (bar chart style) ──────────────
  async loadTodayRoutes() {
    const el = document.getElementById('dashRoutesTable');
    UI.setLoading(el, true);
    try {
      const { data } = await API.routes.today();

      if (data.length === 0) {
        UI.setEmpty(el, 'No routes assigned today', '🗺️');
        return;
      }

      const maxLoad = Math.max(...data.map(r => r.LOAD_PCT || 0), 1);

      el.innerHTML = `
        <div style="padding:1rem 1.25rem;">
          <div class="bar-chart">
            ${data.map(r => {
              const pct = r.LOAD_PCT || 0;
              const cls = pct >= 100 ? 'red' : pct >= 80 ? 'orange' : 'green';
              return `
                <div class="bar-row">
                  <div class="bar-label">
                    <span>${r.ROUTE_CODE} — ${r.DRIVER_NAME}</span>
                    <span>${pct}%</span>
                  </div>
                  <div class="bar-track">
                    <div class="bar-fill ${cls}" style="width:${Math.min(pct, 100)}%"></div>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>`;
    } catch (err) {
      UI.setError(el, err.message);
    }
  },

  // ── Fleet status summary ───────────────────────────────────
  async loadFleetStatus() {
    const el = document.getElementById('dashFleetStatus');
    try {
      const { data } = await API.drivers.vehicles();
      const operational    = data.filter(v => v.SERVICE_STATUS === 'OPERATIONAL').length;
      const maintenance    = data.filter(v => v.SERVICE_STATUS === 'MAINTENANCE').length;
      const decommissioned = data.filter(v => v.SERVICE_STATUS === 'DECOMMISSIONED').length;
      const onRoute        = data.filter(v => v.ASSIGNED_DRIVER_TODAY).length;

      el.innerHTML = `
        <div class="stat-rows">
          <div class="stat-row">
            <span class="stat-row-label">Total Vehicles</span>
            <span class="stat-row-value">${data.length}</span>
          </div>
          <div class="stat-row">
            <span class="stat-row-label">Operational</span>
            <span class="stat-row-value green">${operational}</span>
          </div>
          <div class="stat-row">
            <span class="stat-row-label">On Route Today</span>
            <span class="stat-row-value teal">${onRoute}</span>
          </div>
          <div class="stat-row">
            <span class="stat-row-label">In Maintenance</span>
            <span class="stat-row-value orange">${maintenance}</span>
          </div>
          <div class="stat-row">
            <span class="stat-row-label">Decommissioned</span>
            <span class="stat-row-value red">${decommissioned}</span>
          </div>
        </div>`;
    } catch (err) {
      el.innerHTML = `<div style="color:var(--danger);font-size:12px;padding:0.5rem">${err.message}</div>`;
    }
  },

  // ── Invoice summary ────────────────────────────────────────
  async loadInvoiceSummary() {
    const el = document.getElementById('dashInvoiceSummary');
    try {
      const { data: s } = await API.invoices.summary();

      el.innerHTML = `
        <div class="stat-rows">
          <div class="stat-row">
            <span class="stat-row-label">Total Invoices</span>
            <span class="stat-row-value">${s.TOTAL_INVOICES}</span>
          </div>
          <div class="stat-row">
            <span class="stat-row-label">Grand Total</span>
            <span class="stat-row-value teal">${UI.formatZAR(s.GRAND_TOTAL)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-row-label">Paid (${s.COUNT_PAID})</span>
            <span class="stat-row-value green">${UI.formatZAR(s.TOTAL_PAID)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-row-label">Unpaid (${s.COUNT_UNPAID})</span>
            <span class="stat-row-value orange">${UI.formatZAR(s.TOTAL_UNPAID)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-row-label">Overdue (${s.COUNT_OVERDUE})</span>
            <span class="stat-row-value red">${UI.formatZAR(s.TOTAL_OVERDUE)}</span>
          </div>
        </div>`;
    } catch (err) {
      el.innerHTML = `<div style="color:var(--danger);font-size:12px;padding:0.5rem">${err.message}</div>`;
    }
  },
};