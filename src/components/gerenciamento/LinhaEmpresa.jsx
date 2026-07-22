import React from "react";
import { CheckCircle2, XCircle, FileText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const TIPOS_DOCUMENTO = ["DAS", "FGTS", "INSS", "Holerite"];

export default function LinhaEmpresa({ cliente, registro, documentosPorTipo = {}, onToggleDoc, onToggleDCTFweb }) {
  const enviados = registro?.documentos_enviados || [];
  const manuais = registro?.documentos_nao_enviados || [];
  const dctfweb = registro?.dctfweb_pendente || false;

  return (
    <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors align-top">
      {/* Nome da empresa */}
      <td className="px-4 py-3 font-semibold text-sm sticky left-0 bg-white dark:bg-gray-900 z-10 border-r">
        <div className="max-w-[180px]" title={cliente.nome}>{cliente.nome}</div>
      </td>

      {/* Colunas de tipos de documento */}
      {TIPOS_DOCUMENTO.map((tipo) => {
        const foiEnviado = enviados.includes(tipo);
        const marcadoManual = manuais.includes(tipo);
        const arquivos = documentosPorTipo[tipo] || [];

        return (
          <td key={tipo} className="px-2 py-2 text-center align-top min-w-[80px]">
            {foiEnviado ? (
              /* Enviado automaticamente — verde com nome(s) do arquivo */
              <div className="flex flex-col items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                {arquivos.length > 0 ? (
                  arquivos.map((arq, i) => (
                    <span
                      key={i}
                      className="text-[9px] text-green-700 bg-green-50 border border-green-200 rounded px-1 py-0.5 leading-tight max-w-[76px] truncate block"
                      title={arq}
                    >
                      <FileText className="w-2 h-2 inline mr-0.5" />{arq}
                    </span>
                  ))
                ) : (
                  <span className="text-[9px] text-green-600">enviado</span>
                )}
              </div>
            ) : (
              /* Não enviado — vermelho + checkbox manual */
              <div className="flex flex-col items-center gap-1">
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <Checkbox
                  checked={marcadoManual}
                  onCheckedChange={(checked) => onToggleDoc(cliente.id, tipo, checked)}
                  className="w-3 h-3"
                  title="Marcar como não enviado manualmente"
                />
                {marcadoManual && (
                  <span className="text-[9px] text-orange-500">manual</span>
                )}
              </div>
            )}
          </td>
        );
      })}

      {/* DCTFweb */}
      <td className="px-4 py-3 text-center sticky right-0 bg-white dark:bg-gray-900 border-l">
        <div className="flex flex-col items-center gap-1">
          <Checkbox
            checked={dctfweb}
            onCheckedChange={(checked) => onToggleDCTFweb(cliente.id, checked)}
          />
          {dctfweb && <span className="text-[9px] text-orange-500 font-medium">pendente</span>}
        </div>
      </td>
    </tr>
  );
}

export { TIPOS_DOCUMENTO };