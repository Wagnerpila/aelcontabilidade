# A&L Contabilidade

Sistema de processamento inteligente de documentos, cadastro de clientes e
envio de notificações (e-mail e WhatsApp) para escritórios de contabilidade.

Stack: React + Vite no frontend, Node/Express + PostgreSQL (via Prisma) no
backend, Anthropic Claude para OCR/extração de dados dos documentos, e n8n +
Evolution API para o envio de WhatsApp (integração inalterada).

## Rodando localmente

Pré-requisitos: Node.js 20+, Docker (para o Postgres local) ou um Postgres já
instalado.

```bash
npm install
docker compose up -d db      # sobe um Postgres local (só para dev, porta 5433)
cp .env.example .env         # preencha ANTHROPIC_API_KEY etc. (DATABASE_URL já vem certo)
npx prisma migrate dev       # cria as tabelas
npm run dev:all              # sobe o frontend (Vite) e o backend (Express) juntos
```

Acesse `http://localhost:5173`. O primeiro usuário cadastrado em `/register`
vira administrador automaticamente.

## Deploy em produção

Veja [`DEPLOY.md`](./DEPLOY.md) para o passo a passo de publicação via
EasyPanel (domínio próprio + SSL + Postgres gerenciado).
