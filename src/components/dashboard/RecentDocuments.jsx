import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  CheckCircle, 
  XCircle,
  ExternalLink,
  Filter
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const tipoDocumentoColors = {
  "DAS": "bg-blue-100 text-blue-800 border-blue-200",
  "Nota Fiscal": "bg-green-100 text-green-800 border-green-200",
  "Holerite": "bg-purple-100 text-purple-800 border-purple-200",
  "CNPJ": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "MEI": "bg-orange-100 text-orange-800 border-orange-200",
  "Outros": "bg-gray-100 text-gray-800 border-gray-200",
  "CND ESTADUAL": "bg-red-100 text-red-800 border-red-200",
  "CND FEDERAL": "bg-red-100 text-red-800 border-red-200",
  "CNE MUNICIPAL": "bg-red-100 text-red-800 border-red-200",
  "CND TRABALHISTA": "bg-red-100 text-red-800 border-red-200",
  "COFINS": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "CSLL": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "FGTS": "bg-pink-100 text-pink-800 border-pink-200",
  "INSS": "bg-pink-100 text-pink-800 border-pink-200",
  "IRPJ": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "PARCELAMENTO MEI": "bg-teal-100 text-teal-800 border-teal-200",
  "PARCELAMENTO SIMPLES": "bg-teal-100 text-teal-800 border-teal-200",
  "PIS": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "RECIBO DE PAGAMENTO": "bg-cyan-100 text-cyan-800 border-cyan-200",
};

const StatusIcon = ({ status, size = "w-4 h-4" }) => {
  if (status) {
    return <CheckCircle className={`${size} text-green-500`} />;
  }
  return <XCircle className={`${size} text-red-500`} />;
};

export default function RecentDocuments({ documentos, isLoading }) {
  if (isLoading) {
    return (
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documentos Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow">
      <CardHeader className="border-b border-gray-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-5 h-5 text-blue-600" />
            Documentos Recentes
          </CardTitle>
          <Link to={createPageUrl("Monitor")}>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Ver Todos
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {documentos.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum documento processado
            </h3>
            <p className="text-gray-500 mb-4">
              Comece fazendo upload dos seus documentos contábeis
            </p>
            <Link to={createPageUrl("Upload")}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                Processar Primeiro Documento
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {documentos.map((documento, index) => (
              <div key={documento.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {documento.nome_cliente}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="secondary"
                          className={`text-xs ${tipoDocumentoColors[documento.tipo_documento]}`}
                        >
                          {documento.tipo_documento}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {documento.data_documento && !isNaN(new Date(documento.data_documento).getTime()) && format(new Date(documento.data_documento), "dd MMM yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1" title="Status do Processamento">
                      <StatusIcon status={documento.status_leitura} />
                      <StatusIcon status={documento.status_identificacao} />
                      <StatusIcon status={documento.status_organizacao} />
                      <StatusIcon status={documento.status_email} />
                    </div>
                    {documento.arquivo_url && (
                      <a
                        href={documento.arquivo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}