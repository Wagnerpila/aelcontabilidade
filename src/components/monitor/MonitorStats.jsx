import React from "react";
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertTriangle 
} from "lucide-react";
import StatsCard from "../dashboard/StatsCard";

export default function MonitorStats({ documentos, isLoading }) {
  const stats = React.useMemo(() => {
    const total = documentos.length;
    const processados = documentos.filter(doc => 
      doc.status_leitura && doc.status_identificacao && doc.status_organizacao
    ).length;
    const pendentes = total - processados;
    const hoje = documentos.filter(doc => {
      const dataDoc = new Date(doc.created_date).toDateString();
      const hoje = new Date().toDateString();
      return dataDoc === hoje;
    }).length;

    const taxaSucesso = total > 0 ? Math.round((processados / total) * 100) : 100;

    return { total, processados, pendentes, hoje, taxaSucesso };
  }, [documentos]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatsCard
        title="Total de Documentos"
        value={stats.total}
        icon={FileText}
        color="blue"
        isLoading={isLoading}
      />
      <StatsCard
        title="Processados"
        value={stats.processados}
        icon={CheckCircle}
        color="green"
        trend={`${stats.taxaSucesso}% de sucesso`}
        isLoading={isLoading}
      />
      <StatsCard
        title="Pendentes"
        value={stats.pendentes}
        icon={Clock}
        color="yellow"
        isLoading={isLoading}
      />
      <StatsCard
        title="Processados Hoje"
        value={stats.hoje}
        icon={AlertTriangle}
        color="purple"
        isLoading={isLoading}
      />
    </div>
  );
}