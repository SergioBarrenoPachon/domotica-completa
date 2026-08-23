import express from 'express';
import { db } from '../db/database.js';

const router = express.Router();

// GET /api/finance/month/:month - Obtener proyección y resumen financiero del mes (ej: '2026-08')
router.get('/month/:month', (req, res) => {
  try {
    const { month } = req.params;
    const summary = db.calculateMonthFinance(month);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/finance/transactions - Obtener reglas maestras de transacciones
router.get('/transactions', (req, res) => {
  try {
    const list = db.getFinanceTransactions();
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/finance/transactions - Crear nueva transacción / ingreso / gasto recurrente o puntual
router.post('/transactions', (req, res) => {
  try {
    const { title, amount, type, category, frequency, dayOfMonth, monthOfYear, startDate, active } = req.body;
    if (!title || amount === undefined) {
      return res.status(400).json({ success: false, error: 'Título y monto son requeridos' });
    }
    const newTx = db.addFinanceTransaction({ title, amount, type, category, frequency, dayOfMonth, monthOfYear, startDate, active });
    res.status(201).json({ success: true, data: newTx });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/finance/transactions/:id - Modificar regla recurrente maestra (para todos los meses futuros)
router.put('/transactions/:id', (req, res) => {
  try {
    const result = db.updateFinanceTransaction(req.params.id, req.body, 'future');
    if (!result) {
      return res.status(404).json({ success: false, error: 'Transacción no encontrada' });
    }
    res.json({ success: true, data: result.transaction, message: 'Regla maestra actualizada para meses futuros' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/finance/override - Crear o actualizar excepción puntual de un mes ("Modificar solo este mes")
router.post('/override', (req, res) => {
  try {
    const { transactionId, month, amount, title, category, notes } = req.body;
    if (!transactionId || !month || amount === undefined) {
      return res.status(400).json({ success: false, error: 'transactionId, month y amount son requeridos' });
    }
    const override = db.createMonthOverride(transactionId, month, { amount, title, category, notes });
    res.status(201).json({ success: true, data: override, message: 'Excepción creada exclusivamente para el mes seleccionado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/finance/override/:id - Eliminar una excepción puntual
router.delete('/override/:id', (req, res) => {
  try {
    const result = db.deleteMonthOverride(req.params.id);
    res.json({ success: true, data: result, message: 'Excepción eliminada, restableciendo regla original' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/finance/payment-status - Alternar estado Pagado / Cobrado para un mes concreto
router.post('/payment-status', (req, res) => {
  try {
    const { month, transactionId, paid } = req.body;
    if (!month || !transactionId) {
      return res.status(400).json({ success: false, error: 'month y transactionId son requeridos' });
    }
    const payment = db.togglePaymentStatus(month, transactionId, paid);
    res.json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/finance/transactions/:id - Eliminar transacción recurrente por completo
router.delete('/transactions/:id', (req, res) => {
  try {
    const result = db.deleteFinanceTransaction(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
