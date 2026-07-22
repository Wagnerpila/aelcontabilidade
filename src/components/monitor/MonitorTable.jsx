
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Documento } from "@/entities/Documento";
import {
  CheckSquare,
  CheckCircle,
  XCircle,
  ExternalLink,
  FileText,
  Clock,
  Building2,
  Trash2,
  AlertCircle,
  ChevronRight,
  MessageSquare,
  Send
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

const tipoDocumentoColors = {
  "DAS": "bg-blue-100 text-blue-800 border-blue-200",
  "Nota Fiscal": "bg-green-100 text-green-800 border-green-200",
  "Holerite": "bg-purple-100 text-purple-800 border-purple-200",
  "CNPJ": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "MEI": "bg-orange-100 text-orange-800 border-orange-200",
  "Outros": "bg-gray-100 text-gray-800 border-gray-200",
  "CND ESTADUAL": "bg-red-100 text-red-800 border-red-200",
  "CND FEDERAL": "bg-red-100 text-red-800 border-red-200",
  "CNE MUNICIPAL": "bg-red-100 text-red-800 border-red-200",
  "CND TRABALHISTA": "bg-red-100 text-red-800 border-red-200",
  "COFINS": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "CSLL": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "FGTS": "bg-pink-100 text-pink-800 border-pink-200",
  "INSS": "bg-pink-100 text-pink-800 border-pink-200",
  "IRPJ": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "PARCELAMENTO MEI": "bg-teal-100 text-teal-800 border-teal-200",
  "PARCELAMENTO SIMPLES": "bg-teal-100 text-teal-800 border-teal-200",
  "PIS": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "RECIBO DE PAGAMENTO": "bg-cyan-100 text-cyan-800 border-cyan-200",
};

const StatusIcon = ({ status }) => {
  if (status) return <CheckCircle className="w-4 h-4 text-green-500" />;
  return <XCircle className="w-4 h-4 text-red-500" />;
};

const DocumentRowDetail = ({ doc, cliente, onWhatsAppSent }) => {
  const handleWhatsAppClick = async () => {
    if (!cliente || !cliente.telefone) {
      alert("Este cliente não possui um número de telefone cadastrado.");
      return;
    }

    // Encurtar a URL do documento usando um serviço gratuito
    let shortUrl = doc.arquivo_url;
    try {
      // Tentar encurtar a URL para melhor compatibilidade
      const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(doc.arquivo_url)}`);
      if (response.ok) {
        const shortened = await response.text();
        if (shortened.startsWith('https://tinyurl.com/')) {
          shortUrl = shortened;
        }
      }
    } catch (error) {
      console.log("Não foi possível encurtar a URL, usando a original");
    }

    // Determinar formato da data baseado no tipo de documento
    let dataFormatada = "N/A";
    let textoData = "📅 *Data do Vencimento:*"; // Default

    if (doc.data_documento) {
      if (doc.tipo_documento === "Holerite" || doc.tipo_documento === "RECIBO DE PAGAMENTO") {
        // Para holerites e recibos de pagamento, mostrar competência como veio (ex: AGOSTO/2025)
        dataFormatada = doc.data_documento;
        textoData = "📅 *Competência:*";
      } else if (doc.tipo_documento === "RELATÓRIO DO CARTÃO PONTO") {
        textoData = "📅 *Período Final:*";
        try {
          const date = new Date(doc.data_documento);
          if (!isNaN(date.getTime())) { // Check if it's a valid date
            dataFormatada = format(date, "dd/MM/yyyy");
          } else {
            // If not a valid date object, assume it's already a string in the desired format or an unparseable string
            dataFormatada = doc.data_documento;
          }
        } catch {
          dataFormatada = doc.data_documento; // Fallback
        }
      } else {
        // Para outros documentos (vencimento), tentar formatar como data ou usar como veio
        try {
          const date = new Date(doc.data_documento);
          if (!isNaN(date.getTime())) { // Check if it's a valid date
            dataFormatada = format(date, "dd/MM/yyyy");
          } else {
            // If not a valid date object, assume it's already a string in the desired format or an unparseable string
            dataFormatada = doc.data_documento;
          }
        } catch {
          dataFormatada = doc.data_documento; // Fallback
        }
      }
    }

    const message = `🤖 *A&L Contabilidade - Documento Disponível*

Olá *${cliente.nome}*! 

Seu documento *${doc.tipo_documento}* está disponível para acesso.

📄 *Para visualizar o documento:*
1. Toque no link abaixo
2. Se não abrir, copie e cole no navegador
3. Em caso de problemas, entre em contato

🔗 *Link do documento:*
${shortUrl}

${textoData} ${dataFormatada}

💡 *Dica:* Salve o documento no seu celular após abrir o link.

Em caso de dúvidas, entre em contato conosco.

---
A&L Contabilidade
Processamento Inteligente de Documentos`;

    // Limpar número de telefone (remover caracteres especiais)
    const cleanPhone = cliente.telefone.replace(/\D/g, '');
    
    // Garantir que tenha o código do país (55 para Brasil)
    let formattedPhone = cleanPhone;
    if (!cleanPhone.startsWith('55') && cleanPhone.length > 8) {
      formattedPhone = '55' + cleanPhone;
    }

    // Detectar se é desktop ou mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    let whatsappUrl;
    if (isMobile) {
      // Para dispositivos móveis, usar wa.me que abrirá o app
      whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      // Para desktop, usar protocolo whatsapp:// para abrir o app desktop
      whatsappUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
      window.location.href = whatsappUrl;
    }
    
    // Atualizar status do documento como "mensagem pronta para envio"
    try {
      await Documento.update(doc.id, { 
        status_whatsapp: true 
      });
      
      // Chamar callback para atualizar a UI
      if (onWhatsAppSent) {
        onWhatsAppSent(doc.id);
      }
      
    } catch (error) {
      console.error("Erro ao atualizar status do documento:", error);
      alert("Erro ao atualizar status do documento.");
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3">
        <FileText className="w-4 h-4 text-gray-500" />
        <div className="flex flex-col">
          <span className="text-sm font-medium">{doc.nome_arquivo}</span>
          {doc.created_date && (
            <span className="text-xs text-gray-500">
              {format(new Date(doc.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </span>
          )}
        </div>
        <Badge variant="secondary" className={`text-xs ${tipoDocumentoColors[doc.tipo_documento]}`}>
          {doc.tipo_documento}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <div title="Leitura"><StatusIcon status={doc.status_leitura} /></div>
        <div title="Identificação"><StatusIcon status={doc.status_identificacao} /></div>
        <div title="Organização"><StatusIcon status={doc.status_organizacao} /></div>
        <div title="E-mail"><StatusIcon status={doc.status_email} /></div>
        
        {/* Botão WhatsApp Individual */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleWhatsAppClick}
          disabled={!cliente || !cliente.telefone}
          title={doc.status_whatsapp ? "Mensagem já preparada para envio" : "Preparar mensagem via WhatsApp"}
          className={`${doc.status_whatsapp ? 'text-green-600' : 'text-green-500'} hover:text-green-700 disabled:text-gray-400`}
        >
          {doc.status_whatsapp ? <Send className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
        </Button>
        
        {doc.arquivo_url && (
          <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer" title="Ver arquivo">
            <ExternalLink className="w-4 h-4 text-blue-500 hover:text-blue-700" />
          </a>
        )}
      </div>
    </div>
  );
};

// Nova função para envio em lote por cliente
const ClientGroupHeader = ({ group, cliente, onWhatsAppBatch, onDeleteGroup }) => {
  const clientName = group[0].nome_cliente;
  const docTypes = [...new Set(group.map(doc => doc.tipo_documento))];
  const allCompleted = group.every(doc => doc.status_organizacao && doc.status_leitura);
  const documentsForWhatsApp = group.filter(doc => !doc.status_whatsapp && doc.arquivo_url);

  const handleBatchWhatsApp = async () => {
    if (!cliente || !cliente.telefone) {
      alert("Este cliente não possui um número de telefone cadastrado.");
      return;
    }

    if (documentsForWhatsApp.length === 0) {
      alert("Todos os documentos já foram enviados via WhatsApp.");
      return;
    }

    // Encurtar URLs e formatar datas de todos os documentos
    const documentsWithShortUrls = await Promise.all(
      documentsForWhatsApp.map(async (doc) => {
        let shortUrl = doc.arquivo_url;
        try {
          const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(doc.arquivo_url)}`);
          if (response.ok) {
            const shortened = await response.text();
            if (shortened.startsWith('https://tinyurl.com/')) {
              shortUrl = shortened;
            }
          }
        } catch (error) {
          console.log("Não foi possível encurtar a URL, usando a original");
        }

        // Formatar data conforme o tipo de documento
        let dataFormatada = "N/A";
        let textoData = "Vencimento"; // Default for batch message

        if (doc.data_documento) {
          if (doc.tipo_documento === "Holerite" || doc.tipo_documento === "RECIBO DE PAGAMENTO") {
            dataFormatada = doc.data_documento; // e.g., AGOSTO/2025
            textoData = "Competência";
          } else if (doc.tipo_documento === "RELATÓRIO DO CARTÃO PONTO") {
            textoData = "Período Final";
            try {
              const date = new Date(doc.data_documento);
              if (!isNaN(date.getTime())) {
                dataFormatada = format(date, "dd/MM/yyyy");
              } else {
                dataFormatada = doc.data_documento;
              }
            } catch {
              dataFormatada = doc.data_documento;
            }
          } else {
            // Documentos com vencimento
            try {
              const date = new Date(doc.data_documento);
              if (!isNaN(date.getTime())) {
                dataFormatada = format(date, "dd/MM/yyyy");
              } else {
                dataFormatada = doc.data_documento;
              }
            } catch {
              dataFormatada = doc.data_documento;
            }
          }
        }

        return { ...doc, shortUrl, dataFormatada, textoData };
      })
    );

    // Montar mensagem com múltiplos documentos
    let documentsList = "";
    documentsWithShortUrls.forEach((doc, index) => {
      documentsList += `
📄 *${index + 1}. ${doc.tipo_documento}*
🔗 ${doc.shortUrl}
📅 ${doc.textoData}: ${doc.dataFormatada}
`;
    });

    const message = `🤖 *A&L Contabilidade - Documentos Disponíveis*

Olá *${cliente.nome}*! 

Você possui *${documentsForWhatsApp.length} documento(s)* disponível(is) para acesso:
${documentsList}
📝 *Instruções:*
1. Toque nos links acima para abrir cada documento
2. Se não abrir, copie e cole no navegador
3. Salve os documentos no seu celular
4. Em caso de problemas, entre em contato

💡 *Dica:* Recomendamos salvar todos os documentos assim que abrir os links.

Em caso de dúvidas, entre em contato conosco.

---
A&L Contabilidade
Processamento Inteligente de Documentos`;

    // Limpar número de telefone
    const cleanPhone = cliente.telefone.replace(/\D/g, '');
    let formattedPhone = cleanPhone;
    if (!cleanPhone.startsWith('55') && cleanPhone.length > 8) {
      formattedPhone = '55' + cleanPhone;
    }

    // Detectar dispositivo e abrir WhatsApp
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    let whatsappUrl;
    if (isMobile) {
      whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      whatsappUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
      window.location.href = whatsappUrl;
    }
    
    // Atualizar status de todos os documentos
    try {
      await Promise.all(
        documentsForWhatsApp.map(doc => 
          Documento.update(doc.id, { status_whatsapp: true })
        )
      );
      
      if (onWhatsAppBatch) {
        onWhatsAppBatch(documentsForWhatsApp.map(doc => doc.id));
      }
      
      setTimeout(() => window.location.reload(), 1000);
      
    } catch (error) {
      console.error("Erro ao atualizar status dos documentos:", error);
      alert("Erro ao atualizar status dos documentos.");
    }
  };

  return (
    <div className="p-4 hover:bg-gray-50 flex items-center justify-between transition-colors">
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-4 flex-1 cursor-pointer group">
          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{clientName}</h3>
            <div className="flex items-center gap-2 mt-1">
              {docTypes.slice(0, 4).map(type => (
                <Badge key={type} variant="secondary" className={`text-xs ${tipoDocumentoColors[type]}`}>
                  {type}
                </Badge>
              ))}
              {docTypes.length > 4 && <Badge variant="outline" className="text-xs">+{docTypes.length - 4}</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="min-w-[120px] text-right">{group.length} documento(s)</span>
            {allCompleted ? <CheckCircle className="w-5 h-5 text-green-500" title="Todos os documentos organizados" /> : <Clock className="w-5 h-5 text-yellow-500" title="Aguardando organização" />}
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-data-[state=open]:rotate-90 transition-transform ml-2" />
        </div>
      </CollapsibleTrigger>

      <div className="flex gap-2 ml-4">
        {/* Botão WhatsApp em Lote */}
        {documentsForWhatsApp.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleBatchWhatsApp}
            disabled={!cliente || !cliente.telefone}
            className="gap-2 text-green-600 border-green-200 hover:bg-green-50"
            title={`Enviar ${documentsForWhatsApp.length} documento(s) via WhatsApp`}
          >
            <MessageSquare className="w-4 h-4" />
            WhatsApp ({documentsForWhatsApp.length})
          </Button>
        )}

        {/* Botão de Excluir Grupo */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500" title="Excluir grupo de documentos">
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
               <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500"/>
                Confirmar Exclusão
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir <strong>todos os {group.length} documentos</strong> de <strong>{clientName}</strong>? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDeleteGroup(group)}
                className="bg-red-600 hover:bg-red-700"
              >
                Sim, excluir tudo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default function MonitorTable({ documentGroups, isLoading, searchTerm, onDeleteGroup, clientes }) {
  if (isLoading) {
    return (
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            Status de Processamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4 flex-1">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (documentGroups.length === 0) {
    return (
      <Card className="card-shadow">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? "Nenhum cliente ou documento encontrado" : "Nenhum cliente processado ainda"}
          </h3>
          <p className="text-gray-500">
            {searchTerm
              ? `Não encontramos clientes ou documentos com "${searchTerm}"`
              : "Comece fazendo upload dos documentos contábeis de seus clientes."
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleWhatsAppBatch = (docIds) => {
    console.log("WhatsApp enviado em lote para documentos:", docIds);
  };

  return (
    <Card className="card-shadow">
      <CardHeader className="border-b border-gray-100">
        <CardTitle className="flex items-center gap-2 text-xl">
          <CheckSquare className="w-5 h-5 text-blue-600" />
          Status de Processamento ({documentGroups.length} Clientes)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100">
          {documentGroups.map((group, index) => {
            const clientName = group[0].nome_cliente;
            const cliente = clientes.find(c => c.nome === clientName);

            return (
              <motion.div
                key={clientName}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Collapsible>
                  <ClientGroupHeader 
                    group={group} 
                    cliente={cliente} 
                    onWhatsAppBatch={handleWhatsAppBatch}
                    onDeleteGroup={onDeleteGroup}
                  />
                  <CollapsibleContent className="p-4 bg-gray-50 border-t">
                    <div className="space-y-2">
                      {group.map(doc => (
                        <DocumentRowDetail 
                          key={doc.id} 
                          doc={doc} 
                          cliente={cliente}
                          onWhatsAppSent={handleWhatsAppBatch}
                        />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
