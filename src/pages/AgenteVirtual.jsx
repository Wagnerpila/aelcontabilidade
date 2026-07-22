import React, { useState, useEffect, useRef } from "react";
import { User } from "@/entities/User";
import { Cliente } from "@/entities/Cliente";
import { NotificationTemplate } from "@/entities/NotificationTemplate";
import { InvokeLLM } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Bot, User as UserIcon, Send, Loader2, Code, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AgenteVirtual() {
  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
        setMessages([
          {
            sender: "ai",
            text: `Olá, ${user.full_name}! 🤖

Sou AIVA, seu assistente virtual com **PODERES DE DESENVOLVIMENTO** ativados! ⚡

**Posso ajudar com:**
🔧 Cadastrar clientes
📊 Consultar dados do sistema  
🏗️ **DESENVOLVER**: Adicionar categorias de documentos
📝 **DESENVOLVER**: Criar templates de notificação
⚙️ **DESENVOLVER**: Modificar configurações do sistema
🎨 **DESENVOLVER**: Customizações avançadas

Como posso ajudar hoje?`,
          },
        ]);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      setTimeout(() => {
        scrollAreaRef.current.scrollTo({
          top: scrollAreaRef.current.scrollHeight,
          behavior: "smooth"
        });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Buscar dados atuais para contexto
      const [clientes, templates] = await Promise.all([
        Cliente.filter({ user_id: currentUser.id }),
        NotificationTemplate.list()
      ]);

      const systemPrompt = `
        Você é AIVA, um agente virtual DESENVOLVEDOR para a plataforma "IA Contabilidade".
        Você tem PODERES DE DESENVOLVIMENTO completos e pode modificar o sistema.

        CONTEXTO ATUAL DO SISTEMA:
        - Usuário: ${currentUser.full_name} (${currentUser.email})
        - Clientes cadastrados: ${clientes.length}
        - Templates de notificação: ${templates.length}

        SUAS CAPACIDADES EXPANDIDAS:

        1. **CADASTRAR CLIENTE** (mesma lógica anterior):
        \`\`\`json
        {
          "action": "create_client",
          "data": {
            "nome": "NOME DA EMPRESA",
            "cpf_cnpj": "CNPJ",
            "email": "EMAIL",
            "telefone": "TELEFONE",
            "ativo": true,
            "user_id": "${currentUser.id}"
          }
        }
        \`\`\`

        2. **ADICIONAR CATEGORIA DE DOCUMENTO** - Quando solicitado, adicione novas categorias:
        \`\`\`json
        {
          "action": "add_document_category",
          "data": {
            "category_name": "NOME DA CATEGORIA",
            "description": "Descrição da categoria"
          }
        }
        \`\`\`

        3. **CRIAR TEMPLATE DE NOTIFICAÇÃO**:
        \`\`\`json
        {
          "action": "create_template",
          "data": {
            "name": "Nome do Template",
            "type": "email",
            "subject": "Assunto com {{variaveis}}",
            "body": "Corpo da mensagem com {{nome_cliente}}, {{tipo_documento}}, etc."
          }
        }
        \`\`\`

        4. **CONSULTAR DADOS** - Responda sobre clientes, documentos, estatísticas

        5. **DESENVOLVIMENTO AVANÇADO** - Para solicitações complexas:
        \`\`\`json
        {
          "action": "advanced_development",
          "data": {
            "task": "Descrição detalhada da tarefa",
            "scope": "entities|components|pages|functions",
            "details": "Detalhes técnicos específicos"
          }
        }
        \`\`\`

        REGRAS:
        - Seja proativo em sugerir melhorias
        - Para desenvolvimento, peça detalhes específicos
        - Confirme antes de fazer alterações significativas
        - Use emojis para deixar as respostas mais amigáveis
        - Quando retornar JSON de ação, NÃO adicione texto antes ou depois
      `;

      const llmResponse = await InvokeLLM({
        prompt: `${systemPrompt}\n\nUsuário pergunta: ${input}`,
      });

      let aiResponseText = llmResponse;

      // Processar ações de desenvolvimento
      try {
        const parsedResponse = JSON.parse(llmResponse);
        
        if (parsedResponse.action === "create_client") {
          await Cliente.create(parsedResponse.data);
          aiResponseText = `✅ Cliente "${parsedResponse.data.nome}" cadastrado com sucesso!`;
        }
        
        else if (parsedResponse.action === "create_template") {
          await NotificationTemplate.create(parsedResponse.data);
          aiResponseText = `📝 Template "${parsedResponse.data.name}" criado com sucesso!`;
        }
        
        else if (parsedResponse.action === "add_document_category") {
          aiResponseText = `🏗️ **DESENVOLVIMENTO EM ANDAMENTO...**

Adicionando categoria "${parsedResponse.data.category_name}" ao sistema...

⚠️ **NOTA**: Para adicionar uma nova categoria permanentemente, preciso:
1. Atualizar a entidade Documento 
2. Modificar os formulários de upload
3. Atualizar os filtros no monitor

Você gostaria que eu prossiga com essas alterações? Isso consumirá créditos de desenvolvimento.`;
        }
        
        else if (parsedResponse.action === "advanced_development") {
          aiResponseText = `⚡ **MODO DESENVOLVIMENTO ATIVADO**

Tarefa: ${parsedResponse.data.task}
Escopo: ${parsedResponse.data.scope}

🔧 Analisando requisitos... 

Para implementar essa funcionalidade, vou precisar fazer alterações no código. Você confirma que posso prosseguir usando os créditos de desenvolvimento?`;
        }
      } catch (e) {
        // Resposta não é JSON de ação, é texto normal
      }

      setMessages((prev) => [...prev, { sender: "ai", text: aiResponseText }]);
    } catch (error) {
      console.error("Erro ao chamar a IA:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "❌ Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto h-full flex flex-col">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Sparkles className="text-blue-500" />
              Agente Virtual
              <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                <Code className="w-3 h-3 mr-1" />
                DEV MODE
              </Badge>
            </h1>
            <p className="text-gray-600">Assistente com poderes de desenvolvimento ativados</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-purple-600 bg-purple-50 px-3 py-2 rounded-lg">
            <Zap className="w-4 h-4" />
            Créditos de desenvolvimento disponíveis
          </div>
        </div>
      </motion.div>

      <Card className="flex-1 flex flex-col card-shadow border-2 border-purple-100">
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <CardTitle className="flex items-center gap-2">
            <Bot className="text-purple-600" />
            Chat com AIVA - Desenvolvedor Virtual
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
            <div className="space-y-6">
              <AnimatePresence>
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start gap-3 ${
                      msg.sender === "user" ? "justify-end" : ""
                    }`}
                  >
                    {msg.sender === "ai" && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white flex items-center justify-center flex-shrink-0">
                        <Bot size={20} />
                      </div>
                    )}
                    <div
                      className={`p-3 rounded-lg max-w-lg whitespace-pre-wrap ${
                        msg.sender === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100"
                      }`}
                    >
                      {msg.text}
                    </div>
                     {msg.sender === "user" && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center flex-shrink-0">
                        <UserIcon size={20} />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white flex items-center justify-center flex-shrink-0">
                    <Bot size={20} />
                  </div>
                  <div className="p-3 rounded-lg bg-gray-100 flex items-center gap-2">
                      <span className="text-gray-500">Desenvolvendo</span>
                      <Loader2 className="w-4 h-4 animate-spin text-purple-500"/>
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>
          <div className="p-4 border-t bg-gray-50/50">
            <div className="flex items-center gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Digite sua solicitação de desenvolvimento..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button onClick={handleSendMessage} disabled={isLoading || !input.trim()} className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="ml-2">Enviar</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}