import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Cliente } from "@/entities/Cliente";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Send,
  Users,
  CheckCircle,
  AlertCircle,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { enviarMensagem } from "@/functions/enviarMensagem";
import { enviarMensagemWhatsApp } from "@/functions/enviarMensagemWhatsApp";

const TEMPLATES = [
  {
    label: "Lembrete de Pagamento",
    assunto: "Lembrete: Pendência financeira - {{nome}}",
    corpo: `Olá, {{nome}}!

Gostaríamos de lembrá-lo(a) que identificamos uma pendência financeira em seu cadastro.

Por favor, entre em contato conosco para regularizar sua situação e evitar possíveis transtornos.

Estamos à disposição para qualquer dúvida.

Atenciosamente,
Equipe Contábil`,
  },
  {
    label: "Vencimento DAS/MEI",
    assunto: "Atenção: DAS/MEI com vencimento próximo - {{nome}}",
    corpo: `Prezado(a) {{nome}},

Informamos que sua guia DAS/MEI está com vencimento próximo.

Para evitar multas e juros, efetue o pagamento até a data de vencimento.

Caso precise de auxílio, entre em contato conosco.

Atenciosamente,
Equipe Contábil`,
  },
  {
    label: "Documentação Pendente",
    assunto: "Documentação pendente - {{nome}}",
    corpo: `Olá, {{nome}}!

Verificamos que existem documentos pendentes de entrega em seu processo.

Solicitamos que providencie o envio o mais breve possível para não comprometer seus processos.

Agradecemos a atenção.

Atenciosamente,
Equipe Contábil`,
  },
  {
    label: "Mensagem Personalizada",
    assunto: "",
    corpo: "",
  },
];

