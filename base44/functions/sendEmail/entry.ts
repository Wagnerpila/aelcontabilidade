import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        const body = await req.json();
        const { to, subject, body: emailBody, attachmentUrl } = body;

        if (!to || !subject || !emailBody) {
            return new Response(JSON.stringify({ success: false, error: 'to, subject e body são obrigatórios' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        // Buscar configurações de email do banco de dados
        const configs = await base44.entities.SystemConfig.filter({ config_type: "email" });
        const fromEmail = configs.find(c => c.config_key === 'gmail_user')?.config_value;
        const sendgridApiKey = configs.find(c => c.config_key === 'sendgrid_api_key')?.config_value;
        const isActive = configs.find(c => c.config_key === 'gmail_active')?.config_value === 'true';

        if (!isActive || !fromEmail || !sendgridApiKey) {
            return new Response(JSON.stringify({ success: false, error: 'Configuração de envio (SendGrid) incompleta ou inativa.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        
        // Montar o corpo do e-mail
        let finalBody = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
                .header { background: #1e40af; color: white; padding: 25px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; }
                .content { padding: 30px; }
                .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
                .btn { background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; }
                .attachment { background: #eff6ff; border: 1px solid #dbeafe; padding: 20px; border-radius: 8px; margin-top: 20px; text-align: center; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header"><h1>A&L Contabilidade</h1></div>
                <div class="content">${emailBody.replace(/data-filename="[^"]*"/g, '').replace(/data-linenumber="[^"]*"/g, '').replace(/data-visual-selector-id="[^"]*"/g, '')}</div>`;

        if (attachmentUrl) {
            finalBody += `<div class="attachment"><strong>Documento Anexo:</strong><br><a href="${attachmentUrl}" class="btn" target="_blank">Visualizar Documento</a></div>`;
        }
        
        finalBody += `<div class="footer"><p>Este é um e-mail automático do sistema A&L Contabilidade.<br>Data de envio: ${new Date().toLocaleString('pt-BR')}</p></div></div></body></html>`;

        // Enviar via SendGrid API
        const sendgridData = {
            personalizations: [{ to: [{ email: to }], subject: subject }],
            from: { email: fromEmail, name: "A&L Contabilidade" },
            content: [{ type: "text/html", value: finalBody }]
        };

        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${sendgridApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(sendgridData)
        });

        if (response.ok) {
            return new Response(JSON.stringify({ success: true, message: 'Email enviado com sucesso via SendGrid' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } else {
            const errorData = await response.text();
            return new Response(JSON.stringify({ success: false, error: `Erro no SendGrid: ${response.status} - ${errorData}` }), { status: response.status, headers: { 'Content-Type': 'application/json' } });
        }

    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});