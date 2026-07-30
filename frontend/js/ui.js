// =============================================================
// frontend/js/ui.js
// Shared UI helpers: toast, buildTable, badge, loading, form
// =============================================================

// ── Toast Notifications ───────────────────────────────────────
function toast(message, type = 'info') {
  // Remove any existing toasts
  document.querySelectorAll('.toast').forEach(t => t.remove());

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  document.body.appendChild(el);

  // Trigger animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add('show'));
  });

  // Auto-remove after 3.5 seconds
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, 3500);
}

// ── Loading State ─────────────────────────────────────────────
function setLoading(containerEl, isLoading, text = 'Loading data…') {
  if (!containerEl) return;
  if (isLoading) {
    containerEl.innerHTML = `
      <div class="loading-row">
        <span class="spinner"></span>
        ${text}
      </div>`;
  }
}

// ── Empty State ───────────────────────────────────────────────
function setEmpty(containerEl, message = 'No records found', icon = '📭') {
  if (!containerEl) return;
  containerEl.innerHTML = `
    <div class="empty-state">
      <span class="empty-icon">${icon}</span>
      ${message}
    </div>`;
}

// ── Error State ───────────────────────────────────────────────
function setError(containerEl, message) {
  if (!containerEl) return;
  containerEl.innerHTML = `
    <div class="empty-state" style="color:var(--danger)">
      <span class="empty-icon">⚠️</span>
      ${message}
    </div>`;
}

// ── Badge ─────────────────────────────────────────────────────
// Map known values to badge classes
const BADGE_MAP = {
  // Statuses
  'DELIVERED':      'success',
  'PAID':           'success',
  'OPERATIONAL':    'success',
  'VALID':          'success',
  'Y':              'success',
  'ACTIVE':         'success',
  'IN_TRANSIT':     'info',
  'ASSIGNED':       'info',
  'DISPATCHED':     'info',
  'INDIVIDUAL':     'info',
  'STANDARD':       'muted',
  'RECEIVED':       'muted',
  'N':              'muted',
  'CANCELLED':      'muted',
  'RESCHEDULED':    'muted',
  'UNPAID':         'warn',
  'EXPIRING_SOON':  'warn',
  'MAINTENANCE':    'warn',
  'EXPRESS':        'warn',
  'CORPORATE':      'warn',
  'ECOMMERCE':      'teal',
  'FAILED':         'danger',
  'OVERDUE':        'danger',
  'EXPIRED':        'danger',
  'DECOMMISSIONED': 'danger',
};

function badge(text, forceClass) {
  if (text === null || text === undefined) return '<span class="badge badge-muted">—</span>';
  const cls = forceClass || BADGE_MAP[String(text).toUpperCase()] || 'muted';
  return `<span class="badge badge-${cls}">${text}</span>`;
}

// ── Generic Table Builder ─────────────────────────────────────
// columns: [{ key, label, render? }]
// actions: [{ label, type, handler }]
// handler is a string name of a global function that receives the row object
function buildTable(containerId, columns, rows, actions = []) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!rows || rows.length === 0) {
    setEmpty(container, 'No records found');
    return;
  }

  const thead = `
    <tr>
      ${columns.map(c => `<th>${c.label}</th>`).join('')}
      ${actions.length ? '<th style="width:1px">Actions</th>' : ''}
    </tr>`;

  const tbody = rows.map(row => {
    const cells = columns.map(c => {
      let val = row[c.key];
      if (val === null || val === undefined) val = '—';
      const rendered = c.render ? c.render(val, row) : val;
      return `<td>${rendered}</td>`;
    }).join('');

    const actionBtns = actions.map(a => {
      // Safely serialise row for onclick — escape double quotes
      const rowJson = JSON.stringify(row).replace(/"/g, '&quot;');
      return `<button
        class="tbl-action tbl-action-${a.type || 'default'}"
        onclick="${a.handler}(JSON.parse(this.dataset.row))"
        data-row="${rowJson}"
      >${a.label}</button>`;
    }).join('');

    return `<tr>${cells}${actions.length ? `<td class="action-cell">${actionBtns}</td>` : ''}</tr>`;
  }).join('');

  container.innerHTML = `
    <div class="data-table-wrap">
      <table class="data-table">
        <thead>${thead}</thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>`;
}

// ── Form Serialiser ───────────────────────────────────────────
// Reads a <form> by id and returns a plain object (skips empty strings)
function formData(formId) {
  const form = document.getElementById(formId);
  if (!form) return {};
  const data = {};
  new FormData(form).forEach((value, key) => {
    if (value !== '') data[key] = value;
  });
  return data;
}

// ── Confirm Dialog ────────────────────────────────────────────
function confirmDialog(message) {
  return window.confirm(message);
}

// ── Currency Format ───────────────────────────────────────────
function formatZAR(value) {
  if (value === null || value === undefined || value === '—') return '—';
  return 'R ' + Number(value).toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── Date Format ───────────────────────────────────────────────
function formatDate(value) {
  if (!value || value === '—') return '—';
  return String(value).substring(0, 10);
}

// ── Expose globally ───────────────────────────────────────────
window.UI = {
  toast,
  setLoading,
  setEmpty,
  setError,
  badge,
  buildTable,
  formData,
  confirmDialog,
  formatZAR,
  formatDate,
};