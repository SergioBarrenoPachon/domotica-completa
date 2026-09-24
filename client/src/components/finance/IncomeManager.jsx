import React, { useState, useEffect, useMemo } from 'react';
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
  CalendarRange,
  Zap,
  Tag,
  Coins,
  Receipt,
  Layers,
  CheckCircle2,
  Building2,
  Gift,
  DollarSign,
  ArrowRightLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../Modal';

const MONTH_NAMES = [
  { num: 1, name: 'Enero (Mes 1)', short: 'Enero' },
  { num: 2, name: 'Febrero (Mes 2)', short: 'Febrero' },
  { num: 3, name: 'Marzo (Beneficios / Cierre)', short: 'Marzo' },
  { num: 4, name: 'Abril (Mes 4)', short: 'Abril' },
  { num: 5, name: 'Mayo (Mes 5)', short: 'Mayo' },
  { num: 6, name: 'Junio (Paga Extra de Verano)', short: 'Junio' },
  { num: 7, name: 'Julio (Mes 7)', short: 'Julio' },
  { num: 8, name: 'Agosto (Mes 8)', short: 'Agosto' },
  { num: 9, name: 'Septiembre (Mes 9)', short: 'Septiembre' },
  { num: 10, name: 'Octubre (Mes 10)', short: 'Octubre' },
  { num: 11, name: 'Noviembre (Mes 11)', short: 'Noviembre' },
  { num: 12, name: 'Diciembre (Paga Extra de Navidad)', short: 'Diciembre' }
];

const PRESET_CONCEPTS = [
  { name: 'Devolución IRPF / Hacienda', icon: '🏛️', color: 'from-cyan-500/20 to-blue-500/10 border-cyan-400/30 text-cyan-300' },
  { name: 'Ventas Segunda Mano (Wallapop / Vinted)', icon: '📦', color: 'from-emerald-500/20 to-teal-500/10 border-emerald-400/30 text-emerald-300' },
  { name: 'Trabajos Extra / Proyectos Freelance', icon: '💻', color: 'from-indigo-500/20 to-purple-500/10 border-indigo-400/30 text-indigo-300' },
  { name: 'Bonus / Gratificaciones Puntuales', icon: '⭐', color: 'from-amber-500/20 to-yellow-500/10 border-amber-400/30 text-amber-300' },
  { name: 'Regalos & Familiares', icon: '🎁', color: 'from-pink-500/20 to-rose-500/10 border-pink-400/30 text-pink-300' },
  { name: 'Reembolsos & Devoluciones de Compras', icon: '🔄', color: 'from-sky-500/20 to-blue-500/10 border-sky-400/30 text-sky-300' },
  { name: 'Premios & Loterías', icon: '🍀', color: 'from-rose-500/20 to-red-500/10 border-rose-400/30 text-rose-300' },
  { name: 'Otros Ingresos Extraordinarios', icon: '💶', color: 'from-slate-500/20 to-gray-500/10 border-slate-400/30 text-slate-300' }
];

