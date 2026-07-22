import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SOURCE_EMAIL = 'janaingles15@gmail.com';

// Disparado automaticamente quando um novo usuário é criado via automação de entidade
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const newUserId = body?.event?.entity_id || body?.data?.id || null;

    if (!newUserId) {
      return Response.json({ error: 'ID do novo usuário não fornecido.' }, { status: 400 });
    }

    console.log(`🆕 Novo usuário detectado: ${newUserId}. Iniciando sincronização...`);

    // Buscar usuário fonte
    const allUsers = await base44.asServiceRole.entities.User.list();
    const sourceUser = allUsers.find(u => u.email === SOURCE_EMAIL);
    const newUser = allUsers.find(u => u.id === newUserId);

    if (!sourceUser) {
      return Response.json({ error: `Usuário fonte (${SOURCE_EMAIL}) não encontrado.` }, { status: 404 });
    }

    // Não sincronizar para o próprio usuário fonte
    if (newUserId === sourceUser.id) {
      return Response.json({ message: 'Novo usuário é o próprio usuário fonte. Sync ignorado.' });
    }

    // Buscar clientes da fonte
    const sourceClientes = await base44.asServiceRole.entities.Cliente.filter({ user_id: sourceUser.id });

    if (sourceClientes.length === 0) {
      return Response.json({ message: 'Nenhum cliente no usuário fonte.' });
    }

    let created = 0;

    for (const cliente of sourceClientes) {
      await base44.asServiceRole.entities.Cliente.create({
        ...cliente,
        id: undefined,
        created_date: undefined,
        updated_date: undefined,
        created_by: undefined,
        user_id: newUserId,
      });
      created++;
    }

    console.log(`✅ ${created} clientes copiados para o novo usuário ${newUser?.email || newUserId}`);

    return Response.json({
      success: true,
      message: `${created} clientes sincronizados para o novo usuário.`,
      new_user_id: newUserId,
      new_user_email: newUser?.email,
    });

  } catch (error) {
    console.error('Erro ao sincronizar para novo usuário:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});