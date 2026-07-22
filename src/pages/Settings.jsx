
import React, { useState, useEffect } from "react";
import { NotificationTemplate } from "@/entities/NotificationTemplate";
import { User } from "@/entities/User";
import { UploadFile } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, CheckCircle, AlertCircle, Settings, Mail, User as UserIcon, Save, Upload, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";

import TemplateForm from "../components/settings/TemplateForm";
import TemplateList from "../components/settings/TemplateList";
import SendGridConfig from "../components/settings/SendGridConfig";
import N8nConfig from "../components/settings/N8nConfig"; // Added N8nConfig import

export default function SettingsPage() {
  const [templates, setTemplates] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [userConfig, setUserConfig] = useState({
    companyName: '',
    companyIconUrl: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [message, setMessage] = useState(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);

  // loadTemplates function modified to fetch all templates without user-specific filter
  const loadTemplates = async () => {
    try {
      const data = await NotificationTemplate.list("-created_date");
      setTemplates(data);
    } catch (error) {
      console.error("Erro ao carregar templates:", error);
      setMessage({ type: "error", text: "Erro ao carregar templates: " + error.message });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
        setUserConfig({
          companyName: user.companyName || user.full_name || '', // Keep || '' for robustness
          companyIconUrl: user.companyIconUrl || ''
        });
        await loadTemplates(); // Call the external loadTemplates, now without arguments
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setMessage({ type: "error", text: "Erro ao carregar dados do usuário: " + error.message });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []); // Dependencies adjusted: loadTemplates is stable as it uses stable setters and external API calls

  const handleIconUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: "error", text: "Por favor, selecione apenas arquivos de imagem." });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "O arquivo deve ter no máximo 5MB." });
      return;
    }

    setIsUploadingIcon(true);
    try {
      const { file_url } = await UploadFile({ file });
      setUserConfig({ ...userConfig, companyIconUrl: file_url });
      setMessage({ type: "success", text: "Ícone carregado com sucesso! Lembre-se de salvar as configurações." });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao fazer upload do ícone: " + error.message });
    }
    setIsUploadingIcon(false);
  };

  const handleSaveUserConfig = async () => {
    setIsSavingUser(true);
    try {
      await User.updateMyUserData(userConfig);
      setMessage({ type: "success", text: "Configurações da empresa salvas com sucesso!" });
      
      // Atualizar estado local
      setCurrentUser({ ...currentUser, ...userConfig });
      
      setTimeout(() => setMessage(null), 3000);
      
      // Recarregar página para atualizar o layout
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao salvar: " + error.message });
    }
    setIsSavingUser(false);
  };
  
  const handleSaveTemplate = async (templateData) => {
    try {
      if (editingTemplate) {
        await NotificationTemplate.update(editingTemplate.id, templateData);
        setMessage({ type: "success", text: "Template atualizado com sucesso!" });
      } else {
        // Removed created_by: currentUser.id assignment as per outline's implied change
        await NotificationTemplate.create(templateData);
        setMessage({ type: "success", text: "Template criado com sucesso!" });
      }
      
      setShowForm(false);
      setEditingTemplate(null);
      loadTemplates(); // Reload templates
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao salvar template: " + error.message });
    }
  };
  
  const handleDeleteTemplate = async (templateId) => {
    try {
      await NotificationTemplate.delete(templateId);
      setMessage({ type: "success", text: "Template excluído com sucesso!" });
      loadTemplates(); // Reload templates
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao excluir template: " + error.message });
    }
  };

  const handleEdit = (template) => {
    console.log('Editando template:', template); // Debug log
    setEditingTemplate(template);
    setShowForm(true);
  };
  
  const handleCancelForm = () => {
    setShowForm(false);
    setEditingTemplate(null);
  };

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
              Configurações do Sistema
            </h1>
            <p className="text-gray-600">
              Gerencie sua empresa, templates de notificação e configurações de e-mail.
            </p>
          </div>
        </motion.div>

        {/* Message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert className={message.type === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                {message.type === "success" ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
                <AlertDescription className={message.type === "success" ? "text-green-800" : "text-red-800"}>
                  {message.text}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Tabs */}
        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Empresa
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              E-mail
            </TabsTrigger>
            <TabsTrigger value="n8n" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              n8n
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="space-y-6">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-blue-600" />
                  Dados da Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nome da Empresa</Label>
                  <Input
                    id="companyName"
                    value={userConfig.companyName}
                    onChange={(e) => setUserConfig({ ...userConfig, companyName: e.target.value })}
                    placeholder="Digite o nome da sua empresa"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyIcon">Ícone da Empresa</Label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      id="companyIcon"
                      accept="image/*"
                      onChange={handleIconUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('companyIcon').click()}
                      disabled={isUploadingIcon}
                      className="gap-2"
                    >
                      {isUploadingIcon ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Carregando...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Carregar Ícone
                        </>
                      )}
                    </Button>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>• Recomendado: imagem quadrada, até 5MB</p>
                      <p>• Formatos aceitos: PNG, JPG, GIF, SVG</p>
                    </div>
                  </div>
                </div>

                {userConfig.companyIconUrl && (
                  <div className="space-y-2">
                    <Label>Preview do Ícone</Label>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                        <img 
                          src={userConfig.companyIconUrl} 
                          alt="Preview" 
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = '<div class="text-xs text-red-500 text-center">❌<br/>Erro ao carregar</div>';
                          }}
                          onLoad={(e) => {
                            console.log("Imagem carregada com sucesso:", e.target.src);
                          }}
                        />
                      </div>
                      <div>
                        <p className="font-medium">{userConfig.companyName}</p>
                        <p className="text-sm text-gray-500">Preview do seu logo</p>
                        <p className="text-xs text-gray-400">Se não aparecer, verifique a URL</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t">
                  <Button 
                    onClick={handleSaveUserConfig}
                    disabled={isSavingUser || isLoading}
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4" />
                    {isSavingUser ? "Salvando..." : "Salvar Configurações"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Templates de Notificação</h2>
                <p className="text-gray-600">Gerencie os templates de e-mail</p>
              </div>
              <Button
                onClick={() => { setEditingTemplate(null); setShowForm(true); }}
                className="gap-2 bg-blue-600 hover:bg-blue-700 hover-lift"
              >
                <Plus className="w-4 h-4" />
                Novo Template
              </Button>
            </div>
            
            {/* Template Form */}
            <AnimatePresence>
              {showForm && (
                <TemplateForm
                  template={editingTemplate}
                  onSave={handleSaveTemplate}
                  onCancel={handleCancelForm}
                />
              )}
            </AnimatePresence>
            
            {/* Template List */}
            {!showForm && (
               <TemplateList
                 templates={templates}
                 isLoading={isLoading}
                 onEdit={handleEdit}
                 onDelete={handleDeleteTemplate}
               />
            )}
          </TabsContent>

          <TabsContent value="email" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Integração SendGrid</h2>
              <p className="text-gray-600">Configure sua conta SendGrid para envio confiável das notificações.</p>
            </div>
            <SendGridConfig onMessage={setMessage} />
          </TabsContent>

          {/* New n8n Integration Tab */}
          <TabsContent value="n8n" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Automação com n8n</h2>
              <p className="text-gray-600">Configure o webhook do n8n para envio automático de WhatsApp.</p>
            </div>
            <N8nConfig onMessage={setMessage} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
