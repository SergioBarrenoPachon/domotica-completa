import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Plus, 
  TrendingUp, 
  Sparkles, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  Sun, 
  Heart,
  Car,
  Home
} from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import Modal from '../Modal';

export default function SavingsGoals({ api, onRefresh }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [addModal, setAddModal] = useState(false);
  const [contributeModal, setContributeModal] = useState(null); // goal to contribute
  const [customAmount, setCustomAmount] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Form
  const [goalForm, setGoalForm] = useState({
    title: '',
    category: 'Seguridad',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    monthlyContribution: '',
    color: 'emerald',
    icon: 'ShieldCheck',
    notes: ''
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const data = await api.getGoals();
      setGoals(data);
    } catch (err) {
      console.error('Error cargando metas de ahorro:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!goalForm.title || !goalForm.targetAmount) return;

    try {
      await api.addGoal({
        ...goalForm,
        targetAmount: Number(goalForm.targetAmount),
        currentAmount: Number(goalForm.currentAmount || 0),
        monthlyContribution: Number(goalForm.monthlyContribution || 0)
      });

      setAddModal(false);
      setGoalForm({
        title: '',
        category: 'Seguridad',
        targetAmount: '',
        currentAmount: '',
        deadline: '',
        monthlyContribution: '',
        color: 'emerald',
        icon: 'ShieldCheck',
        notes: ''
      });
      loadGoals();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error creando meta: ' + err.message);
    }
  };

  const handleDeleteGoal = async (id) => {
    try {
      await api.deleteGoal(id);
      setConfirmDeleteId(null);
      loadGoals();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickContribute = async (goal, amount) => {
    try {
      const updated = await api.contributeGoal(goal.id, amount);
      confetti({ particleCount: 45, spread: 60, origin: { y: 0.7 } });
      loadGoals();
      if (onRefresh) onRefresh();
      setContributeModal(null);
    } catch (err) {
      alert('Error añadiendo aportación: ' + err.message);
    }
  };

  const formatEuro = (num) => `${new Intl.NumberFormat('es-ES').format(num)}€`;

  const totalSavedGoals = goals.reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0);
  const totalTargetGoals = goals.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);
  const totalMonthlyCommitment = goals.reduce((sum, g) => sum + (Number(g.suggestedMonthlySavings) || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Top Banner KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Total Ahorrado para Metas */}
        <div className="glass-ios p-5 sm:p-6 rounded-[28px] border border-emerald-500/20 bg-emerald-500/[0.05] flex flex-col justify-between shadow-glass-ambient">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ios-emerald font-display">
              Total Acumulado en Metas
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <Target className="w-5 h-5 text-ios-emerald" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-white font-mono tracking-tight">
              {formatEuro(totalSavedGoals)}
            </p>
            <p className="text-xs text-emerald-300/80 mt-1 font-display">
              De un objetivo total de <span className="font-bold text-white">{formatEuro(totalTargetGoals)}</span>
            </p>
          </div>
        </div>

        {/* Ahorro Sugerido Mensual */}
        <div className="glass-ios p-5 sm:p-6 rounded-[28px] border border-amber-500/20 bg-amber-500/[0.05] flex flex-col justify-between shadow-glass-ambient">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ios-amber font-display">
              Ahorro Mensual Recomendado
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <Clock className="w-5 h-5 text-ios-amber" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-ios-amber font-mono tracking-tight">
              {formatEuro(Math.round(totalMonthlyCommitment))} / mes
            </p>
            <p className="text-xs text-amber-300/80 mt-1 font-display">
              Para cumplir todas las metas en su fecha límite
            </p>
          </div>
        </div>

        {/* Botón Nueva Meta */}
        <div className="glass-ios p-5 sm:p-6 rounded-[28px] border border-white/10 flex flex-col justify-between items-start shadow-glass-ambient">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-white font-display block">
              Planificación por Objetivos
            </span>
            <p className="text-xs text-slate-400 mt-1 font-display">
              Establece hitos de ahorro a corto, medio y largo plazo.
            </p>
          </div>
          <button
            onClick={() => setAddModal(true)}
            className="w-full mt-4 px-4 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_4px_16px_rgba(255,159,10,0.35)]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Crear Nueva Meta de Ahorro</span>
          </button>
        </div>

      </div>

      {/* GOALS GRID */}
      <div className="space-y-4">
        <h3 className="text-lg font-extrabold text-white font-display tracking-tight">
          Metas y Hitos Financieros ({goals.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const isCompleted = goal.progressPercent >= 100;

            return (
              <div
                key={goal.id}
                className={`glass-ios-elevated p-5 sm:p-6 rounded-[28px] border transition-all flex flex-col justify-between gap-4 shadow-glass-ambient ${
                  isCompleted ? 'border-emerald-500/40 bg-emerald-500/[0.08]' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  {/* Top info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-ios-amber border border-amber-500/30 flex items-center justify-center shadow-sm">
                        <Target className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white leading-tight font-display">{goal.title}</h4>
                        <span className="text-[11px] text-slate-400 font-display">{goal.category}</span>
                      </div>
                    </div>

                    {confirmDeleteId === goal.id ? (
                      <div className="flex items-center gap-1.5 p-1 bg-rose-500/20 border border-rose-500/40 rounded-xl animate-fadeIn">
                        <span className="text-[11px] font-bold text-rose-300 px-1">¿Borrar?</span>
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] rounded-lg shadow-sm"
                        >
                          Sí
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white font-medium text-[11px] rounded-lg"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(goal.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 active:scale-90 transition-all"
                        title="Eliminar meta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Progress info */}
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="font-mono text-lg font-black text-white">
                        {formatEuro(goal.currentAmount)}
                      </span>
                      <span className="text-slate-400 font-mono">
                        Objetivo: <strong className="text-slate-200">{formatEuro(goal.targetAmount)}</strong>
                      </span>
                    </div>

                    <div className="w-full bg-white/[0.05] h-2.5 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                          isCompleted ? 'bg-ios-emerald' : 'bg-gradient-to-r from-amber-400 to-emerald-400'
                        }`}
                        style={{ width: `${goal.progressPercent}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-400 pt-0.5 font-display">
                      <span>{goal.progressPercent}% completado</span>
                      {goal.deadline && (
                        <span className="text-ios-amber font-semibold">Meta: {goal.deadline}</span>
                      )}
                    </div>
                  </div>

                  {/* Suggested contribution banner */}
                  {!isCompleted && goal.suggestedMonthlySavings > 0 && (
                    <div className="mt-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-display">Cuota sugerida:</span>
                      <span className="font-bold text-ios-amber font-mono">
                        {formatEuro(goal.suggestedMonthlySavings)} / mes
                      </span>
                    </div>
                  )}

                  {isCompleted && (
                    <div className="mt-3 p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-1.5 font-display">
                      <CheckCircle2 className="w-4 h-4 text-ios-emerald" />
                      <span>¡Meta 100% Alcanzada!</span>
                    </div>
                  )}
                </div>

                {/* Quick Add Funds button */}
                <div className="pt-3.5 border-t border-white/5 flex items-center gap-2">
                  <button
                    onClick={() => handleQuickContribute(goal, 50)}
                    className="flex-1 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-mono text-xs font-bold active:scale-95 transition-all shadow-sm"
                  >
                    +50€
                  </button>
                  <button
                    onClick={() => handleQuickContribute(goal, 100)}
                    className="flex-1 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-mono text-xs font-bold active:scale-95 transition-all shadow-sm"
                  >
                    +100€
                  </button>
                  <button
                    onClick={() => {
                      setContributeModal(goal);
                      setCustomAmount('');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold active:scale-95 transition-all font-display"
                  >
                    Aportar...
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* CONTRIBUTE MODAL */}
      {contributeModal && (
        <Modal
          isOpen={true}
          onClose={() => setContributeModal(null)}
          title={`Añadir Aportación a ${contributeModal.title}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-300">
              Introduce el importe que deseas ingresar a esta hucha o meta de ahorro:
            </p>

            <div className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 space-y-3 shadow-inner">
              <label className="text-xs text-slate-300 font-semibold block font-display">
                Monto de Aportación (€)
              </label>
              <input
                type="number"
                autoFocus
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Ej: 250"
                className="glass-input rounded-2xl px-4 py-3 text-white font-mono text-lg focus:border-amber-400 outline-none w-full"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setContributeModal(null)}
                className="px-4 py-2 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!customAmount || Number(customAmount) <= 0}
                onClick={() => handleQuickContribute(contributeModal, Number(customAmount))}
                className="px-5 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-black text-xs shadow-[0_4px_16px_rgba(255,159,10,0.35)] active:scale-95 transition-all"
              >
                Confirmar Aportación
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ADD GOAL MODAL */}
      {addModal && (
        <Modal
          isOpen={true}
          onClose={() => setAddModal(false)}
          title="Crear Nueva Meta de Ahorro"
        >
          <form onSubmit={handleCreateGoal} className="space-y-4">
            
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Nombre del Objetivo *</label>
              <input
                type="text"
                required
                value={goalForm.title}
                onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                placeholder="Ej: Reforma Terraza, Viaje Japón, Fondo Universidad..."
                className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Categoría</label>
                <select
                  value={goalForm.category}
                  onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value })}
                  className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full"
                >
                  <option value="Seguridad" className="bg-slate-900 text-white">Seguridad / Colchón</option>
                  <option value="Hogar" className="bg-slate-900 text-white">Hogar & Reformas</option>
                  <option value="Vehículo" className="bg-slate-900 text-white">Vehículo / Movilidad</option>
                  <option value="Largo Plazo" className="bg-slate-900 text-white">Largo Plazo & Jubilación</option>
                  <option value="Ocio" className="bg-slate-900 text-white">Viajes & Experiencias</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Fecha Objetivo (AAAA-MM)</label>
                <input
                  type="text"
                  value={goalForm.deadline}
                  onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })}
                  placeholder="2028-06"
                  className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Importe Objetivo (€) *</label>
                <input
                  type="number"
                  required
                  value={goalForm.targetAmount}
                  onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })}
                  placeholder="10000"
                  className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Ahorrado Inicialmente (€)</label>
                <input
                  type="number"
                  value={goalForm.currentAmount}
                  onChange={(e) => setGoalForm({ ...goalForm, currentAmount: e.target.value })}
                  placeholder="0"
                  className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Notas / Estrategia</label>
              <textarea
                rows={2}
                value={goalForm.notes}
                onChange={(e) => setGoalForm({ ...goalForm, notes: e.target.value })}
                placeholder="Cuenta remunerada, aportación automática mensual, etc."
                className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setAddModal(false)}
                className="px-4 py-2 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-[0_4px_16px_rgba(255,159,10,0.35)] active:scale-95 transition-all"
              >
                Guardar Meta
              </button>
            </div>

          </form>
        </Modal>
      )}

    </div>
  );
}
