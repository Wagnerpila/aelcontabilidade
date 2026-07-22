import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';

export async function invokeLLM({ prompt, fileBuffers = [] }) {
  const content = fileBuffers.map((buf) => ({
    type: 'document',
    source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') },
  }));
  content.push({ type: 'text', text: prompt });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock ? textBlock.text : '';
}

export async function extractDataFromFile({ fileBuffer, jsonSchema }) {
  const content = [
    {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: fileBuffer.toString('base64') },
    },
    { type: 'text', text: 'Extraia os dados do documento anexado conforme o schema fornecido pela ferramenta.' },
  ];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    tools: [
      {
        name: 'extract_data',
        description: 'Extrai dados estruturados do documento anexado.',
        input_schema: jsonSchema,
      },
    ],
    tool_choice: { type: 'tool', name: 'extract_data' },
    messages: [{ role: 'user', content }],
  });

  const toolUse = response.content.find((block) => block.type === 'tool_use');
  if (!toolUse) {
    return { status: 'error', output: null };
  }
  return { status: 'success', output: toolUse.input };
}
