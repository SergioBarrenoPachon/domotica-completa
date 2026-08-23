import express from 'express';
import { db } from '../db/database.js';

const router = express.Router();

// GET /api/pantry - Obtener inventario de despensa, nevera y congelador
router.get('/', (req, res) => {
  try {
    const pantry = db.getPantry();
    res.json({ success: true, data: pantry });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/pantry - Añadir nuevo alimento
router.post('/', (req, res) => {
  try {
    const { name, zone, quantity, unit, minQuantity, category, expiration } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'El nombre es obligatorio' });
    }
    const newItem = db.addPantryItem({ name, zone, quantity, unit, minQuantity, category, expiration });
    res.status(201).json({ success: true, data: newItem });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/pantry/:id - Actualizar alimento
router.patch('/:id', (req, res) => {
  try {
    const updated = db.updatePantryItem(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Item no encontrado' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/pantry/:id/adjust - Ajuste rápido táctil (+1 / -1)
router.post('/:id/adjust', (req, res) => {
  try {
    const delta = Number(req.body.delta) || 0;
    const updated = db.adjustPantryQuantity(req.params.id, delta);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Item no encontrado' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/pantry/:id - Eliminar alimento
router.delete('/:id', (req, res) => {
  try {
    const result = db.deletePantryItem(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
