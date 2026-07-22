import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Cliente } from "@/entities/Cliente";
import { Documento } from "@/entities/Documento";
import { createPageUrl } from "@/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import ClientPortalHeader from "../components/clientes/ClientPortalHeader";
import DocumentList from "../components/clientes/DocumentList";
import ClienteForm from "../components/clientes/ClienteForm";

export default function ClientPortal() {
  const [cliente, setCliente] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Pegar o ID do cliente da URL
      const urlParams = new URLSearchParams(window.location.search);
      const clienteId = urlParams.get('id');
      
      if (!clienteId) {
        setMessage({ type: "error", text: "ID do cliente não encontrado na URL." });
        setIsLoading(false);
        return;
      }

      const clienteData = await Cliente.get(clienteId);
      const documentosData = await Documento.filter({ cliente_id: clienteId }, "-created_date");
      setCliente(clienteData);
      setDocumentos(documentosData);
    } catch (error) {
      console.error("Erro ao carregar dados do cliente:", error);
      setMessage({ type: "error", text: "Erro ao carregar dados do cliente." });
    }
    setIsLoading(false);
  };

  const handleSaveCliente = async (clienteData) => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const clienteId = urlParams.get('id');
      
      await Cliente.update(clienteId, clienteData);
      setMessage({ type: "success", text: "Cliente atualizado com sucesso!" });
      setShowEditForm(false);
      loadData();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao atualizar cliente: " + error.message });
    }
  };

  const handleDeleteDocument = async (docId) => {
    try {
      await Documento.delete(docId);
      setMessage({ type: "success", text: "Documento excluído com sucesso!" });
      loadData();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Erro ao excluir documento:", error);
      setMessage({ type: "error", text: "Erro ao excluir documento." });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="p-6 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Cliente não encontrado
          </h2>
          <p className="text-gray-600 mb-4">
            O cliente solicitado não foi encontrado no sistema.
          </p>
          <Link to={createPageUrl("Clientes")}>
            <Button className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar para lista de clientes
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to={createPageUrl("Clientes")} className="flex items-center gap-2 text-blue-600 hover:underline mb-6">
            <ArrowLeft className="w-4 h-4" />
            Voltar para a lista de clientes
          </Link>

          {/* Success/Error Messages */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6"
              >
                <Alert className={message.type === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                  {message.type === "success" ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={message.type === "success" ? "text-green-800" : "text-red-800"}>
                    {message.text}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <ClientPortalHeader 
            cliente={cliente}
            documentCount={documentos.length}
            onEdit={() => setShowEditForm(true)}
          />
        </motion.div>

        {showEditForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ClienteForm 
              cliente={cliente}
              onSave={handleSaveCliente}
              onCancel={() => setShowEditForm(false)}
            />
          </motion.div>
        )}

        {!showEditForm && (
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <DocumentList 
              documentos={documentos}
              onDelete={handleDeleteDocument}
            />
           </motion.div>
        )}
      </div>
    </div>
  );
}