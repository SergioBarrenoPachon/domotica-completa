import express from 'express';
import { db } from '../db/database.js';

const router = express.Router();

// GET /api/shopping - Obtener lista de la compra
router.get('/', (req, res) => {
  try {
    const list = db.getShoppingList();
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/shopping - Añadir producto a la lista
router.post('/', (req, res) => {
  try {
    const { name, category, quantity, checked, fromMealPlan, notes } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'El nombre del producto es obligatorio' });
    }
    const item = db.addShoppingItem({ name, category, quantity, checked, fromMealPlan, notes });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/shopping/:id - Actualizar estado (ej. tachar) o datos
router.patch('/:id', (req, res) => {
  try {
    const updated = db.updateShoppingItem(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/shopping/:id - Eliminar producto
router.delete('/:id', (req, res) => {
  try {
    const result = db.deleteShoppingItem(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/shopping/clear-completed - Limpiar productos comprados / tachados
router.post('/clear-completed', (req, res) => {
  try {
    const list = db.clearCheckedShoppingItems();
    res.json({ success: true, data: list, message: 'Productos comprados limpiados' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/shopping/sync - Sincronización Inteligente: Compara menú semanal + stock de despensa
router.post('/sync', (req, res) => {
  try {
    const result = db.syncShoppingListFromPlan();
    res.json({
      success: true,
      data: result.shoppingList,
      newlyAddedCount: result.newlyAddedCount,
      message: result.newlyAddedCount > 0 
        ? `Se han añadido ${result.newlyAddedCount} ingredientes faltantes a la lista`
        : 'Tu despensa cuenta con todos los ingredientes para el menú planificado'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
