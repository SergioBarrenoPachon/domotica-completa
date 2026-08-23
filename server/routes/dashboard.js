import express from 'express';
import { db } from '../db/database.js';

const router = express.Router();

// GET /api/dashboard - Resumen general de alertas, domótica, finanzas y comidas
router.get('/', (req, res) => {
  try {
    const summary = db.getDashboardSummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
