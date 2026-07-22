import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, Save, Edit, X, CheckCircle, AlertCircle, Users, 
  Building2, Clock, UserCheck, UserX, Loader2
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const user = await base44.auth.me();
      if (user.role !== "admin") {
        window.location.href = createPageUrl("Dashboard");
        return;
      }
      setCurrentUser(user);
      await loadAll();
    };
    checkAdmin();
  }, []);

  const loadAll = async () => {
    setIsLoading(true);
    const [allUsers, allEmpresas] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.Empresa.list(),
    ]);
    setUsers(allUsers);
    setEmpresas(allEmpresas);
    setIsLoading(false);
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleUpdateUser = async (userId, data) => {
    await base44.entities.User.update(userId, data);
    setEditingUser(null);
    await loadAll();
    showMessage("success", "Usuário atualizado com sucesso!");
  };

  const handleAprovar = async (user) => {
    await base44.entities.User.update(user.id, { empresa_status: "aprovado" });
    await loadAll();
    showMessage("success", `${user.full_name} aprovado para ${user.empresa_solicitada}!`);
  };

  const handleRejeitar = async (user) => {
    await base44.entities.User.update(user.id, { empresa_status: "rejeitado", empresa_id: null });
    await loadAll();
    showMessage("success", `Solicitação de ${user.full_name} rejeitada.`);
  };

  const pendentes = users.filter(u => u.empresa_status === "pendente" && u.empresa_id);

  const UserEditForm = ({ user, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
      plan: user.plan || "free",
      empresa_id: user.empresa_id || "",
      empresa_status: user.empresa_status || "pendente",
    });

    return (
      <Card className="mt-4 p-4 space-y-4 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Plano</Label>
            <Select value={formData.plan} onValueChange={val => setFormData({ ...formData, plan: val })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Gratuito</SelectItem>
                <SelectItem value="pro">PRO</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Select value={formData.empresa_id} onValueChange={val => setFormData({ ...formData, empresa_id: val })}>
              <SelectTrigger><SelectValue placeholder="Selecionar empresa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Sem empresa</SelectItem>
                {empresas.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.empresa_status} onValueChange={val => setFormData({ ...formData, empresa_status: val })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}><X className="w-4 h-4 mr-1" /> Cancelar</Button>
          <Button size="sm" onClick={() => onSave(user.id, formData)}><Save className="w-4 h-4 mr-1" /> Salvar</Button>
        </div>
      </Card>
    );
  };

  if (isLoading || !currentUser) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Shield className="w-8 h-8" /> Painel do Administrador
      </h1>

      {message && (
        <Alert className={message.type === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          {message.type === "success" ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
          <AlertDescription className={message.type === "success" ? "text-green-800" : "text-red-800"}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue={pendentes.length > 0 ? "pendentes" : "usuarios"}>
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="pendentes" className="relative">
            Pendentes
            {pendentes.length > 0 && (
              <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5">{pendentes.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="empresas">Empresas</TabsTrigger>
        </TabsList>

        {/* Pendentes */}
        <TabsContent value="pendentes" className="space-y-3 mt-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" /> Solicitações Pendentes
          </h2>
          {pendentes.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-gray-500">Nenhuma solicitação pendente.</CardContent></Card>
          ) : (
            pendentes.map(user => (
              <Card key={user.id} className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-semibold">{user.full_name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Solicitou acesso para: <strong>{user.empresa_solicitada}</strong>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-2" onClick={() => handleAprovar(user)}>
                      <UserCheck className="w-4 h-4" /> Aprovar
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-2" onClick={() => handleRejeitar(user)}>
                      <UserX className="w-4 h-4" /> Rejeitar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Usuários */}
        <TabsContent value="usuarios" className="space-y-3 mt-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Users className="w-5 h-5" /> Todos os Usuários ({users.length})
          </h2>
          {users.map(user => {
            const empresa = empresas.find(e => e.id === user.empresa_id);
            return (
              <div key={user.id} className="p-4 border rounded-lg bg-white">
                <div className="flex justify-between items-start flex-wrap gap-3">
                  <div>
                    <p className="font-semibold">{user.full_name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant={user.plan === "pro" ? "default" : "secondary"}>{user.plan || "free"}</Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {empresa?.nome || "Sem empresa"}
                      </Badge>
                      {user.empresa_status && (
                        <Badge className={
                          user.empresa_status === "aprovado" ? "bg-green-100 text-green-800" :
                          user.empresa_status === "pendente" ? "bg-yellow-100 text-yellow-800" :
                          "bg-red-100 text-red-800"
                        }>
                          {user.empresa_status}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setEditingUser(editingUser?.id === user.id ? null : user)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
                {editingUser?.id === user.id && (
                  <UserEditForm user={editingUser} onSave={handleUpdateUser} onCancel={() => setEditingUser(null)} />
                )}
              </div>
            );
          })}
        </TabsContent>

        {/* Empresas (resumo) */}
        <TabsContent value="empresas" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5" /> Empresas ({empresas.length})
            </h2>
            <Button onClick={() => window.location.href = createPageUrl("Empresas")} variant="outline" size="sm" className="gap-2">
              <Building2 className="w-4 h-4" /> Gerenciar Empresas
            </Button>
          </div>
          {empresas.map(empresa => {
            const membros = users.filter(u => u.empresa_id === empresa.id && u.empresa_status === "aprovado");
            return (
              <Card key={empresa.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{empresa.nome}</p>
                    <p className="text-sm text-gray-500">{empresa.cnpj || "CNPJ não informado"}</p>
                    <Badge variant="outline" className="mt-1">{membros.length} usuário(s) aprovado(s)</Badge>
                  </div>
                  <Badge variant={empresa.plano === "pro" ? "default" : "secondary"}>{empresa.plano?.toUpperCase()}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}