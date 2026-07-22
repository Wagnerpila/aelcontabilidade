import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';
import { invokeLLM, extractDataFromFile } from '../lib/anthropic.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const router = express.Router();

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${crypto.randomUUID()}_${safeName}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

function resolveLocalFile(fileUrl) {
  const pathname = new URL(fileUrl, 'http://localhost').pathname;
  const filename = path.basename(pathname);
  const resolved = path.join(UPLOADS_DIR, filename);
  if (!resolved.startsWith(UPLOADS_DIR)) {
    throw new Error('Caminho de arquivo inválido');
  }
  return resolved;
}

router.post('/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Arquivo obrigatório' });
  const base = process.env.APP_PUBLIC_URL || '';
  res.json({ file_url: `${base}/uploads/${req.file.filename}` });
});

router.post('/invoke-llm', requireAuth, async (req, res) => {
  try {
    const { prompt, file_urls } = req.body || {};
    const fileBuffers = (file_urls || []).map((url) => fs.readFileSync(resolveLocalFile(url)));
    const text = await invokeLLM({ prompt, fileBuffers });
    res.json({ text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/extract-file', requireAuth, async (req, res) => {
  try {
    const { file_url, json_schema } = req.body || {};
    const fileBuffer = fs.readFileSync(resolveLocalFile(file_url));
    const result = await extractDataFromFile({ fileBuffer, jsonSchema: json_schema });
    res.json(result);
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

export default router;
