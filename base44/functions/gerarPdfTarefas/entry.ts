import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";
import { jsPDF } from "npm:jspdf@4.0.0";

// Remove acentos e caracteres especiais para compatibilidade com jsPDF
function norm(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x00-\x7F]/g, "");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { mes_referencia } = await req.json().catch(() => ({}));
    if (!mes_referencia) {
      return Response.json({ error: "Mês de referência obrigatório" }, { status: 400 });
    }

    const TIPOS = ["DAS", "FGTS", "INSS", "Holerite"];

    const [clientes, documentos, registros] = await Promise.all([
      base44.entities.Cliente.filter({ user_id: user.id, ativo: true }),
      base44.entities.Documento.filter({ user_id: user.id }, "-created_date", 500),
      base44.entities.GerenciamentoEnvio.filter({ user_id: user.id, mes_referencia }),
    ]);

    const regMap = {};
    for (const r of registros) regMap[r.cliente_id] = r;

    const docsMap = {};
    for (const d of documentos) {
      if (!d.cliente_id) continue;
      const iso = d.created_date instanceof Date ? d.created_date.toISOString() : String(d.created_date || "");
      if (iso.substring(0, 7) !== mes_referencia) continue;
      if (!docsMap[d.cliente_id]) docsMap[d.cliente_id] = {};
      if (!docsMap[d.cliente_id][d.tipo_documento]) docsMap[d.cliente_id][d.tipo_documento] = [];
      docsMap[d.cliente_id][d.tipo_documento].push(d.nome_arquivo || d.tipo_documento);
    }

    const [ano, mesNum] = mes_referencia.split("-");
    const meses = ["Janeiro","Fevereiro","Marco","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const mesNome = meses[parseInt(mesNum) - 1] || mesNum;

    const comEnvio = registros.filter(r => (r.documentos_enviados || []).length > 0).length;
    const semEnvio = clientes.length - comEnvio;
    const dctfwebCount = registros.filter(r => r.dctfweb_pendente).length;

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 10;
    let y = margin;

    // Título
    doc.setFontSize(16);
    doc.text("Relatorio de Gerenciamento de Tarefas", margin, y + 5);
    y += 8;
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`${mesNome} de ${ano}`, margin, y + 5);
    y += 10;
    doc.setTextColor(0);

    // Cards de resumo
    const cardW = (pageW - margin * 2 - 12) / 4;
    const cardH = 18;
    const cards = [
      { label: "Total Empresas", value: String(clientes.length), color: [200,200,200] },
      { label: "Com Envios", value: String(comEnvio), color: [34,197,94] },
      { label: "Sem Envios", value: String(semEnvio), color: [239,68,68] },
      { label: "DCTFweb Pend.", value: String(dctfwebCount), color: [249,115,22] },

    ];

    cards.forEach((card, i) => {
      const cx = margin + i * (cardW + 4);
      doc.setFillColor(...card.color, 0.15);
      doc.roundedRect(cx, y, cardW, cardH, 2, 2, "F");
      doc.setFontSize(16);
      doc.setTextColor(...card.color);
      doc.text(card.value, cx + cardW / 2, y + 8, { align: "center" });
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(card.label, cx + cardW / 2, y + 14, { align: "center" });
    });
    doc.setTextColor(0);
    y += cardH + 10;

    // Tabela
    const colW = [55, 45, 45, 45, 45, 28];
    const headers = ["Empresa", "DAS", "FGTS", "INSS", "Holerite", "DCTFweb"];
    const rowH = 7;

    // Cabeçalho
    doc.setFillColor(240, 240, 240);
    doc.setFontSize(8);
    let cx = margin;
    headers.forEach((h, i) => {
      doc.rect(cx, y, colW[i], rowH, "FD");
      doc.text(h, cx + 1, y + 5);
      cx += colW[i];
    });
    y += rowH;

    // Linhas
    doc.setFontSize(7);
    for (const c of clientes) {
      if (y > pageH - margin - 20) {
        doc.addPage();
        y = margin;
        // Repetir cabeçalho
        cx = margin;
        doc.setFillColor(240, 240, 240);
        doc.setFontSize(8);
        headers.forEach((h, i) => {
          doc.rect(cx, y, colW[i], rowH, "FD");
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

      // Alternar cor de fundo
      if (clientes.indexOf(c) % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y, pageW - margin * 2, rowH, "F");
      }

      // Empresa
      cx = margin;
      const nome = norm(c.nome || "");
      const nomeExib = nome.length > 28 ? nome.substring(0, 28) + "..." : nome;
      doc.setTextColor(0);
      doc.text(nomeExib, cx + 1, y + 5);
      cx += colW[0];

      // Colunas DAS, FGTS, INSS, Holerite
      TIPOS.forEach((tipo, idx) => {
        if (enviados.includes(tipo)) {
          doc.setTextColor(34, 197, 94);
          const arqs = docs[tipo] || [];
          const txt = arqs.length > 0 ? norm(arqs[0]).substring(0, 14) : "enviado";
          doc.text(txt, cx + 1, y + 5);
        } else if (naoEnviados.includes(tipo)) {
          doc.setTextColor(249, 115, 22);
          doc.text("manual", cx + 1, y + 5);
        } else {
          doc.setTextColor(239, 68, 68);
          doc.text("X", cx + 1, y + 5);
        }
        cx += colW[idx + 1];
      });

      // DCTFweb
      if (dctfweb) {
        doc.setTextColor(249, 115, 22);
        doc.text("Pendente", cx + 1, y + 5);
      }
      doc.setTextColor(0);

      y += rowH;
    }

    // Empresas sem envio
    y += 6;
    const semEnvioList = clientes.filter(
      c => !registros.find(r => r.cliente_id === c.id && (r.documentos_enviados || []).length > 0)
    );
    if (semEnvioList.length > 0) {
      if (y > pageH - margin - 30) { doc.addPage(); y = margin; }
      doc.setFontSize(9);
      doc.text("Empresas sem nenhum envio:", margin, y + 5);

      y += 7;
      doc.setFontSize(7);
      doc.setTextColor(239, 68, 68);
      for (const c of semEnvioList) {
        if (y > pageH - margin - 10) { doc.addPage(); y = margin; }
        doc.text(`X  ${norm(c.nome)}`, margin + 2, y + 4);
        y += 5;
      }
      doc.setTextColor(0);
    }

    const pdfBytes = doc.output("arraybuffer");
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=relatorio-tarefas-${mes_referencia}.pdf`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});