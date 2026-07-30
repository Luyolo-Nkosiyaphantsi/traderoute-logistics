// =============================================================
// frontend/js/api.js
// Central API client — all HTTP calls go through here
// =============================================================

const API_BASE = 'http://127.0.0.1:3000/api';

async function apiFetch(path, options = {}) {
  const url    = `${API_BASE}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  };
  if (!options.body) delete config.headers['Content-Type'];

  const response = await fetch(url, config);
  const data     = await response.json();

  if (!response.ok) {
    const msg =
      data.error ||
      (Array.isArray(data.errors) && data.errors[0]?.msg) ||
      `HTTP ${response.status}`;
    throw new Error(msg);
  }
  return data;
}

const get   = (path)        => apiFetch(path);
const post  = (path, body)  => apiFetch(path, { method: 'POST',   body: JSON.stringify(body) });
const put   = (path, body)  => apiFetch(path, { method: 'PUT',    body: JSON.stringify(body) });
const patch = (path, body)  => apiFetch(path, { method: 'PATCH',  body: body ? JSON.stringify(body) : undefined });
const del   = (path)        => apiFetch(path, { method: 'DELETE' });

const API = {
  health: () => get('/health'),

  parcels: {
    list:         ()           => get('/parcels'),
    get:          (id)         => get(`/parcels/${id}`),
    track:        (code)       => get(`/parcels/track/${encodeURIComponent(code)}`),
    create:       (body)       => post('/parcels', body),
    updateStatus: (id, body)   => patch(`/parcels/${id}/status`, body),
    update:       (id, body)   => put(`/parcels/${id}`, body),
    delete:       (id)         => del(`/parcels/${id}`),
  },

  clients: {
    list:   ()         => get('/clients'),
    get:    (id)       => get(`/clients/${id}`),
    create: (body)     => post('/clients', body),
    update: (id, body) => put(`/clients/${id}`, body),
    delete: (id)       => del(`/clients/${id}`),
  },

  routes: {
    list:       ()         => get('/routes'),
    today:      ()         => get('/routes/today'),
    hubs:       ()         => get('/routes/hubs'),
    get:        (id)       => get(`/routes/${id}`),
    create:     (body)     => post('/routes', body),
    assign:     (body)     => post('/routes/assign', body),
    update:     (id, body) => put(`/routes/${id}`, body),
    deactivate: (id)       => del(`/routes/${id}`),
  },

  drivers: {
    list:      ()         => get('/drivers'),
    available: ()         => get('/drivers/available'),
    get:       (id)       => get(`/drivers/${id}`),
    create:    (body)     => post('/drivers', body),
    update:    (id, body) => put(`/drivers/${id}`, body),
    delete:    (id)       => del(`/drivers/${id}`),
  },

  vehicles: {
    list:         ()         => get('/vehicles'),
    available:    ()         => get('/vehicles/available'),
    get:          (id)       => get(`/vehicles/${id}`),
    create:       (body)     => post('/vehicles', body),
    update:       (id, body) => put(`/vehicles/${id}`, body),
    setStatus:    (id, body) => patch(`/vehicles/${id}/status`, body),
    delete:       (id)       => del(`/vehicles/${id}`),
  },

  invoices: {
    list:         ()         => get('/invoices'),
    summary:      ()         => get('/invoices/summary'),
    get:          (id)       => get(`/invoices/${id}`),
    create:       (body)     => post('/invoices', body),
    pay:          (id)       => patch(`/invoices/${id}/pay`),
    updateStatus: (id, body) => patch(`/invoices/${id}/status`, body),
    delete:       (id)       => del(`/invoices/${id}`),
  },

  search: {
    query: (q) => get(`/search?q=${encodeURIComponent(q)}`),
  },

  reports: {
    summary:           () => get('/reports/summary'),
    driverPerformance: () => get('/reports/driver-performance'),
    routePerformance:  () => get('/reports/route-performance'),
    exceptions:        () => get('/reports/exceptions'),
    revenue:           () => get('/reports/revenue'),
    tariffs:           () => get('/reports/tariffs'),
  },
};

window.API = API;