
import React, { useState, useEffect } from "react";
import { Cliente } from "@/entities/Cliente";
import { Documento } from "@/entities/Documento";
import { User } from "@/entities/User";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  FileText, 
  Users, 
  CheckCircle,
  Upload,
  Clock,
  AlertCircle,
  LogOut // Added LogOut icon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

import StatsCard from "../components/dashboard/StatsCard";
import RecentDocuments from "../components/dashboard/RecentDocuments";
import QuickActions from "../components/dashboard/QuickActions";

export default function Dashboard() {
  const [clientes, setClientes] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);
      
      const [clientesData, documentosData] = await Promise.all([
        Cliente.filter({ user_id: user.id }, "-created_date"),
        Documento.filter({ user_id: user.id }, "-created_date", 10)
      ]);
      setClientes(clientesData);
      setDocumentos(documentosData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    try {
      await User.logout(); // Assuming User.logout() clears session/token
      // Redirect to login page or home page after logout
      window.location.href = '/login'; 
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      alert("Falha ao fazer logout. Tente novamente.");
    }
  };

  const calculateStats = () => {
    const totalDocumentos = documentos.length;
    const documentosHoje = documentos.filter(doc => {
      const hoje = new Date().toDateString();
      return new Date(doc.created_date).toDateString() === hoje;
    }).length;
    
    const documentosProcessados = documentos.filter(doc => 
      doc.status_leitura && doc.status_identificacao && doc.status_organizacao
    ).length;
    
    const taxaSucesso = totalDocumentos > 0 ? Math.round((documentosProcessados / totalDocumentos) * 100) : 100;

    return {
      totalClientes: clientes.length,
      totalDocumentos,
      documentosHoje,
      taxaSucesso
    };
  };

  const stats = calculateStats();

  return (
    <div className="p-6 space-y-8 min-h-screen bg-transparent">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
        >
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-300">
              Painel de Controle
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 transition-colors duration-300">
              Processamento inteligente de documentos contábeis
            </p>
          </div>
          <div className="flex gap-3">
            <Link to={createPageUrl("Clientes")}>
              <Button variant="outline" className="gap-2 hover-lift dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-800/50 transition-colors duration-300">
                <Users className="w-4 h-4" />
                Novo Cliente
              </Button>
            </Link>
            <Link to={createPageUrl("Upload")}>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-gradient-to-r dark:from-purple-600 dark:to-violet-600 dark:hover:from-purple-700 dark:hover:to-violet-700 hover-lift transition-all duration-300">
                <Upload className="w-4 h-4" />
                Processar Documentos
              </Button>
            </Link>
            <Button 
              variant="destructive" 
              onClick={handleLogout} 
              className="gap-2 hover-lift dark:bg-red-700 dark:hover:bg-red-800 dark:text-white transition-colors duration-300"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <StatsCard
            title="Total de Clientes"
            value={stats.totalClientes}
            icon={Users}
            color="blue"
            trend="+12% este mês"
            isLoading={isLoading}
          />
          <StatsCard
            title="Documentos Processados"
            value={stats.totalDocumentos}
            icon={FileText}
            color="green"
            trend="+8% esta semana"
            isLoading={isLoading}
          />
          <StatsCard
            title="Documentos Hoje"
            value={stats.documentosHoje}
            icon={Clock}
            color="purple"
            isLoading={isLoading}
          />
          <StatsCard
            title="Taxa de Sucesso"
            value={`${stats.taxaSucesso}%`}
            icon={CheckCircle}
            color="emerald"
            trend="Excelente desempenho"
            isLoading={isLoading}
          />
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Documents */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <RecentDocuments 
              documentos={documentos}
              isLoading={isLoading}
            />
          </motion.div>

          {/* Quick Actions & Info */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            <QuickActions />
            
            {/* System Status */}
            <Card className="card-shadow hover-lift dark:bg-gray-800/50 dark:border-purple-700/50 transition-colors duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg dark:text-white transition-colors duration-300">
                  <AlertCircle className="w-5 h-5 text-blue-500 dark:text-purple-400 transition-colors duration-300" />
                  Status do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">Processamento</span>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 transition-colors duration-300">
                    Operacional
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">OCR Engine</span>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 transition-colors duration-300">
                    Ativo
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">Envio de E-mails</span>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 transition-colors duration-300">
                    Configurado
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">Armazenamento</span>
                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 transition-colors duration-300">
                    85% usado
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
