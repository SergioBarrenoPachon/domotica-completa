import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Plus, 
  Calendar, 
  Clock, 
  Edit3, 
  Trash2, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Briefcase, 
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Wallet,
  CalendarRange
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../Modal';

export default function IncomeManager({ api, currentMonth, onDataChanged }) {
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddIncomeModalOpen, setIsAddIncomeModalOpen] = useState(false);
  const [isTramoModalOpen, setIsTramoModalOpen] = useState(false);
  const [selectedIncomeForTramo, setSelectedIncomeForTramo] = useState(null);
  const [editingIncome, setEditingIncome] = useState(null);

  // Form states
  const [incomeForm, setIncomeForm] = useState({
    title: '',
    amount: '',
    category: 'Nóminas',
    frequency: 'mensual',
    dayOfMonth: 28,
    monthOfYear: 1,
    startDate: new Date().toISOString().slice(0, 7),
    endDate: '',
    isIndefinite: true,
    notes: ''
  });

  const [tramoForm, setTramoForm] = useState({
    startDate: new Date().toISOString().slice(0, 7),
    endDate: '',
    amount: '',
    frequency: 'mensual',
    notes: 'Subida de sueldo'
  });

  const [expandedIncomes, setExpandedIncomes] = useState({});

  useEffect(() => {
    loadIncomes();
  }, [currentMonth]);

  const loadIncomes = async () => {
    try {
      setLoading(true);
      const allTx = await api.getFinanceTransactions();
      const incomeList = (allTx || []).filter(t => t.type === 'ingreso');
      setIncomes(incomeList);
    } catch (err) {
      console.error('Error cargando ingresos:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedIncomes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveIncome = async (e) => {
    e.preventDefault();
    if (!incomeForm.title || !incomeForm.amount) return;

    try {
      const payload = {
        ...incomeForm,
        type: 'ingreso',
        amount: parseFloat(String(incomeForm.amount).replace(',', '.')),
        dayOfMonth: parseInt(incomeForm.dayOfMonth, 10) || 28,
        rateSteps: editingIncome ? (editingIncome.rateSteps || []) : []
      };

      if (editingIncome) {
        await api.updateFinanceTransaction(editingIncome.id, payload);
      } else {
        await api.addFinanceTransaction(payload);
      }

      setIsAddIncomeModalOpen(false);
      setEditingIncome(null);
      setIncomeForm({
        title: '',
        amount: '',
        category: 'Nóminas',
        frequency: 'mensual',
        dayOfMonth: 28,
        monthOfYear: 1,
        startDate: new Date().toISOString().slice(0, 7),
        endDate: '',
        isIndefinite: true,
        notes: ''
      });
      loadIncomes();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert('Error guardando ingreso: ' + err.message);
    }
  };

  const handleOpenAddTramo = (income) => {
    setSelectedIncomeForTramo(income);
    setTramoForm({
      startDate: new Date().toISOString().slice(0, 7),
      endDate: '',
      amount: String(income.amount || ''),
      frequency: income.frequency || 'mensual',
      notes: 'Subida salarial / Nuevo tramo'
    });
    setIsTramoModalOpen(true);
  };

  const handleSaveTramo = async (e) => {
    e.preventDefault();
    if (!selectedIncomeForTramo || !tramoForm.amount || !tramoForm.startDate) return;

    try {
      const currentSteps = Array.isArray(selectedIncomeForTramo.rateSteps) ? [...selectedIncomeForTramo.rateSteps] : [];
      const newStep = {
        id: `tramo-${Date.now()}`,
        startDate: tramoForm.startDate,
        endDate: tramoForm.endDate || null,
        amount: parseFloat(String(tramoForm.amount).replace(',', '.')),
        frequency: tramoForm.frequency || 'mensual',
        notes: tramoForm.notes || 'Revisión salarial'
      };

      const updatedSteps = [...currentSteps, newStep].sort((a, b) => a.startDate.localeCompare(b.startDate));

      await api.updateFinanceTransaction(selectedIncomeForTramo.id, {
        rateSteps: updatedSteps
      });

      setIsTramoModalOpen(false);
      setSelectedIncomeForTramo(null);
      loadIncomes();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert('Error guardando tramo: ' + err.message);
    }
  };

  const handleDeleteTramo = async (income, stepId) => {
    if (!confirm('¿Eliminar este tramo de sueldo?')) return;
    try {
      const updatedSteps = (income.rateSteps || []).filter(s => s.id !== stepId);
      await api.updateFinanceTransaction(income.id, { rateSteps: updatedSteps });
      loadIncomes();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert('Error al eliminar tramo: ' + err.message);
    }
  };

  const handleDeleteIncome = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este ingreso y todo su histórico de nóminas?')) return;
    try {
      await api.deleteFinanceTransaction(id);
      loadIncomes();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Cálculo de estadísticas
  const totalMonthlyIncome = incomes.reduce((sum, inc) => {
    if (!inc.active) return sum;
    // Si tiene tramos activos para el mes actual
    let amt = Number(inc.amount) || 0;
    if (Array.isArray(inc.rateSteps) && inc.rateSteps.length > 0) {
      const match = inc.rateSteps.find(s => {
        if (s.startDate && currentMonth < s.startDate.slice(0, 7)) return false;
        if (s.endDate && currentMonth > s.endDate.slice(0, 7)) return false;
        return true;
      });
      if (match && match.amount) amt = Number(match.amount);
    }
    return sum + amt;
  }, 0);

  const totalAnnualized = totalMonthlyIncome * 12;

  return (
    <div className="space-y-5">
      
      {/* 1. Header con métricas y botón añadir */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-white font-display flex items-center gap-2">
            <span className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </span>
            Gestión de Ingresos & Nóminas
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Control de salarios, pagas extraordinarias y registro de subidas de sueldo por periodos y fechas.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingIncome(null);
            setIncomeForm({
              title: '',
              amount: '',
              category: 'Nóminas',
              frequency: 'mensual',
              dayOfMonth: 28,
              monthOfYear: 1,
              startDate: new Date().toISOString().slice(0, 7),
              endDate: '',
              isIndefinite: true,
              notes: ''
            });
            setIsAddIncomeModalOpen(true);
          }}
          className="min-h-touch px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all touch-press"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Nuevo Ingreso / Nómina</span>
        </button>
      </div>

      {/* 2. Tarjetas de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-3xl bg-white/[0.04] border border-white/10 shadow-inner-light">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block font-display">
            Nóminas / Ingresos Activos
          </span>
          <p className="text-2xl font-black font-mono text-white mt-1">
            +{totalMonthlyIncome.toFixed(2)} €
          </p>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            Total en mes en vigor ({incomes.filter(i => i.active).length} fuentes)
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-white/[0.04] border border-white/10 shadow-inner-light">
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block font-display">
            Previsión Anual Bruta
          </span>
          <p className="text-2xl font-black font-mono text-cyan-300 mt-1">
            +{totalAnnualized.toFixed(2)} €
          </p>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            Proyección anualizada a 12 meses
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-white/[0.04] border border-white/10 shadow-inner-light">
          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block font-display">
            Tramos Salariales Registrados
          </span>
          <p className="text-2xl font-black font-mono text-amber-300 mt-1">
            {incomes.reduce((s, i) => s + ((i.rateSteps && i.rateSteps.length) || 0), 0)} tramos
          </p>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            Histórico y subidas programadas
          </span>
        </div>
      </div>

      {/* 3. Listado de Ingresos con Tramos */}
      {incomes.length === 0 ? (
        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Briefcase className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-white">No hay ingresos registrados todavía</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Añade tu nómina o fuentes de ingresos habituales para que el sistema empiece a predecir tu saldo mensual.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {incomes.map((income) => {
            const tramos = Array.isArray(income.rateSteps) ? income.rateSteps : [];
            const isExpanded = Boolean(expandedIncomes[income.id]);

            // Determinar importe en vigor para este mes
            let currentAmt = Number(income.amount) || 0;
            let currentTramo = null;
            if (tramos.length > 0) {
              const match = tramos.find(s => {
                if (s.startDate && currentMonth < s.startDate.slice(0, 7)) return false;
                if (s.endDate && currentMonth > s.endDate.slice(0, 7)) return false;
                return true;
              });
              if (match) {
                currentAmt = Number(match.amount);
                currentTramo = match;
              }
            }

            return (
              <div 
                key={income.id}
                className="p-4 sm:p-5 rounded-3xl bg-white/[0.04] border border-white/10 space-y-3.5 transition-all hover:bg-white/[0.06]"
              >
                {/* Cabecera del ingreso */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-extrabold text-white text-base font-display">
                        {income.title}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                        +{currentAmt.toFixed(2)} € / {income.frequency}
                      </span>
                      {currentTramo && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Tramo activo: {currentTramo.notes || 'Subida'}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>Día de cobro: <strong>Día {income.dayOfMonth || 28}</strong></span>
                      <span>•</span>
                      <span>Categoría: <strong>{income.category || 'Nóminas'}</strong></span>
                      {income.notes && (
                        <>
                          <span>•</span>
                          <span className="italic">{income.notes}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Acciones principales */}
                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenAddTramo(income)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all touch-press"
                      title="Añadir subida salarial o tramo temporal a esta nómina"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Subida / Tramo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingIncome(income);
                        setIncomeForm({
                          title: income.title,
                          amount: income.amount,
                          category: income.category || 'Nóminas',
                          frequency: income.frequency || 'mensual',
                          dayOfMonth: income.dayOfMonth || 28,
                          monthOfYear: income.monthOfYear || 1,
                          startDate: income.startDate || '',
                          endDate: income.endDate || '',
                          isIndefinite: income.isIndefinite !== false,
                          notes: income.notes || ''
                        });
                        setIsAddIncomeModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/10 transition-colors"
                      title="Editar datos básicos"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteIncome(income.id)}
                      className="p-2 rounded-xl bg-white/[0.06] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/10 transition-colors"
                      title="Eliminar ingreso"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {tramos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(income.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] text-slate-300 text-xs font-semibold flex items-center gap-1 border border-white/10"
                      >
                        <span>{tramos.length} {tramos.length === 1 ? 'tramo' : 'tramos'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Historial desplegable de Tramos Salariales */}
                {tramos.length > 0 && isExpanded && (
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-display flex items-center gap-1.5">
                      <CalendarRange className="w-3.5 h-3.5 text-amber-400" />
                      <span>Evolución Salarial y Tramos de este Ingreso</span>
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {tramos.map((tramo) => (
                        <div 
                          key={tramo.id}
                          className="p-3 rounded-2xl bg-black/30 border border-white/10 text-xs space-y-1 relative group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-emerald-400 font-mono text-sm">
                              +{Number(tramo.amount).toFixed(2)} €
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteTramo(income, tramo.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                              title="Eliminar tramo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="text-[11px] text-slate-300 font-semibold">
                            {tramo.startDate} ➔ {tramo.endDate || 'Actualidad / En vigor'}
                          </div>

                          {tramo.notes && (
                            <p className="text-[10px] text-slate-400 italic">
                              "{tramo.notes}"
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

      {/* --- MODAL AÑADIR / EDITAR INGRESO --- */}
      {isAddIncomeModalOpen && (
        <Modal
          isOpen={isAddIncomeModalOpen}
          onClose={() => setIsAddIncomeModalOpen(false)}
          title={editingIncome ? 'Editar Ingreso' : 'Nuevo Ingreso / Nómina'}
        >
          <form onSubmit={handleSaveIncome} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Título / Concepto de Nómina</label>
              <input
                type="text"
                required
                placeholder="Ej: Nómina Sergio, Nómina María, Alquiler Piso"
                value={incomeForm.title}
                onChange={(e) => setIncomeForm({ ...incomeForm, title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Importe Mensual (€)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 2150.00"
                  value={incomeForm.amount}
                  onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Día Habitual de Cobro</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={incomeForm.dayOfMonth}
                  onChange={(e) => setIncomeForm({ ...incomeForm, dayOfMonth: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Frecuencia</label>
                <select
                  value={incomeForm.frequency}
                  onChange={(e) => setIncomeForm({ ...incomeForm, frequency: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-400"
                >
                  <option value="mensual">Mensual</option>
                  <option value="semestral">Paga Extra (Semestral)</option>
                  <option value="anual">Anual</option>
                  <option value="puntual">Puntual</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Categoría</label>
                <input
                  type="text"
                  value={incomeForm.category}
                  onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value })}
                  placeholder="Nóminas, Rendimientos, etc."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Notas (Opcional)</label>
              <input
                type="text"
                placeholder="Empresa, retención IRPF, etc."
                value={incomeForm.notes}
                onChange={(e) => setIncomeForm({ ...incomeForm, notes: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsAddIncomeModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
              >
                {editingIncome ? 'Guardar Cambios' : 'Añadir Nómina'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- MODAL AÑADIR SUBIDA SALARIAL / TRAMO --- */}
      {isTramoModalOpen && selectedIncomeForTramo && (
        <Modal
          isOpen={isTramoModalOpen}
          onClose={() => setIsTramoModalOpen(false)}
          title={`Añadir Subida Salarial a "${selectedIncomeForTramo.title}"`}
        >
          <form onSubmit={handleSaveTramo} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
              Permite registrar revisiones salariales o subidas por antigüedad con fecha de inicio y fin, de modo que los meses anteriores conserven el importe antiguo y los futuros el nuevo.
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Nuevo Sueldo Neto (€)</label>
              <input
                type="text"
                required
                placeholder="Ej: 2300.00"
                value={tramoForm.amount}
                onChange={(e) => setTramoForm({ ...tramoForm, amount: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Vigente Desde (YYYY-MM)</label>
                <input
                  type="month"
                  required
                  value={tramoForm.startDate}
                  onChange={(e) => setTramoForm({ ...tramoForm, startDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Hasta (Opcional)</label>
                <input
                  type="month"
                  placeholder="En blanco si es indefinido"
                  value={tramoForm.endDate}
                  onChange={(e) => setTramoForm({ ...tramoForm, endDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Motivo / Notas del Tramo</label>
              <input
                type="text"
                placeholder="Ej: Subida por convenio 2026, ascenso a senior"
                value={tramoForm.notes}
                onChange={(e) => setTramoForm({ ...tramoForm, notes: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsTramoModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20"
              >
                Guardar Tramo Salarial
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}
