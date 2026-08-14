
import React, { useState } from "react";
import { Cliente } from "@/entities/Cliente";
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

const PREFERENCIAS_VALIDAS = ["email", "whatsapp", "ambos"];

// Parser simples de CSV (RFC 4180): lida com campos entre aspas, aspas
// escapadas ("") e vírgulas dentro de campos com aspas.
function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function parseCsv(text) {
  const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] ?? "").trim();
    });
    return row;
  });
}

const normalizeCnpjRaiz = (cpfCnpj) => (cpfCnpj || "").replace(/\D/g, "").substring(0, 8);

// Converte uma linha crua do CSV (que pode ter colunas de export antigas,
// como id/created_date/user_id de outra conta) num objeto só com os campos
// que a entidade Cliente aceita.
function mapRowToCliente(row, currentUserId) {
  const nome = row.nome?.trim();
  const cpf_cnpj = row.cpf_cnpj?.trim();
  if (!nome || !cpf_cnpj) return null; // nome e cpf_cnpj são obrigatórios

  const cliente = {
    nome,
    cpf_cnpj,
    user_id: currentUserId,
    ativo: row.ativo === "" || row.ativo === undefined ? true : row.ativo === "true" || row.ativo === true,
  };

  if (row.email) cliente.email = row.email;
  if (row.telefone) cliente.telefone = row.telefone;
  if (PREFERENCIAS_VALIDAS.includes(row.preferencia_envio)) {
    cliente.preferencia_envio = row.preferencia_envio;
  }

  return cliente;
}

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
      const text = await file.text();
      const rows = parseCsv(text);

      if (rows.length === 0) {
        throw new Error("O arquivo CSV está vazio.");
      }

      const semNomeOuCnpj = [];
      const porCnpj = new Map(); // dedupe: mantém a versão mais completa por raiz do CNPJ

      rows.forEach((row, index) => {
        const cliente = mapRowToCliente(row, currentUser.id);
        if (!cliente) {
          semNomeOuCnpj.push(index + 2); // +2 = linha real no arquivo (cabeçalho + 1-index)
          return;
        }
        const chave = normalizeCnpjRaiz(cliente.cpf_cnpj) || cliente.cpf_cnpj;
        const existente = porCnpj.get(chave);
        if (!existente) {
          porCnpj.set(chave, cliente);
        } else {
          // Se a linha atual tem mais dados preenchidos (email/telefone), substitui a anterior
          const pontosAtual = (cliente.email ? 1 : 0) + (cliente.telefone ? 1 : 0);
          const pontosExistente = (existente.email ? 1 : 0) + (existente.telefone ? 1 : 0);
          if (pontosAtual > pontosExistente) porCnpj.set(chave, cliente);
        }
      });

      const clientsToCreate = Array.from(porCnpj.values());
      const duplicados = rows.length - semNomeOuCnpj.length - clientsToCreate.length;

      if (clientsToCreate.length === 0) {
        throw new Error("Nenhuma linha válida encontrada. Verifique se o CSV tem as colunas 'nome' e 'cpf_cnpj' preenchidas.");
      }

      await Cliente.bulkCreate(clientsToCreate);

      if (semNomeOuCnpj.length > 0 || duplicados > 0) {
        alert(
          `✅ ${clientsToCreate.length} cliente(s) importado(s).\n` +
          (duplicados > 0 ? `⚠️ ${duplicados} linha(s) duplicada(s) (mesmo CNPJ) foram ignoradas.\n` : '') +
          (semNomeOuCnpj.length > 0 ? `⚠️ ${semNomeOuCnpj.length} linha(s) sem nome/CNPJ foram ignoradas (linhas: ${semNomeOuCnpj.slice(0, 20).join(', ')}${semNomeOuCnpj.length > 20 ? '...' : ''}).` : '')
        );
      }

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
            Faça upload de um arquivo CSV com as colunas: nome, cpf_cnpj (obrigatórias), email, telefone, preferencia_envio, ativo (opcionais). Linhas duplicadas (mesmo CNPJ) e sem nome/cpf_cnpj são ignoradas automaticamente.
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
