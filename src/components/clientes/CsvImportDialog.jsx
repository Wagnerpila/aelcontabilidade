
import React, { useState } from "react";
import { Cliente } from "@/entities/Cliente";
import { UploadFile, ExtractDataFromUploadedFile } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileUp, Upload, X, CheckCircle, Loader2 } from "lucide-react";

export default function CsvImportDialog({ isOpen, onClose, onImportSuccess, currentUser }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setError(null);
    } else {
      setError("Por favor, selecione um arquivo no formato CSV.");
      setFile(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError("Nenhum arquivo selecionado.");
      return;
    }
    if (!currentUser) {
      setError("Usuário não identificado. Não é possível importar.");
      return;
    }
    setIsProcessing(true);
    setError(null);

    try {
      const { file_url } = await UploadFile({ file });
      
      const extractionResult = await ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "array",
          items: Cliente.schema(),
        },
      });
      
      if (extractionResult.status !== "success" || !Array.isArray(extractionResult.output)) {
        throw new Error("Não foi possível extrair dados do arquivo CSV. Verifique o formato.");
      }
      
      const clientsToCreate = extractionResult.output.map(client => ({
        ...client,
        ativo: client.ativo === undefined ? true : client.ativo,
        user_id: currentUser.id, // Adiciona o ID do usuário logado
      }));

      await Cliente.bulkCreate(clientsToCreate);
      
      onImportSuccess(clientsToCreate.length);
      handleClose();
    } catch (err) {
      setError(err.message || "Ocorreu um erro durante a importação.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    setIsProcessing(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5" />
            Importar Clientes via CSV
          </DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV com as colunas: nome, cpf_cnpj, email, telefone, preferencia_envio.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              id="csv-upload"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <div className="w-12 h-12 mx-auto mb-2 bg-gray-100 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-gray-500" />
              </div>
              <p className="font-medium text-blue-600">
                {file ? "Arquivo selecionado:" : "Clique para selecionar o arquivo"}
              </p>
              <p className="text-sm text-gray-500">
                {file ? file.name : "Apenas arquivos .csv"}
              </p>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={!file || isProcessing}>
            {isProcessing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            {isProcessing ? "Importando..." : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
