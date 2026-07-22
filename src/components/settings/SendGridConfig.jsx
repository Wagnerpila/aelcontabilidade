
import React, { useState, useEffect } from "react";
import { SystemConfig } from "@/entities/SystemConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Mail, 
  Save, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertCircle,
  ShieldCheck
} from "lucide-react";
import { motion } from "framer-motion";

import { sendEmail } from "@/functions/sendEmail";

export default function SendGridConfig({ onMessage }) {
  const [config, setConfig] = useState({
    gmail_user: "",
    sendgrid_api_key: "",
    gmail_active: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const configs = await SystemConfig.filter({ config_type: "email" });
      const configObj = {};
      configs.forEach(c => {
        if (c.config_key === "gmail_active") {
          configObj[c.config_key] = c.config_value === "true";
        } else {
          configObj[c.config_key] = c.config_value;
        }
      });
      setConfig(prev => ({ ...prev, ...configObj }));
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const configsToSave = [
        { key: "gmail_user", value: config.gmail_user },
        { key: "sendgrid_api_key", value: config.sendgrid_api_key },
        { key: "gmail_active", value: config.gmail_active.toString() },
      ];

      const existingConfigs = await SystemConfig.filter({ config_type: "email" });

      for (const { key, value } of configsToSave) {
        const existing = existingConfigs.find(c => c.config_key === key);
        if (existing) {
          await SystemConfig.update(existing.id, { config_value: value });
        } else {
          await SystemConfig.create({
            config_key: key,
            config_value: value,
            config_type: "email",
            description: `Configuração ${key} do SendGrid`,
            is_active: true
          });
        }
      }

      onMessage?.({ type: "success", text: "Configurações do SendGrid salvas com sucesso!" });
    } catch (error) {
      onMessage?.({ type: "error", text: "Erro ao salvar configurações: " + error.message });
    }
    setIsSaving(false);
  };

  const handleTest = async () => {
    if (!config.gmail_user || !config.sendgrid_api_key) {
      onMessage?.({ type: "error", text: "Preencha o e-mail remetente e a API Key." });
      return;
    }
    setIsTesting(true);
    try {
      const { data } = await sendEmail({
        to: config.gmail_user,
        subject: "Teste de Configuração - A&L Contabilidade",
        body: `<h2>✅ Teste de Configuração</h2><p>Se você recebeu este e-mail, a integração com SendGrid está funcionando!</p>`
      });
      if (data.success) {
        onMessage?.({ type: "success", text: "E-mail de teste enviado com sucesso!" });
      } else {
        let errorMessage = "Erro no envio: " + (data.error || "Verifique a API Key e as configurações.");
        
        // Tratar erro específico de sender identity
        if (data.error && data.error.includes("verified Sender Identity")) {
          errorMessage = `❌ E-mail remetente não verificado no SendGrid!

📧 Você precisa verificar o e-mail "${config.gmail_user}" no SendGrid antes de enviar.

🔧 Como resolver:
1. Acesse: https://app.sendgrid.com/settings/sender_auth
2. Clique em "Single Sender Verification"
3. Adicione o e-mail: ${config.gmail_user}
4. Verifique o e-mail na caixa de entrada
5. Tente novamente após a verificação`;
        }
        
        onMessage?.({ type: "error", text: errorMessage });
      }
    } catch (error) {
      onMessage?.({ type: "error", text: "Erro ao testar envio: " + error.message });
    }
    setIsTesting(false);
  };

  if (isLoading) {
    return (
      <Card className="card-shadow"><CardContent className="p-6"><div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div></CardContent></Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card className="card-shadow">
        <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-blue-600" />Status da Integração</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="font-semibold">SendGrid API</p>
            <Badge className={config.gmail_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
              {config.gmail_active ? <CheckCircle className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
              {config.gmail_active ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      <Card className="card-shadow">
        <CardHeader><CardTitle>Configuração de Envio</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="gmail_user">E-mail Remetente * (Deve ser verificado no SendGrid)</Label>
            <Input id="gmail_user" type="email" value={config.gmail_user} onChange={(e) => setConfig({ ...config, gmail_user: e.target.value })} placeholder="seu-email-verificado@seudominio.com" />
            <p className="text-xs text-gray-500">⚠️ Este e-mail deve ser verificado no SendGrid antes do primeiro envio.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sendgrid_api_key">SendGrid API Key *</Label>
            <Input id="sendgrid_api_key" type="password" value={config.sendgrid_api_key} onChange={(e) => setConfig({ ...config, sendgrid_api_key: e.target.value })} placeholder="Cole a chave de API que começa com SG." />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="gmail_active" checked={config.gmail_active} onCheckedChange={(checked) => setConfig({ ...config, gmail_active: checked })} />
            <Label htmlFor="gmail_active" className="text-sm">Ativar envio de e-mails automáticos</Label>
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={handleSave} disabled={isSaving || !config.gmail_user || !config.sendgrid_api_key} className="gap-2 bg-blue-600 hover:bg-blue-700">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={isTesting || !config.gmail_active} className="gap-2">
              {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
              Testar Envio
            </Button>
          </div>
        </CardContent>
      </Card>

      <Alert variant="default" className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-800">⚠️ IMPORTANTE: Verificar E-mail Remetente</AlertTitle>
        <AlertDescription className="text-red-700">
          <strong>Antes do primeiro envio</strong>, você deve verificar o e-mail remetente no SendGrid:
          <br />
          <br />
          <strong>1.</strong> Acesse: <a href="https://app.sendgrid.com/settings/sender_auth" target="_blank" rel="noopener noreferrer" className="font-bold underline">SendGrid → Sender Authentication</a>
          <br />
          <strong>2.</strong> Clique em "Single Sender Verification"
          <br />
          <strong>3.</strong> Adicione seu e-mail: <strong>{config.gmail_user || "seu@email.com"}</strong>
          <br />
          <strong>4.</strong> Confirme no e-mail recebido
          <br />
          <strong>5.</strong> Teste o envio novamente
        </AlertDescription>
      </Alert>

      <Alert variant="default" className="border-blue-200 bg-blue-50">
        <ShieldCheck className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">Como evitar a caixa de Spam?</AlertTitle>
        <AlertDescription className="text-blue-700">
          Para garantir que seus e-mails sejam entregues na caixa de entrada, é <strong>essencial</strong> autenticar seu domínio de envio no SendGrid. Isso envolve adicionar registros (CNAME) no painel de controle do seu domínio (ex: GoDaddy, HostGator).
          <br />
          <a href="https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication" target="_blank" rel="noopener noreferrer" className="font-bold underline mt-2 inline-block">
            Siga o guia oficial do SendGrid para autenticar seu domínio.
          </a>
        </AlertDescription>
      </Alert>
    </motion.div>
  );
}