export default function IncomeManager({ api, currentMonth, onDataChanged }) {
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Sub-Tab: 'all' | 'recurring' | 'punctual'
  const [activeTab, setActiveTab] = useState('all');

  // Modals for Recurring Payrolls
  const [isAddIncomeModalOpen, setIsAddIncomeModalOpen] = useState(false);
  const [isTramoModalOpen, setIsTramoModalOpen] = useState(false);
  const [selectedIncomeForTramo, setSelectedIncomeForTramo] = useState(null);
  const [editingIncome, setEditingIncome] = useState(null);

  // Pagas Extras Modal State
  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
  const [selectedIncomeForExtra, setSelectedIncomeForExtra] = useState(null);
  const [editingExtraPay, setEditingExtraPay] = useState(null);
  const [extraForm, setExtraForm] = useState({
    title: 'Paga Extra Verano',
    month: 6,
    dayOfMonth: 25,
    amount: '',
    notes: 'Paga extra'
  });

  // Modal for Punctual Incomes
  const [isPunctualModalOpen, setIsPunctualModalOpen] = useState(false);
  const [editingPunctual, setEditingPunctual] = useState(null);
  const [punctualForm, setPunctualForm] = useState({
    title: '',
    category: 'Devolución IRPF / Hacienda',
    customCategory: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
    isPaid: true
  });

  // Modal para Editar / Renombrar / Redistribuir Concepto Completo
  const [isConceptModalOpen, setIsConceptModalOpen] = useState(false);
  const [editingConceptModal, setEditingConceptModal] = useState(null);
  const [conceptForm, setConceptForm] = useState({
    newName: '',
    targetConcept: '',
    customTarget: '',
    mode: 'rename' // 'rename' | 'redistribute'
  });
  const [isUpdatingConcept, setIsUpdatingConcept] = useState(false);

  // Modal para Redistribuir Cobro Individual Rápido
  const [movingSingleItem, setMovingSingleItem] = useState(null);

  // Form states for recurring
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
  const [expandedConcepts, setExpandedConcepts] = useState({});

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

  const formatMoney = (val) => {
    const num = Math.round((Number(val) || 0) * 100) / 100;
    return num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Separa recurrentes de puntuales
  const recurringIncomes = useMemo(() => {
    return incomes.filter(i => i.frequency !== 'puntual');
  }, [incomes]);

  const punctualIncomes = useMemo(() => {
    return incomes.filter(i => i.frequency === 'puntual');
  }, [incomes]);

  // Agrupación de ingresos puntuales por concepto
  const groupedPunctual = useMemo(() => {
    const groups = {};
    punctualIncomes.forEach(inc => {
      const conceptKey = inc.category || inc.title || 'Otros Ingresos Extraordinarios';
      if (!groups[conceptKey]) {
        const preset = PRESET_CONCEPTS.find(p => p.name.toLowerCase() === conceptKey.toLowerCase());
        groups[conceptKey] = {
          concept: conceptKey,
          icon: preset ? preset.icon : '💶',
          styleClass: preset ? preset.color : 'from-slate-500/20 to-gray-500/10 border-slate-400/30 text-slate-300',
          items: [],
          totalAmount: 0,
          thisMonthAmount: 0,
          latestDate: null
        };
      }
      groups[conceptKey].items.push(inc);
      const amt = Number(inc.amount) || 0;
      groups[conceptKey].totalAmount += amt;

      const incMonth = inc.startDate ? inc.startDate.slice(0, 7) : '';
      if (incMonth === currentMonth) {
        groups[conceptKey].thisMonthAmount += amt;
      }

      if (!groups[conceptKey].latestDate || (inc.startDate && inc.startDate > groups[conceptKey].latestDate)) {
        groups[conceptKey].latestDate = inc.startDate;
      }
    });

    Object.values(groups).forEach(g => {
      g.items.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
      g.totalAmount = Math.round(g.totalAmount * 100) / 100;
      g.thisMonthAmount = Math.round(g.thisMonthAmount * 100) / 100;
    });

    return Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [punctualIncomes, currentMonth]);

  // Lista unificada de todos los conceptos disponibles (presets + creados por el usuario)
  const allAvailableConcepts = useMemo(() => {
    const list = [...PRESET_CONCEPTS];
    punctualIncomes.forEach(inc => {
      const cat = inc.category || inc.title;
      if (cat && !list.some(p => p.name.toLowerCase() === cat.toLowerCase())) {
        list.push({
          name: cat,
          icon: '🏷️',
          color: 'from-slate-500/20 to-gray-500/10 border-slate-400/30 text-slate-300'
        });
      }
    });
    return list;
  }, [punctualIncomes]);

  const toggleExpand = (id) => {
    setExpandedIncomes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleConceptExpand = (concept) => {
    setExpandedConcepts(prev => ({ ...prev, [concept]: !prev[concept] }));
  };

  // --- RECURRING HANDLERS ---
  const handleSaveIncome = async (e) => {
    e.preventDefault();
    if (!incomeForm.title || !incomeForm.amount) return;

    try {
      const cleanAmount = parseFloat(String(incomeForm.amount).replace(',', '.'));
      if (isNaN(cleanAmount) || cleanAmount <= 0) {
        alert('Por favor introduce un importe neto válido para la nómina');
        return;
      }

      const payload = {
        ...incomeForm,
        type: 'ingreso',
        amount: cleanAmount,
        dayOfMonth: parseInt(incomeForm.dayOfMonth, 10) || 28,
        rateSteps: editingIncome ? (editingIncome.rateSteps || []) : [],
        extraPays: editingIncome ? (editingIncome.extraPays || []) : []
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
      await loadIncomes();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.error('Error guardando nómina:', err);
      alert('Error guardando nómina: ' + err.message);
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

  const handleOpenAddExtra = (income) => {
    setSelectedIncomeForExtra(income);
    setEditingExtraPay(null);
    setExtraForm({
      title: 'Paga Extra Verano',
      month: 6,
      dayOfMonth: 25,
      amount: String(income.amount || ''),
      notes: 'Paga extra'
    });
    setIsExtraModalOpen(true);
  };

  const handleOpenEditExtra = (income, extra) => {
    setSelectedIncomeForExtra(income);
    setEditingExtraPay(extra);
    setExtraForm({
      title: extra.title || 'Paga Extra',
      month: Number(extra.month) || 6,
      dayOfMonth: Number(extra.dayOfMonth) || 25,
      amount: String(extra.amount || income.amount || ''),
      notes: extra.notes || ''
    });
    setIsExtraModalOpen(true);
  };

  const handleSaveExtra = async (e) => {
    e.preventDefault();
    if (!selectedIncomeForExtra || !extraForm.amount) return;

    try {
      const currentExtras = Array.isArray(selectedIncomeForExtra.extraPays) ? [...selectedIncomeForExtra.extraPays] : [];
      const cleanAmount = parseFloat(String(extraForm.amount).replace(',', '.'));
      const safeMonth = Math.min(12, Math.max(1, parseInt(extraForm.month, 10) || 6));
      const safeDay = Math.min(31, Math.max(1, parseInt(extraForm.dayOfMonth, 10) || 25));

      if (editingExtraPay) {
        const idx = currentExtras.findIndex(x => x.id === editingExtraPay.id);
        if (idx >= 0) {
          currentExtras[idx] = {
            ...currentExtras[idx],
            title: extraForm.title.trim() || 'Paga Extra',
            month: safeMonth,
            dayOfMonth: safeDay,
            amount: cleanAmount,
            notes: extraForm.notes.trim()
          };
        }
      } else {
        currentExtras.push({
          id: `extra-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          title: extraForm.title.trim() || 'Paga Extra',
          month: safeMonth,
          dayOfMonth: safeDay,
          amount: cleanAmount,
          notes: extraForm.notes.trim()
        });
      }

      currentExtras.sort((a, b) => a.month - b.month);

      await api.updateFinanceTransaction(selectedIncomeForExtra.id, {
        extraPays: currentExtras
      });

      setIsExtraModalOpen(false);
      setSelectedIncomeForExtra(null);
      setEditingExtraPay(null);
      loadIncomes();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert('Error guardando paga extra: ' + err.message);
    }
  };

  const handleDeleteExtra = async (income, extraId) => {
    if (!confirm('¿Eliminar esta paga extra programada?')) return;
    try {
      const updatedExtras = (income.extraPays || []).filter(x => x.id !== extraId);
      await api.updateFinanceTransaction(income.id, { extraPays: updatedExtras });
      loadIncomes();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert('Error al eliminar paga extra: ' + err.message);
    }
  };

  const handleDeleteIncome = async (id, title) => {
    if (!confirm(`¿Eliminar la nómina o ingreso "${title}"?`)) return;
    try {
      await api.deleteFinanceTransaction(id);
      loadIncomes();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert('Error eliminando ingreso: ' + err.message);
    }
  };

  // --- PUNCTUAL INCOME HANDLERS ---
  const handleOpenAddPunctual = (presetConcept = null) => {
    setEditingPunctual(null);
    setPunctualForm({
      title: '',
      category: presetConcept || 'Devolución IRPF / Hacienda',
      customCategory: '',
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      notes: '',
      isPaid: true
    });
    setIsPunctualModalOpen(true);
  };

  const handleOpenEditPunctual = (item) => {
    setEditingPunctual(item);
    const itemCat = item.category || 'Otros Ingresos Extraordinarios';
    const exists = allAvailableConcepts.some(p => p.name.toLowerCase() === itemCat.toLowerCase());
    setPunctualForm({
      title: item.title || '',
      category: exists ? itemCat : 'custom',
      customCategory: exists ? '' : itemCat,
      amount: String(item.amount || ''),
      date: item.startDate ? item.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      notes: item.notes || '',
      isPaid: Boolean(item.paid)
    });
    setIsPunctualModalOpen(true);
  };

  const handleSavePunctual = async (e) => {
    e.preventDefault();
    if (!punctualForm.title || !punctualForm.amount) return;

    const cleanAmt = parseFloat(String(punctualForm.amount).replace(',', '.'));
    if (isNaN(cleanAmt) || cleanAmt <= 0) {
      alert('Introduce un importe válido para el ingreso puntual');
      return;
    }

    const finalCategory = punctualForm.category === 'custom' 
      ? (punctualForm.customCategory.trim() || 'Otros Ingresos Extraordinarios')
      : punctualForm.category;

    const dateParts = punctualForm.date.split('-');
    const day = parseInt(dateParts[2], 10) || 1;
    const monthNum = parseInt(dateParts[1], 10) || 1;

    const payload = {
      title: punctualForm.title.trim(),
      amount: cleanAmt,
      type: 'ingreso',
      category: finalCategory,
      frequency: 'puntual',
      dayOfMonth: day,
      monthOfYear: monthNum,
      startDate: punctualForm.date,
      endDate: punctualForm.date,
      isIndefinite: false,
      notes: punctualForm.notes ? punctualForm.notes.trim() : '',
      initialPaid: Boolean(punctualForm.isPaid)
    };

    try {
      if (editingPunctual) {
        await api.updateFinanceTransaction(editingPunctual.id, payload);
      } else {
        await api.addFinanceTransaction(payload);
      }

      setIsPunctualModalOpen(false);
      setEditingPunctual(null);
      await loadIncomes();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert('Error guardando ingreso puntual: ' + err.message);
    }
  };

  const handleDeletePunctual = async (id, title) => {
    if (!confirm(`¿Eliminar el registro de ingreso puntual "${title}"?`)) return;
    try {
      await api.deleteFinanceTransaction(id);
      await loadIncomes();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert('Error eliminando ingreso: ' + err.message);
    }
  };

  // --- GESTIÓN Y REDISTRIBUCIÓN DE CONCEPTOS ---
  const handleOpenEditConcept = (group) => {
    setEditingConceptModal(group);
    const otherConcepts = allAvailableConcepts.filter(p => p.name.toLowerCase() !== group.concept.toLowerCase());
    setConceptForm({
      newName: group.concept,
      targetConcept: otherConcepts.length > 0 ? otherConcepts[0].name : '',
      customTarget: '',
      mode: 'rename'
    });
    setIsConceptModalOpen(true);
  };

  const handleSaveConcept = async (e) => {
    e.preventDefault();
    if (!editingConceptModal) return;

    const oldName = editingConceptModal.concept;

    try {
      setIsUpdatingConcept(true);

      if (conceptForm.mode === 'rename') {
        const newName = conceptForm.newName.trim();
        if (!newName || newName.toLowerCase() === oldName.toLowerCase()) {
          setIsConceptModalOpen(false);
          return;
        }

        const itemsToUpdate = punctualIncomes.filter(i => 
          (i.category || i.title || 'Otros Ingresos Extraordinarios').toLowerCase() === oldName.toLowerCase()
        );
        
        await Promise.all(
          itemsToUpdate.map(item => api.updateFinanceTransaction(item.id, { category: newName }))
        );
      } else if (conceptForm.mode === 'redistribute') {
        const targetName = conceptForm.targetConcept === 'custom' 
          ? conceptForm.customTarget.trim() 
          : conceptForm.targetConcept;

        if (!targetName || targetName.toLowerCase() === oldName.toLowerCase()) {
          setIsConceptModalOpen(false);
          return;
        }

        const itemsToUpdate = punctualIncomes.filter(i => 
          (i.category || i.title || 'Otros Ingresos Extraordinarios').toLowerCase() === oldName.toLowerCase()
        );
        
        await Promise.all(
          itemsToUpdate.map(item => api.updateFinanceTransaction(item.id, { category: targetName }))
        );
      }

      setIsConceptModalOpen(false);
      setEditingConceptModal(null);
      await loadIncomes();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.error('Error actualizando concepto:', err);
      alert('Error al gestionar concepto: ' + err.message);
    } finally {
      setIsUpdatingConcept(false);
    }
  };

  const handleMoveSingleItem = async (item, targetConcept) => {
    if (!targetConcept || item.category === targetConcept) {
      setMovingSingleItem(null);
      return;
    }
    try {
      await api.updateFinanceTransaction(item.id, { category: targetConcept });
      setMovingSingleItem(null);
      await loadIncomes();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.error('Error redistribuyendo cobro:', err);
      alert('Error: ' + err.message);
    }
  };

  // --- CÁLCULO DE TOTALES GLOBALES ---
  const totalMonthlyIncome = recurringIncomes.reduce((sum, inc) => {
    if (!inc.active) return sum;
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

  const totalPunctualThisMonth = punctualIncomes.reduce((sum, inc) => {
    const m = inc.startDate ? inc.startDate.slice(0, 7) : '';
    return m === currentMonth ? sum + (Number(inc.amount) || 0) : sum;
  }, 0);

  const totalPunctualAllTime = punctualIncomes.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
  const totalIncomeThisMonth = totalMonthlyIncome + totalPunctualThisMonth;

  return (
    <div className="space-y-6">
      
      {/* 1. Header con métricas y botones principales */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-white font-display flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-inner-light">
              <TrendingUp className="w-5 h-5" />
            </span>
            Gestión de Ingresos & Nóminas
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Nóminas periódicas con tramos salariales, pagas extras y registro de ingresos puntuales agrupados por concepto.
          </p>
        </div>

        {/* Botones de creación rápida */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleOpenAddPunctual()}
            className="min-h-touch px-4 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all touch-press shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>+ Ingreso Puntual</span>
          </button>

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
            <span>+ Nueva Nómina</span>
          </button>
        </div>
      </div>

      {/* 2. Tarjetas de Resumen KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-3xl bg-white/[0.04] border border-white/10 shadow-inner-light">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] text-emerald-400 font-bold uppercase tracking-wider block font-display">
              💼 Nóminas Fijas (Mes)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono">
              {recurringIncomes.filter(i => i.active).length} activas
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-white mt-1.5">
            +{formatMoney(totalMonthlyIncome)} €
          </p>
          <span className="text-[11px] text-slate-400 block mt-0.5 font-display">
            Salarios fijos ordinarios mensuales
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white/[0.04] border border-white/10 shadow-inner-light">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] text-amber-400 font-bold uppercase tracking-wider block font-display">
              ⚡ Puntuales (Este Mes)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-mono">
              {punctualIncomes.filter(i => (i.startDate || '').slice(0, 7) === currentMonth).length} en {currentMonth}
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-amber-300 mt-1.5">
            +{formatMoney(totalPunctualThisMonth)} €
          </p>
          <span className="text-[11px] text-slate-400 block mt-0.5 font-display">
            Total histórico: +{formatMoney(totalPunctualAllTime)} € en {groupedPunctual.length} conceptos
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white/[0.04] border border-white/10 shadow-inner-light">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] text-cyan-400 font-bold uppercase tracking-wider block font-display">
              🏁 Previsión Total ({currentMonth})
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-mono">
              Fijos + Puntuales
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-cyan-300 mt-1.5">
            +{formatMoney(totalIncomeThisMonth)} €
          </p>
          <span className="text-[11px] text-slate-400 block mt-0.5 font-display">
            Ingresos computados este mes
          </span>
        </div>
      </div>

      {/* 3. Selector de Subpestañas iOS Segmented Control */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/[0.04] border border-white/8 max-w-xl">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
            activeTab === 'all'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Todos ({incomes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('recurring')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
            activeTab === 'recurring'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
          <span>Nóminas ({recurringIncomes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('punctual')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
            activeTab === 'punctual'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Puntuales ({punctualIncomes.length})</span>
        </button>
      </div>

      {/* 4. SECCIÓN A: INGRESOS PUNTUALES ORGANIZADOS POR CONCEPTO */}
      {(activeTab === 'all' || activeTab === 'punctual') && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-lg font-bold text-white font-display">
                  Ingresos Puntuales por Concepto
                </h4>
                <p className="text-xs text-slate-400">
                  Organizados por fuente: Hacienda, ventas de segunda mano, trabajos extra y devoluciones.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleOpenAddPunctual()}
              className="px-3.5 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Registro</span>
            </button>
          </div>

          {groupedPunctual.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/8 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                <Coins className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-white">No hay ingresos puntuales registrados</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Registra ventas de segunda mano (Wallapop), devoluciones de Hacienda, bonus o trabajos freelance para tener un historial agrupado por concepto.
              </p>
              <button
                onClick={() => handleOpenAddPunctual()}
                className="mt-2 px-4 py-2 rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all touch-press"
              >
                + Registrar Primer Ingreso Puntual
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupedPunctual.map((group) => {
                const isExpanded = Boolean(expandedConcepts[group.concept]);

                return (
                  <div
                    key={group.concept}
                    className="p-5 rounded-3xl bg-white/[0.04] border border-white/10 space-y-4 hover:border-white/20 transition-all shadow-ambient-sm"
                  >
                    {/* Header de la tarjeta del concepto */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl p-2 rounded-2xl bg-white/[0.06] border border-white/10">
                          {group.icon}
                        </span>
                        <div>
                          <h5 className="font-extrabold text-white text-base font-display">
                            {group.concept}
                          </h5>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-400 font-mono">
                              {group.items.length} {group.items.length === 1 ? 'registro' : 'registros'}
                            </span>
                            {group.thisMonthAmount > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-semibold border border-emerald-500/30">
                                Este mes: +{formatMoney(group.thisMonthAmount)}€
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Total acumulado del concepto */}
                      <div className="text-right">
                        <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 block tracking-tight">
                          +{formatMoney(group.totalAmount)} €
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-display font-medium">
                          Total Cobrado
                        </span>
                      </div>
                    </div>

                    {/* Botones de acción rápida del concepto */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/8 text-xs flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleOpenAddPunctual(group.concept)}
                          className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-amber-300 font-semibold flex items-center gap-1.5 transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Añadir cobro</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditConcept(group)}
                          className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.10] text-slate-300 hover:text-white font-medium flex items-center gap-1.5 transition-all"
                          title="Renombrar concepto o redistribuir todos sus cobros"
                        >
                          <Edit3 className="w-3 h-3 text-amber-400" />
                          <span>Editar / Redistribuir</span>
                        </button>
                      </div>

                      <button
                        onClick={() => toggleConceptExpand(group.concept)}
                        className="px-3 py-1.5 rounded-xl text-slate-300 hover:text-white flex items-center gap-1 font-medium transition-all"
                      >
                        <span>{isExpanded ? 'Ocultar cobros' : `Ver registros (${group.items.length})`}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Desglose desplegable de registros individuales de este concepto */}
                    {isExpanded && (
                      <div className="pt-2 space-y-2 border-t border-white/8">
                        {group.items.map((item) => {
                          const dateLabel = item.startDate 
                            ? new Date(item.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'Sin fecha';

                          return (
                            <div
                              key={item.id}
                              className="p-3 rounded-2xl bg-white/[0.03] border border-white/6 flex items-center justify-between gap-3 hover:bg-white/[0.06] transition-all"
                            >
                              <div className="space-y-0.5 min-w-0">
                                <p className="text-sm font-bold text-white truncate font-display">
                                  {item.title}
                                </p>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                  <span className="font-mono text-slate-300">{dateLabel}</span>
                                  {item.notes && (
                                    <>
                                      <span>•</span>
                                      <span className="truncate max-w-[150px]">{item.notes}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className="font-mono font-bold text-sm text-emerald-300">
                                  +{formatMoney(item.amount)} €
                                </span>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setMovingSingleItem(item)}
                                    className="p-1.5 rounded-xl hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 transition-all"
                                    title="Mover este cobro a otro concepto"
                                  >
                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditPunctual(item)}
                                    className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                    title="Editar cobro"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePunctual(item.id, item.title)}
                                    className="p-1.5 rounded-xl hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all"
                                    title="Eliminar cobro"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. SECCIÓN B: NÓMINAS & SALARIOS PERIÓDICOS (CON TRAMOS Y PAGAS EXTRAS) */}
      {(activeTab === 'all' || activeTab === 'recurring') && (
        <div className="space-y-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-lg font-bold text-white font-display">
                  Nóminas & Salarios Habituales
                </h4>
                <p className="text-xs text-slate-400">
                  Control mensual, pagas extraordinarias y subidas de sueldo programadas por periodos.
                </p>
              </div>
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
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Nómina</span>
            </button>
          </div>

          {recurringIncomes.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/8 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <Briefcase className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-white">No hay nóminas recurrentes registradas</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Añade tu nómina habitual para que el sistema empiece a predecir tu saldo mensual y contabilice tus pagas extras.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {recurringIncomes.map((income) => {
                const tramos = Array.isArray(income.rateSteps) ? income.rateSteps : [];
                const extraPays = Array.isArray(income.extraPays) ? income.extraPays : [];
                const isExpanded = Boolean(expandedIncomes[income.id]);

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
                          <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-mono">
                            +{formatMoney(currentAmt)} € / {income.frequency}
                          </span>
                          {currentTramo && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              <span>Tramo activo: {currentTramo.notes || 'Subida'}</span>
                            </span>
                          )}
                          {extraPays.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 flex items-center gap-1 font-mono">
                              🎁 {extraPays.length} {extraPays.length === 1 ? 'paga extra' : 'pagas extras'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            Día {income.dayOfMonth || 28} de cada mes
                          </span>
                          <span>•</span>
                          <span>Inicio: {income.startDate || 'Sin definir'}</span>
                          {tramos.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-amber-400 font-semibold">
                                {tramos.length} tramos salariales
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button
                          onClick={() => handleOpenAddExtra(income)}
                          className="px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all touch-press"
                          title="Añadir paga extra a esta nómina"
                        >
                          <Gift className="w-3.5 h-3.5" />
                          <span>+ Paga Extra</span>
                        </button>

                        <button
                          onClick={() => handleOpenAddTramo(income)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all touch-press"
                          title="Añadir subida salarial o tramo por fechas"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>+ Subida / Tramo</span>
                        </button>

                        <button
                          onClick={() => {
                            setEditingIncome(income);
                            setIncomeForm({
                              title: income.title,
                              amount: String(income.amount || ''),
                              category: income.category || 'Nóminas',
                              frequency: income.frequency || 'mensual',
                              dayOfMonth: income.dayOfMonth || 28,
                              monthOfYear: income.monthOfYear || 1,
                              startDate: income.startDate || new Date().toISOString().slice(0, 7),
                              endDate: income.endDate || '',
                              isIndefinite: income.isIndefinite !== false,
                              notes: income.notes || ''
                            });
                            setIsAddIncomeModalOpen(true);
                          }}
                          className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] text-slate-300 hover:text-white transition-all touch-press"
                          title="Editar nómina base"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteIncome(income.id, income.title)}
                          className="p-2 rounded-xl bg-white/[0.05] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all touch-press"
                          title="Eliminar nómina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {(tramos.length > 0 || extraPays.length > 0) && (
                          <button
                            onClick={() => toggleExpand(income.id)}
                            className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] text-slate-300 transition-all touch-press"
                            title="Desplegar detalles"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Desglose de Pagas Extras y Tramos */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-white/8 space-y-4">
                        
                        {/* Bloque: Pagas Extras Manuales */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 font-display">
                              <Gift className="w-3.5 h-3.5" />
                              <span>Pagas Extras Programadas ({extraPays.length}):</span>
                            </span>
                            <button
                              onClick={() => handleOpenAddExtra(income)}
                              className="text-[11px] text-cyan-400 hover:underline font-semibold"
                            >
                              + Añadir otra paga extra
                            </button>
                          </div>

                          {extraPays.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                              No hay pagas extras configuradas para esta nómina. Pulsa "+ Paga Extra" para programar la de verano o navidad.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {extraPays.map((extra) => {
                                const monthObj = MONTH_NAMES.find(m => m.num === Number(extra.month));
                                return (
                                  <div
                                    key={extra.id}
                                    className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-between gap-2"
                                  >
                                    <div>
                                      <p className="text-xs font-bold text-white font-display">
                                        {extra.title}
                                      </p>
                                      <p className="text-[11px] text-cyan-300/80 font-mono">
                                        {monthObj ? monthObj.short : `Mes ${extra.month}`} (día {extra.dayOfMonth || 25})
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono font-black text-cyan-300">
                                        +{formatMoney(extra.amount)} €
                                      </span>
                                      <button
                                        onClick={() => handleOpenEditExtra(income, extra)}
                                        className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white"
                                        title="Editar paga extra"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteExtra(income, extra.id)}
                                        className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                                        title="Eliminar paga extra"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Bloque: Tramos Salariales por Fechas */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 font-display">
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                              <span>Tramos Salariales y Subidas ({tramos.length}):</span>
                            </span>
                            <button
                              onClick={() => handleOpenAddTramo(income)}
                              className="text-[11px] text-amber-400 hover:underline font-semibold"
                            >
                              + Añadir subida salarial
                            </button>
                          </div>

                          {tramos.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                              No hay tramos registrados. Esta nómina tiene un importe constante.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {tramos.map((step) => {
                                const isActiveNow = (!step.startDate || currentMonth >= step.startDate.slice(0, 7)) &&
                                                    (!step.endDate || currentMonth <= step.endDate.slice(0, 7));

                                return (
                                  <div
                                    key={step.id}
                                    className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 ${
                                      isActiveNow 
                                        ? 'bg-amber-500/10 border-amber-400/30' 
                                        : 'bg-white/[0.02] border-white/5 opacity-75'
                                    }`}
                                  >
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <p className="text-xs font-bold text-white font-display">
                                          {step.notes || 'Tramo salarial'}
                                        </p>
                                        {isActiveNow && (
                                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black">
                                            ACTUAL
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10.5px] text-slate-400 font-mono">
                                        {step.startDate} {step.endDate ? `hasta ${step.endDate}` : 'en adelante'}
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono font-black text-amber-300">
                                        +{formatMoney(step.amount)} €
                                      </span>
                                      <button
                                        onClick={() => handleDeleteTramo(income, step.id)}
                                        className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                                        title="Eliminar tramo"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- MODAL 1: NUEVA / EDITAR NÓMINA BASE --- */}
      {isAddIncomeModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddIncomeModalOpen(false)}
          title={editingIncome ? 'Editar Nómina Habitual' : 'Registrar Nueva Nómina'}
        >
          <form onSubmit={handleSaveIncome} className="space-y-4">
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Nombre del Ingreso / Nómina *</label>
              <input
                type="text"
                required
                value={incomeForm.title}
                onChange={(e) => setIncomeForm({ ...incomeForm, title: e.target.value })}
                placeholder="Ej: Nómina Empresa Sergio, Nómina María..."
                className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Importe Mensual Neto (€) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={incomeForm.amount}
                  onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                  placeholder="2450.00"
                  className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Día del Mes que se Cobra (1-31) *</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={incomeForm.dayOfMonth}
                  onChange={(e) => setIncomeForm({ ...incomeForm, dayOfMonth: e.target.value })}
                  placeholder="28"
                  className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Fecha de Inicio (AAAA-MM)</label>
                <input
                  type="text"
                  value={incomeForm.startDate}
                  onChange={(e) => setIncomeForm({ ...incomeForm, startDate: e.target.value })}
                  placeholder="2024-01"
                  className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Categoría</label>
                <input
                  type="text"
                  value={incomeForm.category}
                  onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value })}
                  placeholder="Nóminas"
                  className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Notas</label>
              <textarea
                value={incomeForm.notes}
                onChange={(e) => setIncomeForm({ ...incomeForm, notes: e.target.value })}
                placeholder="Comentarios adicionales o retenciones..."
                rows={2}
                className="glass-input rounded-2xl px-3.5 py-2 text-white text-sm focus:border-white/30 outline-none w-full resize-none"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsAddIncomeModalOpen(false)}
                className="px-4 py-2 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                Guardar Nómina
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- MODAL 2: AÑADIR / EDITAR TRAMO SALARIAL --- */}
      {isTramoModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsTramoModalOpen(false)}
          title={`Subida Salarial: ${selectedIncomeForTramo?.title || ''}`}
        >
          <form onSubmit={handleSaveTramo} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              💡 <strong>Periodos salariales:</strong> Puedes definir que desde cierta fecha el sueldo subió a otro importe. El calendario calculará el sueldo exacto para cada mes automáticamente.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Fecha Inicio del Tramo (AAAA-MM) *</label>
                <input
                  type="text"
                  required
                  value={tramoForm.startDate}
                  onChange={(e) => setTramoForm({ ...tramoForm, startDate: e.target.value })}
                  placeholder="2025-01"
                  className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Fecha Fin (Opcional, vacío = Indefinido)</label>
                <input
                  type="text"
                  value={tramoForm.endDate}
                  onChange={(e) => setTramoForm({ ...tramoForm, endDate: e.target.value })}
                  placeholder="2025-12"
                  className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Nuevo Importe Neto Mensual (€) *</label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={tramoForm.amount}
                onChange={(e) => setTramoForm({ ...tramoForm, amount: e.target.value })}
                placeholder="2650.00"
                className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Motivo / Notas del Tramo</label>
              <input
                type="text"
                value={tramoForm.notes}
                onChange={(e) => setTramoForm({ ...tramoForm, notes: e.target.value })}
                placeholder="Ej: Subida IPC 3%, Promoción a Senior..."
                className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsTramoModalOpen(false)}
                className="px-4 py-2 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all"
              >
                Guardar Tramo
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- MODAL 3: AÑADIR / EDITAR PAGA EXTRA MANUAL --- */}
      {isExtraModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsExtraModalOpen(false);
            setEditingExtraPay(null);
          }}
          title={editingExtraPay ? 'Editar Paga Extra' : `Nueva Paga Extra: ${selectedIncomeForExtra?.title || ''}`}
        >
          <form onSubmit={handleSaveExtra} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300">
              🎁 <strong>Pagas extras exactas:</strong> Elige el mes exacto del año y el día de cobro. Si tienes dos, añade una en Junio y otra en Diciembre; si son tres, añade las tres.
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Concepto de la Paga Extra *</label>
              <input
                type="text"
                required
                value={extraForm.title}
                onChange={(e) => setExtraForm({ ...extraForm, title: e.target.value })}
                placeholder="Ej: Paga Extra Verano, Paga Extra Navidad..."
                className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Mes en que se cobra *</label>
                <select
                  value={extraForm.month}
                  onChange={(e) => setExtraForm({ ...extraForm, month: parseInt(e.target.value, 10) })}
                  className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full"
                >
                  {MONTH_NAMES.map(m => (
                    <option key={m.num} value={m.num} className="bg-slate-900 text-white">
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Día del Mes (1-31) *</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={extraForm.dayOfMonth}
                  onChange={(e) => setExtraForm({ ...extraForm, dayOfMonth: e.target.value })}
                  placeholder="25"
                  className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Importe Neto de la Paga Extra (€) *</label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={extraForm.amount}
                onChange={(e) => setExtraForm({ ...extraForm, amount: e.target.value })}
                placeholder="2150.00"
                className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Notas</label>
              <input
                type="text"
                value={extraForm.notes}
                onChange={(e) => setExtraForm({ ...extraForm, notes: e.target.value })}
                placeholder="Detalles sobre esta paga extra..."
                className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setIsExtraModalOpen(false);
                  setEditingExtraPay(null);
                }}
                className="px-4 py-2 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-2xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black text-xs shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
              >
                Guardar Paga Extra
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- MODAL 4: AÑADIR / EDITAR INGRESO PUNTUAL ORGANIZADO POR CONCEPTO --- */}
      {isPunctualModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsPunctualModalOpen(false);
            setEditingPunctual(null);
          }}
          title={editingPunctual ? 'Editar Ingreso Puntual' : 'Registrar Ingreso Puntual'}
        >
          <form onSubmit={handleSavePunctual} className="space-y-4">
            
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">
                Concepto / Categoría Agrupadora *
              </label>
              <select
                value={punctualForm.category}
                onChange={(e) => setPunctualForm({ ...punctualForm, category: e.target.value })}
                className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full"
              >
                <optgroup label="Conceptos Disponibles">
                  {allAvailableConcepts.map(p => (
                    <option key={p.name} value={p.name} className="bg-slate-900 text-white">
                      {p.icon} {p.name}
                    </option>
                  ))}
                </optgroup>
                <option value="custom" className="bg-slate-900 text-white font-bold">
                  ➕ Crear Nuevo Concepto Personalizado...
                </option>
              </select>
            </div>

            {punctualForm.category === 'custom' && (
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">
                  Escribe el Nombre del Nuevo Concepto *
                </label>
                <input
                  type="text"
                  required
                  value={punctualForm.customCategory}
                  onChange={(e) => setPunctualForm({ ...punctualForm, customCategory: e.target.value })}
                  placeholder="Ej: Alquiler Trastero, Dividendos Acciones..."
                  className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full"
                />
              </div>
            )}

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">
                Título o Detalle del Cobro *
              </label>
              <input
                type="text"
                required
                value={punctualForm.title}
                onChange={(e) => setPunctualForm({ ...punctualForm, title: e.target.value })}
                placeholder="Ej: Devolución IRPF 2025, Venta Bicicleta Montaña, Bonus Q3..."
                className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">
                  Importe del Cobro (€) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={punctualForm.amount}
                  onChange={(e) => setPunctualForm({ ...punctualForm, amount: e.target.value })}
                  placeholder="450.00"
                  className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">
                  Fecha del Cobro (AAAA-MM-DD) *
                </label>
                <input
                  type="date"
                  required
                  value={punctualForm.date}
                  onChange={(e) => setPunctualForm({ ...punctualForm, date: e.target.value })}
                  className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Notas o Descripción</label>
              <input
                type="text"
                value={punctualForm.notes}
                onChange={(e) => setPunctualForm({ ...punctualForm, notes: e.target.value })}
                placeholder="Detalle opcional (ej: comprador Wallapop, nº de justificante...)"
                className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full"
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Marcar como cobrado</span>
                <span className="text-[11px] text-slate-400">Sumará inmediatamente al dinero disponible en cuenta</span>
              </div>
              <input
                type="checkbox"
                checked={punctualForm.isPaid}
                onChange={(e) => setPunctualForm({ ...punctualForm, isPaid: e.target.checked })}
                className="w-5 h-5 rounded-lg accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setIsPunctualModalOpen(false);
                  setEditingPunctual(null);
                }}
                className="px-4 py-2 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all"
              >
                {editingPunctual ? 'Actualizar Ingreso' : 'Guardar Ingreso Puntual'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- MODAL 4: GESTIONAR / RENOMBRAR / REDISTRIBUIR CONCEPTO COMPLETO --- */}
      {isConceptModalOpen && editingConceptModal && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsConceptModalOpen(false);
            setEditingConceptModal(null);
          }}
          title={`Gestionar Concepto: ${editingConceptModal.concept}`}
        >
          <form onSubmit={handleSaveConcept} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block font-display">Concepto seleccionado:</span>
                <span className="text-white font-bold text-sm flex items-center gap-1.5 mt-0.5">
                  <span>{editingConceptModal.icon}</span>
                  <span>{editingConceptModal.concept}</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block font-display">Cobros acumulados:</span>
                <span className="text-emerald-300 font-bold font-mono">
                  {editingConceptModal.items.length} ({formatMoney(editingConceptModal.totalAmount)} €)
                </span>
              </div>
            </div>

            {/* Selector de modo: Renombrar vs Redistribuir */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/10">
              <button
                type="button"
                onClick={() => setConceptForm({ ...conceptForm, mode: 'rename' })}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                  conceptForm.mode === 'rename'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Renombrar Concepto</span>
              </button>
              <button
                type="button"
                onClick={() => setConceptForm({ ...conceptForm, mode: 'redistribute' })}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                  conceptForm.mode === 'redistribute'
                    ? 'bg-cyan-400 text-slate-950 font-black shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Redistribuir Cobros</span>
              </button>
            </div>

            {conceptForm.mode === 'rename' ? (
              <div className="space-y-2">
                <label className="text-xs text-slate-300 font-semibold block font-display">
                  Nuevo Nombre para este Concepto *
                </label>
                <input
                  type="text"
                  required
                  value={conceptForm.newName}
                  onChange={(e) => setConceptForm({ ...conceptForm, newName: e.target.value })}
                  placeholder="Ej: Ventas Wallapop & Vinted, Bonus Anual..."
                  className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full"
                />
                <p className="text-[11px] text-slate-400">
                  💡 Todos los cobros asociados ({editingConceptModal.items.length} {editingConceptModal.items.length === 1 ? 'registro' : 'registros'}) pasarán a tener este nuevo nombre como concepto.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">
                    Mover todos los cobros hacia el concepto: *
                  </label>
                  <select
                    value={conceptForm.targetConcept}
                    onChange={(e) => setConceptForm({ ...conceptForm, targetConcept: e.target.value })}
                    className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full"
                  >
                    {allAvailableConcepts
                      .filter(p => p.name.toLowerCase() !== editingConceptModal.concept.toLowerCase())
                      .map(p => (
                        <option key={p.name} value={p.name} className="bg-slate-900 text-white">
                          {p.icon} {p.name}
                        </option>
                      ))}
                    <option value="custom" className="bg-slate-900 text-white font-bold">
                      ➕ Crear y mover a un nuevo concepto...
                    </option>
                  </select>
                </div>

                {conceptForm.targetConcept === 'custom' && (
                  <div>
                    <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">
                      Nombre del nuevo concepto destino *
                    </label>
                    <input
                      type="text"
                      required
                      value={conceptForm.customTarget}
                      onChange={(e) => setConceptForm({ ...conceptForm, customTarget: e.target.value })}
                      placeholder="Ej: Nuevo concepto agrupador..."
                      className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full"
                    />
                  </div>
                )}

                <p className="text-[11px] text-cyan-300 bg-cyan-500/10 p-2.5 rounded-xl border border-cyan-500/20">
                  ℹ️ Los {editingConceptModal.items.length} cobros de <strong>"{editingConceptModal.concept}"</strong> se transferirán al concepto elegido y se unificarán.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setIsConceptModalOpen(false);
                  setEditingConceptModal(null);
                }}
                className="px-4 py-2 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isUpdatingConcept}
                className="px-5 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isUpdatingConcept ? 'Actualizando...' : (conceptForm.mode === 'rename' ? 'Guardar Nuevo Nombre' : 'Redistribuir Cobros')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- MODAL 5: REDISTRIBUIR COBRO INDIVIDUAL A OTRO CONCEPTO --- */}
      {movingSingleItem && (
        <Modal
          isOpen={true}
          onClose={() => setMovingSingleItem(null)}
          title="Mover Cobro a Otro Concepto"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
              <span className="text-[11px] text-slate-400 block font-display">Cobro a redistribuir:</span>
              <p className="text-white font-bold text-sm font-display">{movingSingleItem.title}</p>
              <div className="flex items-center gap-2 text-xs text-emerald-300 font-mono">
                <span>+{formatMoney(movingSingleItem.amount)} €</span>
                <span>•</span>
                <span className="text-slate-400">{movingSingleItem.startDate || 'Sin fecha'}</span>
              </div>
              <span className="text-[11px] text-amber-400 block pt-1">
                Concepto actual: <strong>{movingSingleItem.category || 'Otros Ingresos Extraordinarios'}</strong>
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-2 font-display">
                Selecciona el nuevo concepto para este cobro:
              </label>
              <div className="grid grid-cols-1 gap-1.5 max-h-60 overflow-y-auto pr-1">
                {allAvailableConcepts
                  .filter(c => c.name.toLowerCase() !== (movingSingleItem.category || '').toLowerCase())
                  .map(concept => (
                    <button
                      key={concept.name}
                      type="button"
                      onClick={() => handleMoveSingleItem(movingSingleItem, concept.name)}
                      className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.10] border border-white/8 hover:border-amber-400/40 text-left flex items-center justify-between transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{concept.icon}</span>
                        <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                          {concept.name}
                        </span>
                      </div>
                      <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                    </button>
                  ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setMovingSingleItem(null)}
                className="px-4 py-2 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold active:scale-95 transition-all"
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
