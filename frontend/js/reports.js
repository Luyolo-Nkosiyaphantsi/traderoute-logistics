// =============================================================
// frontend/js/reports.js
// Reports & Analytics page controller
// =============================================================

Pages.reports = {

  async load() {
    await Promise.all([
      this.loadSummaryKpis(),
      this.loadDriverPerformance(),
      this.loadRoutePerformance(),
      this.loadRevenue(),
      this.loadTariffs(),
      this.loadAlerts(),
      this.loadExceptions(),
    ]);
  },

  // ── System summary KPIs ───────────────────────────────────
  async loadSummaryKpis() {
    try {
      const { data } = await API.reports.summary();
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      set('rk-parcels', Number(data.TOTAL_PARCELS).toLocaleString());
      set('rk-clients', Number(data.TOTAL_CLIENTS).toLocaleString());
      set('rk-drivers', data.AVAILABLE_DRIVERS);
      set('rk-revenue', UI.formatZAR(data.REVENUE_THIS_MONTH));
    } catch (err) {
      console.warn('Report KPIs failed:', err.message);
    }
  },

  // ── Driver performance table ──────────────────────────────
  async loadDriverPerformance() {
    const el = document.getElementById('driverPerfTable');
    UI.setLoading(el, true);
    try {
      const { data } = await API.reports.driverPerformance();
      UI.buildTable('driverPerfTable', [
        { key: 'FULL_NAME',         label: 'Driver',
          render: v => `<strong>${v}</strong>` },
        { key: 'TOTAL_DELIVERIES',  label: 'Total' },
        { key: 'SUCCESSFUL',        label: 'Successful',
          render: v => `<span style="color:var(--success);font-weight:700">${v || 0}</span>` },
        { key: 'FAILED',            label: 'Failed',
          render: v => v > 0
            ? `<span style="color:var(--danger);font-weight:700">${v}</span>`
            : `<span style="color:var(--muted)">0</span>` },
        { key: 'SUCCESS_PCT',       label: 'Success Rate',
          render: (v, row) => {
            if (v === null || v === undefined || row.TOTAL_DELIVERIES === 0) return '<span style="color:var(--muted)">—</span>';
            const pct   = Number(v);
            const color = pct >= 95 ? 'var(--success)' : pct >= 80 ? 'var(--warn)' : 'var(--danger)';
            return `<span style="color:${color};font-weight:800">${pct}%</span>`;
          }},
        { key: 'LAST_ACTIVE', label: 'Last Active', render: UI.formatDate },
      ], data);
    } catch (err) {
      UI.setError(document.getElementById('driverPerfTable'), err.message);
    }
  },

  // ── Route performance table ───────────────────────────────
  async loadRoutePerformance() {
    const el = document.getElementById('routePerfTable');
    UI.setLoading(el, true);
    try {
      const { data } = await API.reports.routePerformance();
      UI.buildTable('routePerfTable', [
        { key: 'ROUTE_CODE',         label: 'Code' },
        { key: 'ROUTE_NAME',         label: 'Route' },
        { key: 'HUB_CITY',           label: 'Hub City' },
        { key: 'TOTAL_PARCELS',      label: 'Total' },
        { key: 'DELIVERED',          label: 'Delivered',
          render: v => `<span style="color:var(--success);font-weight:700">${v || 0}</span>` },
        { key: 'FAILED',             label: 'Failed',
          render: v => v > 0
            ? `<span style="color:var(--danger);font-weight:700">${v}</span>`
            : `<span style="color:var(--muted)">0</span>` },
        { key: 'DELIVERY_RATE_PCT',  label: 'Rate',
          render: v => {
            if (v === null || v === undefined) return '—';
            const pct   = Number(v);
            const color = pct >= 95 ? 'var(--success)' : pct >= 80 ? 'var(--warn)' : 'var(--danger)';
            return `<span style="color:${color};font-weight:800">${pct}%</span>`;
          }},
      ], data);
    } catch (err) {
      UI.setError(document.getElementById('routePerfTable'), err.message);
    }
  },

  // ── Revenue bar chart ─────────────────────────────────────
  async loadRevenue() {
    const el = document.getElementById('revenueChart');
    try {
      const { data } = await API.reports.revenue();

      if (!data.length) {
        UI.setEmpty(el, 'No invoice data yet', '💰');
        return;
      }

      const maxTotal = Math.max(...data.map(r => Number(r.TOTAL) || 0), 1);

      el.innerHTML = `
        <div class="bar-chart">
          ${data.map(r => {
            const total = Number(r.TOTAL) || 0;
            const paid  = Number(r.PAID)  || 0;
            const pct   = Math.round((total / maxTotal) * 100);
            const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;
            return `
              <div class="bar-row">
                <div class="bar-label">
                  <span>${r.MONTH_LABEL}</span>
                  <span>${UI.formatZAR(total)}</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill navy" style="width:${pct}%"></div>
                </div>
                <div style="font-family:var(--ff-mono);font-size:9px;color:var(--muted);margin-top:2px;">
                  ${r.INVOICE_COUNT} invoices · ${paidPct}% collected
                </div>
              </div>`;
          }).join('')}
        </div>`;
    } catch (err) {
      el.innerHTML = `<div style="color:var(--danger);font-size:12px">${err.message}</div>`;
    }
  },

  // ── Tariff rate table ─────────────────────────────────────
  async loadTariffs() {
    const el = document.getElementById('tariffTable');
    UI.setLoading(el, true);
    try {
      const { data } = await API.reports.tariffs();
      UI.buildTable('tariffTable', [
        { key: 'ZONE_NAME',    label: 'Zone' },
        { key: 'PROVINCE',     label: 'Province' },
        { key: 'SIZE_CATEGORY',label: 'Size',    render: v => UI.badge(v) },
        { key: 'WEIGHT_BAND',  label: 'Weight Band' },
        { key: 'SERVICE_TYPE', label: 'Service', render: v => UI.badge(v) },
        { key: 'RATE_ZAR',     label: 'Rate (ZAR)',
          render: v => `<strong style="color:var(--navy)">${UI.formatZAR(v)}</strong>` },
        { key: 'EFFECTIVE_FROM',label: 'Effective', render: UI.formatDate },
      ], data);
    } catch (err) {
      UI.setError(document.getElementById('tariffTable'), err.message);
    }
  },

  // ── System alerts ─────────────────────────────────────────
  async loadAlerts() {
    const el = document.getElementById('systemAlerts');
    try {
      const { data } = await API.reports.summary();
      const alerts = [];

      if (Number(data.LICENSES_EXPIRING_SOON) > 0) {
        alerts.push({
          icon: '⚠️',
          msg:  `${data.LICENSES_EXPIRING_SOON} driver license(s) expiring within 30 days`,
          cls:  'warn',
        });
      }
      if (Number(data.FAILED) > 0) {
        alerts.push({
          icon: '❌',
          msg:  `${data.FAILED} parcel(s) have failed delivery status`,
          cls:  'red',
        });
      }
      if (Number(data.OUTSTANDING_BALANCE) > 0) {
        alerts.push({
          icon: '💳',
          msg:  `${UI.formatZAR(data.OUTSTANDING_BALANCE)} in unpaid invoices`,
          cls:  'orange',
        });
      }
      if (alerts.length === 0) {
        alerts.push({ icon: '✅', msg: 'No system alerts — all operations normal', cls: 'green' });
      }

      el.innerHTML = `
        <div class="rule-list">
          ${alerts.map(a => `
            <div class="rule-item ${a.cls}">
              <span>${a.icon}</span>
              <span style="font-size:12.5px">${a.msg}</span>
            </div>`
          ).join('')}
        </div>`;
    } catch (err) {
      el.innerHTML = `<div style="color:var(--danger);font-size:12px">${err.message}</div>`;
    }
  },

  // ── Exceptions summary ────────────────────────────────────
  async loadExceptions() {
    const el = document.getElementById('exceptionsReport');
    UI.setLoading(el, true, 'Loading exceptions…');
    try {
      const { data } = await API.reports.exceptions();
      if (!data.length) {
        UI.setEmpty(el, 'No delivery exceptions on record', '🎉');
        return;
      }
      UI.buildTable('exceptionsReport', [
        { key: 'TRACKING_CODE', label: 'Parcel',
          render: v => `<span style="font-family:var(--ff-mono)">${v}</span>` },
        { key: 'OUTCOME_CODE',  label: 'Reason',   render: v => UI.badge(v) },
        { key: 'RECIPIENT',     label: 'Recipient' },
        { key: 'ROUTE_CODE',    label: 'Route' },
        { key: 'DRIVER_NAME',   label: 'Driver' },
        { key: 'EVENT_TIME',    label: 'Date/Time' },
      ], data.slice(0, 15));
    } catch (err) {
      UI.setError(el, err.message);
    }
  },
};