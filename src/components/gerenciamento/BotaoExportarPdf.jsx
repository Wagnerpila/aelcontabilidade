import React, { useState } from "react";
import { FileDown, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function BotaoExportarPdf({ mesReferencia }) {
  const [exportando, setExportando] = useState(false);
  const [erro, setErro] = useState(null);

  const handleExportar = async () => {
    setExportando(true);
    setErro(null);
    try {
      const response = await base44.functions.invoke(
        "gerarPdfTarefas",
        { mes_referencia: mesReferencia },
        { responseType: "arraybuffer" }
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-tarefas-${mesReferencia}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao exportar PDF:", err);
      setErro(err.message || "Erro ao gerar PDF");
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleExportar} disabled={exportando}>
        {exportando ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : erro ? (
          <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
        ) : (
          <FileDown className="w-4 h-4 mr-2" />
        )}
        PDF
      </Button>
      {erro && (
        <span className="text-xs text-red-500">{erro}</span>
      )}
    </div>
  );
}