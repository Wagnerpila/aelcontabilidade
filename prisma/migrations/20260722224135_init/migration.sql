-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "plan" TEXT NOT NULL DEFAULT 'free',
    "companyName" TEXT,
    "companyIconUrl" TEXT,
    "empresa_id" TEXT,
    "empresa_solicitada" TEXT,
    "empresa_status" TEXT NOT NULL DEFAULT 'pendente',
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf_cnpj" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "preferencia_envio" TEXT NOT NULL DEFAULT 'email',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cliente_id" TEXT,
    "nome_cliente" TEXT NOT NULL,
    "tipo_documento" TEXT NOT NULL,
    "data_documento" TEXT,
    "arquivo_url" TEXT,
    "nome_arquivo" TEXT,
    "status_leitura" BOOLEAN NOT NULL DEFAULT false,
    "status_identificacao" BOOLEAN NOT NULL DEFAULT false,
    "status_organizacao" BOOLEAN NOT NULL DEFAULT false,
    "status_email" BOOLEAN NOT NULL DEFAULT false,
    "status_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "caminho_pasta" TEXT,
    "observacoes" TEXT,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "email_contato" TEXT,
    "logo_url" TEXT,
    "plano" TEXT NOT NULL DEFAULT 'free',
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "n8n_webhook_documentos" TEXT,
    "n8n_webhook_mensagens" TEXT,
    "n8n_ativo" BOOLEAN NOT NULL DEFAULT false,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GerenciamentoEnvio" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "nome_cliente" TEXT,
    "mes_referencia" TEXT NOT NULL,
    "documentos_enviados" JSONB NOT NULL DEFAULT '[]',
    "documentos_nao_enviados" JSONB NOT NULL DEFAULT '[]',
    "dctfweb_pendente" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "GerenciamentoEnvio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "config_key" TEXT NOT NULL,
    "config_value" TEXT NOT NULL,
    "config_type" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Cliente_user_id_idx" ON "Cliente"("user_id");

-- CreateIndex
CREATE INDEX "Documento_user_id_idx" ON "Documento"("user_id");

-- CreateIndex
CREATE INDEX "Documento_cliente_id_idx" ON "Documento"("cliente_id");

-- CreateIndex
CREATE INDEX "GerenciamentoEnvio_user_id_idx" ON "GerenciamentoEnvio"("user_id");

-- CreateIndex
CREATE INDEX "GerenciamentoEnvio_cliente_id_idx" ON "GerenciamentoEnvio"("cliente_id");
