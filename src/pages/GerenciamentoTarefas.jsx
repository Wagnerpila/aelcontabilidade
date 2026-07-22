import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ClipboardList, RefreshCw, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MesSeletor from "@/components/gerenciamento/MesSeletor";
import LinhaEmpresa, { TIPOS_DOCUMENTO } from "@/components/gerenciamento/LinhaEmpresa";
import RelatorioMensal from "@/components/gerenciamento/RelatorioMensal";
import BotaoExportarPdf from "@/components/gerenciamento/BotaoExportarPdf";

export default function GerenciamentoTarefas() {
  const [user, setUser] = useState(null);
  const [mesAtual, setMesAtual] = useState(format(new Date(), "yyyy-MM"));
  const [clientes, setClientes] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [docsPorCliente, setDocsPorCliente] = useState({});

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const carregarDados = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [clientesData, documentosData, registrosData] = await Promise.all([
        base44.entities.Cliente.filter({ user_id: user.id, ativo: true }),
        base44.entities.Documento.filter({ user_id: user.id }, "-created_date", 500),
        base44.entities.GerenciamentoEnvio.filter({ user_id: user.id, mes_referencia: mesAtual }),
      ]);

      // Sincronizar registros: criar em lote os que não existem
      const registrosAtualizados = [...registrosData];
      const clientesSemRegistro = clientesData.filter(c => !registrosData.find(r => r.cliente_id === c.id));

      if (clientesSemRegistro.length > 0) {
        const novosRegistros = await base44.entities.GerenciamentoEnvio.bulkCreate(
          clientesSemRegistro.map(c => ({
            user_id: user.id,
            cliente_id: c.id,
            nome_cliente: c.nome,
            mes_referencia: mesAtual,
            documentos_enviados: [],
            documentos_nao_enviados: [],
            dctfweb_pendente: false,
          }))
        );
        registrosAtualizados.push(...novosRegistros);
      }

      // Função auxiliar: verifica se documento pertence ao mês atual
      // data_documento vem em formatos livres ("MAIO/2026", "12/07/2024"), então usa created_date como referência
      // created_date pode ser objeto Date ou string ISO — normalizamos para string
      const docPertenceAoMes = (d) => {
        const dataRef = d.created_date;
        if (!dataRef) return false;
        const iso = dataRef instanceof Date ? dataRef.toISOString() : String(dataRef);
        return iso.substring(0, 7) === mesAtual;
      };

      // Sincronizar documentos_enviados com base nos documentos reais do mês
      for (const reg of registrosAtualizados) {
        const docsDoCliente = documentosData.filter(d =>
          d.cliente_id === reg.cliente_id && docPertenceAoMes(d)
        );
        const tiposEnviados = [...new Set(
          docsDoCliente
            .filter(d => d.status_email || d.status_whatsapp)
            .map(d => d.tipo_documento)
        )];
        const atual = (reg.documentos_enviados || []).slice().sort();
        if (JSON.stringify(tiposEnviados.sort()) !== JSON.stringify(atual)) {
          await base44.entities.GerenciamentoEnvio.update(reg.id, { documentos_enviados: tiposEnviados });
          reg.documentos_enviados = tiposEnviados;
        }
      }

      // Mapear documentos por cliente para exibir nomes de arquivo
      const docsPorCliente = {};
      for (const d of documentosData) {
        if (!d.cliente_id) continue;
        if (!docPertenceAoMes(d)) continue;
        if (!docsPorCliente[d.cliente_id]) docsPorCliente[d.cliente_id] = {};
        if (!docsPorCliente[d.cliente_id][d.tipo_documento]) docsPorCliente[d.cliente_id][d.tipo_documento] = [];
        docsPorCliente[d.cliente_id][d.tipo_documento].push(d.nome_arquivo || d.tipo_documento);
      }

      setClientes(clientesData);
      setRegistros(registrosAtualizados);
      setDocsPorCliente(docsPorCliente);
    } finally {
      setLoading(false);
    }
  }, [user, mesAtual]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const getRegistro = (clienteId) => registros.find(r => r.cliente_id === clienteId);

  const handleToggleDoc = async (clienteId, tipo, checked) => {
    const reg = getRegistro(clienteId);
    if (!reg) return;
    setSalvando(true);
    const atual = reg.documentos_nao_enviados || [];
    const novo = checked ? [...atual, tipo] : atual.filter(t => t !== tipo);
    await base44.entities.GerenciamentoEnvio.update(reg.id, { documentos_nao_enviados: novo });
    setRegistros(prev => prev.map(r => r.id === reg.id ? { ...r, documentos_nao_enviados: novo } : r));
    setSalvando(false);
  };

  const handleToggleDCTFweb = async (clienteId, checked) => {
    const reg = getRegistro(clienteId);
    if (!reg) return;
    setSalvando(true);
    // DCTFweb pendente = marca todos os documentos como não enviados
    const todosNaoEnviados = checked ? TIPOS_DOCUMENTO : [];
    await base44.entities.GerenciamentoEnvio.update(reg.id, {
      dctfweb_pendente: checked,
      documentos_nao_enviados: todosNaoEnviados,
    });
    setRegistros(prev => prev.map(r =>
      r.id === reg.id ? { ...r, dctfweb_pendente: checked, documentos_nao_enviados: todosNaoEnviados } : r
    ));
    setSalvando(false);
  };

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gerenciamento de Tarefas</h1>
            <p className="text-sm text-gray-500">Controle mensal de envios por empresa</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <MesSeletor mesAtual={mesAtual} onChange={setMesAtual} />
          <Button variant="outline" size="sm" onClick={carregarDados} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <BotaoExportarPdf mesReferencia={mesAtual} />
          {salvando && <span className="text-xs text-gray-400 animate-pulse">Salvando...</span>}
        </div>
      </div>

      <Tabs defaultValue="tabela">
        <TabsList>
          <TabsTrigger value="tabela">
            <ClipboardList className="w-4 h-4 mr-2" />
            Tabela de Envios
          </TabsTrigger>
          <TabsTrigger value="relatorio">
            <BarChart2 className="w-4 h-4 mr-2" />
            Relatório do Mês
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tabela" className="mt-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border overflow-hidden">
            <div className="overflow-auto max-h-[65vh]">
              <table className="w-full text-xs border-separate border-spacing-0">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b sticky top-0 z-20">
                    <th className="px-4 py-3 text-left font-semibold sticky left-0 bg-gray-50 dark:bg-gray-800 z-30 border-r whitespace-nowrap">
                      Empresa
                    </th>
                    {TIPOS_DOCUMENTO.map(tipo => (
                      <th key={tipo} className="px-2 py-3 text-center font-medium text-gray-500 whitespace-nowrap">
                        <div className="writing-mode-vertical" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', maxHeight: 100, overflow: 'hidden', fontSize: '10px' }}>
                          {tipo}
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center font-semibold text-orange-600 sticky right-0 bg-gray-50 dark:bg-gray-800 border-l whitespace-nowrap z-30">
                      DCTFweb
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.length === 0 ? (
                    <tr>
                      <td colSpan={TIPOS_DOCUMENTO.length + 2} className="text-center py-12 text-gray-400">
                        Nenhum cliente cadastrado.
                      </td>
                    </tr>
                  ) : (
                    clientes.map(cliente => (
                      <LinhaEmpresa
                        key={cliente.id}
                        cliente={cliente}
                        registro={getRegistro(cliente.id)}
                        documentosPorTipo={docsPorCliente[cliente.id] || {}}
                        onToggleDoc={handleToggleDoc}
                        onToggleDCTFweb={handleToggleDCTFweb}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Enviado automaticamente
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Não enviado
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded border border-gray-400 inline-block" /> Marcar manualmente
            </span>
          </div>
        </TabsContent>

        <TabsContent value="relatorio" className="mt-4">
          <RelatorioMensal clientes={clientes} registros={registros} mes={mesAtual} />
        </TabsContent>
      </Tabs>
    </div>
  );
}