export default function MensagensPage() {
  const [clientes, setClientes] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [showClienteList, setShowClienteList] = useState(true);

  const [assunto, setAssunto] = useState("");
  const [corpo, setCorpo] = useState("");
  const [templateSelecionado, setTemplateSelecionado] = useState(0);
  const [canal, setCanal] = useState("email"); // "email", "whatsapp", "ambos"

  useEffect(() => {
    const init = async () => {
      const user = await User.me();
      setCurrentUser(user);
      if (user) {
        const data = await Cliente.filter({ user_id: user.id, ativo: true }, "-nome");
        setClientes(data);
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const handleTemplateSelect = (idx) => {
    setTemplateSelecionado(idx);
    setAssunto(TEMPLATES[idx].assunto);
    setCorpo(TEMPLATES[idx].corpo);
  };

  const filteredClientes = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.cpf_cnpj && c.cpf_cnpj.includes(searchTerm))
  );

  const handleToggle = (id) => {
    const novo = new Set(selectedIds);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    setSelectedIds(novo);
    setSelectAll(novo.size === filteredClientes.length && filteredClientes.length > 0);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(filteredClientes.map((c) => c.id)));
      setSelectAll(true);
    }
  };

  const handleEnviar = async () => {
    if (!corpo.trim()) {
      setMessage({ type: "error", text: "Preencha a mensagem antes de enviar." });
      return;
    }
    if ((canal === "email" || canal === "ambos") && !assunto.trim()) {
      setMessage({ type: "error", text: "Preencha o assunto para envio por e-mail." });
      return;
    }

    const destinatarios = selectedIds.size > 0 ? Array.from(selectedIds) : [];

    setIsSending(true);
    setMessage(null);
    try {
      const resultados = [];

      if (canal === "email" || canal === "ambos") {
        const res = await enviarMensagem({ cliente_ids: destinatarios, assunto, mensagem: corpo });
        resultados.push(`📧 E-mail: ${res.data.enviados} enviado(s)`);
        if (res.data.erros?.length > 0) {
          resultados.push(`Falhas e-mail: ${res.data.erros.map(e => e.cliente).join(", ")}`);
        }
      }

      if (canal === "whatsapp" || canal === "ambos") {
        const res = await enviarMensagemWhatsApp({ cliente_ids: destinatarios, mensagem: corpo });
        resultados.push(`📱 WhatsApp: ${res.data.enviados} enviado(s)`);
        if (res.data.sem_telefone > 0) {
          resultados.push(`${res.data.sem_telefone} cliente(s) sem telefone ignorado(s)`);
        }
        if (res.data.erros?.length > 0) {
          resultados.push(`Falhas WhatsApp: ${res.data.erros.map(e => e.cliente).join(", ")}`);
        }
      }

      setMessage({ type: "success", text: resultados.join(" | ") });
    } catch (err) {
      setMessage({ type: "error", text: "Erro ao enviar: " + err.message });
    }
    setIsSending(false);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><p>Carregando...</p></div>;
  }

  const totalSelecionados = selectedIds.size > 0 ? selectedIds.size : clientes.filter(c => c.ativo).length;

  return (
    <div className="p-6 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Mail className="w-8 h-8 text-blue-600" />
            Envio de Mensagens
          </h1>
          <p className="text-gray-600">Envie lembretes e comunicados personalizados para seus clientes por e-mail.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna esquerda: seleção de clientes */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Destinatários
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{totalSelecionados} selecionado(s)</Badge>
                    <Button variant="ghost" size="icon" onClick={() => setShowClienteList(!showClienteList)}>
                      {showClienteList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {showClienteList && (
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-500">
                    Selecione clientes específicos ou deixe em branco para enviar a todos os clientes ativos.
                  </p>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar cliente..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="flex items-center gap-2 border-b pb-2">
                    <Checkbox
                      id="select-all"
                      checked={selectAll}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label htmlFor="select-all" className="cursor-pointer font-medium text-sm">
                      Selecionar todos ({filteredClientes.length})
                    </Label>
                    {selectedIds.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto text-xs text-gray-500"
                        onClick={() => { setSelectedIds(new Set()); setSelectAll(false); }}
                      >
                        <X className="w-3 h-3 mr-1" /> Limpar
                      </Button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                    {filteredClientes.map((cliente) => (
                      <div
                        key={cliente.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedIds.has(cliente.id) ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                        onClick={() => handleToggle(cliente.id)}
                      >
                        <Checkbox
                          checked={selectedIds.has(cliente.id)}
                          onCheckedChange={() => handleToggle(cliente.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{cliente.nome}</p>
                          <p className="text-xs text-gray-500 truncate">{cliente.email}</p>
                        </div>
                      </div>
                    ))}
                    {filteredClientes.length === 0 && (
                      <p className="text-center text-gray-400 py-4 text-sm">Nenhum cliente encontrado.</p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          </motion.div>

          {/* Coluna direita: compose */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  Compor Mensagem
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Canal de envio */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Canal de Envio</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={canal === "email" ? "default" : "outline"}
                      onClick={() => setCanal("email")}
                      className="gap-1 text-xs"
                    >
                      <Mail className="w-3 h-3" /> E-mail
                    </Button>
                    <Button
                      size="sm"
                      variant={canal === "whatsapp" ? "default" : "outline"}
                      onClick={() => setCanal("whatsapp")}
                      className="gap-1 text-xs"
                    >
                      <MessageCircle className="w-3 h-3" /> WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      variant={canal === "ambos" ? "default" : "outline"}
                      onClick={() => setCanal("ambos")}
                      className="gap-1 text-xs"
                    >
                      <Send className="w-3 h-3" /> Ambos
                    </Button>
                  </div>
                  {canal === "whatsapp" && (
                    <p className="text-xs text-amber-600 mt-1">⚠️ Requer n8n configurado em Configurações. Apenas clientes com telefone cadastrado receberão.</p>
                  )}
                  {canal === "ambos" && (
                    <p className="text-xs text-blue-600 mt-1">Será enviado por e-mail e WhatsApp simultaneamente.</p>
                  )}
                </div>

                {/* Templates */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Modelos prontos</Label>
                  <div className="flex flex-wrap gap-2">
                    {TEMPLATES.map((t, i) => (
                      <Button
                        key={i}
                        size="sm"
                        variant={templateSelecionado === i ? "default" : "outline"}
                        onClick={() => handleTemplateSelect(i)}
                        className="text-xs"
                      >
                        {t.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Assunto - só aparece para email */}
                {(canal === "email" || canal === "ambos") && (
                  <div>
                    <Label htmlFor="assunto" className="text-sm font-medium">Assunto do E-mail</Label>
                    <Input
                      id="assunto"
                      value={assunto}
                      onChange={(e) => setAssunto(e.target.value)}
                      placeholder="Ex: Lembrete de pagamento"
                      className="mt-1"
                    />
                  </div>
                )}

                {/* Corpo */}
                <div>
                  <Label htmlFor="corpo" className="text-sm font-medium">Mensagem</Label>
                  <textarea
                    id="corpo"
                    value={corpo}
                    onChange={(e) => setCorpo(e.target.value)}
                    placeholder="Digite sua mensagem aqui... Use {{nome}} para personalizar com o nome do cliente."
                    rows={10}
                    className="mt-1 w-full border border-gray-200 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Variáveis disponíveis: <code>{"{{nome}}"}</code>, <code>{"{{cpf_cnpj}}"}</code>, <code>{"{{email}}"}</code>
                  </p>
                </div>

                {/* Alert */}
                <AnimatePresence>
                  {message && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Alert
                        className={
                          message.type === "success"
                            ? "border-green-200 bg-green-50 text-green-800"
                            : message.type === "warning"
                            ? "border-yellow-200 bg-yellow-50 text-yellow-800"
                            : "border-red-200 bg-red-50 text-red-800"
                        }
                      >
                        {message.type === "success" ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        <AlertDescription>{message.text}</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Botão enviar */}
                <Button
                  onClick={handleEnviar}
                  disabled={isSending}
                  className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4" />
                  {isSending
                    ? "Enviando..."
                    : `Enviar para ${selectedIds.size > 0 ? selectedIds.size : "todos os"} cliente(s)`}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}