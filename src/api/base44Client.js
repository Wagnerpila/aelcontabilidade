import { request } from '@/lib/apiClient';
import { Cliente } from '@/entities/Cliente';
import { Documento } from '@/entities/Documento';
import { Empresa } from '@/entities/Empresa';
import { GerenciamentoEnvio } from '@/entities/GerenciamentoEnvio';
import { NotificationTemplate } from '@/entities/NotificationTemplate';
import { SystemConfig } from '@/entities/SystemConfig';
import { User } from '@/entities/User';

// Camada de compatibilidade: substitui o SDK do Base44 pelo backend próprio,
// mantendo a mesma forma (base44.auth.*, base44.entities.*, base44.functions.invoke)
// usada em vários arquivos, para não precisar reescrever cada chamada.
export const base44 = {
  auth: {
    me: () => User.me(),
    updateMe: (data) => User.updateMyUserData(data),
    logout: () => User.logout(),
    isAuthenticated: async () => {
      try {
        await User.me();
        return true;
      } catch {
        return false;
      }
    },
    redirectToLogin: () => {
      window.location.href = '/login';
    },
  },
  entities: { Cliente, Documento, Empresa, GerenciamentoEnvio, NotificationTemplate, SystemConfig, User },
  functions: {
    invoke: async (name, payload, options = {}) => {
      const data = await request(`/functions/${name}`, {
        method: 'POST',
        body: payload,
        responseType: options.responseType,
      });
      return { data };
    },
  },
};
