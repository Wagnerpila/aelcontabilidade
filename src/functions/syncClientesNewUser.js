import { request } from '@/lib/apiClient';

export async function syncClientesNewUser(payload) {
  const data = await request('/functions/syncClientesNewUser', { method: 'POST', body: payload });
  return { data };
}
