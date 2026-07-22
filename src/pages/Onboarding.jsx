import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, CheckCircle, Clock, Loader2 } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function OnboardingPage() {
  const [empresas, setEmpresas] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedEmpresa, setSelectedEmpresa] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [solicitado, setSolicitado] = useState(false);

  useEffect(() => {
    const init = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);

      // Se já tem empresa aprovada, redireciona
      if (user.empresa_id && user.empresa_status === "aprovado") {
        window.location.href = createPageUrl("Dashboard");
        return;
      }

      // Se já solicitou, mostra tela de espera
      if (user.empresa_status === "pendente" && user.empresa_solicitada) {
        setSolicitado(true);
        setIsLoading(false);
        return;
      }

      const data = await base44.entities.Empresa.filter({ ativa: true });
      setEmpresas(data);
      setIsLoading(false);
    };
    init();
  }, []);

  const handleSolicitar = async () => {
    if (!selectedEmpresa) return;
    setIsSaving(true);
    const empresa = empresas.find(e => e.id === selectedEmpresa);
    await base44.auth.updateMe({
      empresa_id: selectedEmpresa,
      empresa_solicitada: empresa?.nome,
      empresa_status: "pendente"
    });
    setSolicitado(true);
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Bem-vindo ao Sistema!</CardTitle>
          <p className="text-gray-600 text-sm mt-2">
            Para continuar, selecione sua empresa e aguarde a aprovação do administrador.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {solicitado ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <div>
                <p className="font-semibold text-lg">Solicitação enviada!</p>
                <p className="text-gray-600 text-sm mt-1">
                  Sua solicitação para <strong>{currentUser?.empresa_solicitada}</strong> está aguardando aprovação do administrador.
                </p>
                <p className="text-gray-500 text-xs mt-3">Entre em contato com o administrador para agilizar o processo.</p>
              </div>
              <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
                Verificar status
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <Label>Selecione sua Empresa *</Label>
                {empresas.length === 0 ? (
                  <Alert>
                    <AlertDescription>Nenhuma empresa cadastrada ainda. Entre em contato com o administrador.</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    {empresas.map(empresa => (
                      <div
                        key={empresa.id}
                        onClick={() => setSelectedEmpresa(empresa.id)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedEmpresa === empresa.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{empresa.nome}</p>
                            {empresa.cnpj && <p className="text-xs text-gray-500">{empresa.cnpj}</p>}
                          </div>
                          {selectedEmpresa === empresa.id && (
                            <CheckCircle className="w-5 h-5 text-blue-600 ml-auto" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleSolicitar}
                disabled={!selectedEmpresa || isSaving}
                className="w-full gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Solicitar Acesso
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}