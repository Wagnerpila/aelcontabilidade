import express from 'express';
import { jsPDF } from 'jspdf';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { sendViaSendGrid } from '../lib/email.js';

const router = express.Router();
router.use(requireAuth);

// ─────────────────────────────────────────────────────────────────────────
// enviarMensagem — envio de e-mail em massa via SendGrid (SENDGRID_API_KEY)
// ─────────────────────────────────────────────────────────────────────────
router.post('/enviarMensagem', async (req, res) => {
  try {
    const { cliente_ids, assunto, mensagem } = req.body || {};
    if (!assunto || !mensagem) {
      return res.status(400).json({ error: 'Assunto e mensagem são obrigatórios.' });
    }

    let clientes;
    if (cliente_ids && cliente_ids.length > 0) {
      const todos = await prisma.cliente.findMany({ where: { user_id: req.user.id } });
      clientes = todos.filter((c) => cliente_ids.includes(c.id));
    } else {
      clientes = await prisma.cliente.findMany({ where: { user_id: req.user.id, ativo: true } });
    }
    if (clientes.length === 0) {
      return res.status(400).json({ error: 'Nenhum cliente encontrado.' });
    }

    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'SENDGRID_API_KEY não configurada.' });
    }

    let enviados = 0;
    const erros = [];

    for (const cliente of clientes) {
      if (!cliente.email) {
        erros.push({ cliente: cliente.nome, erro: 'Sem e-mail cadastrado' });
        continue;
      }
      const mensagemPersonalizada = mensagem
        .replace(/\{\{nome\}\}/g, cliente.nome)
        .replace(/\{\{cpf_cnpj\}\}/g, cliente.cpf_cnpj || '')
        .replace(/\{\{email\}\}/g, cliente.email || '');
      const assuntoPersonalizado = assunto
        .replace(/\{\{nome\}\}/g, cliente.nome)
        .replace(/\{\{cpf_cnpj\}\}/g, cliente.cpf_cnpj || '');

      try {
        await sendViaSendGrid({
          apiKey,
          to: cliente.email,
          from: req.user.email,
          subject: assuntoPersonalizado,
          html: mensagemPersonalizada.replace(/\n/g, '<br>'),
        });
        enviados++;
      } catch (err) {
        erros.push({ cliente: cliente.nome, erro: err.message });
      }
    }

    res.json({
      success: true,
      total: clientes.length,
      enviados,
      erros,
      message: `${enviados} mensagem(ns) enviada(s) com sucesso!`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// enviarMensagemWhatsApp — dispara o webhook do n8n (fluxo com Evolution API
// roda dentro do n8n). Mantido EXATAMENTE como no fluxo original: mesmo
// payload, mesma ordem de fallback de configuração (Empresa -> SystemConfig).
// ─────────────────────────────────────────────────────────────────────────
router.post('/enviarMensagemWhatsApp', async (req, res) => {
  try {
    const { cliente_ids, mensagem } = req.body || {};
    if (!mensagem) {
      return res.status(400).json({ error: 'Mensagem é obrigatória.' });
    }

    let n8nWebhookUrl = null;

    if (req.user.empresa_id) {
      const empresa = await prisma.empresa.findUnique({ where: { id: req.user.empresa_id } });
      n8nWebhookUrl = empresa?.n8n_webhook_mensagens || empresa?.n8n_webhook_documentos;
    }
    if (!n8nWebhookUrl) {
      const config = await prisma.systemConfig.findFirst({ where: { config_key: 'n8n_webhook_mensagens_url' } });
      n8nWebhookUrl = config?.config_value;
    }
    if (!n8nWebhookUrl) {
      const config = await prisma.systemConfig.findFirst({ where: { config_key: 'n8n_webhook_url' } });
      n8nWebhookUrl = config?.config_value;
    }
    if (!n8nWebhookUrl) {
      return res.status(400).json({ error: 'Webhook do n8n não configurado. Configure em Configurações > n8n.' });
    }

    let clientes;
    if (cliente_ids && cliente_ids.length > 0) {
      const todos = await prisma.cliente.findMany({ where: { user_id: req.user.id } });
      clientes = todos.filter((c) => cliente_ids.includes(c.id));
    } else {
      clientes = await prisma.cliente.findMany({ where: { user_id: req.user.id, ativo: true } });
    }

    function formatarTelefone(tel) {
      const digits = tel.replace(/\D/g, '');
      if (digits.startsWith('55') && digits.length >= 12) return digits;
      return '55' + digits;
    }

    const clientesComTelefone = clientes
      .filter((c) => c.telefone)
      .map((c) => {
        const tel = formatarTelefone(c.telefone);
        const texto = mensagem
          .replace(/\{\{nome\}\}/g, c.nome || '')
          .replace(/\{\{cpf_cnpj\}\}/g, c.cpf_cnpj || '')
          .replace(/\{\{email\}\}/g, c.email || '');
        return { number: tel, mensagem: texto, nome: c.nome, telefone: tel, email: c.email || '', cpf_cnpj: c.cpf_cnpj || '' };
      });

    const semTelefone = clientes.length - clientesComTelefone.length;
    if (clientesComTelefone.length === 0) {
      return res.status(400).json({ error: 'Nenhum cliente com telefone cadastrado.' });
    }

    const payload = {
      tipo_envio: 'mensagem_personalizada',
      clientes: clientesComTelefone,
      mensagem_template: mensagem,
      app: {
        nome: req.user.companyName || req.user.full_name,
        user_email: req.user.email,
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

    res.json({
      success: true,
      total: clientesComTelefone.length,
      enviados: clientesComTelefone.length,
      erros: [],
      sem_telefone: semTelefone,
      message: `${clientesComTelefone.length} mensagem(ns) enviada(s) para o WhatsApp!`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// notifyWhatsAppViaWebhook — notificação de documento único via webhook n8n
// (mesmo payload/lógica original; a Evolution API roda dentro do n8n).
// ─────────────────────────────────────────────────────────────────────────
router.post('/notifyWhatsAppViaWebhook', async (req, res) => {
  try {
    const { documento, cliente } = req.body || {};
    if (!documento || !cliente) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    let n8nWebhookUrl = null;
    if (req.user.empresa_id) {
      const empresa = await prisma.empresa.findUnique({ where: { id: req.user.empresa_id } });
      n8nWebhookUrl = empresa?.n8n_webhook_documentos;
    }
    if (!n8nWebhookUrl) n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nWebhookUrl) {
      return res.status(500).json({
        error: 'Webhook n8n não configurado para esta empresa',
        message: 'Configure a URL do webhook em Configurações > n8n',
      });
    }

    let dataFormatada = 'N/A';
    let textoData = '📅 *Data do Vencimento:*';
    if (documento.data_documento) {
      if (documento.tipo_documento === 'Holerite' || documento.tipo_documento === 'RECIBO DE PAGAMENTO') {
        dataFormatada = documento.data_documento;
        textoData = '📅 *Competência:*';
      } else if (documento.tipo_documento === 'RELATÓRIO DO CARTÃO PONTO') {
        textoData = '📅 *Período Final:*';
        dataFormatada = documento.data_documento;
      } else {
        dataFormatada = documento.data_documento;
      }
    }

    const payload = {
      cliente: { nome: cliente.nome, telefone: cliente.telefone, email: cliente.email },
      documento: {
        tipo: documento.tipo_documento,
        data: dataFormatada,
        texto_data: textoData,
        arquivo_url: documento.arquivo_url,
        nome_arquivo: documento.nome_arquivo,
      },
      app: { nome: req.user.companyName || req.user.full_name, user_email: req.user.email },
    };

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro no n8n webhook: ${response.status} - ${errorText}`);
    }

    const result = await response.json().catch(() => ({}));
    res.json({ success: true, message: 'Notificação enviada para o n8n com sucesso', result });
  } catch (error) {
    res.status(500).json({ error: error.message, success: false });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// sendEmail — envio via SendGrid usando credenciais salvas em SystemConfig
// ─────────────────────────────────────────────────────────────────────────
router.post('/sendEmail', async (req, res) => {
  try {
    const { to, subject, body, attachmentUrl } = req.body || {};
    if (!to || !subject || !body) {
      return res.status(400).json({ success: false, error: 'to, subject e body são obrigatórios' });
    }

    const configs = await prisma.systemConfig.findMany({ where: { config_type: 'email' } });
    const fromEmail = configs.find((c) => c.config_key === 'gmail_user')?.config_value;
    const sendgridApiKey = configs.find((c) => c.config_key === 'sendgrid_api_key')?.config_value;
    const isActive = configs.find((c) => c.config_key === 'gmail_active')?.config_value === 'true';

    if (!isActive || !fromEmail || !sendgridApiKey) {
      return res.status(400).json({ success: false, error: 'Configuração de envio (SendGrid) incompleta ou inativa.' });
    }

    let finalBody = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
            .header { background: #1e40af; color: white; padding: 25px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
            .btn { background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; }
            .attachment { background: #eff6ff; border: 1px solid #dbeafe; padding: 20px; border-radius: 8px; margin-top: 20px; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header"><h1>A&L Contabilidade</h1></div>
            <div class="content">${body.replace(/data-filename="[^"]*"/g, '').replace(/data-linenumber="[^"]*"/g, '').replace(/data-visual-selector-id="[^"]*"/g, '')}</div>`;

    if (attachmentUrl) {
      finalBody += `<div class="attachment"><strong>Documento Anexo:</strong><br><a href="${attachmentUrl}" class="btn" target="_blank">Visualizar Documento</a></div>`;
    }

    finalBody += `<div class="footer"><p>Este é um e-mail automático do sistema A&L Contabilidade.<br>Data de envio: ${new Date().toLocaleString('pt-BR')}</p></div></div></body></html>`;

    await sendViaSendGrid({ apiKey: sendgridApiKey, to, from: fromEmail, subject, html: finalBody });
    res.json({ success: true, message: 'Email enviado com sucesso via SendGrid' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// syncClientes — copia clientes do usuário fonte para os demais usuários
// ─────────────────────────────────────────────────────────────────────────
const SOURCE_EMAIL = 'janaingles15@gmail.com';

router.post('/syncClientes', async (req, res) => {
  try {
    const targetUserId = req.body?.target_user_id || null;

    const allUsers = await prisma.user.findMany();
    const sourceUser = allUsers.find((u) => u.email === SOURCE_EMAIL);
    if (!sourceUser) {
      return res.status(404).json({ error: `Usuário fonte (${SOURCE_EMAIL}) não encontrado.` });
    }

    const sourceClientes = await prisma.cliente.findMany({ where: { user_id: sourceUser.id } });
    if (sourceClientes.length === 0) {
      return res.json({ message: 'Nenhum cliente encontrado no usuário fonte.', synced: 0 });
    }

    const targetUsers = targetUserId
      ? allUsers.filter((u) => u.id === targetUserId && u.id !== sourceUser.id)
      : allUsers.filter((u) => u.id !== sourceUser.id);

    let totalCreated = 0;
    let totalSkipped = 0;
    const results = [];

    for (const targetUser of targetUsers) {
      const existingClientes = await prisma.cliente.findMany({ where: { user_id: targetUser.id } });
      const existingCnpjs = new Set(existingClientes.map((c) => c.cpf_cnpj?.replace(/\D/g, '')));

      const toCreate = [];
      let skipped = 0;
      for (const cliente of sourceClientes) {
        const cnpjNorm = cliente.cpf_cnpj?.replace(/\D/g, '');
        if (existingCnpjs.has(cnpjNorm)) {
          skipped++;
        } else {
          const { id, created_date, updated_date, created_by, ...rest } = cliente;
          toCreate.push({ ...rest, user_id: targetUser.id });
          existingCnpjs.add(cnpjNorm);
        }
      }

      if (toCreate.length > 0) {
        await prisma.$transaction(toCreate.map((data) => prisma.cliente.create({ data })));
      }

      totalCreated += toCreate.length;
      totalSkipped += skipped;
      results.push({ user: targetUser.full_name || targetUser.email, created: toCreate.length, updated: skipped });
    }

    res.json({
      success: true,
      message: `Sincronização completa! ${totalCreated} clientes criados, ${totalSkipped} atualizados.`,
      source: SOURCE_EMAIL,
      source_total: sourceClientes.length,
      users_synced: targetUsers.length,
      results,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// syncClientesNewUser — copia clientes do usuário fonte para um novo usuário
// ─────────────────────────────────────────────────────────────────────────
router.post('/syncClientesNewUser', async (req, res) => {
  try {
    const newUserId = req.body?.event?.entity_id || req.body?.data?.id || req.user.id;

    const allUsers = await prisma.user.findMany();
    const sourceUser = allUsers.find((u) => u.email === SOURCE_EMAIL);
    const newUser = allUsers.find((u) => u.id === newUserId);

    if (!sourceUser) {
      return res.status(404).json({ error: `Usuário fonte (${SOURCE_EMAIL}) não encontrado.` });
    }
    if (newUserId === sourceUser.id) {
      return res.json({ message: 'Novo usuário é o próprio usuário fonte. Sync ignorado.' });
    }

    const sourceClientes = await prisma.cliente.findMany({ where: { user_id: sourceUser.id } });
    if (sourceClientes.length === 0) {
      return res.json({ message: 'Nenhum cliente no usuário fonte.' });
    }

    let created = 0;
    for (const cliente of sourceClientes) {
      const { id, created_date, updated_date, created_by, ...rest } = cliente;
      await prisma.cliente.create({ data: { ...rest, user_id: newUserId } });
      created++;
    }

    res.json({
      success: true,
      message: `${created} clientes sincronizados para o novo usuário.`,
      new_user_id: newUserId,
      new_user_email: newUser?.email,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// gerarPdfTarefas — relatório mensal de gerenciamento de tarefas (PDF)
// ─────────────────────────────────────────────────────────────────────────
const DIACRITICS_REGEX = new RegExp('[\\u0300-\\u036f]', 'g');

function norm(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .replace(/[^\x00-\x7F]/g, '');
}

router.post('/gerarPdfTarefas', async (req, res) => {
  try {
    const { mes_referencia } = req.body || {};
    if (!mes_referencia) {
      return res.status(400).json({ error: 'Mês de referência obrigatório' });
    }

    const TIPOS = ['DAS', 'FGTS', 'INSS', 'Holerite'];

    const [clientes, documentos, registros] = await Promise.all([
      prisma.cliente.findMany({ where: { user_id: req.user.id, ativo: true } }),
      prisma.documento.findMany({ where: { user_id: req.user.id }, orderBy: { created_date: 'desc' }, take: 500 }),
      prisma.gerenciamentoEnvio.findMany({ where: { user_id: req.user.id, mes_referencia } }),
    ]);

    const regMap = {};
    for (const r of registros) regMap[r.cliente_id] = r;

    const docsMap = {};
    for (const d of documentos) {
      if (!d.cliente_id) continue;
      const iso = d.created_date instanceof Date ? d.created_date.toISOString() : String(d.created_date || '');
      if (iso.substring(0, 7) !== mes_referencia) continue;
      if (!docsMap[d.cliente_id]) docsMap[d.cliente_id] = {};
      if (!docsMap[d.cliente_id][d.tipo_documento]) docsMap[d.cliente_id][d.tipo_documento] = [];
      docsMap[d.cliente_id][d.tipo_documento].push(d.nome_arquivo || d.tipo_documento);
    }

    const [ano, mesNum] = mes_referencia.split('-');
    const meses = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const mesNome = meses[parseInt(mesNum, 10) - 1] || mesNum;

    const comEnvio = registros.filter((r) => (r.documentos_enviados || []).length > 0).length;
    const semEnvio = clientes.length - comEnvio;
    const dctfwebCount = registros.filter((r) => r.dctfweb_pendente).length;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 10;
    let y = margin;

    doc.setFontSize(16);
    doc.text('Relatorio de Gerenciamento de Tarefas', margin, y + 5);
    y += 8;
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`${mesNome} de ${ano}`, margin, y + 5);
    y += 10;
    doc.setTextColor(0);

    const cardW = (pageW - margin * 2 - 12) / 4;
    const cardH = 18;
    const cards = [
      { label: 'Total Empresas', value: String(clientes.length), color: [200, 200, 200] },
      { label: 'Com Envios', value: String(comEnvio), color: [34, 197, 94] },
      { label: 'Sem Envios', value: String(semEnvio), color: [239, 68, 68] },
      { label: 'DCTFweb Pend.', value: String(dctfwebCount), color: [249, 115, 22] },
    ];

    cards.forEach((card, i) => {
      const cx = margin + i * (cardW + 4);
      doc.setFillColor(...card.color, 0.15);
      doc.roundedRect(cx, y, cardW, cardH, 2, 2, 'F');
      doc.setFontSize(16);
      doc.setTextColor(...card.color);
      doc.text(card.value, cx + cardW / 2, y + 8, { align: 'center' });
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(card.label, cx + cardW / 2, y + 14, { align: 'center' });
    });
    doc.setTextColor(0);
    y += cardH + 10;

    const colW = [55, 45, 45, 45, 45, 28];
    const headers = ['Empresa', 'DAS', 'FGTS', 'INSS', 'Holerite', 'DCTFweb'];
    const rowH = 7;

    doc.setFillColor(240, 240, 240);
    doc.setFontSize(8);
    let cx = margin;
    headers.forEach((h, i) => {
      doc.rect(cx, y, colW[i], rowH, 'FD');
      doc.text(h, cx + 1, y + 5);
      cx += colW[i];
    });
    y += rowH;

    doc.setFontSize(7);
    clientes.forEach((c, index) => {
      if (y > pageH - margin - 20) {
        doc.addPage();
        y = margin;
        cx = margin;
        doc.setFillColor(240, 240, 240);
        doc.setFontSize(8);
        headers.forEach((h, i) => {
          doc.rect(cx, y, colW[i], rowH, 'FD');
          doc.text(h, cx + 1, y + 5);
          cx += colW[i];
        });
        y += rowH;
        doc.setFontSize(7);
      }

      const reg = regMap[c.id] || { documentos_enviados: [], documentos_nao_enviados: [], dctfweb_pendente: false };
      const enviados = reg.documentos_enviados || [];
      const naoEnviados = reg.documentos_nao_enviados || [];
      const dctfweb = reg.dctfweb_pendente || false;
      const docs = docsMap[c.id] || {};

      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y, pageW - margin * 2, rowH, 'F');
      }

      cx = margin;
      const nome = norm(c.nome || '');
      const nomeExib = nome.length > 28 ? nome.substring(0, 28) + '...' : nome;
      doc.setTextColor(0);
      doc.text(nomeExib, cx + 1, y + 5);
      cx += colW[0];

      TIPOS.forEach((tipo, idx) => {
        if (enviados.includes(tipo)) {
          doc.setTextColor(34, 197, 94);
          const arqs = docs[tipo] || [];
          const txt = arqs.length > 0 ? norm(arqs[0]).substring(0, 14) : 'enviado';
          doc.text(txt, cx + 1, y + 5);
        } else if (naoEnviados.includes(tipo)) {
          doc.setTextColor(249, 115, 22);
          doc.text('manual', cx + 1, y + 5);
        } else {
          doc.setTextColor(239, 68, 68);
          doc.text('X', cx + 1, y + 5);
        }
        cx += colW[idx + 1];
      });

      if (dctfweb) {
        doc.setTextColor(249, 115, 22);
        doc.text('Pendente', cx + 1, y + 5);
      }
      doc.setTextColor(0);

      y += rowH;
    });

    y += 6;
    const semEnvioList = clientes.filter(
      (c) => !registros.find((r) => r.cliente_id === c.id && (r.documentos_enviados || []).length > 0)
    );
    if (semEnvioList.length > 0) {
      if (y > pageH - margin - 30) {
        doc.addPage();
        y = margin;
      }
      doc.setFontSize(9);
      doc.text('Empresas sem nenhum envio:', margin, y + 5);
      y += 7;
      doc.setFontSize(7);
      doc.setTextColor(239, 68, 68);
      for (const c of semEnvioList) {
        if (y > pageH - margin - 10) {
          doc.addPage();
          y = margin;
        }
        doc.text(`X  ${norm(c.nome)}`, margin + 2, y + 4);
        y += 5;
      }
      doc.setTextColor(0);
    }

    const pdfBytes = doc.output('arraybuffer');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=relatorio-tarefas-${mes_referencia}.pdf`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
