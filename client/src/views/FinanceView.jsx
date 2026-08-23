import React, { useState, useEffect } from 'react';
import { 
  Landmark, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Check, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Calendar, 
  Layers, 
  Edit3, 
  Trash2, 
  Sparkles, 
  RotateCcw,
  PieChart as PieIcon,
  Tag,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Modal from '../components/Modal';

export default function FinanceView({ api, onRefreshDashboard }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [monthData, setMonthData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [newTxModal, setNewTxModal] = useState(false);
  const [editTxModal, setEditTxModal] = useState(null); // the item being edited
  const [overrideChoiceModal, setOverrideChoiceModal] = useState(null); // { item, form }

  // Forms
  const [txForm, setTxForm] = useState({
    title: '',
    amount: '',
    type: 'gasto', // 'ingreso' | 'gasto'
    category: 'Vivienda',
    frequency: 'mensual', // 'mensual' | 'trimestral' | 'semestral' | 'anual' | 'puntual'
    dayOfMonth: 1,
    monthOfYear: 1
  });

  const [editForm, setEditForm] = useState({
    title: '',
    amount: '',
    category: '',
    notes: ''
  });

  useEffect(() => {
    loadMonthData(currentMonth);
  }, [currentMonth]);

  const loadMonthData = async (monthKey) => {
    try {
      setLoading(true);
      const data = await api.getMonthFinance(monthKey);
      setMonthData(data);
    } catch (err) {
      console.error('Error cargando finanzas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const date = new Date(y, m - 2, 1);
    setCurrentMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const date = new Date(y, m, 1);
    setCurrentMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setCurrentMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  };

  // Toggle Paid / Cobrado checkbox
  const handleTogglePaid = async (item) => {
    try {
      const newPaid = !item.paid;
      await api.togglePaymentStatus(currentMonth, item.id, newPaid);
      if (newPaid) {
        confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } });
      }
      loadMonthData(currentMonth);
      onRefreshDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  // Open edit modal for an item
  const handleOpenEdit = (item) => {
    setEditTxModal(item);
    setEditForm({
      title: item.title,
      amount: item.amount,
      category: item.category,
      notes: item.overrideNotes || ''
    });
  };

  // Save edit - Triggers choice between "Only this month" and "All future months"
  const handleTriggerChoice = (e) => {
    e.preventDefault();
    if (!editTxModal) return;
    setOverrideChoiceModal({
      item: editTxModal,
      form: { ...editForm }
    });
  };

  // Option 1: Modify only this month (Create Override)
  const handleConfirmOnlyThisMonth = async () => {
    if (!overrideChoiceModal) return;
    const { item, form } = overrideChoiceModal;
    try {
      await api.createMonthOverride(item.id, currentMonth, {
        title: form.title,
        amount: Number(form.amount),
        category: form.category,
        notes: form.notes || 'Excepción puntual de este mes'
      });
      setOverrideChoiceModal(null);
      setEditTxModal(null);
      loadMonthData(currentMonth);
      onRefreshDashboard();
    } catch (err) {
      alert('Error guardando excepción');
    }
  };

  // Option 2: Modify master rule for all future months
  const handleConfirmFutureRule = async () => {
    if (!overrideChoiceModal) return;
    const { item, form } = overrideChoiceModal;
    try {
      await api.updateTransactionRule(item.id, {
        title: form.title,
        amount: Number(form.amount),
        category: form.category
      });
      setOverrideChoiceModal(null);
      setEditTxModal(null);
      loadMonthData(currentMonth);
      onRefreshDashboard();
    } catch (err) {
      alert('Error actualizando regla maestra');
    }
  };

  // Remove override and restore original rule
  const handleRemoveOverride = async (overrideId) => {
    try {
      await api.deleteMonthOverride(overrideId);
      loadMonthData(currentMonth);
      onRefreshDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  // Create new transaction
  const handleCreateTx = async (e) => {
    e.preventDefault();
    if (!txForm.title || !txForm.amount) return;
    try {
      await api.addFinanceTransaction({
        ...txForm,
        amount: Number(txForm.amount),
        startDate: currentMonth
      });
      setNewTxModal(false);
      setTxForm({
        title: '',
        amount: '',
        type: 'gasto',
        category: 'Vivienda',
        frequency: 'mensual',
        dayOfMonth: 1,
        monthOfYear: 1
      });
      loadMonthData(currentMonth);
      onRefreshDashboard();
    } catch (err) {
      alert('Error creando transacción');
    }
  };

  // Delete transaction rule
  const handleDeleteTx = async (id) => {
    if (window.confirm('¿Eliminar esta transacción y todas sus recurrencias?')) {
      try {
        await api.deleteFinanceTransaction(id);
        loadMonthData(currentMonth);
        onRefreshDashboard();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const formattedMonthLabel = (() => {
    const [y, m] = currentMonth.split('-');
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  })();

  const items = monthData?.items || [];
  const totalIncome = monthData?.totalIncome || 0;
  const totalExpenses = monthData?.totalExpenses || 0;
  const projectedBalance = monthData?.projectedBalance || 0;
  const paidIncome = monthData?.paidIncome || 0;
  const paidExpenses = monthData?.paidExpenses || 0;
  const actualBalance = monthData?.currentActualBalance || 0;
  const categoryList = monthData?.categoryList || [];

  return (
    <div className="space-y-6 pb-28">
      
      {/* Header & Month Navigator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Landmark className="w-6 h-6" />
            </span>
            Economía Doméstica
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Motor de ingresos y gastos recurrentes con sistema de excepciones mensuales.
          </p>
        </div>

        {/* NAVEGADOR MENSUAL GIGANTE TÁCTIL */}
        <div className="flex items-center gap-2 bg-surface p-1.5 rounded-3xl border border-white/10 shadow-lg">
          <button
            onClick={handlePrevMonth}
            className="min-h-touch min-w-touch p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center touch-press"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={handleCurrentMonth}
            className="px-4 py-2 text-center min-w-[140px] sm:min-w-[180px] touch-press"
            title="Ir al mes actual"
          >
            <span className="text-xs uppercase font-bold text-amber-400 block tracking-wider font-display">
              Mes Seleccionado
            </span>
            <span className="text-base sm:text-lg font-extrabold text-white capitalize font-display">
              {formattedMonthLabel}
            </span>
          </button>

          <button
            onClick={handleNextMonth}
            className="min-h-touch min-w-touch p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center touch-press"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 1. RESUMEN FINANCIERO VISUAL (Bento KPIs + Barras) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Ingresos Proyectados */}
        <div className="glass-panel p-5 rounded-3xl border border-emerald-500/20 bg-emerald-950/15 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-display">
              Total Ingresos
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-white font-mono">
              +{totalIncome.toFixed(2)}€
            </p>
            <p className="text-xs text-emerald-300 mt-1">
              Cobrado hasta hoy: <span className="font-bold">{paidIncome.toFixed(2)}€</span>
            </p>
          </div>
        </div>

        {/* Gastos Proyectados */}
        <div className="glass-panel p-5 rounded-3xl border border-rose-500/20 bg-rose-950/15 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 font-display">
              Total Gastos
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-white font-mono">
              -{totalExpenses.toFixed(2)}€
            </p>
            <p className="text-xs text-rose-300 mt-1">
              Pagado hasta hoy: <span className="font-bold">{paidExpenses.toFixed(2)}€</span>
            </p>
          </div>
        </div>

        {/* Balance Neto */}
        <div className={`glass-panel p-5 rounded-3xl border flex flex-col justify-between ${
          projectedBalance >= 0 ? 'border-brand-500/30 bg-brand-950/15' : 'border-rose-500/30 bg-rose-950/20'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-400 font-display">
              Balance Proyectado
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 text-white font-mono">
              {projectedBalance >= 0 ? 'Ahorro Positivo' : 'Déficit'}
            </span>
          </div>
          <div className="mt-3">
            <p className={`text-3xl font-black font-mono ${projectedBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {projectedBalance >= 0 ? `+${projectedBalance.toFixed(2)}€` : `${projectedBalance.toFixed(2)}€`}
            </p>
            <p className="text-xs text-slate-300 mt-1">
              Caja real actual: <span className="font-bold">{actualBalance.toFixed(2)}€</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. DISTRIBUCIÓN POR CATEGORÍAS */}
      {categoryList.length > 0 && (
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-amber-400" />
              <span>Distribución del Gasto del Mes</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Total {totalExpenses.toFixed(2)}€</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
            {categoryList.map((cat) => (
              <div key={cat.name} className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-1">
                <span className="text-xs font-semibold text-slate-300 truncate block">{cat.name}</span>
                <p className="text-base font-bold text-white font-mono">{cat.amount}€</p>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full" style={{ width: `${cat.percentage}%` }} />
                </div>
                <span className="text-[10px] text-slate-400 block text-right">{cat.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. LISTADO DE TRANSACCIONES DEL MES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white font-display">
            Cobros y Pagos de {formattedMonthLabel}
          </h3>

          <button
            onClick={() => setNewTxModal(true)}
            className="min-h-touch px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-950/60 touch-press"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Transacción</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {items.map((item) => {
            const isExpense = item.type === 'gasto';

            return (
              <motion.div
                key={item.id}
                layout
                className={`glass-panel p-4 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  item.paid ? 'border-white/10 bg-surface/60' : 'border-amber-500/20 bg-surface'
                }`}
              >
                {/* Left: Checkbox táctil & Título */}
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* BIG TOUCH CHECKBOX */}
                  <button
                    onClick={() => handleTogglePaid(item)}
                    className={`min-h-[48px] min-w-[48px] rounded-2xl flex items-center justify-center border-2 transition-all flex-shrink-0 touch-press ${
                      item.paid
                        ? 'bg-emerald-500 border-emerald-400 text-white shadow-glow-brand'
                        : 'border-slate-500 bg-black/30 text-transparent hover:border-slate-400'
                    }`}
                    aria-label={item.paid ? 'Marcar como pendiente' : 'Marcar como pagado'}
                  >
                    <Check className={`w-6 h-6 stroke-[3] ${item.paid ? 'opacity-100' : 'opacity-0'}`} />
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-base font-bold truncate ${item.paid ? 'line-through text-slate-400' : 'text-white'}`}>
                        {item.title}
                      </h4>

                      {/* Overridden Badge */}
                      {item.isOverridden && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-500/30 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Excepción Este Mes
                        </span>
                      )}

                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-400 capitalize">
                        {item.frequency} (Día {item.dayOfMonth})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <span className="font-semibold text-slate-300">{item.category}</span>
                      <span>•</span>
                      <span className={item.paid ? 'text-emerald-400 font-bold' : 'text-amber-400 font-semibold'}>
                        {item.paid ? `✓ ${isExpense ? 'Pagado' : 'Cobrado'}` : `⏳ Pendiente`}
                      </span>
                      {item.overrideNotes && (
                        <span className="italic text-purple-300 text-[11px] truncate">({item.overrideNotes})</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Monto y Acciones Táctiles */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <div className="text-right">
                    <span className={`text-xl sm:text-2xl font-black font-mono ${
                      isExpense ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {isExpense ? '-' : '+'}{item.amount.toFixed(2)}€
                    </span>
                    {item.isOverridden && (
                      <span className="text-[10px] text-slate-500 block line-through">
                        Normal: {item.originalAmount.toFixed(2)}€
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Botón Editar / Crear Excepción */}
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center touch-press"
                      title="Editar importe o regla"
                      aria-label="Editar transacción"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Si tiene excepción, botón para eliminarla y restablecer la regla original */}
                    {item.isOverridden && (
                      <button
                        onClick={() => handleRemoveOverride(item.overrideId)}
                        className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 flex items-center justify-center touch-press"
                        title="Restablecer importe original recurrente"
                        aria-label="Restablecer excepción"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}

                    {/* Botón Eliminar Transacción Maestra */}
                    <button
                      onClick={() => handleDeleteTx(item.id)}
                      className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center touch-press"
                      title="Eliminar transacción recurrente"
                      aria-label="Eliminar transacción"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {items.length === 0 && (
            <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 space-y-3">
              <Landmark className="w-12 h-12 text-slate-500 mx-auto" />
              <h3 className="text-xl font-bold text-white font-display">Sin transacciones para este mes</h3>
              <p className="text-sm text-slate-400">
                Añade tus ingresos o gastos periódicos usando el botón "Nueva Transacción".
              </p>
            </div>
          )}
        </div>
      </div>

      {/* DIÁLOGO / MODAL DE EDICIÓN CON SISTEMA DE EXCEPCIONES */}
      <Modal
        isOpen={Boolean(editTxModal)}
        onClose={() => setEditTxModal(null)}
        title="Modificar Transacción"
        subtitle={`Transacción: ${editTxModal?.title}`}
      >
        <form onSubmit={handleTriggerChoice} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Título / Concepto</label>
            <input
              type="text"
              required
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Importe (€)</label>
              <input
                type="number"
                step="0.01"
                required
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Categoría</label>
              <select
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="Sueldo">Sueldo</option>
                <option value="Freelance">Freelance</option>
                <option value="Vivienda">Vivienda</option>
                <option value="Suministros">Suministros</option>
                <option value="Comunicaciones">Comunicaciones</option>
                <option value="Seguros">Seguros</option>
                <option value="Vehículo">Vehículo</option>
                <option value="Alimentación">Alimentación</option>
                <option value="Impuestos">Impuestos</option>
                <option value="Ocio">Ocio</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Motivo / Notas de la Modificación</label>
            <input
              type="text"
              placeholder="Ej: Factura más alta por uso de calefacción/aire..."
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditTxModal(null)}
              className="min-h-touch px-4 py-2.5 rounded-2xl bg-white/5 text-slate-300 font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-touch px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-950/60"
            >
              Continuar a Opciones
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL DE DECISIÓN CRÍTICA DE RECURRENCIA (ESTE MES VS TODOS LOS MESES) */}
      <Modal
        isOpen={Boolean(overrideChoiceModal)}
        onClose={() => setOverrideChoiceModal(null)}
        title="¿Cómo deseas aplicar esta modificación?"
        subtitle="Elige el alcance de este cambio en tu motor financiero"
      >
        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-300">
            Has cambiado el importe a <span className="font-bold text-amber-400 font-mono">{overrideChoiceModal?.form.amount}€</span> para <span className="font-semibold text-white">"{overrideChoiceModal?.form.title}"</span>.
          </p>

          <div className="space-y-3 pt-2">
            {/* OPCIÓN 1: MODIFICAR SOLO ESTE MES */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleConfirmOnlyThisMonth}
              className="w-full p-4 rounded-3xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/50 text-left transition-all flex items-start gap-3.5 shadow-lg shadow-purple-950/50 touch-press"
            >
              <div className="w-10 h-10 rounded-2xl bg-purple-500/30 text-purple-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-purple-200 font-display">
                  1. Modificar solo este mes ({formattedMonthLabel})
                </h4>
                <p className="text-xs text-purple-300/80 mt-1 leading-relaxed">
                  Crea una excepción puntual exclusivamente para este mes. Los meses anteriores y futuros conservarán la regla recurrente original.
                </p>
              </div>
            </motion.button>

            {/* OPCIÓN 2: MODIFICAR LA REGLA GENERAL RECURRENTE */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleConfirmFutureRule}
              className="w-full p-4 rounded-3xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/50 text-left transition-all flex items-start gap-3.5 shadow-lg shadow-amber-950/50 touch-press"
            >
              <div className="w-10 h-10 rounded-2xl bg-amber-500/30 text-amber-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Layers className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-amber-200 font-display">
                  2. Modificar la regla para todos los meses futuros
                </h4>
                <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
                  Actualiza la plantilla maestra de la transacción recurrente de forma permanente para todos los periodos sucesivos.
                </p>
              </div>
            </motion.button>
          </div>
        </div>
      </Modal>

      {/* MODAL: CREAR NUEVA TRANSACCIÓN */}
      <Modal
        isOpen={newTxModal}
        onClose={() => setNewTxModal(false)}
        title="Nueva Transacción o Regla Periódica"
        subtitle="Registra un cobro o pago en la economía del hogar"
      >
        <form onSubmit={handleCreateTx} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Concepto / Título</label>
            <input
              type="text"
              required
              placeholder="Ej: Nómina, Hipoteca, Seguro, Fibra óptica..."
              value={txForm.title}
              onChange={(e) => setTxForm({ ...txForm, title: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Tipo</label>
              <select
                value={txForm.type}
                onChange={(e) => setTxForm({ ...txForm, type: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="gasto">📉 Gasto / Pago</option>
                <option value="ingreso">📈 Ingreso / Cobro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Importe (€)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={txForm.amount}
                onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Frecuencia</label>
              <select
                value={txForm.frequency}
                onChange={(e) => setTxForm({ ...txForm, frequency: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="mensual">Mensual</option>
                <option value="trimestral">Trimestral (cada 3 meses)</option>
                <option value="semestral">Semestral (Jun y Dic)</option>
                <option value="anual">Anual</option>
                <option value="puntual">Puntual (solo un mes)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Día de Cobro/Pago</label>
              <input
                type="number"
                min="1"
                max="31"
                value={txForm.dayOfMonth}
                onChange={(e) => setTxForm({ ...txForm, dayOfMonth: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Categoría</label>
            <select
              value={txForm.category}
              onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500"
            >
              <option value="Sueldo">Sueldo</option>
              <option value="Freelance">Freelance</option>
              <option value="Vivienda">Vivienda</option>
              <option value="Suministros">Suministros</option>
              <option value="Comunicaciones">Comunicaciones</option>
              <option value="Seguros">Seguros</option>
              <option value="Vehículo">Vehículo</option>
              <option value="Alimentación">Alimentación</option>
              <option value="Impuestos">Impuestos</option>
              <option value="Ocio">Ocio</option>
              <option value="General">General</option>
            </select>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setNewTxModal(false)}
              className="min-h-touch px-4 py-2.5 rounded-2xl bg-white/5 text-slate-300 font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-touch px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-950/60"
            >
              Crear Transacción
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
