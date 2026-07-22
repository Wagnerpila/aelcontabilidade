import { request } from '@/lib/apiClient';

export async function sendEmail(payload) {
  const data = await request('/functions/sendEmail', { method: 'POST', body: payload });
  return { data };
}
