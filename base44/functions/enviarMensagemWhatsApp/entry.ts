import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cliente_ids, mensagem } = await req.json();

    if (!mensagem) {
      return Response.json({ error: 'Mensagem é obrigatória.' }, { status: 400 });
    }

    // Buscar URL do webhook do n8n (salvo no SystemConfig)
    let n8nWebhookUrl = null;

    // 1. Tentar pela empresa do usuário
    if (user.empresa_id) {
      const empresa = await base44.asServiceRole.entities.Empresa.get(user.empresa_id);
      n8nWebhookUrl = empresa?.n8n_webhook_mensagens || empresa?.n8n_webhook_documentos;
    }

    // 2. Fallback: buscar no SystemConfig (configuração global)
    if (!n8nWebhookUrl) {
      const configs = await base44.asServiceRole.entities.SystemConfig.filter({ config_key: 'n8n_webhook_mensagens_url' });
      if (configs && configs.length > 0) {
        n8nWebhookUrl = configs[0].config_value;
      }
    }

    // 3. Fallback: webhook de documentos no SystemConfig
    if (!n8nWebhookUrl) {
      const configs = await base44.asServiceRole.entities.SystemConfig.filter({ config_key: 'n8n_webhook_url' });
      if (configs && configs.length > 0) {
        n8nWebhookUrl = configs[0].config_value;
      }
    }

    if (!n8nWebhookUrl) {
      return Response.json({ error: 'Webhook do n8n não configurado. Configure em Configurações > n8n.' }, { status: 400 });
    }

    // Buscar clientes
    let clientes;
    if (cliente_ids && cliente_ids.length > 0) {
      const todos = await base44.entities.Cliente.filter({ user_id: user.id });
      clientes = todos.filter(c => cliente_ids.includes(c.id));
    } else {
      clientes = await base44.entities.Cliente.filter({ user_id: user.id, ativo: true });
    }

    function formatarTelefone(tel) {
      const digits = tel.replace(/\D/g, '');
      if (digits.startsWith('55') && digits.length >= 12) return digits;
      return '55' + digits;
    }

    const clientesComTelefone = clientes.filter(c => c.telefone).map(c => {
      const tel = formatarTelefone(c.telefone);
      const texto = mensagem
        .replace(/\{\{nome\}\}/g, c.nome || '')
        .replace(/\{\{cpf_cnpj\}\}/g, c.cpf_cnpj || '')
        .replace(/\{\{email\}\}/g, c.email || '');
      return {
        number: tel,
        mensagem: texto,
        nome: c.nome,
        telefone: tel,
        email: c.email || '',
        cpf_cnpj: c.cpf_cnpj || '',
      };
    });

    const semTelefone = clientes.length - clientesComTelefone.length;

    if (clientesComTelefone.length === 0) {
      return Response.json({ error: 'Nenhum cliente com telefone cadastrado.' }, { status: 400 });
    }

    // Enviar todos de uma vez para o n8n processar em lote
    const payload = {
      tipo_envio: 'mensagem_personalizada',
      clientes: clientesComTelefone,
      mensagem_template: mensagem,
      app: {
        nome: user.companyName || user.full_name,
        user_email: user.email,
      },
    };

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const txt = await response.text();
      throw new Error(`Webhook retornou erro ${response.status}: ${txt.substring(0, 200)}`);
    }

    return Response.json({
      success: true,
      total: clientesComTelefone.length,
      enviados: clientesComTelefone.length,
      erros: [],
      sem_telefone: semTelefone,
      message: `${clientesComTelefone.length} mensagem(ns) enviada(s) para o WhatsApp!`,
    });

  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});