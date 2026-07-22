import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import sgMail from 'npm:@sendgrid/mail@8.1.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cliente_ids, assunto, mensagem, tipo } = await req.json();

    if (!assunto || !mensagem) {
      return Response.json({ error: 'Assunto e mensagem são obrigatórios.' }, { status: 400 });
    }

    // Buscar clientes do usuário
    let clientes;
    if (cliente_ids && cliente_ids.length > 0) {
      const todosClientes = await base44.entities.Cliente.filter({ user_id: user.id });
      clientes = todosClientes.filter(c => cliente_ids.includes(c.id));
    } else {
      clientes = await base44.entities.Cliente.filter({ user_id: user.id, ativo: true });
    }

    if (clientes.length === 0) {
      return Response.json({ error: 'Nenhum cliente encontrado.' }, { status: 400 });
    }

    const apiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'SENDGRID_API_KEY não configurada.' }, { status: 500 });
    }

    sgMail.setApiKey(apiKey);

    let enviados = 0;
    let erros = [];

    for (const cliente of clientes) {
      if (!cliente.email) {
        erros.push({ cliente: cliente.nome, erro: 'Sem e-mail cadastrado' });
        continue;
      }

      // Personalizar mensagem com dados do cliente
      const mensagemPersonalizada = mensagem
        .replace(/\{\{nome\}\}/g, cliente.nome)
        .replace(/\{\{cpf_cnpj\}\}/g, cliente.cpf_cnpj || '')
        .replace(/\{\{email\}\}/g, cliente.email || '');

      const assuntoPersonalizado = assunto
        .replace(/\{\{nome\}\}/g, cliente.nome)
        .replace(/\{\{cpf_cnpj\}\}/g, cliente.cpf_cnpj || '');

      try {
        await sgMail.send({
          to: cliente.email,
          from: user.email,
          subject: assuntoPersonalizado,
          html: mensagemPersonalizada.replace(/\n/g, '<br>'),
        });
        enviados++;
      } catch (err) {
        erros.push({ cliente: cliente.nome, erro: err.message });
      }
    }

    return Response.json({
      success: true,
      total: clientes.length,
      enviados,
      erros,
      message: `${enviados} mensagem(ns) enviada(s) com sucesso!`,
    });

  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});