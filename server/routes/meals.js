import express from 'express';
import { db } from '../db/database.js';

const router = express.Router();

// GET /api/meals - Obtener el plan de comidas semanal y recetas
router.get('/', (req, res) => {
  try {
    const meals = db.getMeals();
    res.json({ success: true, data: meals });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/meals/plan - Actualizar toda la semana
router.put('/plan', (req, res) => {
  try {
    const { days } = req.body;
    if (!Array.isArray(days)) {
      return res.status(400).json({ success: false, error: 'Days must be an array' });
    }
    const updatedDays = db.updateMealPlan(days);
    res.json({ success: true, data: updatedDays });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/meals/day/:dayId - Actualizar un día específico
router.patch('/day/:dayId', (req, res) => {
  try {
    const { dayId } = req.params;
    const day = db.updateDayMeal(dayId, req.body);
    if (!day) {
      return res.status(404).json({ success: false, error: 'Day not found' });
    }
    res.json({ success: true, data: day });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/meals/suggest - Sugerir menú semanal automáticamente
router.post('/suggest', (req, res) => {
  try {
    const suggested = db.suggestRandomMenu();
    res.json({ success: true, data: suggested, message: 'Menú sugerido con éxito' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
