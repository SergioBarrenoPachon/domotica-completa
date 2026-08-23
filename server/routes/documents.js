import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from '../db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Multer storage for photos/PDFs
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB max
});

const router = express.Router();

// GET /api/documents - Obtener todos los documentos con estados calculados de garantía
router.get('/', (req, res) => {
  try {
    const docs = db.getDocuments();
    res.json({ success: true, data: docs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/documents - Crear nuevo documento con o sin archivo adjunto
router.post('/', upload.single('file'), (req, res) => {
  try {
    const { title, category, issuer, modelOrPolicy, purchaseDate, warrantyExpiryDate, notes, tags } = req.body;
    
    if (!title) {
      return res.status(400).json({ success: false, error: 'El título del documento es obligatorio' });
    }

    let fileUrl = null;
    let fileName = null;
    let fileType = 'application/pdf';
    let fileSize = '0 KB';

    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
      fileName = req.file.originalname;
      fileType = req.file.mimetype;
      const bytes = req.file.size;
      fileSize = bytes > 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
    }

    const newDoc = db.addDocument({
      title,
      category,
      issuer,
      modelOrPolicy,
      purchaseDate,
      warrantyExpiryDate,
      notes,
      tags,
      fileUrl,
      fileName,
      fileType,
      fileSize
    });

    res.status(201).json({ success: true, data: newDoc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/documents/:id - Actualizar metadatos del documento
router.patch('/:id', (req, res) => {
  try {
    const updated = db.updateDocument(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Documento no encontrado' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/documents/:id - Eliminar documento y archivo físico asociado
router.delete('/:id', (req, res) => {
  try {
    const docs = db.getDocuments();
    const docToDelete = docs.find(d => d.id === req.params.id);

    if (docToDelete && docToDelete.fileUrl && docToDelete.fileUrl.startsWith('/uploads/')) {
      const filePath = path.join(UPLOADS_DIR, path.basename(docToDelete.fileUrl));
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { console.error('Error unlinking file', e); }
      }
    }

    const result = db.deleteDocument(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
