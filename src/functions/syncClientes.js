import { request } from '@/lib/apiClient';

export async function syncClientes(payload) {
  const data = await request('/functions/syncClientes', { method: 'POST', body: payload });
  return { data };
}
