import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Building2, Plus, Edit, Save, X, CheckCircle, AlertCircle, 
  Users, Trash2, Loader2
} from "lucide-react";
import { createPageUrl } from "@/utils";

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState(null);
  const [formData, setFormData] = useState({ nome: "", cnpj: "", email_contato: "", plano: "free" });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const init = async () => {
      const user = await base44.auth.me();
      if (user.role !== "admin") {
        window.location.href = createPageUrl("Dashboard");
        return;
      }
      setCurrentUser(user);
      await loadEmpresas();
    };
    init();
  }, []);

  const loadEmpresas = async () => {
    setIsLoading(true);
    const data = await base44.entities.Empresa.list("-created_date");
    setEmpresas(data);
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      setMessage({ type: "error", text: "Nome da empresa é obrigatório." });
      return;
    }
    setIsSaving(true);
    if (editingEmpresa) {
      await base44.entities.Empresa.update(editingEmpresa.id, formData);
      setMessage({ type: "success", text: "Empresa atualizada!" });
    } else {
      await base44.entities.Empresa.create({ ...formData, ativa: true });
      setMessage({ type: "success", text: "Empresa criada com sucesso!" });
    }
    setShowForm(false);
    setEditingEmpresa(null);
    setFormData({ nome: "", cnpj: "", email_contato: "", plano: "free" });
    await loadEmpresas();
    setIsSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleEdit = (empresa) => {
    setEditingEmpresa(empresa);
    setFormData({ nome: empresa.nome, cnpj: empresa.cnpj || "", email_contato: empresa.email_contato || "", plano: empresa.plano || "free" });
    setShowForm(true);
  };

  const handleDelete = async (empresaId) => {
    if (!confirm("Tem certeza? Isso não remove os usuários vinculados.")) return;
    await base44.entities.Empresa.delete(empresaId);
    await loadEmpresas();
    setMessage({ type: "success", text: "Empresa removida." });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingEmpresa(null);
    setFormData({ nome: "", cnpj: "", email_contato: "", plano: "free" });
  };

  if (isLoading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="w-8 h-8" /> Gerenciar Empresas
          </h1>
          <p className="text-gray-600 mt-1">Cadastre e gerencie as empresas clientes do sistema.</p>
        </div>
        <Button onClick={() => { setEditingEmpresa(null); setFormData({ nome: "", cnpj: "", email_contato: "", plano: "free" }); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Nova Empresa
        </Button>
      </div>

      {message && (
        <Alert className={message.type === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          {message.type === "success" ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
          <AlertDescription className={message.type === "success" ? "text-green-800" : "text-red-800"}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {showForm && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle>{editingEmpresa ? "Editar Empresa" : "Nova Empresa"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Empresa *</Label>
                <Input value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: AeL Contabilidade" />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={formData.cnpj} onChange={e => setFormData({ ...formData, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-2">
                <Label>E-mail de Contato</Label>
                <Input value={formData.email_contato} onChange={e => setFormData({ ...formData, email_contato: e.target.value })} placeholder="contato@empresa.com" />
              </div>
              <div className="space-y-2">
                <Label>Plano</Label>
                <select
                  value={formData.plano}
                  onChange={e => setFormData({ ...formData, plano: e.target.value })}
                  className="w-full border rounded-md h-9 px-3 text-sm"
                >
                  <option value="free">Gratuito</option>
                  <option value="pro">PRO</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button variant="ghost" onClick={handleCancel}><X className="w-4 h-4 mr-1" /> Cancelar</Button>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {empresas.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-gray-500">Nenhuma empresa cadastrada. Crie a primeira empresa.</CardContent></Card>
        ) : (
          empresas.map(empresa => (
            <Card key={empresa.id} className={!empresa.ativa ? "opacity-60" : ""}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold">{empresa.nome}</p>
                    <p className="text-sm text-gray-500">{empresa.cnpj || "CNPJ não informado"} • {empresa.email_contato || "Sem e-mail"}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant={empresa.plano === "pro" ? "default" : "secondary"}>{empresa.plano?.toUpperCase()}</Badge>
                      <Badge variant={empresa.ativa ? "outline" : "secondary"} className={empresa.ativa ? "border-green-500 text-green-700" : ""}>
                        {empresa.ativa ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(empresa)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(empresa.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}