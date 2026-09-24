import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  CalendarRange, 
  Clock, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Home, 
  Car, 
  Zap, 
  Tv, 
  Tag, 
  ChevronDown, 
  ChevronUp, 
  Search,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import Modal from '../Modal';

export default function RecurringExpensesManager({ api, currentMonth, onDataChanged }) {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [selectedExpenseForPeriod, setSelectedExpenseForPeriod] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);

  // Form states
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    category: 'Vivienda',
    frequency: 'mensual',
    dayOfMonth: 1,
    monthOfYear: 1,
    startDate: new Date().toISOString().slice(0, 7),
    endDate: '',
    isIndefinite: true,
    notes: ''
  });

  const [periodForm, setPeriodForm] = useState({
    startDate: new Date().toISOString().slice(0, 7),
    endDate: '',
    amount: '',
    frequency: 'mensual',
    monthOfYear: 1,
    dayOfMonth: 1,
    notes: 'Revisión de cuota / nuevo periodo'
  });

  const [expandedExpenses, setExpandedExpenses] = useState({});

  useEffect(() => {
    loadExpenses();
  }, [currentMonth]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const [allTx, allCats] = await Promise.all([
        api.getFinanceTransactions(),
        api.getFinanceCategories ? api.getFinanceCategories() : []
      ]);
      const expenseList = (allTx || []).filter(t => t.type === 'gasto' && t.frequency !== 'puntual');
      setExpenses(expenseList);
      setCategories(allCats || []);
    } catch (err) {
      console.error('Error cargando gastos periódicos:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedExpenses(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.title || !expenseForm.amount) return;

    try {
      const payload = {
        ...expenseForm,
        type: 'gasto',
        amount: parseFloat(String(expenseForm.amount).replace(',', '.')),
        dayOfMonth: parseInt(expenseForm.dayOfMonth, 10) || 1,
        monthOfYear: parseInt(expenseForm.monthOfYear, 10) || 1,
        rateSteps: editingExpense ? (editingExpense.rateSteps || []) : []
      };

      if (editingExpense) {
        await api.updateFinanceTransaction(editingExpense.id, payload);
      } else {
        await api.addFinanceTransaction(payload);
      }

      setIsAddExpenseModalOpen(false);
      setEditingExpense(null);
      setExpenseForm({
        title: '',
        amount: '',
        category: 'Vivienda',
        frequency: 'mensual',
        dayOfMonth: 1,
        monthOfYear: 1,
        startDate: new Date().toISOString().slice(0, 7),
        endDate: '',
        isIndefinite: true,
        notes: ''
      });
      loadExpenses();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert('Error guardando gasto: ' + err.message);
    }
  };

  const handleOpenAddPeriod = (expense) => {
    setSelectedExpenseForPeriod(expense);
    setPeriodForm({
      startDate: new Date().toISOString().slice(0, 7),
      endDate: '',
      amount: String(expense.amount || ''),
      frequency: expense.frequency || 'mensual',
      monthOfYear: expense.monthOfYear || 1,
      dayOfMonth: expense.dayOfMonth || 1,
      notes: 'Nuevo periodo de tarifa'
    });
    setIsPeriodModalOpen(true);
  };

  const handleSavePeriod = async (e) => {
    e.preventDefault();
    if (!selectedExpenseForPeriod || !periodForm.amount || !periodForm.startDate) return;

    try {
      const currentSteps = Array.isArray(selectedExpenseForPeriod.rateSteps) ? [...selectedExpenseForPeriod.rateSteps] : [];
      const newStep = {
        id: `step-${Date.now()}`,
        startDate: periodForm.startDate,
        endDate: periodForm.endDate || null,
        amount: parseFloat(String(periodForm.amount).replace(',', '.')),
        frequency: periodForm.frequency || 'mensual',
        monthOfYear: parseInt(periodForm.monthOfYear, 10) || 1,
        dayOfMonth: parseInt(periodForm.dayOfMonth, 10) || 1,
        notes: periodForm.notes || 'Periodo de tarifa'
      };

      const updatedSteps = [...currentSteps, newStep].sort((a, b) => a.startDate.localeCompare(b.startDate));

      await api.updateFinanceTransaction(selectedExpenseForPeriod.id, {
        rateSteps: updatedSteps
      });

      setIsPeriodModalOpen(false);
      setSelectedExpenseForPeriod(null);
      loadExpenses();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert('Error guardando periodo: ' + err.message);
    }
  };

  const handleDeletePeriod = async (expense, stepId) => {
    if (!confirm('¿Eliminar este periodo de tarifa?')) return;
    try {
      const updatedSteps = (expense.rateSteps || []).filter(s => s.id !== stepId);
      await api.updateFinanceTransaction(expense.id, { rateSteps: updatedSteps });
      loadExpenses();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert('Error al eliminar periodo: ' + err.message);
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await api.toggleTransactionActive(id);
      loadExpenses();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este gasto periódico por completo?')) return;
    try {
      await api.deleteFinanceTransaction(id);
      loadExpenses();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert('Error al eliminar gasto: ' + err.message);
    }
  };

  // Filtrado
  const filteredExpenses = expenses.filter(exp => {
    if (categoryFilter !== 'all' && exp.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = exp.title?.toLowerCase().includes(q);
      const matchCategory = exp.category?.toLowerCase().includes(q);
      const matchNotes = exp.notes?.toLowerCase().includes(q);
      if (!matchTitle && !matchCategory && !matchNotes) return false;
    }
    return true;
  });

  const uniqueCategories = Array.from(new Set(expenses.map(e => e.category).filter(Boolean)));

  // Estadísticas
  const totalMonthlyExpenses = expenses.reduce((sum, exp) => {
    if (!exp.active) return sum;
    let amt = Number(exp.amount) || 0;
    let freq = exp.frequency || 'mensual';

    if (Array.isArray(exp.rateSteps) && exp.rateSteps.length > 0) {
      const match = exp.rateSteps.find(s => {
        if (s.startDate && currentMonth < s.startDate.slice(0, 7)) return false;
        if (s.endDate && currentMonth > s.endDate.slice(0, 7)) return false;
        return true;
      });
      if (match) {
        if (match.amount !== undefined) amt = Number(match.amount);
        if (match.frequency) freq = match.frequency;
      }
    }

    if (freq === 'mensual') return sum + amt;
    if (freq === 'trimestral') return sum + (amt / 3);
    if (freq === 'semestral') return sum + (amt / 6);
    if (freq === 'anual') return sum + (amt / 12);
    return sum + amt;
  }, 0);

  return (
    <div className="space-y-5">
      
      {/* 1. Header con métricas y botón añadir */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-white font-display flex items-center gap-2">
            <span className="w-9 h-9 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </span>
            Gastos Periódicos & Tramos
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Recibos, suministros, seguros e impuestos. Gestiona periodos con importes y frecuencias variables en el tiempo.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingExpense(null);
            setExpenseForm({
              title: '',
              amount: '',
              category: 'Vivienda',
              frequency: 'mensual',
              dayOfMonth: 1,
              monthOfYear: 1,
              startDate: new Date().toISOString().slice(0, 7),
              endDate: '',
              isIndefinite: true,
              notes: ''
            });
            setIsAddExpenseModalOpen(true);
          }}
          className="min-h-touch px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all touch-press"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Nuevo Gasto Periódico</span>
        </button>
      </div>

      {/* 2. Tarjetas de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-3xl bg-white/[0.04] border border-white/10 shadow-inner-light">
          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block font-display">
            Coste Fijo Mensual Estimado
          </span>
          <p className="text-2xl font-black font-mono text-amber-300 mt-1">
            -{totalMonthlyExpenses.toFixed(2)} € / mes
          </p>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            Prorrateo mensual de fijos, trimestrales y anuales
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-white/[0.04] border border-white/10 shadow-inner-light">
          <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block font-display">
            Coste Anual Consolidado
          </span>
          <p className="text-2xl font-black font-mono text-rose-300 mt-1">
            -{(totalMonthlyExpenses * 12).toFixed(2)} €
          </p>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            Presupuesto anual de gastos periódicos
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-white/[0.04] border border-white/10 shadow-inner-light">
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block font-display">
            Conceptos con Tramos Temporales
          </span>
          <p className="text-2xl font-black font-mono text-cyan-300 mt-1">
            {expenses.filter(e => Array.isArray(e.rateSteps) && e.rateSteps.length > 0).length} gastos
          </p>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            Con histórico de importes o frecuencias
          </span>
        </div>
      </div>

      {/* 3. Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre o categoría..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-2xl bg-white/[0.05] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              categoryFilter === 'all'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-white/[0.05] text-slate-300 hover:text-white border border-white/10'
            }`}
          >
            Todas ({expenses.length})
          </button>
          {uniqueCategories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                  : 'bg-white/[0.05] text-slate-300 hover:text-white border border-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Listado de Gastos Periódicos con Tramos */}
      {filteredExpenses.length === 0 ? (
        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-white">No hay gastos periódicos encontrados</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Añade tus seguros, suministros, internet o suscripciones con sus correspondientes tramos de fechas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((exp) => {
            const tramos = Array.isArray(exp.rateSteps) ? exp.rateSteps : [];
            const isExpanded = Boolean(expandedExpenses[exp.id]);

            // Determinar importe y frecuencia en vigor para el mes actual
            let currentAmt = Number(exp.amount) || 0;
            let currentFreq = exp.frequency || 'mensual';
            let activeStep = null;

            if (tramos.length > 0) {
              const match = tramos.find(s => {
                if (s.startDate && currentMonth < s.startDate.slice(0, 7)) return false;
                if (s.endDate && currentMonth > s.endDate.slice(0, 7)) return false;
                return true;
              });
              if (match) {
                if (match.amount !== undefined) currentAmt = Number(match.amount);
                if (match.frequency) currentFreq = match.frequency;
                activeStep = match;
              }
            }

            return (
              <div
                key={exp.id}
                className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                  exp.active 
                    ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.06]' 
                    : 'bg-white/[0.01] border-white/5 opacity-60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-extrabold text-white text-base font-display">
                        {exp.title}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25">
                        -{currentAmt.toFixed(2)} € / {currentFreq}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.06] text-slate-300 border border-white/10">
                        {exp.category || 'General'}
                      </span>
                      {activeStep && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Tramo activo: {activeStep.notes || 'Tarifa actual'}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>Día de cargo: <strong>Día {exp.dayOfMonth || 1}</strong></span>
                      <span>•</span>
                      <span>Frecuencia base: <strong>{exp.frequency}</strong></span>
                      {exp.notes && (
                        <>
                          <span>•</span>
                          <span className="italic">{exp.notes}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenAddPeriod(exp)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all touch-press"
                      title="Añadir o gestionar tramos de fecha e importes"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Gestionar Periodo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(exp.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                        exp.active 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                          : 'bg-white/[0.05] text-slate-400 border-white/10 hover:text-white'
                      }`}
                      title={exp.active ? 'Pausar este gasto' : 'Reactivar este gasto'}
                    >
                      {exp.active ? 'Activo' : 'Pausado'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingExpense(exp);
                        setExpenseForm({
                          title: exp.title,
                          amount: exp.amount,
                          category: exp.category || 'Vivienda',
                          frequency: exp.frequency || 'mensual',
                          dayOfMonth: exp.dayOfMonth || 1,
                          monthOfYear: exp.monthOfYear || 1,
                          startDate: exp.startDate || '',
                          endDate: exp.endDate || '',
                          isIndefinite: exp.isIndefinite !== false,
                          notes: exp.notes || ''
                        });
                        setIsAddExpenseModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/10 transition-colors"
                      title="Editar datos básicos"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="p-2 rounded-xl bg-white/[0.06] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/10 transition-colors"
                      title="Eliminar gasto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {tramos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(exp.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] text-slate-300 text-xs font-semibold flex items-center gap-1 border border-white/10"
                      >
                        <span>{tramos.length} {tramos.length === 1 ? 'periodo' : 'periodos'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Línea temporal de tramos del gasto */}
                {tramos.length > 0 && isExpanded && (
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-display flex items-center gap-1.5">
                      <CalendarRange className="w-3.5 h-3.5 text-amber-400" />
                      <span>Histórico y Tramos de este Gasto (De X a Y fecha)</span>
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {tramos.map((step) => (
                        <div 
                          key={step.id}
                          className="p-3 rounded-2xl bg-black/30 border border-white/10 text-xs space-y-1 relative"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-amber-400 font-mono text-sm">
                              -{Number(step.amount).toFixed(2)} €
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300">
                                {step.frequency || 'mensual'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeletePeriod(exp, step.id)}
                                className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                                title="Eliminar este tramo"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-300 font-semibold">
                            {step.startDate} ➔ {step.endDate || 'Actualidad / En vigor'}
                          </div>

                          {step.notes && (
                            <p className="text-[10px] text-slate-400 italic">
                              "{step.notes}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* --- MODAL AÑADIR / EDITAR GASTO --- */}
      {isAddExpenseModalOpen && (
        <Modal
          isOpen={isAddExpenseModalOpen}
          onClose={() => setIsAddExpenseModalOpen(false)}
          title={editingExpense ? 'Editar Gasto Periódico' : 'Nuevo Gasto Periódico'}
        >
          <form onSubmit={handleSaveExpense} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Concepto / Nombre del Gasto</label>
              <input
                type="text"
                required
                placeholder="Ej: Seguro Hogar Mapfre, Fibra Internet, Factura Luz"
                value={expenseForm.title}
                onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Importe Base (€)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 45.00"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Día Habitual de Cargo</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={expenseForm.dayOfMonth}
                  onChange={(e) => setExpenseForm({ ...expenseForm, dayOfMonth: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Frecuencia Habitual</label>
                <select
                  value={expenseForm.frequency}
                  onChange={(e) => setExpenseForm({ ...expenseForm, frequency: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400"
                >
                  <option value="mensual">Mensual (Cada mes)</option>
                  <option value="trimestral">Trimestral (Cada 3 meses)</option>
                  <option value="semestral">Semestral (Cada 6 meses)</option>
                  <option value="anual">Anual (Una vez al año)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Categoría</label>
                <input
                  type="text"
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  placeholder="Seguros, Suministros, Vivienda, etc."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Notas / Proveedor</label>
              <input
                type="text"
                placeholder="Póliza número X, contrato con permanencia..."
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsAddExpenseModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20"
              >
                {editingExpense ? 'Guardar Cambios' : 'Añadir Gasto'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- MODAL GESTIONAR TRAMOS / PERIODOS --- */}
      {isPeriodModalOpen && selectedExpenseForPeriod && (
        <Modal
          isOpen={isPeriodModalOpen}
          onClose={() => setIsPeriodModalOpen(false)}
          title={`Gestionar Periodos para "${selectedExpenseForPeriod.title}"`}
        >
          <form onSubmit={handleSavePeriod} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 leading-relaxed">
              Configura periodos específicos para este gasto. Por ejemplo: <strong>de 2024-01 a 2025-06 eran 45€ cada mes</strong>, y <strong>a partir de 2025-07 pasa a ser 135€ cada 3 meses</strong>. El calendario generará los pagos en las fechas correspondientes.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Importe en este periodo (€)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 135.00"
                  value={periodForm.amount}
                  onChange={(e) => setPeriodForm({ ...periodForm, amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Frecuencia en este periodo</label>
                <select
                  value={periodForm.frequency}
                  onChange={(e) => setPeriodForm({ ...periodForm, frequency: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400"
                >
                  <option value="mensual">Cada mes</option>
                  <option value="trimestral">Cada 3 meses (Trimestral)</option>
                  <option value="semestral">Cada 6 meses (Semestral)</option>
                  <option value="anual">Cada año (Anual)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Desde Fecha (YYYY-MM)</label>
                <input
                  type="month"
                  required
                  value={periodForm.startDate}
                  onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Hasta Fecha (Opcional)</label>
                <input
                  type="month"
                  placeholder="En blanco si sigue activo"
                  value={periodForm.endDate}
                  onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {periodForm.frequency !== 'mensual' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Mes Base de Cobro</label>
                  <select
                    value={periodForm.monthOfYear}
                    onChange={(e) => setPeriodForm({ ...periodForm, monthOfYear: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                  >
                    <option value="1">Enero</option>
                    <option value="2">Febrero</option>
                    <option value="3">Marzo</option>
                    <option value="4">Abril</option>
                    <option value="5">Mayo</option>
                    <option value="6">Junio</option>
                    <option value="7">Julio</option>
                    <option value="8">Agosto</option>
                    <option value="9">Septiembre</option>
                    <option value="10">Octubre</option>
                    <option value="11">Noviembre</option>
                    <option value="12">Diciembre</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Día del Mes</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={periodForm.dayOfMonth}
                    onChange={(e) => setPeriodForm({ ...periodForm, dayOfMonth: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Descripción del Periodo</label>
              <input
                type="text"
                placeholder="Ej: Cambio a cobro trimestral con Mapfre, subida de prima 2026"
                value={periodForm.notes}
                onChange={(e) => setPeriodForm({ ...periodForm, notes: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsPeriodModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20"
              >
                Guardar Tramo / Periodo
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}
