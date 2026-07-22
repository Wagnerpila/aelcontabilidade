import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Workflow, 
  Save, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Loader2,
  ExternalLink
} from "lucide-react";
import { motion } from "framer-motion";

export default function N8nConfig({ onMessage }) {
  const [config, setConfig] = useState({
    n8n_webhook_documentos: "",
    n8n_ativo: false,
    n8n_webhook_mensagens: "",
  });
  const [empresa, setEmpresa] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const user = await base44.auth.me();
      let emp = null;

      if (user.empresa_id) {
        // Usuário vinculado a uma empresa
        emp = await base44.entities.Empresa.get(user.empresa_id);
      } else if (user.role === 'admin') {
        // Admin sem empresa_id: pega a primeira empresa cadastrada
        const empresas = await base44.entities.Empresa.list();
        if (empresas.length > 0) emp = empresas[0];
      }

      if (emp) {
        setEmpresa(emp);
        setConfig({
          n8n_webhook_documentos: emp.n8n_webhook_documentos || "",
          n8n_ativo: emp.n8n_ativo || false,
          n8n_webhook_mensagens: emp.n8n_webhook_mensagens || "",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!empresa) {
      onMessage?.({ type: "error", text: "Você precisa estar vinculado a uma empresa para salvar configurações." });
      return;
    }
    setIsSaving(true);
    try {
      await base44.entities.Empresa.update(empresa.id, {
        n8n_webhook_documentos: config.n8n_webhook_documentos,
        n8n_ativo: config.n8n_ativo,
        n8n_webhook_mensagens: config.n8n_webhook_mensagens,
      });
      onMessage?.({ type: "success", text: "Configurações do n8n salvas com sucesso!" });
    } catch (error) {
      onMessage?.({ type: "error", text: "Erro ao salvar configurações: " + error.message });
    }
    setIsSaving(false);
  };

  const handleTest = async () => {
    if (!config.n8n_webhook_documentos) {
      onMessage?.({ type: "error", text: "Preencha a URL do webhook do n8n." });
      return;
    }

    // Validar formato da URL
    try {
      const url = new URL(config.n8n_webhook_documentos);
      if (!url.protocol.startsWith('http')) {
        onMessage?.({ type: "error", text: "URL inválida. Deve começar com http:// ou https://" });
        return;
      }
    } catch (e) {
      onMessage?.({ type: "error", text: "URL inválida. Verifique o formato." });
      return;
    }

    setIsTesting(true);
    try {
      console.log('🧪 Testando webhook:', config.n8n_webhook_url);

      const testPayload = {
        cliente: {
          nome: "Cliente Teste",
          telefone: "5511999999999",
          email: "teste@teste.com"
        },
        documento: {
          tipo: "DAS",
          data: "19/09/2025",
          arquivo_url: "https://example.com/teste.pdf",
          nome_arquivo: "teste.pdf"
        },
        mensagem: {
          texto: "🧪 **TESTE DE INTEGRAÇÃO n8n**\n\nSe você recebeu esta mensagem, a integração está funcionando!",
          tipo_envio: "unico"
        },
        app: {
          nome: "A&L Contabilidade - TESTE",
          user_email: "admin@contabilidade.com"
        }
      };

      console.log('📤 Enviando payload de teste:', JSON.stringify(testPayload, null, 2));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

      const response = await fetch(config.n8n_webhook_documentos, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal,
        mode: 'cors'
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const responseData = await response.json().catch(() => ({}));
        console.log('✅ Resposta do webhook:', responseData);
        onMessage?.({ 
          type: "success", 
          text: "✅ Webhook testado com sucesso! Verifique se recebeu a mensagem de teste no WhatsApp." 
        });
      } else {
        const errorText = await response.text().catch(() => 'Sem detalhes');
        console.error('❌ Erro HTTP:', response.status, errorText);
        onMessage?.({ 
          type: "error", 
          text: `❌ Erro HTTP ${response.status}: ${errorText.substring(0, 200)}` 
        });
      }

    } catch (fetchError) {
      console.error('❌ Erro ao testar webhook:', fetchError);
      
      let errorMessage = "❌ Erro ao conectar com o webhook:\n\n";
      
      if (fetchError.name === 'AbortError') {
        errorMessage += "⏱️ **Timeout (15s)**\n\nO webhook não respondeu a tempo.\n\n" +
                       "**Soluções:**\n" +
                       "• Verifique se o workflow está ATIVO no n8n\n" +
                       "• Teste a URL no navegador\n" +
                       "• Verifique se o servidor n8n está online";
      } else if (fetchError.message.includes('Failed to fetch')) {
        errorMessage += "🔴 **Falha ao conectar (Failed to fetch)**\n\n" +
                       "**Causas mais comuns:**\n\n" +
                       "1. ⚠️ **Workflow não está ATIVO no n8n**\n" +
                       "   → Abra o workflow e clique no toggle para ativar\n\n" +
                       "2. 🌐 **Problema de CORS**\n" +
                       "   → No n8n: Settings → Enable CORS\n\n" +
                       "3. 🔗 **URL incorreta**\n" +
                       "   → Copie a URL correta do webhook node\n\n" +
                       "4. 🔒 **n8n self-hosted sem HTTPS**\n" +
                       "   → Use ngrok ou configure certificado SSL\n\n" +
                       "5. 🛡️ **Firewall/Rede bloqueando**\n" +
                       "   → Tente de outra rede\n\n" +
                       `**URL testada:** ${config.n8n_webhook_documentos}`;
      } else {
        errorMessage += fetchError.message;
      }
      
      onMessage?.({ type: "error", text: errorMessage });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="card-shadow"><CardContent className="p-6"><div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div></CardContent></Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card className="card-shadow">
        <CardHeader><CardTitle className="flex items-center gap-2"><Workflow className="w-5 h-5 text-blue-600" />Status da Integração n8n</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="font-semibold">Automação n8n (WhatsApp) {empresa && <span className="text-sm text-gray-500">— {empresa.nome}</span>}</p>
            <Badge className={config.n8n_ativo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
              {config.n8n_ativo ? <CheckCircle className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
              {config.n8n_ativo ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      <Card className="card-shadow">
        <CardHeader><CardTitle>Webhook — Envio de Documentos</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-gray-500">Usado no envio automático de documentos processados via WhatsApp.</p>
          <div className="space-y-2">
            <Label htmlFor="n8n_webhook_documentos">URL do Webhook n8n *</Label>
            <Input 
              id="n8n_webhook_documentos" 
              type="url" 
              value={config.n8n_webhook_documentos} 
              onChange={(e) => setConfig({ ...config, n8n_webhook_documentos: e.target.value })} 
              placeholder="https://seu-n8n.com/webhook/whatsapp" 
            />
            <p className="text-xs text-gray-500">Cole aqui a URL do webhook gerada no n8n</p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="n8n_ativo" 
              checked={config.n8n_ativo} 
              onCheckedChange={(checked) => setConfig({ ...config, n8n_ativo: checked })} 
            />
            <Label htmlFor="n8n_ativo" className="text-sm">
              Ativar envio automático de WhatsApp via n8n após processar documentos
            </Label>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={handleSave} disabled={isSaving || !config.n8n_webhook_documentos} className="gap-2 bg-blue-600 hover:bg-blue-700">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={isTesting || !config.n8n_webhook_documentos} className="gap-2">
              {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
              Testar Webhook
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="card-shadow border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-green-600" />
            Webhook — Mensagens Personalizadas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-gray-500">Usado na página "Envio de Mensagens" para disparar mensagens personalizadas via WhatsApp.</p>
          <div className="space-y-2">
            <Label htmlFor="n8n_webhook_mensagens">URL do Webhook — Mensagens Personalizadas</Label>
            <Input 
              id="n8n_webhook_mensagens" 
              type="url" 
              value={config.n8n_webhook_mensagens} 
              onChange={(e) => setConfig({ ...config, n8n_webhook_mensagens: e.target.value })} 
              placeholder="https://seu-n8n.com/webhook/mensagem-personalizada" 
            />
            <p className="text-xs text-gray-500">Fluxo separado no n8n para envio de mensagens livres (lembretes, avisos, etc.)</p>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-green-600 hover:bg-green-700">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Alert variant="default" className="border-blue-200 bg-blue-50">
        <Workflow className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">📘 Configuração n8n - Sistema Inteligente de Fila</AlertTitle>
        <AlertDescription className="text-blue-700 space-y-2">
          <p><strong>✅ O sistema agora envia de forma inteligente!</strong></p>
          <br />
          
          <p><strong>📱 Caso 1: DOCUMENTO ÚNICO</strong></p>
          <p className="ml-4">• Payload contém: <code>tipo_envio: "unico"</code></p>
          <p className="ml-4">• Configure n8n para enviar: mensagem + arquivo juntos</p>
          <br />
          
          <p><strong>📦 Caso 2: MÚLTIPLOS DOCUMENTOS</strong></p>
          <p className="ml-4">• <strong>1ª chamada:</strong> <code>tipo_envio: "multiplos_inicial"</code></p>
          <p className="ml-6">→ Enviar apenas mensagem de texto com lista completa</p>
          <p className="ml-4">• <strong>Chamadas seguintes:</strong> <code>tipo_envio: "multiplos_arquivo"</code></p>
          <p className="ml-6">→ Enviar mensagem resumida + arquivo PDF</p>
          <br />
          
          <p><strong>🎯 Configure o n8n assim:</strong></p>
          <p className="ml-4">1. Webhook recebe payload</p>
          <p className="ml-4">2. IF: <code>{`{{ $json.mensagem.tipo_envio == "multiplos_inicial" }}`}</code></p>
          <p className="ml-6">→ TRUE: Evolution API (só texto)</p>
          <p className="ml-6">→ FALSE: Evolution API (texto + arquivo)</p>
          
          <a href="https://docs.n8n.io/" target="_blank" rel="noopener noreferrer" className="font-bold underline inline-flex items-center gap-1 mt-2">
            Ver documentação do n8n <ExternalLink className="w-3 h-3" />
          </a>
        </AlertDescription>
      </Alert>
    </motion.div>
  );
}