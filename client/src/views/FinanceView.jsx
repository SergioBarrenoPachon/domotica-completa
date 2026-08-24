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
  Calendar as CalendarIcon, 
  Layers, 
  Edit3, 
  Trash2, 
  Sparkles, 
  RotateCcw,
  PieChart as PieIcon,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Target,
  ListOrdered,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Modal from '../components/Modal';

import FinanceCalendar from '../components/finance/FinanceCalendar';
import LongTermProjection from '../components/finance/LongTermProjection';
import LoansManager from '../components/finance/LoansManager';
import SavingsGoals from '../components/finance/SavingsGoals';

export default function FinanceView({ api, onRefreshDashboard }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'calendar' | 'longterm' | 'loans' | 'goals'

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
    monthOfYear: 1,
    startDate: '',
    endDate: '',
    yearlyIncreasePct: 0
  });

  const [editForm, setEditForm] = useState({
    title: '',
    amount: '',
    category: '',
    notes: '',
    dayOfMonth: 1
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
      if (onRefreshDashboard) onRefreshDashboard();
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
      notes: item.overrideNotes || '',
      dayOfMonth: item.dayOfMonth
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
      if (onRefreshDashboard) onRefreshDashboard();
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
        category: form.category,
        dayOfMonth: Number(form.dayOfMonth)
      });
      setOverrideChoiceModal(null);
      setEditTxModal(null);
      loadMonthData(currentMonth);
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      alert('Error actualizando regla maestra');
    }
  };

  // Remove override and restore original rule
  const handleRemoveOverride = async (overrideId) => {
    try {
      await api.deleteMonthOverride(overrideId);
      loadMonthData(currentMonth);
      if (onRefreshDashboard) onRefreshDashboard();
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
        dayOfMonth: Number(txForm.dayOfMonth) || 1,
        startDate: txForm.startDate || currentMonth,
        endDate: txForm.endDate || null,
        yearlyIncreasePct: Number(txForm.yearlyIncreasePct) || 0
      });
      setNewTxModal(false);
      setTxForm({
        title: '',
        amount: '',
        type: 'gasto',
        category: 'Vivienda',
        frequency: 'mensual',
        dayOfMonth: 1,
        monthOfYear: 1,
        startDate: '',
        endDate: '',
        yearlyIncreasePct: 0
      });
      loadMonthData(currentMonth);
      if (onRefreshDashboard) onRefreshDashboard();
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
        if (onRefreshDashboard) onRefreshDashboard();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleOpenAddTxWithDay = ({ dayOfMonth }) => {
    setTxForm({
      title: '',
      amount: '',
      type: 'gasto',
      category: 'Vivienda',
      frequency: 'mensual',
      dayOfMonth: dayOfMonth || 1,
      monthOfYear: 1,
      startDate: currentMonth,
      endDate: '',
      yearlyIncreasePct: 0
    });
    setNewTxModal(true);
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
      
      {/* Header & Subtabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Landmark className="w-6 h-6" />
            </span>
            Economía & Patrimonio del Hogar
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Gestión de ingresos, calendario mensual de recibos, hipotecas y proyecciones a largo plazo (1 a 30 años).
          </p>
        </div>

        {/* NAVEGADOR MENSUAL GIGANTE TÁCTIL (solo si estamos en pestañas mensuales) */}
        {(activeTab === 'overview' || activeTab === 'calendar') && (
          <div className="flex items-center gap-2 bg-surface p-1.5 rounded-3xl border border-white/10 shadow-lg self-start lg:self-auto">
            <button
              onClick={handlePrevMonth}
              className="min-h-touch min-w-touch p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center touch-press"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={handleCurrentMonth}
              className="px-4 py-2 text-center min-w-[140px] sm:min-w-[170px] touch-press"
              title="Ir al mes actual"
            >
              <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider font-display">
                Mes Seleccionado
              </span>
              <span className="text-sm sm:text-base font-extrabold text-white capitalize font-display">
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
        )}
      </div>

      {/* TOP NAVIGATION SUBTABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-all touch-press ${
            activeTab === 'overview'
              ? 'bg-amber-500 text-slate-950 shadow-glow-amber'
              : 'glass-panel text-slate-300 hover:text-white hover:border-white/20'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>Resumen & Recibos</span>
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-all touch-press ${
            activeTab === 'calendar'
              ? 'bg-amber-500 text-slate-950 shadow-glow-amber'
              : 'glass-panel text-slate-300 hover:text-white hover:border-white/20'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Calendario Mensual de Gastos</span>
        </button>

        <button
          onClick={() => setActiveTab('longterm')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-all touch-press ${
            activeTab === 'longterm'
              ? 'bg-amber-500 text-slate-950 shadow-glow-amber'
              : 'glass-panel text-slate-300 hover:text-white hover:border-white/20'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Proyección a Largo Plazo (1 a 30 Años)</span>
        </button>

        <button
          onClick={() => setActiveTab('loans')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-all touch-press ${
            activeTab === 'loans'
              ? 'bg-amber-500 text-slate-950 shadow-glow-amber'
              : 'glass-panel text-slate-300 hover:text-white hover:border-white/20'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Hipotecas y Préstamos</span>
        </button>

        <button
          onClick={() => setActiveTab('goals')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-all touch-press ${
            activeTab === 'goals'
              ? 'bg-amber-500 text-slate-950 shadow-glow-amber'
              : 'glass-panel text-slate-300 hover:text-white hover:border-white/20'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Metas de Ahorro</span>
        </button>

      </div>

      {/* --- TAB CONTENT 1: OVERVIEW & MONTHLY LIST --- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* 1. RESUMEN FINANCIERO VISUAL (Bento KPIs) */}
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
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center touch-press"
                          title="Editar importe o regla"
                          aria-label="Editar transacción"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

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
            </div>
          </div>

        </div>
      )}

      {/* --- TAB CONTENT 2: CALENDARIO MENSUAL INTERACTIVO --- */}
      {activeTab === 'calendar' && (
        <FinanceCalendar
          monthData={monthData}
          currentMonth={currentMonth}
          onTogglePaid={handleTogglePaid}
          onOpenAddTx={handleOpenAddTxWithDay}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onCurrentMonth={handleCurrentMonth}
        />
      )}

      {/* --- TAB CONTENT 3: PROYECCIÓN A LARGO PLAZO (1 A 30 AÑOS) --- */}
      {activeTab === 'longterm' && (
        <LongTermProjection api={api} />
      )}

      {/* --- TAB CONTENT 4: HIPOTECAS Y PRÉSTAMOS --- */}
      {activeTab === 'loans' && (
        <LoansManager api={api} onRefresh={() => loadMonthData(currentMonth)} />
      )}

      {/* --- TAB CONTENT 5: METAS DE AHORRO --- */}
      {activeTab === 'goals' && (
        <SavingsGoals api={api} onRefresh={() => loadMonthData(currentMonth)} />
      )}

      {/* MODAL 1: NUEVA TRANSACCIÓN */}
      {newTxModal && (
        <Modal
          isOpen={true}
          onClose={() => setNewTxModal(false)}
          title="Añadir Nueva Regla de Transacción"
        >
          <form onSubmit={handleCreateTx} className="space-y-4">
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">Título o Concepto *</label>
              <input
                type="text"
                required
                value={txForm.title}
                onChange={(e) => setTxForm({ ...txForm, title: e.target.value })}
                placeholder="Ej: Nómina, Seguro de Vida, Alquiler..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Importe (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={txForm.amount}
                  onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Tipo</label>
                <select
                  value={txForm.type}
                  onChange={(e) => setTxForm({ ...txForm, type: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
                >
                  <option value="gasto">Gasto (Salida de Dinero)</option>
                  <option value="ingreso">Ingreso (Entrada de Dinero)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Categoría</label>
                <select
                  value={txForm.category}
                  onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
                >
                  <option value="Vivienda">Vivienda (Alquiler/Comunidad)</option>
                  <option value="Suministros">Suministros (Luz/Gas/Agua)</option>
                  <option value="Comunicaciones">Comunicaciones (Internet/Móvil)</option>
                  <option value="Seguros">Seguros</option>
                  <option value="Vehículo">Vehículo & Transporte</option>
                  <option value="Alimentación">Alimentación & Supermercado</option>
                  <option value="Ocio">Ocio & Suscripciones</option>
                  <option value="Impuestos">Impuestos & Tasas</option>
                  <option value="Sueldo">Sueldo & Nóminas</option>
                  <option value="Freelance">Freelance & Extras</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Periodicidad / Frecuencia</label>
                <select
                  value={txForm.frequency}
                  onChange={(e) => setTxForm({ ...txForm, frequency: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
                >
                  <option value="mensual">Mensual (Todos los meses)</option>
                  <option value="trimestral">Trimestral (Cada 3 meses)</option>
                  <option value="semestral">Semestral (Cada 6 meses)</option>
                  <option value="anual">Anual (Una vez al año)</option>
                  <option value="puntual">Puntual (Solo este mes concreto)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Día del Mes de Vencimiento (1 - 31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={txForm.dayOfMonth}
                  onChange={(e) => setTxForm({ ...txForm, dayOfMonth: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none font-mono"
                />
              </div>

              {txForm.frequency === 'anual' && (
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Mes del Año (1 a 12)</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={txForm.monthOfYear}
                    onChange={(e) => setTxForm({ ...txForm, monthOfYear: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none font-mono"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Fecha Fin / Vencimiento (Opcional)</label>
                <input
                  type="text"
                  value={txForm.endDate}
                  onChange={(e) => setTxForm({ ...txForm, endDate: e.target.value })}
                  placeholder="Ej: 2029-03 (Dejar vacío si indefinido)"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Crecimiento / Inflación Anual (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={txForm.yearlyIncreasePct}
                  onChange={(e) => setTxForm({ ...txForm, yearlyIncreasePct: e.target.value })}
                  placeholder="2.0"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setNewTxModal(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-950/50"
              >
                Guardar Transacción
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: EDITAR REGLA */}
      {editTxModal && (
        <Modal
          isOpen={true}
          onClose={() => setEditTxModal(null)}
          title={`Modificar: ${editTxModal.title}`}
        >
          <form onSubmit={handleTriggerChoice} className="space-y-4">
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">Título o Concepto</label>
              <input
                type="text"
                required
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Importe (€)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Día de Cobro/Pago</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={editForm.dayOfMonth}
                  onChange={(e) => setEditForm({ ...editForm, dayOfMonth: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">Nota o motivo del cambio</label>
              <input
                type="text"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Ej: Mayor consumo, bonificación, extra puntual..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditTxModal(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-950/50"
              >
                Continuar y Elegir Ámbito
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: DIÁLOGO DE DECISIÓN (EXCLUSIVO SOLO ESTE MES vs TODOS LOS MESES FUTUROS) */}
      {overrideChoiceModal && (
        <Modal
          isOpen={true}
          onClose={() => setOverrideChoiceModal(null)}
          title="¿Dónde deseas aplicar esta modificación?"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-300 leading-relaxed">
              Has modificado el importe de <strong className="text-white">{overrideChoiceModal.item.title}</strong> a <strong className="text-amber-400 font-mono">{overrideChoiceModal.form.amount}€</strong>.
            </p>

            <div className="grid grid-cols-1 gap-3 pt-1">
              
              {/* Opción A: Solo este mes */}
              <button
                onClick={handleConfirmOnlyThisMonth}
                className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/40 hover:border-purple-400 text-left transition-all group touch-press"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-purple-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Modificar SOLO este mes ({formattedMonthLabel})
                  </span>
                  <span className="text-xs text-purple-400 font-bold group-hover:translate-x-1 transition-transform">→</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Crea una excepción temporal. Los meses anteriores y futuros conservarán la cuota habitual ({overrideChoiceModal.item.originalAmount}€).
                </p>
              </button>

              {/* Opción B: Todos los meses futuros */}
              <button
                onClick={handleConfirmFutureRule}
                className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 hover:border-amber-400 text-left transition-all group touch-press"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Modificar REGLA MAESTRA (Meses futuros)
                  </span>
                  <span className="text-xs text-amber-400 font-bold group-hover:translate-x-1 transition-transform">→</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Actualiza la cuota recurrente fija para todos los meses a partir de ahora.
                </p>
              </button>

            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setOverrideChoiceModal(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
