import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SOURCE_EMAIL = 'janaingles15@gmail.com';
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const targetUserId = body.target_user_id || null; // Se passado, sincroniza só para esse usuário

    // 1. Buscar usuário fonte
    const allUsers = await base44.asServiceRole.entities.User.list();
    const sourceUser = allUsers.find(u => u.email === SOURCE_EMAIL);

    if (!sourceUser) {
      return Response.json({ error: `Usuário fonte (${SOURCE_EMAIL}) não encontrado.` }, { status: 404 });
    }

    // 2. Buscar todos os clientes da fonte
    const sourceClientes = await base44.asServiceRole.entities.Cliente.filter({ user_id: sourceUser.id });

    if (sourceClientes.length === 0) {
      return Response.json({ message: 'Nenhum cliente encontrado no usuário fonte.', synced: 0 });
    }

    // 3. Definir usuários alvo
    const targetUsers = targetUserId
      ? allUsers.filter(u => u.id === targetUserId && u.id !== sourceUser.id)
      : allUsers.filter(u => u.id !== sourceUser.id);

    let totalCreated = 0;
    let totalSkipped = 0;
    const results = [];

    for (const targetUser of targetUsers) {
      // Buscar clientes já existentes para este usuário
      const existingClientes = await base44.asServiceRole.entities.Cliente.filter({ user_id: targetUser.id });
      const existingCnpjs = new Set(existingClientes.map(c => c.cpf_cnpj?.replace(/\D/g, '')));

      let created = 0;
      let skipped = 0;

      const toCreate = [];

      for (const cliente of sourceClientes) {
        const cnpjNorm = cliente.cpf_cnpj?.replace(/\D/g, '');

        if (existingCnpjs.has(cnpjNorm)) {
          skipped++; // Pula atualizações para evitar rate limit
        } else {
          toCreate.push({
            ...cliente,
            id: undefined,
            created_date: undefined,
            updated_date: undefined,
            created_by: undefined,
            user_id: targetUser.id,
          });
          existingCnpjs.add(cnpjNorm);
        }
      }

      // Criar em lotes de 10 para evitar rate limit
      const batchSize = 10;
      for (let i = 0; i < toCreate.length; i += batchSize) {
        const batch = toCreate.slice(i, i + batchSize);
        await base44.asServiceRole.entities.Cliente.bulkCreate(batch);
        created += batch.length;
        if (i + batchSize < toCreate.length) {
          await sleep(1000);
        }
      }

      totalCreated += created;
      totalSkipped += skipped;
      results.push({
        user: targetUser.full_name || targetUser.email,
        created,
        updated: skipped,
      });

      console.log(`✅ ${targetUser.email}: ${created} criados, ${skipped} atualizados`);

      // Pausa entre usuários para evitar rate limit
      await sleep(1000);
    }

    return Response.json({
      success: true,
      message: `Sincronização completa! ${totalCreated} clientes criados, ${totalSkipped} atualizados.`,
      source: SOURCE_EMAIL,
      source_total: sourceClientes.length,
      users_synced: targetUsers.length,
      results,
    });

  } catch (error) {
    console.error('Erro na sincronização:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});