import express from 'express';
import { db } from '../db/database.js';

const router = express.Router();

// GET /api/database/status - Información de salud, persistencia y copias de seguridad
router.get('/status', (req, res) => {
  try {
    const status = db.getDatabaseStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/database/backup - Generar copia de seguridad manual en el servidor
router.post('/backup', (req, res) => {
  try {
    const backup = db.createBackup('manual');
    if (!backup) {
      return res.status(500).json({ success: false, error: 'No se pudo generar la copia de seguridad' });
    }
    res.json({ 
      success: true, 
      data: backup,
      message: 'Copia de seguridad del sistema generada exitosamente en el disco' 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/database/export - Descargar fichero JSON completo de la base de datos
router.get('/export', (req, res) => {
  try {
    const status = db.getDatabaseStatus();
    if (!status.dbFile) {
      return res.status(404).json({ success: false, error: 'Fichero de base de datos no encontrado' });
    }
    const timestamp = new Date().toISOString().slice(0, 10);
    res.download(status.dbFile, `domotica-backup-${timestamp}.json`);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
