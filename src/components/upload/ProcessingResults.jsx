import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  FileText,
  RotateCcw,
  ExternalLink,
  Eye,
  Info,
  Send
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ResultRow = ({ result }) => {
  let statusIcon;
  let statusColor;
  let statusText;

  switch (result.status) {
    case 'success':
      statusIcon = <CheckCircle className="w-5 h-5 text-green-500" />;
      statusColor = "bg-green-50 text-green-800";
      statusText = "Sucesso";
      break;
    case 'error':
      statusIcon = <XCircle className="w-5 h-5 text-red-500" />;
      statusColor = "bg-red-50 text-red-800";
      statusText = "Erro";
      break;
    case 'processing':
      statusIcon = <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      statusColor = "bg-blue-50 text-blue-800";
      statusText = "Processando...";
      break;
    default:
      statusIcon = <FileText className="w-5 h-5 text-gray-500" />;
      statusColor = "bg-gray-100 text-gray-800";
      statusText = "Pendente";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${statusColor}`}
    >
      <div className="flex items-center gap-3 flex-1 overflow-hidden">
        {statusIcon}
        <div className="flex-1 overflow-hidden">
          <p className="font-medium truncate" title={result.fileName}>{result.fileName}</p>
          {result.status === 'error' && (
            <p className="text-xs text-red-700 mt-1">{result.error}</p>
          )}
          {result.message && (
             <p className="text-xs text-blue-700 mt-1">{result.message}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 self-end sm:self-center">
        <Badge variant="outline" className={`border-current ${statusColor}`}>{statusText}</Badge>

        {result.status === 'success' && result.summary && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 bg-white">
                <Eye className="w-3 h-3"/> Detalhes
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle>Resumo do Processamento</DialogTitle>
                <DialogDescription>{result.fileName}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 max-h-80 overflow-y-auto p-1">
                {result.summary.map((item, index) => (
                  <div key={index} className={`flex items-start gap-3 p-3 rounded-md text-sm ${item.status === 'success' ? 'bg-green-50 text-green-900' : 'bg-blue-50 text-blue-900'}`}>
                    {item.status === 'success' ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" /> : <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />}
                    <span>{item.message}</span>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
        
        {result.status === 'success' && result.document?.id && (
          <>
            <a href={result.document.arquivo_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1 bg-white">
                <ExternalLink className="w-3 h-3"/> Abrir
              </Button>
            </a>
            <Link to={createPageUrl(`ClientPortal?id=${result.document.cliente_id}`)}>
              <Button variant="outline" size="sm" className="gap-1 bg-white">
                <Eye className="w-3 h-3"/> Ver no Portal
              </Button>
            </Link>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default function ProcessingResults({ results, onReset, isProcessing, onTestWebhook }) {
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const totalCount = results.length;
  const [isTesting, setIsTesting] = React.useState(false);

  const handleTestWebhook = async () => {
    setIsTesting(true);
    await onTestWebhook();
    setIsTesting(false);
  };

  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Resultados do Processamento
          </span>
          <Badge variant="secondary">
            {successCount + errorCount} / {totalCount} concluídos
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 max-h-[60vh] overflow-y-auto p-1 pr-3">
          {results.map((result, index) => (
            <ResultRow key={index} result={result} />
          ))}
        </div>
        
        {!isProcessing && (
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t">
            <div>
              <span className="text-green-600 font-semibold">{successCount} sucesso(s)</span>
              <span className="mx-2">|</span>
              <span className="text-red-600 font-semibold">{errorCount} erro(s)</span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {successCount > 0 && (
                <Button 
                  onClick={handleTestWebhook} 
                  disabled={isTesting}
                  variant="outline" 
                  className="gap-2 hover-lift border-blue-200 text-blue-700 hover:bg-blue-50 flex-1 sm:flex-none"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Testar Webhook n8n
                    </>
                  )}
                </Button>
              )}
              <Button onClick={onReset} variant="outline" className="gap-2 hover-lift flex-1 sm:flex-none">
                <RotateCcw className="w-4 h-4" />
                Processar Mais
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}