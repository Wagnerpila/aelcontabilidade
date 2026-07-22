import { request } from '@/lib/apiClient';

export async function enviarMensagemWhatsApp(payload) {
  const data = await request('/functions/enviarMensagemWhatsApp', { method: 'POST', body: payload });
  return { data };
}
