export const API_BASE = import.meta.env.VITE_API_URL || '/api';

function buildQuery(params) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    usp.set(key, value);
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

export async function request(path, { method = 'GET', body, responseType } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const data = await res.json();
      message = data?.error || message;
    } catch {
      // resposta sem corpo JSON
    }
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  if (responseType === 'arraybuffer') return res.arrayBuffer();
  if (res.status === 204) return null;
  return res.json();
}

export function createEntityClient(name) {
  return {
    list: (sort) => request(`/entities/${name}${buildQuery({ sort })}`),
    filter: (query = {}, sort, limit) => request(`/entities/${name}${buildQuery({ ...query, sort, limit })}`),
    get: (id) => request(`/entities/${name}/${id}`),
    create: (data) => request(`/entities/${name}`, { method: 'POST', body: data }),
    update: (id, data) => request(`/entities/${name}/${id}`, { method: 'PATCH', body: data }),
    delete: (id) => request(`/entities/${name}/${id}`, { method: 'DELETE' }),
    bulkCreate: (items) => request(`/entities/${name}/bulk`, { method: 'POST', body: items }),
  };
}
