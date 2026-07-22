export async function sendViaSendGrid({ apiKey, to, from, subject, html }) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }], subject }],
      from: { email: from, name: 'A&L Contabilidade' },
      content: [{ type: 'text/html', value: html }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro no SendGrid: ${response.status} - ${text}`);
  }
}
