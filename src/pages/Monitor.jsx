
import React, { useState, useEffect, useMemo } from "react";
import { Documento } from "@/entities/Documento";
import { Cliente } from "@/entities/Cliente";
import { User } from "@/entities/User"; // Added User import
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";

import MonitorTable from "../components/monitor/MonitorTable";
import MonitorFilters from "../components/monitor/MonitorFilters";
import MonitorStats from "../components/monitor/MonitorStats";

export default function MonitorPage() {
  const [documentos, setDocumentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [currentUser, setCurrentUser] = useState(null); // Added currentUser state
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    cliente: "all",
    tipo: "all",
    status: "all"
  });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const user = await User.me(); // Fetch current user
      setCurrentUser(user); // Set current user

      const [documentosData, clientesData] = await Promise.all([
        Documento.filter({ user_id: user.id }, "-created_date"), // Filter documents by user_id
        Cliente.filter({ user_id: user.id }) // Filter clients by user_id
      ]);
      setDocumentos(documentosData);
      setClientes(clientesData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setMessage({ type: "error", text: "Erro ao carregar dados. Verifique sua conexão ou tente novamente." });
    }
    setIsLoading(false);
  };
  
  const handleDeleteGroup = async (docsToDelete) => {
    try {
      await Promise.all(docsToDelete.map(doc => Documento.delete(doc.id)));
      setMessage({ type: "success", text: `${docsToDelete.length} documento(s) excluído(s) com sucesso!` });
      loadData();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao excluir documentos." });
    }
  };

  const groupedAndFilteredDocumentos = useMemo(() => {
    const filtered = documentos.filter(documento => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = documento.nome_cliente.toLowerCase().includes(search) ||
                           documento.tipo_documento.toLowerCase().includes(search) ||
                           (documento.nome_arquivo && documento.nome_arquivo.toLowerCase().includes(search));
      
      const matchesCliente = filters.cliente === "all" || documento.nome_cliente === filters.cliente;
      const matchesTipo = filters.tipo === "all" || documento.tipo_documento === filters.tipo;
      
      let matchesStatus = true;
      if (filters.status === "completed") {
        matchesStatus = documento.status_leitura && documento.status_identificacao && documento.status_organizacao;
      } else if (filters.status === "pending") {
        matchesStatus = !documento.status_leitura || !documento.status_identificacao || !documento.status_organizacao;
      }

      return matchesSearch && matchesCliente && matchesTipo && matchesStatus;
    });

    const grouped = filtered.reduce((acc, doc) => {
      const key = doc.nome_cliente;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(doc);
      return acc;
    }, {});

    return Object.values(grouped);
  }, [documentos, searchTerm, filters]);


  return (
    <div className="p-6 space-y-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Monitor de Processamento
            </h1>
            <p className="text-gray-600">
              Acompanhe o status de todos os documentos processados pelo sistema
            </p>
          </div>
        </motion.div>

        {/* Success/Error Message */}
        {message && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="pt-4">
            <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {message.text}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="pt-6"
        >
          <MonitorStats 
            documentos={documentos} 
            isLoading={isLoading} 
          />
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="pt-6"
        >
          <MonitorFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filters={filters}
            onFiltersChange={setFilters}
            clientes={clientes}
            documentos={documentos}
          />
        </motion.div>

        {/* Results Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="pt-6"
        >
          <MonitorTable
            documentGroups={groupedAndFilteredDocumentos}
            isLoading={isLoading}
            searchTerm={searchTerm}
            onDeleteGroup={handleDeleteGroup}
            clientes={clientes}
          />
        </motion.div>
      </div>
    </div>
  );
}
