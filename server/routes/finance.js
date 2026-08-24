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
// GET /api/finance/long-term - Motor de proyección patrimonial y presupuestaria (1 a 30 años)
router.get('/long-term', (req, res) => {
  try {
    const { years = 10, startYear, inflation = 2.5, growth = 2.0, netWorth = 15000, extraSavings = 0 } = req.query;
    const projection = db.calculateLongTermProjection({
      yearsCount: parseInt(years, 10),
      startYear: startYear ? parseInt(startYear, 10) : new Date().getFullYear(),
      inflationRate: parseFloat(inflation),
      salaryGrowthRate: parseFloat(growth),
      initialNetWorth: parseFloat(netWorth),
      monthlyExtraSavings: parseFloat(extraSavings)
    });
    res.json({ success: true, data: projection });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- LOANS & MORTGAGES ENDPOINTS ---
// GET /api/finance/loans
router.get('/loans', (req, res) => {
  try {
    const loans = db.getLoans();
    res.json({ success: true, data: loans });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/finance/loans - Crear préstamo o hipoteca
router.post('/loans', (req, res) => {
  try {
    const newLoan = db.addLoan(req.body);
    res.status(201).json({ success: true, data: newLoan });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/finance/loans/:id - Actualizar datos de préstamo
router.put('/loans/:id', (req, res) => {
  try {
    const updated = db.updateLoan(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Préstamo no encontrado' });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/finance/loans/:id - Eliminar préstamo
router.delete('/loans/:id', (req, res) => {
  try {
    const result = db.deleteLoan(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/finance/loans/:id/simulate - Simular amortización anticipada (reducir plazo vs reducir cuota)
router.post('/loans/:id/simulate', (req, res) => {
  try {
    const { extraAmount, mode = 'reduce_term' } = req.body;
    if (!extraAmount || extraAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Importe extraordinario requerido y mayor a 0' });
    }
    const result = db.simulateLoanAmortization(req.params.id, extraAmount, mode);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// --- SAVINGS GOALS ENDPOINTS ---
// GET /api/finance/goals
router.get('/goals', (req, res) => {
  try {
    const goals = db.getGoals();
    res.json({ success: true, data: goals });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/finance/goals - Crear meta de ahorro
router.post('/goals', (req, res) => {
  try {
    const newGoal = db.addGoal(req.body);
    res.status(201).json({ success: true, data: newGoal });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/finance/goals/:id - Actualizar meta
router.put('/goals/:id', (req, res) => {
  try {
    const updated = db.updateGoal(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Meta no encontrada' });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/finance/goals/:id - Eliminar meta
router.delete('/goals/:id', (req, res) => {
  try {
    const result = db.deleteGoal(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/finance/goals/:id/contribute - Añadir aportación puntual a una meta
router.post('/goals/:id/contribute', (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Monto de aportación requerido' });
    }
    const goal = db.contributeGoal(req.params.id, amount);
    res.json({ success: true, data: goal });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
