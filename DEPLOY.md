# Deploy na VPS via EasyPanel

Este app agora é auto-hospedado (Node/Express + PostgreSQL + Anthropic Claude),
sem depender do Base44. A stack é propositalmente enxuta: **um serviço de App**
(Node, construído a partir do `Dockerfile` deste repositório) + **um serviço de
Postgres** (template pronto do EasyPanel).

## 1. Pré-requisitos

- VPS com o EasyPanel instalado e um domínio apontando para ela (registro A/AAAA).
- Este repositório disponível em um Git remoto (GitHub/GitLab) que o EasyPanel
  consiga acessar — o EasyPanel builda a partir do `Dockerfile` do repositório.
- Uma chave de API da Anthropic (`ANTHROPIC_API_KEY`) — usada no OCR/extração de
  dados dos documentos.
- (Opcional, para envio de e-mail) uma API key do SendGrid.
- A URL do webhook do seu fluxo n8n com a Evolution API (a integração de
  WhatsApp continua exatamente como já estava — nada mudou nela).

## 2. Criar o serviço de banco de dados

No EasyPanel: **Create Service → Postgres** (template pronto). Anote a
connection string interna gerada (algo como
`postgresql://postgres:SENHA@nome-do-servico:5432/postgres`).

## 3. Criar o serviço da aplicação

**Create Service → App**, apontando para este repositório e o `Dockerfile` na
raiz. O EasyPanel builda a imagem automaticamente a cada deploy.

### Variáveis de ambiente (aba Environment do serviço)

Copie de `.env.example` e preencha:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | A connection string do serviço Postgres criado no passo 2 |
| `JWT_SECRET` | Uma string longa e aleatória (ex: gerar com `openssl rand -hex 32`) |
| `ANTHROPIC_API_KEY` | Sua chave da Anthropic |
| `ANTHROPIC_MODEL` | `claude-opus-4-8` (padrão, pode trocar depois) |
| `SENDGRID_API_KEY` | Chave do SendGrid, se for usar a função de envio em massa de e-mail |
| `APP_PUBLIC_URL` | A URL pública final, ex: `https://app.seudominio.com.br` (sem barra no final) |
| `NODE_ENV` | `production` |
| `PORT` | `3000` (deixe igual à porta configurada no serviço) |

### Volume persistente (arquivos enviados)

Os documentos enviados pelos usuários ficam salvos em disco, em
`server/uploads`. Sem um volume, esses arquivos somem a cada novo deploy.

No EasyPanel, adicione um **Volume** no serviço apontando para o caminho do
container `/app/server/uploads`.

### Domínio e SSL

Na aba **Domains** do serviço, adicione seu domínio (ex: `app.seudominio.com.br`).
O EasyPanel emite o certificado SSL automaticamente via Let's Encrypt.

### Migrações do banco

Não é necessário rodar nada manualmente: o container executa
`npx prisma migrate deploy` automaticamente antes de subir o servidor (veja o
`CMD` do `Dockerfile`), aplicando as migrações pendentes a cada deploy.

## 4. Primeiro acesso

1. Acesse `https://seu-dominio/register` e crie a primeira conta — ela vira
   automaticamente **administradora** do sistema (o primeiro usuário criado
   sempre recebe `role: admin`).
2. Como admin, cadastre a(s) empresa(s) em **Empresas** e configure o webhook
   do n8n em **Configurações → n8n** para cada uma.
3. Os demais usuários se cadastram normalmente em `/register` e passam pelo
   fluxo de aprovação (`Onboarding`) já existente.

## 5. O que NÃO muda

- O fluxo de envio de WhatsApp (n8n + Evolution API) continua idêntico: o app
  só dispara um `POST` para a URL do webhook configurada, com o mesmo formato
  de payload de antes. A troca dessa integração específica fica para depois.
- Toda a UI e regras de negócio (Clientes, Documentos, Monitor, Gerenciamento
  de Tarefas, Agente Virtual, etc.) permanecem as mesmas — só o backend que as
  sustenta mudou de "Base44 gerenciado" para "Node/Postgres próprio".

## 6. Rodando localmente para testar antes do deploy

```bash
npm install
docker compose up -d db            # sobe um Postgres local só para dev (porta 5433)
cp .env.example .env                # já vem apontando para localhost:5433
npx prisma migrate dev              # cria as tabelas
npm run dev:all                     # sobe frontend (Vite) + backend (Express) juntos
```

Acesse `http://localhost:5173`.
