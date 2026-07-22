import { createEntityClient } from '@/lib/apiClient';

const CLIENTE_SCHEMA = {
  type: 'object',
  properties: {
    user_id: { type: 'string', description: 'ID do usuário dono deste cliente' },
    nome: { type: 'string', description: 'Nome da empresa ou cliente' },
    cpf_cnpj: { type: 'string', description: 'CPF ou CNPJ do cliente' },
    email: { type: 'string', format: 'email', description: 'E-mail para envio dos documentos' },
    telefone: { type: 'string', description: 'Telefone com WhatsApp' },
    preferencia_envio: {
      type: 'string',
      enum: ['email', 'whatsapp', 'ambos'],
      default: 'email',
      description: 'Preferência de recebimento',
    },
    ativo: { type: 'boolean', default: true, description: 'Cliente ativo no sistema' },
  },
  required: ['nome', 'cpf_cnpj', 'email'],
};

export const Cliente = {
  ...createEntityClient('Cliente'),
  schema: () => CLIENTE_SCHEMA,
};
