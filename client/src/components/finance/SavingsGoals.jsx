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
    if (window.confirm('¿Eliminar esta meta de ahorro?')) {
      try {
        await api.deleteGoal(id);
        loadGoals();
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error(err);
      }
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
        <div className="glass-panel p-5 rounded-3xl border border-emerald-500/20 bg-emerald-950/15 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-display">
              Total Acumulado en Metas
            </span>
            <Target className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-white font-mono">
              {formatEuro(totalSavedGoals)}
            </p>
            <p className="text-xs text-emerald-300/80 mt-1">
              De un objetivo total de <span className="font-bold">{formatEuro(totalTargetGoals)}</span>
            </p>
          </div>
        </div>

        {/* Ahorro Sugerido Mensual */}
        <div className="glass-panel p-5 rounded-3xl border border-amber-500/20 bg-amber-950/15 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-display">
              Ahorro Mensual Recomendado
            </span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-amber-400 font-mono">
              {formatEuro(Math.round(totalMonthlyCommitment))} / mes
            </p>
            <p className="text-xs text-amber-300/80 mt-1">
              Para cumplir todas las metas en su fecha límite
            </p>
          </div>
        </div>

        {/* Botón Nueva Meta */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 flex flex-col justify-between items-start">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-white font-display block">
              Planificación por Objetivos
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Establece hitos de ahorro a corto, medio y largo plazo.
            </p>
          </div>
          <button
            onClick={() => setAddModal(true)}
            className="w-full mt-3 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 touch-press shadow-lg shadow-amber-950/50"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nueva Meta de Ahorro</span>
          </button>
        </div>

      </div>

      {/* GOALS GRID */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white font-display">
          Metas y Hitos Financieros ({goals.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const isCompleted = goal.progressPercent >= 100;

            return (
              <div
                key={goal.id}
                className={`glass-panel p-5 rounded-3xl border transition-all flex flex-col justify-between gap-4 ${
                  isCompleted ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  {/* Top info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                        <Target className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white leading-tight">{goal.title}</h4>
                        <span className="text-[11px] text-slate-400">{goal.category}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                      title="Eliminar meta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Progress info */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="font-mono text-lg font-black text-white">
                        {formatEuro(goal.currentAmount)}
                      </span>
                      <span className="text-slate-400 font-mono">
                        Objetivo: <strong className="text-slate-200">{formatEuro(goal.targetAmount)}</strong>
                      </span>
                    </div>

                    <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted ? 'bg-emerald-400' : 'bg-gradient-to-r from-amber-500 to-emerald-400'
                        }`}
                        style={{ width: `${goal.progressPercent}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                      <span>{goal.progressPercent}% completado</span>
                      {goal.deadline && (
                        <span className="text-amber-400 font-medium">Meta: {goal.deadline}</span>
                      )}
                    </div>
                  </div>

                  {/* Suggested contribution banner */}
                  {!isCompleted && goal.suggestedMonthlySavings > 0 && (
                    <div className="mt-3 p-2.5 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Cuota sugerida:</span>
                      <span className="font-bold text-amber-400 font-mono">
                        {formatEuro(goal.suggestedMonthlySavings)} / mes
                      </span>
                    </div>
                  )}

                  {isCompleted && (
                    <div className="mt-3 p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>¡Meta 100% Alcanzada!</span>
                    </div>
                  )}
                </div>

                {/* Quick Add Funds button */}
                <div className="pt-3 border-t border-white/5 flex items-center gap-1.5">
                  <button
                    onClick={() => handleQuickContribute(goal, 50)}
                    className="flex-1 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-mono text-xs font-bold touch-press"
                  >
                    +50€
                  </button>
                  <button
                    onClick={() => handleQuickContribute(goal, 100)}
                    className="flex-1 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-mono text-xs font-bold touch-press"
                  >
                    +100€
                  </button>
                  <button
                    onClick={() => {
                      setContributeModal(goal);
                      setCustomAmount('');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold touch-press"
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

            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
              <label className="text-xs text-slate-300 font-semibold block">
                Monto de Aportación (€)
              </label>
              <input
                type="number"
                autoFocus
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Ej: 250"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-lg focus:border-amber-400 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setContributeModal(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!customAmount || Number(customAmount) <= 0}
                onClick={() => handleQuickContribute(contributeModal, Number(customAmount))}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-amber-950/50"
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
              <label className="text-xs text-slate-300 font-semibold block mb-1">Nombre del Objetivo *</label>
              <input
                type="text"
                required
                value={goalForm.title}
                onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                placeholder="Ej: Reforma Terraza, Viaje Japón, Fondo Universidad..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Categoría</label>
                <select
                  value={goalForm.category}
                  onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
                >
                  <option value="Seguridad">Seguridad / Colchón</option>
                  <option value="Hogar">Hogar & Reformas</option>
                  <option value="Vehículo">Vehículo / Movilidad</option>
                  <option value="Largo Plazo">Largo Plazo & Jubilación</option>
                  <option value="Ocio">Viajes & Experiencias</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Fecha Objetivo (AAAA-MM)</label>
                <input
                  type="text"
                  value={goalForm.deadline}
                  onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })}
                  placeholder="2028-06"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Importe Objetivo (€) *</label>
                <input
                  type="number"
                  required
                  value={goalForm.targetAmount}
                  onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })}
                  placeholder="10000"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Ahorrado Inicialmente (€)</label>
                <input
                  type="number"
                  value={goalForm.currentAmount}
                  onChange={(e) => setGoalForm({ ...goalForm, currentAmount: e.target.value })}
                  placeholder="0"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">Notas / Estrategia</label>
              <textarea
                rows={2}
                value={goalForm.notes}
                onChange={(e) => setGoalForm({ ...goalForm, notes: e.target.value })}
                placeholder="Cuenta remunerada, aportación automática mensual, etc."
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setAddModal(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-950/50"
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
