import { request } from '@/lib/apiClient';

export async function enviarMensagem(payload) {
  const data = await request('/functions/enviarMensagem', { method: 'POST', body: payload });
  return { data };
}
