import React, { useState, useEffect } from "react";
import { Cliente } from "@/entities/Cliente";
import { User } from "@/entities/User"; // Added User entity import
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  UserPlus, 
  Users,
  Search,
  CheckCircle,
  FileUp,
  RefreshCw,
  AlertCircle as AlertIcon
} from "lucide-react";
import { syncClientes } from "@/functions/syncClientes";
import { motion, AnimatePresence } from "framer-motion";

import ClienteForm from "../components/clientes/ClienteForm";
import ClientesList from "../components/clientes/ClientesList";
import CsvImportDialog from "../components/clientes/CsvImportDialog";
import { createPageUrl } from "@/utils"; // Added createPageUrl import
import { Link } from "react-router-dom"; // Added Link import

const FREE_PLAN_LIMIT = 20; // Defined free plan limit

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedClientes, setSelectedClientes] = useState(new Set());
  const [currentUser, setCurrentUser] = useState(null);
  const [limitReached, setLimitReached] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const init = async () => {
      // Fetch current user on mount
      const user = await User.me();
      setCurrentUser(user);
      if (user) {
        loadClientes(user); // Load clients only if user is available
      } else {
        // Handle case where user is not logged in or session expired
        setIsLoading(false);
        setMessage({ type: "error", text: "Você precisa estar logado para ver os clientes." });
      }
    };
    init();
  }, []);

  const loadClientes = async (user) => {
    setIsLoading(true);
    try {
      // Filter clients by user_id for multi-tenancy
      const data = await Cliente.filter({ user_id: user.id }, "-created_date");
      setClientes(data);
      // Check for free plan limit
      if (user.plan === 'free' && data.length >= FREE_PLAN_LIMIT) {
        setLimitReached(true);
      } else {
        setLimitReached(false);
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      setMessage({ type: "error", text: "Erro ao carregar clientes: " + error.message });
    }
    setIsLoading(false);
    setSelectedClientes(new Set()); // Clear selection on load
  };

  const handleSaveCliente = async (clienteData) => {
    // Prevent adding new clients if limit is reached on free plan
    if (limitReached && !editingCliente) {
      setMessage({ type: "error", text: `Limite de ${FREE_PLAN_LIMIT} clientes atingido no plano gratuito. Faça upgrade para adicionar mais.` });
      setTimeout(() => setMessage(null), 5000); // Give more time for limit messages
      return;
    }
    
    try {
      // Associate client with current user
      const dataToSave = { ...clienteData, user_id: currentUser.id };
      if (editingCliente) {
        await Cliente.update(editingCliente.id, dataToSave);
        setMessage({ type: "success", text: "Cliente atualizado com sucesso!" });
      } else {
        await Cliente.create(dataToSave);
        setMessage({ type: "success", text: "Cliente cadastrado com sucesso!" });
      }
      
      setShowForm(false);
      setEditingCliente(null);
      loadClientes(currentUser); // Reload clients for the current user
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao salvar cliente: " + error.message });
    }
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setShowForm(true);
  };

  const handleDelete = async (clienteId) => {
    try {
      await Cliente.delete(clienteId);
      setMessage({ type: "success", text: "Cliente excluído com sucesso!" });
      loadClientes(currentUser); // Reload clients for the current user
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao excluir cliente: " + error.message });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedClientes.size === 0) {
      setMessage({ type: "error", text: "Nenhum cliente selecionado para exclusão." });
      return;
    }
    try {
      // Convert Set to Array for Promise.all
      await Promise.all(Array.from(selectedClientes).map(id => Cliente.delete(id)));
      setMessage({ type: "success", text: `${selectedClientes.size} cliente(s) excluído(s) com sucesso!` });
      loadClientes(currentUser); // Reload clients for the current user
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao excluir clientes: " + error.message });
    }
  };

  const handleToggleSelect = (clienteId) => {
    const newSelection = new Set(selectedClientes);
    if (newSelection.has(clienteId)) {
      newSelection.delete(clienteId);
    } else {
      newSelection.add(clienteId);
    }
    setSelectedClientes(newSelection);
  };

  const handleToggleSelectAll = () => {
    if (selectedClientes.size === filteredClientes.length && filteredClientes.length > 0) {
      setSelectedClientes(new Set());
    } else {
      setSelectedClientes(new Set(filteredClientes.map(c => c.id)));
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingCliente(null);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncClientes({});
      setMessage({ type: "success", text: "Clientes sincronizados com sucesso!" });
      loadClientes(currentUser);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao sincronizar: " + error.message });
    }
    setIsSyncing(false);
  };

  const handleImportSuccess = (count) => {
    setMessage({ type: "success", text: `${count} clientes importados com sucesso!` });
    loadClientes(currentUser); // Reload clients for the current user
    setTimeout(() => setMessage(null), 4000);
  };

  const filteredClientes = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.cpf_cnpj.includes(searchTerm) ||
    cliente.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading && !currentUser) { // Show loading state until currentUser is determined
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>Carregando clientes...</p>
        </div>
    );
  }

  // Render nothing or a message if currentUser is null after loading
  if (!currentUser) {
    return (
        <div className="p-6 space-y-8 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <Alert variant="destructive">
                    <AlertIcon className="h-4 w-4" />
                    <AlertDescription>
                        Não foi possível carregar as informações do usuário. Por favor, tente recarregar a página ou fazer login novamente.
                    </AlertDescription>
                </Alert>
            </div>
        </div>
    );
  }

  return (
    <div className="p-6 space-y-8 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Cadastro de Clientes
            </h1>
            <p className="text-gray-600">
              Gerencie os dados dos seus clientes para processamento automático
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSync}
              className="gap-2 hover-lift"
              disabled={isSyncing}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Cadastros'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(true)}
              className="gap-2 hover-lift"
              disabled={limitReached}
            >
              <FileUp className="w-4 h-4" />
              Importar CSV
            </Button>
            <Button
              onClick={() => setShowForm(true)}
              className="gap-2 bg-blue-600 hover:bg-blue-700 hover-lift"
              disabled={limitReached && !editingCliente} // Disable "Novo Cliente" if limit reached and not editing
            >
              <UserPlus className="w-4 h-4" />
              Novo Cliente
            </Button>
          </div>
        </motion.div>

        {/* Plan Limit Alert */}
        <AnimatePresence>
          {limitReached && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-6"
            >
              <Alert variant="destructive">
                <AlertIcon className="h-4 w-4" />
                <AlertDescription>
                  Você atingiu o limite de {FREE_PLAN_LIMIT} clientes do plano gratuito.{" "}
                  <Link to={createPageUrl("Subscription")} className="font-bold underline hover:text-red-700 transition-colors">Faça upgrade para adicionar mais.</Link>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CsvImportDialog */}
        <CsvImportDialog
          isOpen={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          onImportSuccess={handleImportSuccess}
          currentUser={currentUser} // Pass currentUser to CsvImportDialog
        />

        {/* Success/Error Messages */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-6" // Added margin top for spacing
            >
              <Alert className={message.type === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}>
                {message.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertIcon className="h-4 w-4" />} {/* Changed error icon to AlertIcon */}
                <AlertDescription>
                  {message.text}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Client Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6" // Added margin top for spacing
            >
              <ClienteForm
                cliente={editingCliente}
                onSave={handleSaveCliente}
                onCancel={handleCancelForm}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search and Stats */}
        {!showForm && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col md:flex-row gap-6 items-center mt-6" // Added margin top for spacing
          >
            {/* Search */}
            <Card className="flex-1 card-shadow w-full">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por nome, CPF/CNPJ ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="card-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total de Clientes</p>
                    <p className="text-xl font-bold text-gray-900">{clientes.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Clients List */}
        {!showForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6" // Added margin top for spacing
          >
            <ClientesList
              clientes={filteredClientes}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              searchTerm={searchTerm}
              selectedClientes={selectedClientes}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              onBulkDelete={handleBulkDelete}
              currentUser={currentUser} // Pass currentUser to ClientesList if it needs it (e.g., for admin features)
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}