import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, Download, Trash2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";

const tipoDocumentoColors = {
  "DAS": "bg-blue-100 text-blue-800 border-blue-200",
  "Nota Fiscal": "bg-green-100 text-green-800 border-green-200",
  "Holerite": "bg-purple-100 text-purple-800 border-purple-200",
  "CNPJ": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "MEI": "bg-orange-100 text-orange-800 border-orange-200",
  "Outros": "bg-gray-100 text-gray-800 border-gray-200"
};

export default function DocumentList({ documentos, onDelete }) {
  if (documentos.length === 0) {
    return (
      <Card className="card-shadow">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum documento encontrado
          </h3>
          <p className="text-gray-500">
            Comece processando os documentos deste cliente na página de upload.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <FileText className="w-5 h-5 text-blue-600" />
          Documentos Armazenados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documentos.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover-lift overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="secondary" className={tipoDocumentoColors[doc.tipo_documento]}>
                      {doc.tipo_documento}
                    </Badge>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(doc.data_documento), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="font-medium text-gray-800 truncate" title={doc.nome_arquivo}>
                    {doc.nome_arquivo}
                  </p>
                </div>
                <div className="bg-gray-50 px-4 py-3 flex justify-end gap-2">
                  <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-1">
                      <Download className="w-3 h-3" />
                      Baixar
                    </Button>
                  </a>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="gap-1">
                        <Trash2 className="w-3 h-3" />
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-red-500"/>
                          Confirmar Exclusão
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Você tem certeza que deseja excluir o documento <strong>{doc.nome_arquivo}</strong>? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(doc.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Sim, excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}