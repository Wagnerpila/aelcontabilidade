import express from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = express.Router();

const MODELS = {
  Cliente: { delegate: prisma.cliente, booleanFields: ['ativo'], userScoped: true },
  Documento: {
    delegate: prisma.documento,
    booleanFields: ['status_leitura', 'status_identificacao', 'status_organizacao', 'status_email', 'status_whatsapp'],
    userScoped: true,
  },
  Empresa: { delegate: prisma.empresa, booleanFields: ['ativa', 'n8n_ativo'], userScoped: false },
  GerenciamentoEnvio: { delegate: prisma.gerenciamentoEnvio, booleanFields: ['dctfweb_pendente'], userScoped: true },
  NotificationTemplate: { delegate: prisma.notificationTemplate, booleanFields: [], userScoped: false },
  SystemConfig: { delegate: prisma.systemConfig, booleanFields: ['is_active'], userScoped: false },
  User: { delegate: prisma.user, booleanFields: [], userScoped: false, adminOnly: true },
};

function parseSort(sort) {
  if (!sort) return undefined;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  return { [field]: desc ? 'desc' : 'asc' };
}

function buildWhere(entityDef, query, user) {
  const where = {};
  for (const [key, value] of Object.entries(query)) {
    if (key === 'sort' || key === 'limit') continue;
    where[key] = entityDef.booleanFields.includes(key) ? value === 'true' : value;
  }
  if (entityDef.userScoped && user.role !== 'admin') {
    where.user_id = user.id;
  }
  return where;
}

function sanitizeUser(row) {
  if (!row || typeof row !== 'object') return row;
  const { password_hash, ...rest } = row;
  return rest;
}

function cleanCreateData(body, user) {
  const data = { ...body, created_by: user.id };
  delete data.id;
  delete data.created_date;
  delete data.updated_date;
  return data;
}

router.use(requireAuth);

router.param('entity', (req, res, next, entity) => {
  const def = MODELS[entity];
  if (!def) return res.status(404).json({ error: 'Entidade não encontrada' });
  if (def.adminOnly && req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  req.entityDef = def;
  req.entityName = entity;
  next();
});

router.get(
  '/:entity',
  asyncHandler(async (req, res) => {
    const where = buildWhere(req.entityDef, req.query, req.user);
    const orderBy = parseSort(req.query.sort);
    const take = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
    const rows = await req.entityDef.delegate.findMany({ where, orderBy, take });
    res.json(req.entityName === 'User' ? rows.map(sanitizeUser) : rows);
  })
);

router.get(
  '/:entity/:id',
  asyncHandler(async (req, res) => {
    const row = await req.entityDef.delegate.findUnique({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ error: 'Não encontrado' });
    res.json(req.entityName === 'User' ? sanitizeUser(row) : row);
  })
);

router.post(
  '/:entity/bulk',
  asyncHandler(async (req, res) => {
    const items = Array.isArray(req.body) ? req.body : [];
    const results = await prisma.$transaction(
      items.map((item) => {
        const data = cleanCreateData(item, req.user);
        if (req.entityDef.userScoped && (req.user.role !== 'admin' || !data.user_id)) data.user_id = req.user.id;
        return req.entityDef.delegate.create({ data });
      })
    );
    res.status(201).json(results);
  })
);

router.post(
  '/:entity',
  asyncHandler(async (req, res) => {
    const data = cleanCreateData(req.body, req.user);
    if (req.entityDef.userScoped && (req.user.role !== 'admin' || !data.user_id)) {
      data.user_id = req.user.id;
    }
    const row = await req.entityDef.delegate.create({ data });
    res.status(201).json(row);
  })
);

router.patch(
  '/:entity/:id',
  asyncHandler(async (req, res) => {
    const data = { ...req.body };
    delete data.id;
    delete data.created_date;
    delete data.updated_date;
    delete data.created_by;
    const row = await req.entityDef.delegate.update({ where: { id: req.params.id }, data });
    res.json(req.entityName === 'User' ? sanitizeUser(row) : row);
  })
);

router.delete(
  '/:entity/:id',
  asyncHandler(async (req, res) => {
    await req.entityDef.delegate.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

export default router;
