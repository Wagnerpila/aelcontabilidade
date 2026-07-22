import { createEntityClient, request } from '@/lib/apiClient';

export const User = {
  ...createEntityClient('User'),
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  updateMyUserData: (data) => request('/auth/me', { method: 'PATCH', body: data }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  register: (data) => request('/auth/register', { method: 'POST', body: data }),
};
