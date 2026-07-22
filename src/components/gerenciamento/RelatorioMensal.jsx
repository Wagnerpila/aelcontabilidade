import React from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function RelatorioMensal({ clientes, registros, mes }) {
  const date = parseISO(mes + "-01");
  const mesFormatado = format(date, "MMMM yyyy", { locale: ptBR });

  const totalClientes = clientes.length;
  const comEnvio = registros.filter(r => (r.documentos_enviados || []).length > 0).length;
  const dctfwebPendentes = registros.filter(r => r.dctfweb_pendente).length;
  const semNada = totalClientes - comEnvio;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border p-6 space-y-4">
      <h3 className="text-lg font-bold capitalize">Relatório — {mesFormatado}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-2xl font-bold">{totalClientes}</p>
          <p className="text-xs text-gray-500 mt-1">Total de Empresas</p>
        </div>
        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-2xl font-bold text-green-600">{comEnvio}</p>
          <p className="text-xs text-gray-500 mt-1">Com Envios</p>
        </div>
        <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-2xl font-bold text-red-500">{semNada}</p>
          <p className="text-xs text-gray-500 mt-1">Sem Envios</p>
        </div>
        <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <p className="text-2xl font-bold text-orange-500">{dctfwebPendentes}</p>
          <p className="text-xs text-gray-500 mt-1">DCTFweb Pendente</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-600">Empresas sem nenhum envio:</p>
        {clientes
          .filter(c => !registros.find(r => r.cliente_id === c.id && (r.documentos_enviados || []).length > 0))
          .map(c => (
            <div key={c.id} className="flex items-center gap-2 text-sm text-red-600">
              <XCircle className="w-4 h-4" />
              {c.nome}
            </div>
          ))
        }
        {clientes.filter(c => !registros.find(r => r.cliente_id === c.id && (r.documentos_enviados || []).length > 0)).length === 0 && (
          <p className="text-sm text-green-600 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Todas as empresas tiveram envios!
          </p>
        )}
      </div>
    </div>
  );
}