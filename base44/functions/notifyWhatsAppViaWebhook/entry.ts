import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Pegar dados do payload
        const { documento, cliente } = await req.json();

        if (!documento || !cliente) {
            return Response.json({ error: 'Dados incompletos' }, { status: 400 });
        }

        // Pegar a URL do webhook n8n da empresa do usuário
        let n8nWebhookUrl = null;
        if (user.empresa_id) {
            const empresa = await base44.entities.Empresa.get(user.empresa_id);
            n8nWebhookUrl = empresa?.n8n_webhook_documentos;
        }
        if (!n8nWebhookUrl) n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');

        if (!n8nWebhookUrl) {
            return Response.json({ 
                error: 'Webhook n8n não configurado para esta empresa',
                message: 'Configure a URL do webhook em Configurações > n8n'
            }, { status: 500 });
        }

        // Formatar a data do documento conforme o tipo
        let dataFormatada = "N/A";
        let textoData = "📅 *Data do Vencimento:*";

        if (documento.data_documento) {
            if (documento.tipo_documento === "Holerite" || documento.tipo_documento === "RECIBO DE PAGAMENTO") {
                // Para holerites, manter o formato MÊS/ANO
                dataFormatada = documento.data_documento;
                textoData = "📅 *Competência:*";
            } else if (documento.tipo_documento === "RELATÓRIO DO CARTÃO PONTO") {
                textoData = "📅 *Período Final:*";
                dataFormatada = documento.data_documento;
            } else {
                // Para outros documentos, é data de vencimento
                dataFormatada = documento.data_documento;
            }
        }

        // Preparar payload para o n8n
        const payload = {
            cliente: {
                nome: cliente.nome,
                telefone: cliente.telefone,
                email: cliente.email
            },
            documento: {
                tipo: documento.tipo_documento,
                data: dataFormatada,
                texto_data: textoData,
                arquivo_url: documento.arquivo_url,
                nome_arquivo: documento.nome_arquivo
            },
            app: {
                nome: user.companyName || user.full_name,
                user_email: user.email
            }
        };

        // Chamar webhook do n8n
        const response = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro no n8n webhook: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        return Response.json({
            success: true,
            message: 'Notificação enviada para o n8n com sucesso',
            result: result
        });

    } catch (error) {
        console.error('Erro ao notificar via n8n:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});