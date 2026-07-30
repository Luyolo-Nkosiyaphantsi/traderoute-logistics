// =============================================================
// frontend/js/search.js
// Global search controller — live dropdown results
// =============================================================

const GlobalSearch = {
  debounceTimer: null,

  init() {
    const input = document.getElementById('globalSearchInput');
    if (!input) return;

    // Live search as user types (debounced 300ms)
    input.addEventListener('input', () => {
      clearTimeout(this.debounceTimer);
      const q = input.value.trim();
      if (q.length < 2) {
        this.clearDropdown();
        return;
      }
      this.debounceTimer = setTimeout(() => this.run(), 300);
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.topbar-search')) {
        this.clearDropdown();
      }
    });

    // Escape to close
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.clearDropdown();
    });
  },

  async run() {
    const input = document.getElementById('globalSearchInput');
    const q     = (input?.value || '').trim();
    if (q.length < 2) return;

    const dropdown = document.getElementById('searchDropdown');
    if (!dropdown) return;

    dropdown.innerHTML = `
      <div class="search-loading">
        <span class="spinner" style="width:12px;height:12px;border-width:1.5px"></span>
        Searching…
      </div>`;
    dropdown.style.display = 'block';

    try {
      const { results, total } = await API.search.query(q);

      if (total === 0) {
        dropdown.innerHTML = `<div class="search-empty">No results for "<strong>${q}</strong>"</div>`;
        return;
      }

      let html = '';

      if (results.parcels.length) {
        html += `<div class="search-group-label">📦 Parcels</div>`;
        html += results.parcels.map(r => `
          <div class="search-result" onclick="GlobalSearch.goToParcel('${r.LABEL}')">
            <span class="sr-label">${r.LABEL}</span>
            <span class="sr-sub">${UI.badge(r.SUBLABEL)}</span>
            <span class="sr-detail">${r.DETAIL || ''}</span>
          </div>`).join('');
      }

      if (results.clients.length) {
        html += `<div class="search-group-label">👤 Clients</div>`;
        html += results.clients.map(r => `
          <div class="search-result" onclick="GlobalSearch.goToClients()">
            <span class="sr-label">${r.LABEL}</span>
            <span class="sr-sub">${UI.badge(r.SUBLABEL)}</span>
            <span class="sr-detail">${r.DETAIL || ''}</span>
          </div>`).join('');
      }

      if (results.drivers.length) {
        html += `<div class="search-group-label">🚛 Drivers</div>`;
        html += results.drivers.map(r => `
          <div class="search-result" onclick="GlobalSearch.goToDrivers()">
            <span class="sr-label">${r.LABEL}</span>
            <span class="sr-sub">${r.SUBLABEL || ''}</span>
            <span class="sr-detail">${r.DETAIL || ''}</span>
          </div>`).join('');
      }

      if (results.routes.length) {
        html += `<div class="search-group-label">🗺️ Routes</div>`;
        html += results.routes.map(r => `
          <div class="search-result" onclick="GlobalSearch.goToRoutes()">
            <span class="sr-label">${r.LABEL}</span>
            <span class="sr-sub">${r.SUBLABEL || ''}</span>
            <span class="sr-detail">${r.DETAIL || ''}</span>
          </div>`).join('');
      }

      dropdown.innerHTML = html;
      dropdown.style.display = 'block';

    } catch (err) {
      dropdown.innerHTML = `<div class="search-empty" style="color:var(--danger)">${err.message}</div>`;
    }
  },

  clearDropdown() {
    const dropdown = document.getElementById('searchDropdown');
    if (dropdown) {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
    }
  },

  goToParcel(code) {
    this.clearDropdown();
    document.getElementById('globalSearchInput').value = '';
    document.querySelector('[data-page="track"]').click();
    const input = document.getElementById('trackInput');
    if (input) input.value = code;
    setTimeout(() => Pages.track.search(), 200);
  },

  goToClients() {
    this.clearDropdown();
    document.getElementById('globalSearchInput').value = '';
    document.querySelector('[data-page="clients"]').click();
  },

  goToDrivers() {
    this.clearDropdown();
    document.getElementById('globalSearchInput').value = '';
    document.querySelector('[data-page="drivers"]').click();
  },

  goToRoutes() {
    this.clearDropdown();
    document.getElementById('globalSearchInput').value = '';
    document.querySelector('[data-page="routes"]').click();
  },
};

// Initialise when DOM is ready
document.addEventListener('DOMContentLoaded', () => GlobalSearch.init());