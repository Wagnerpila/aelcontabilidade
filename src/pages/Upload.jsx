
import React, { useState, useEffect } from "react";
import { Documento } from "@/entities/Documento";
import { Cliente } from "@/entities/Cliente";
import { Empresa } from "@/entities/Empresa";
import { User } from "@/entities/User";
import { UploadFile, ExtractDataFromUploadedFile, InvokeLLM } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";

import FileUploadZone from "../components/upload/FileUploadZone";
import ProcessingResults from "../components/upload/ProcessingResults";

const FREE_PLAN_LIMIT = 10;

export default function UploadPage() {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [limitReached, setLimitReached] = useState(false);
  const [processedDocuments, setProcessedDocuments] = useState({}); // Novo estado

  useEffect(() => {
    const init = async () => {
      const user = await User.me();
      setCurrentUser(user);
      if (user.plan === 'free') {
        const docs = await Documento.filter({ user_id: user.id });
        if (docs.length >= FREE_PLAN_LIMIT) {
          setLimitReached(true);
        }
      }
    };
    init();
  }, []);
  
  const normalizeCNPJ = (cnpj) => {
    if (!cnpj) return null;
    const numbersOnly = cnpj.replace(/\D/g, '');
    return numbersOnly.substring(0, 8);
  };

  // Função para normalizar telefone para formato internacional (5542991153552)
  const normalizeTelefone = (telefone) => {
    if (!telefone) return null;
    
    // Remove todos os caracteres não numéricos
    let numbersOnly = telefone.replace(/\D/g, '');
    
    console.log(`📞 Normalizando telefone: "${telefone}" → "${numbersOnly}"`);
    
    // Se já começa com 55, verificar se está no formato correto
    if (numbersOnly.startsWith('55')) {
      // Formato esperado: 55 + DDD (2 dígitos) + número (8 ou 9 dígitos)
      // Total: 12 ou 13 dígitos
      if (numbersOnly.length === 12 || numbersOnly.length === 13) {
        console.log(`✅ Telefone já no formato internacional: ${numbersOnly}`);
        return numbersOnly;
      }
      
      // Se tiver mais que 13 dígitos, pode ter múltiplos "55"
      if (numbersOnly.length > 13) {
        console.log(`⚠️ Telefone com múltiplos "55", corrigindo...`);
        // Remove o primeiro "55" e tenta novamente
        numbersOnly = numbersOnly.substring(2);
      }
    }
    
    // Se não começa com 55, adicionar código do país
    if (!numbersOnly.startsWith('55')) {
      // Verificar se tem DDD + número (10 ou 11 dígitos)
      if (numbersOnly.length === 10 || numbersOnly.length === 11) {
        numbersOnly = '55' + numbersOnly;
        console.log(`✅ Adicionado código do país 55: ${numbersOnly}`);
      } else if (numbersOnly.length === 8 || numbersOnly.length === 9) {
        console.log(`⚠️ Telefone sem DDD, não é possível processar: ${numbersOnly}`);
        return null;
      }
    }
    
    // Validação final
    const tamanhoFinal = numbersOnly.length;
    
    // Formato válido: 55 + DDD (2) + número (8 ou 9)
    // Total: 12 (fixo) ou 13 (celular) dígitos
    if (tamanhoFinal === 12 || tamanhoFinal === 13) {
      console.log(`✅ Telefone normalizado com sucesso: ${numbersOnly}`);
      return numbersOnly;
    }
    
    console.error(`❌ Telefone inválido após normalização: ${numbersOnly} (${tamanhoFinal} dígitos)`);
    return null;
  };

  // Função auxiliar para delay entre envios
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Função auxiliar para enviar payload ao webhook com tratamento de erro melhorado
  const sendToWebhook = async (url, payload, description) => {
    console.log(`📤 Enviando ${description}...`);
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        mode: 'cors' // Adicionar explicitamente para melhor compatibilidade
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`✅ ${description} enviado com sucesso!`);
        return { success: true };
      } else {
        const errorText = await response.text().catch(() => 'Sem detalhes');
        console.error(`❌ Erro HTTP ${response.status}:`, errorText);
        return { 
          success: false, 
          error: `Erro HTTP ${response.status}: ${errorText.substring(0, 100)}` 
        };
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      let errorDetails = '';
      if (fetchError.name === 'AbortError') {
        errorDetails = 'Timeout (30s). O webhook demorou muito para responder.';
      } else if (fetchError.message.includes('Failed to fetch')) {
        errorDetails = `Não foi possível conectar ao webhook. Possíveis causas:

🔴 **PROBLEMAS MAIS COMUNS:**
1. **Webhook não está ativo/em produção no n8n**
   → Verifique se o workflow está ATIVO (toggle verde)
   
2. **URL incorreta ou inacessível**
   → Teste a URL no navegador ou Postman
   
3. **Problema de CORS**
   → No n8n, vá em Settings → Enable CORS
   
4. **Firewall/Rede bloqueando**
   → Tente de outra rede ou dispositivo

5. **n8n self-hosted sem HTTPS**
   → Use ngrok ou configure HTTPS

📋 **URL testada:** ${url}`;
      } else {
        errorDetails = fetchError.message;
      }
      
      console.error(`❌ ${description}:`, errorDetails);
      return { success: false, error: errorDetails };
    }
  };

  // Função para enviar notificação consolidada por cliente
  const sendConsolidatedNotifications = async (documentosPorCliente) => {
    // Config do n8n mora na Empresa vinculada ao usuário — mesma fonte usada
    // pela tela Configurações > n8n (N8nConfig.jsx). Antes esta função lia de
    // SystemConfig, um resquício da versão antiga que nunca era preenchido,
    // fazendo o envio real sair em silêncio sem nunca chamar o webhook.
    let empresa = null;
    try {
      if (currentUser.empresa_id) {
        empresa = await Empresa.get(currentUser.empresa_id);
      } else if (currentUser.role === 'admin') {
        const empresas = await Empresa.list();
        if (empresas.length > 0) empresa = empresas[0];
      }
    } catch (error) {
      console.error('❌ Erro ao carregar configuração da empresa:', error);
    }

    const isN8nActive = !!empresa?.n8n_ativo;
    const n8nWebhookUrl = empresa?.n8n_webhook_documentos;

    if (!isN8nActive) {
      console.log('⚠️ n8n está desativado nas configurações da empresa.');
      return { enviados: 0, erros: 0, motivo: 'Envio automático via n8n está desativado. Ative em Configurações → n8n.' };
    }

    if (!n8nWebhookUrl) {
      console.log('⚠️ URL do webhook n8n não configurada.');
      alert('⚠️ URL do webhook n8n não está configurada. Configure em Configurações → n8n');
      return { enviados: 0, erros: 0, motivo: 'URL do webhook não configurada.' };
    }

    // Validar URL do webhook
    try {
      const url = new URL(n8nWebhookUrl);
      if (!url.protocol.startsWith('http')) {
        console.error('❌ URL do webhook inválida. Deve começar com http:// ou https://');
        alert('⚠️ URL do webhook n8n está inválida. Configure em Configurações → n8n');
        return { enviados: 0, erros: 0, motivo: 'URL do webhook inválida.' };
      }
    } catch (e) {
      console.error('❌ URL do webhook malformada:', n8nWebhookUrl, e);
      alert('⚠️ URL do webhook n8n está malformada. Verifique em Configurações → n8n');
      return { enviados: 0, erros: 0, motivo: 'URL do webhook malformada.' };
    }

    let totalEnviados = 0;
    let totalErros = 0;

    // ═══════════════════════════════════════════════════════════════════
    // IMPORTANTE: Processar clientes em FILA SEQUENCIAL (um de cada vez)
    // ═══════════════════════════════════════════════════════════════════
    const clientesArray = Object.entries(documentosPorCliente);
    const totalClientes = clientesArray.length;

    console.log(`📋 INICIANDO FILA DE ENVIOS: ${totalClientes} cliente(s) na fila`);
    // Estimativa de tempo para dar uma noção ao usuário (ex: 10s por cliente + 2s por documento + 3s inicial)
    // Isso é uma estimativa bruta, pode variar bastante.
    let estimatedTime = 0;
    clientesArray.forEach(([_, dados]) => {
      estimatedTime += 5; // Base de 5s entre clientes
      if (dados.documentos.length === 1) {
        estimatedTime += 5; // Apenas um doc leva menos tempo
      } else {
        estimatedTime += 3; // Mensagem inicial
        estimatedTime += (dados.documentos.length * 2); // 2s por documento
      }
    });
    console.log(`⏱️ Estimativa: ~${estimatedTime} segundos`);


    for (let clienteIndex = 0; clienteIndex < clientesArray.length; clienteIndex++) {
      const [clienteId, dados] = clientesArray[clienteIndex];
      const { cliente, documentos } = dados;
      const numeroClienteNaFila = clienteIndex + 1;

      console.log(`\n🔄 [${numeroClienteNaFila}/${totalClientes}] Processando cliente: ${cliente.nome}`);
      
      // NOTA: Envio de e-mail removido pois a função backend está bloqueada no seu plano
      console.log('ℹ️ Envio de e-mail desabilitado (função backend bloqueada no plano atual)');

      // ═══════════════════════════════════════════════════════════
      // NORMALIZAR TELEFONE ANTES DE ENVIAR
      // ═══════════════════════════════════════════════════════════
      const telefoneNormalizado = normalizeTelefone(cliente.telefone);
      
      if (!telefoneNormalizado) {
        console.error(`❌ Telefone inválido para ${cliente.nome}: "${cliente.telefone}"`);
        alert(`⚠️ Cliente "${cliente.nome}" possui telefone inválido: "${cliente.telefone}"\n\nCorreção necessária:\n• O número deve conter DDD + número (ex: 42991153552 ou 4230268500)\n• Não é possível enviar WhatsApp sem um telefone válido.\n\nPor favor, corrija o cadastro do cliente antes de enviar.`);
        // Pular para o próximo cliente se o telefone não for válido
        if (clienteIndex < clientesArray.length - 1) {
          const proximoCliente = clientesArray[clienteIndex + 1][1].cliente.nome;
          console.log(`⏳ Aguardando 5s antes de processar próximo cliente (${proximoCliente})...`);
          await sleep(5000);
        }
        continue; 
      }

      // Enviar WhatsApp via n8n
      if (cliente.preferencia_envio === 'whatsapp' || cliente.preferencia_envio === 'ambos') {
        try {
          const totalDocumentos = documentos.length;
          
          // ============================================================
          // CASO 1: APENAS 1 DOCUMENTO - Mensagem completa com saudação
          // ============================================================
          if (totalDocumentos === 1) {
            const doc = documentos[0];
            console.log(`📤 Enviando 1 documento para ${cliente.nome}`);

            let dataFormatada = doc.data_documento || "N/A";
            let textoDataPrefix = "📅 *Data do Vencimento:*";

            if (doc.tipo_documento === "Holerite" || doc.tipo_documento === "RECIBO DE PAGAMENTO") {
              textoDataPrefix = "📅 *Competência:*";
            } else if (doc.tipo_documento === "RELATÓRIO DO CARTÃO PONTO") {
              textoDataPrefix = "📅 *Período Final:*";
            }

            const mensagemTexto = `🤖 *${currentUser.companyName || 'A&L Contabilidade'}*

Olá *${cliente.nome}*! 👋

Seu documento *${doc.tipo_documento}* está disponível.

${textoDataPrefix} ${dataFormatada}

📄 O documento está sendo enviado em anexo (PDF).

💡 *Dica:* Salve o documento no seu dispositivo assim que receber.

Em caso de dúvidas, entre em contato conosco.

---
_${currentUser.companyName || 'A&L Contabilidade'}_
_Processamento Inteligente de Documentos_`;

            const payload = {
              cliente: {
                nome: cliente.nome,
                telefone: telefoneNormalizado, // ✅ Usar telefone normalizado
                email: cliente.email
              },
              documento: { // 'documento' singular para envio único
                tipo: doc.tipo_documento,
                data: dataFormatada,
                texto_data: textoDataPrefix, // Sending with prefix
                arquivo_url: doc.arquivo_url,
                nome_arquivo: doc.nome_arquivo
              },
              mensagem: {
                texto: mensagemTexto,
                tipo_envio: "unico" // Flag para n8n saber que é envio único
              },
              app: {
                nome: currentUser.companyName || currentUser.full_name,
                user_email: currentUser.email
              }
            };

            const result = await sendToWebhook(n8nWebhookUrl, payload, `Documento único para ${cliente.nome}`);

            if (result.success) {
              await Documento.update(doc.id, { status_whatsapp: true });
              totalEnviados++;
            } else {
              totalErros++;
              alert(`⚠️ Erro ao enviar WhatsApp para ${cliente.nome}:\n\n${result.error}\n\nVerifique as configurações do n8n.`);
            }
          }
          
          // ============================================================
          // CASO 2: MÚLTIPLOS DOCUMENTOS - Fila com mensagens diferentes
          // ============================================================
          else {
            console.log(`📦 Enviando ${totalDocumentos} documentos em fila para ${cliente.nome}`);

            // ═══════════════════════════════════════════════════════════
            // ETAPA 1: Primeira mensagem - SAUDAÇÃO COMPLETA + LISTA (SEM ARQUIVO)
            // ═══════════════════════════════════════════════════════════
            let listaCompleta = "";
            documentos.forEach((doc, index) => {
              let dataFormatada = doc.data_documento || "N/A";
              let textoDataList = "Vencimento"; // No emoji for list item

              if (doc.tipo_documento === "Holerite" || doc.tipo_documento === "RECIBO DE PAGAMENTO") {
                textoDataList = "Competência";
              } else if (doc.tipo_documento === "RELATÓRIO DO CARTÃO PONTO") {
                textoDataList = "Período Final";
              }

              listaCompleta += `
📄 *${index + 1}. ${doc.tipo_documento}*
   📅 ${textoDataList}: ${dataFormatada}`; // Add 📅 for list prefix
            });

            const mensagemInicial = `🤖 *${currentUser.companyName || 'A&L Contabilidade'}*

Olá *${cliente.nome}*! 👋

Você possui *${totalDocumentos} documento(s)* processado(s):
${listaCompleta}

📎 Os documentos serão enviados em sequência nos próximos segundos.

💡 *Dica:* Salve cada documento assim que receber.

Em caso de dúvidas, entre em contato conosco.

---
_${currentUser.companyName || 'A&L Contabilidade'}_
_Processamento Inteligente de Documentos_`;

            const payloadInicial = {
              cliente: {
                nome: cliente.nome,
                telefone: telefoneNormalizado, // ✅ Usar telefone normalizado
                email: cliente.email
              },
              mensagem: {
                texto: mensagemInicial,
                tipo_envio: "multiplos_inicial" // Flag: primeira mensagem, só texto
              },
              app: {
                nome: currentUser.companyName || currentUser.full_name,
                user_email: currentUser.email
              }
            };

            const resultInicial = await sendToWebhook(n8nWebhookUrl, payloadInicial, `Mensagem inicial para ${cliente.nome}`);

            if (!resultInicial.success) {
              totalErros++;
              alert(`⚠️ Erro ao enviar mensagem inicial para ${cliente.nome}:\n\n${resultInicial.error}\n\nOs documentos NÃO serão enviados. Verifique as configurações do n8n.`);
              // Pular para o próximo cliente se a mensagem inicial falhou
              if (clienteIndex < clientesArray.length - 1) {
                const proximoCliente = clientesArray[clienteIndex + 1][1].cliente.nome;
                console.log(`⏳ Aguardando 5s antes de processar próximo cliente (${proximoCliente})...`);
                await sleep(5000);
              }
              continue;
            }
            totalEnviados++;

            // Aguardar 3 segundos antes de começar a enviar arquivos
            await sleep(3000);

            // ═══════════════════════════════════════════════════════════
            // ETAPA 2: Enviar cada documento - MENSAGEM RESUMIDA + ARQUIVO
            // ═══════════════════════════════════════════════════════════
            for (let i = 0; i < documentos.length; i++) {
              const doc = documentos[i];
              const numeroDocumento = i + 1;

              console.log(`📤 [${numeroDocumento}/${totalDocumentos}] Enviando: ${doc.tipo_documento}`);

              let dataFormatada = doc.data_documento || "N/A";
              let textoDataResumida = "Vencimento"; // No emoji for resumida message

              if (doc.tipo_documento === "Holerite" || doc.tipo_documento === "RECIBO DE PAGAMENTO") {
                textoDataResumida = "Competência";
              } else if (doc.tipo_documento === "RELATÓRIO DO CARTÃO PONTO") {
                textoDataResumida = "Período Final";
              }

              // Mensagem resumida para cada arquivo (sem saudação ou info da empresa)
              const mensagemResumida = `📎 *Documento ${numeroDocumento}/${totalDocumentos}*

📄 ${doc.tipo_documento}
📅 ${textoDataResumida}: ${dataFormatada}`;

              const payloadDocumento = {
                cliente: {
                  nome: cliente.nome,
                  telefone: telefoneNormalizado, // ✅ Usar telefone normalizado
                  email: cliente.email
                },
                documento: { // 'documento' singular para envio de cada arquivo
                  tipo: doc.tipo_documento,
                  data: dataFormatada,
                  texto_data: textoDataResumida, // Sending without prefix
                  arquivo_url: doc.arquivo_url,
                  nome_arquivo: doc.nome_arquivo,
                  numero: numeroDocumento, // Adiciona número do documento na sequência
                  total: totalDocumentos // Adiciona total de documentos
                },
                mensagem: {
                  texto: mensagemResumida,
                  tipo_envio: "multiplos_arquivo" // Flag: envio de arquivo com texto resumido
                },
                app: {
                  nome: currentUser.companyName || currentUser.full_name,
                  user_email: currentUser.email
                }
              };

              const resultDoc = await sendToWebhook(
                n8nWebhookUrl, 
                payloadDocumento, 
                `Documento ${numeroDocumento}/${totalDocumentos} para ${cliente.nome}`
              );
              
              if (resultDoc.success) {
                await Documento.update(doc.id, { status_whatsapp: true });
                totalEnviados++;
              } else {
                totalErros++;
                console.error(`❌ Falha ao enviar documento ${numeroDocumento} para ${cliente.nome}: ${resultDoc.error}`);
              }

              // Aguardar 2 segundos entre cada envio (para não sobrecarregar a API)
              if (i < documentos.length - 1) {
                console.log(`⏳ Aguardando 2s antes do próximo envio...`);
                await sleep(2000);
              }
            }

            console.log(`✅ Todos os ${totalDocumentos} documentos foram processados para ${cliente.nome}!`);
          }

        } catch (error) {
          console.error("❌ Erro ao enviar WhatsApp:", error);
          alert(`⚠️ Erro inesperado ao enviar WhatsApp para ${cliente.nome}: ${error.message}`);
        }
      }

      // ═══════════════════════════════════════════════════════════
      // INTERVALO ENTRE CLIENTES: Aguardar 5 segundos antes do próximo cliente
      // ═══════════════════════════════════════════════════════════
      if (clienteIndex < clientesArray.length - 1) {
        const proximoCliente = clientesArray[clienteIndex + 1][1].cliente.nome;
        console.log(`⏳ Aguardando 5s antes de processar próximo cliente (${proximoCliente})...`);
        await sleep(5000);
      }
    }

    console.log(`\n🎉 FILA COMPLETA! Todos os ${totalClientes} clientes foram processados.`);
    return { enviados: totalEnviados, erros: totalErros };
  };

  const processSingleFile = async (file, file_url) => {
    const extractionResult = await ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          nome_cliente: { 
            type: "string", 
            description: "O nome da empresa ou razão social que está associado ao CNPJ principal no documento. Ignore nomes de funcionários." 
          },
          cpf_cnpj: { 
            type: "string", 
            description: "O CNPJ principal da empresa. Priorize o CNPJ sobre qualquer CPF no documento." 
          },
          email: { 
            type: "string", 
            description: "Email principal de contato, se houver." 
          },
          tipo_documento: { 
            type: "string", 
            enum: ["CND ESTADUAL", "CND FEDERAL", "CNE MUNICIPAL", "CND TRABALHISTA", "COFINS", "CSLL", "DAS", "FGTS", "INSS", "IRPJ", "Nota Fiscal", "Holerite", "CNPJ", "MEI", "PARCELAMENTO MEI", "PARCELAMENTO SIMPLES", "PIS", "RECIBO DE PAGAMENTO", "RELATÓRIO DO CARTÃO PONTO", "Outros"] 
          },
          data_documento: { 
            type: "string", 
            description: "IMPORTANTE: Para FGTS/INSS/DAS/impostos = data de vencimento no formato DD/MM/AAAA (ex: '19/09/2025'). Para Holerite/Folha de Pagamento = competência no formato MÊS/ANO (ex: 'AGOSTO/2025'). Para RELATÓRIO DO CARTÃO PONTO = data final do período no formato DD/MM/AAAA (ex: '31/08/2025')." 
          },
        }
      }
    });

    if (extractionResult.status !== "success" || !extractionResult.output) {
      throw new Error("Erro na extração de dados do documento. Verifique o arquivo.");
    }
    const extractedData = extractionResult.output;

    let clienteEncontrado = null;
    let observacao = "";

    const cnpjNormalizado = normalizeCNPJ(extractedData.cpf_cnpj);
    
    if (cnpjNormalizado) {
      const todosClientes = await Cliente.filter({ user_id: currentUser.id });
      clienteEncontrado = todosClientes.find(cliente => normalizeCNPJ(cliente.cpf_cnpj) === cnpjNormalizado);
      
      if (clienteEncontrado) {
        observacao = `Cliente identificado pela raiz do CNPJ: ${cnpjNormalizado}.`;
      }
    }
    
    if (!clienteEncontrado) {
      if (!extractedData.nome_cliente || !extractedData.cpf_cnpj) {
        throw new Error("Não foi possível extrair nome e CNPJ do documento para criar um novo cliente. Verifique a qualidade do documento.");
      }
      
      const newClientData = { 
        nome: extractedData.nome_cliente, 
        cpf_cnpj: extractedData.cpf_cnpj,
        email: extractedData.email || "", 
        telefone: "", 
        preferencia_envio: "whatsapp", 
        ativo: true,
        user_id: currentUser.id 
      };
      clienteEncontrado = await Cliente.create(newClientData);
      observacao = `Novo cliente cadastrado automaticamente. Raiz do CNPJ: ${cnpjNormalizado}.`;
    }

    const documentData = {
      cliente_id: clienteEncontrado?.id,
      nome_cliente: clienteEncontrado.nome,
      tipo_documento: extractedData.tipo_documento || "Outros",
      data_documento: extractedData.data_documento || new Date().toISOString().split('T')[0],
      arquivo_url: file_url,
      nome_arquivo: file.name,
      status_leitura: true, 
      status_identificacao: true, 
      status_organizacao: true,
      status_email: false, 
      status_whatsapp: false, 
      caminho_pasta: `/Clientes/${clienteEncontrado.nome}/${extractedData.tipo_documento || "Outros"}/${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}/`,
      observacoes: observacao,
      user_id: currentUser.id
    };
    
    const savedDocument = await Documento.create(documentData);
    return { documento: savedDocument, cliente: clienteEncontrado };
  };
  
  const processProlaboreFile = async (file, file_url) => {
    const extractionResult = await ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          empresa_nome: { "type": "string", "description": "O nome da empresa ou razão social que emitiu a folha de pagamento. Ignore nomes de funcionários." },
          empresa_cnpj: { "type": "string", "description": "O CNPJ da empresa que emitiu a folha de pagamento. Ignore CPFs de funcionários." },
          data_folha: { 
            "type": "string", 
            "description": "Para folhas de pagamento: extrair a competência no formato MÊS/ANO (ex: 'AGOSTO/2025'). NÃO converter para data completa." 
          }
        },
        "required": ["empresa_nome", "empresa_cnpj"]
      }
    });

    if (extractionResult.status !== "success" || !extractionResult.output) {
      throw new Error("Falha ao extrair dados da folha de pagamento. Verifique se o documento contém os dados da empresa (Nome, CNPJ).");
    }
    
    const { empresa_nome, empresa_cnpj, data_folha } = extractionResult.output;
    
    const cnpjNormalizado = normalizeCNPJ(empresa_cnpj);
    let empresaCliente = null;
    
    if (cnpjNormalizado) {
      const todosClientes = await Cliente.filter({ user_id: currentUser.id });
      empresaCliente = todosClientes.find(cliente => normalizeCNPJ(cliente.cpf_cnpj) === cnpjNormalizado);
    }
    
    if (!empresaCliente) {
      empresaCliente = await Cliente.create({ 
        nome: empresa_nome, 
        cpf_cnpj: empresa_cnpj,
        email: "", 
        telefone: "", 
        preferencia_envio: "whatsapp", 
        ativo: true,
        user_id: currentUser.id
      });
    }
    
    const docData = {
      cliente_id: empresaCliente.id, 
      nome_cliente: empresaCliente.nome, 
      tipo_documento: "Holerite",
      data_documento: data_folha || "COMPETÊNCIA N/A", 
      arquivo_url: file_url, 
      nome_arquivo: file.name,
      status_leitura: true, 
      status_identificacao: true, 
      status_organizacao: true, 
      status_email: false, 
      status_whatsapp: false, 
      caminho_pasta: `/Clientes/${empresaCliente.nome}/Holerites/${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}/`, 
      observacoes: `Folha de pagamento processada. Empresa: ${empresa_nome}. Raiz CNPJ: ${cnpjNormalizado}.`,
      user_id: currentUser.id
    };
    
    const savedDoc = await Documento.create(docData);
    return { documento: savedDoc, cliente: empresaCliente };
  };

  const handleProcessAllFiles = async () => {
    if (limitReached) {
      alert("Limite de documentos atingido no plano gratuito. Faça upgrade para processar mais.");
      return;
    }
    
    setIsProcessing(true);
    setResults(files.map(file => ({ fileName: file.name, status: 'pending' })));

    const documentosPorCliente = {}; // Agrupar documentos por cliente

    for (const file of files) {
      setResults(prev => prev.map(r => r.fileName === file.name ? { ...r, status: 'processing', message: 'Analisando tipo de documento...' } : r));
      
      try {
        const { file_url } = await UploadFile({ file });

        const classificationResponse = await InvokeLLM({
          prompt: "Este documento é uma folha de pagamento, holerite ou pró-labore? Responda apenas com 'sim' ou 'não'.",
          file_urls: [file_url],
        });
        const isPayroll = classificationResponse.toLowerCase().includes('sim');

        let result;
        if (isPayroll) {
          setResults(prev => prev.map(r => r.fileName === file.name ? { ...r, message: 'Processando como folha de pagamento...' } : r));
          result = await processProlaboreFile(file, file_url);
        } else {
          setResults(prev => prev.map(r => r.fileName === file.name ? { ...r, message: 'Processando como documento padrão...' } : r));
          result = await processSingleFile(file, file_url);
        }

        // Agrupar por cliente
        const clienteId = result.cliente.id;
        if (!documentosPorCliente[clienteId]) {
          documentosPorCliente[clienteId] = {
            cliente: result.cliente,
            documentos: []
          };
        }
        documentosPorCliente[clienteId].documentos.push(result.documento);

        setResults(prev => prev.map(r => r.fileName === file.name ? { 
          ...r, 
          status: 'success', 
          document: result.documento,
          summary: [
            { status: 'success', message: `Documento processado para ${result.cliente.nome}` }
          ]
        } : r));
      } catch (error) {
        console.error("Erro no processamento:", error);
        setResults(prev => prev.map(r => r.fileName === file.name ? { ...r, status: 'error', error: error.message } : r));
      }
    }

    // Salvar documentos processados para teste posterior
    setProcessedDocuments(documentosPorCliente);

    console.log('📦 Iniciando fila de notificações via WhatsApp...');
    await sendConsolidatedNotifications(documentosPorCliente);
    
    setIsProcessing(false);
  };
  
  // Nova função para testar webhook com documentos já processados
  const handleTestWebhook = async () => {
    if (Object.keys(processedDocuments).length === 0) {
      alert("Nenhum documento processado para testar.");
      return;
    }

    console.log('🧪 Testando webhook com documentos processados...');
    const resultado = await sendConsolidatedNotifications(processedDocuments);

    if (resultado?.motivo) {
      alert(`⚠️ Nada foi enviado: ${resultado.motivo}`);
    } else if (resultado?.enviados > 0) {
      alert(`✅ Webhook testado! ${resultado.enviados} mensagem(ns) enviada(s) com sucesso. Verifique o WhatsApp.`);
    } else {
      alert('⚠️ Nenhuma mensagem foi enviada. Verifique o console para detalhes.');
    }
  };
  
  const handleFileSelect = (selectedFiles) => {
    const pdfFiles = Array.from(selectedFiles).filter(file => file.type === "application/pdf");
    setFiles(prev => [...prev, ...pdfFiles]);
  };
  
  const handleRemoveFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };
  
  const resetProcess = () => {
    setFiles([]);
    setResults([]);
    setProcessedDocuments({}); // Limpar documentos processados
    setIsProcessing(false);
  };

  if (!currentUser) return <div className="p-6 min-h-screen flex items-center justify-center text-lg">Carregando...</div>;

  return (
    <div className="p-6 min-h-screen space-y-8">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="icon" className="hover-lift">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Processamento de Documentos</h1>
            <p className="text-gray-600 mt-1">Upload e processamento automático com OCR e notificações via WhatsApp</p>
          </div>
        </motion.div>

        {limitReached && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Você atingiu o limite de {FREE_PLAN_LIMIT} documentos do plano gratuito.{" "}
              <Link to={createPageUrl("Subscription")} className="font-bold underline">Faça upgrade para processar mais.</Link>
            </AlertDescription>
          </Alert>
        )}

        <AnimatePresence mode="wait">
          {results.length === 0 ? (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <FileUploadZone
                onFileSelect={handleFileSelect}
                files={files}
                onRemoveFile={handleRemoveFile}
                onProcess={handleProcessAllFiles}
                isProcessing={isProcessing || limitReached}
              />
            </motion.div>
          ) : (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ProcessingResults 
                results={results} 
                onReset={resetProcess} 
                isProcessing={isProcessing}
                onTestWebhook={handleTestWebhook}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
