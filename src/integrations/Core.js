import { API_BASE, request } from '@/lib/apiClient';

export async function UploadFile({ file }) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/integrations/upload`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  if (!res.ok) {
    let message = 'Falha no upload do arquivo.';
    try {
      const data = await res.json();
      message = data?.error || message;
    } catch {
      // sem corpo JSON
    }
    throw new Error(message);
  }
  return res.json();
}

export async function InvokeLLM({ prompt, file_urls }) {
  const data = await request('/integrations/invoke-llm', { method: 'POST', body: { prompt, file_urls } });
  return data.text;
}

export async function ExtractDataFromUploadedFile({ file_url, json_schema }) {
  return request('/integrations/extract-file', { method: 'POST', body: { file_url, json_schema } });
}
