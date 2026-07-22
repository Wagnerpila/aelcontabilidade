import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { requireAuth, signSession, COOKIE_NAME, COOKIE_OPTIONS } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = express.Router();

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, password, full_name } = req.body || {};
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'E-mail já cadastrado.' });

    const userCount = await prisma.user.count();
    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password_hash,
        full_name,
        role: userCount === 0 ? 'admin' : 'user',
      },
    });

    const token = signSession(user.id);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    const { password_hash: _omit, ...safeUser } = user;
    res.status(201).json(safeUser);
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
    if (!user || !(await bcrypt.compare(password || '', user.password_hash))) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    const token = signSession(user.id);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    const { password_hash, ...safeUser } = user;
    res.json(safeUser);
  })
);

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
  res.json({ success: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = { ...req.body };
    delete data.id;
    delete data.email;
    delete data.password_hash;
    delete data.role;
    delete data.plan;
    // Impede auto-aprovação: só o admin pode aprovar/rejeitar via /api/entities/User
    if (data.empresa_status && data.empresa_status !== 'pendente') {
      delete data.empresa_status;
    }

    const user = await prisma.user.update({ where: { id: req.user.id }, data });
    const { password_hash, ...safeUser } = user;
    res.json(safeUser);
  })
);

export default router;
