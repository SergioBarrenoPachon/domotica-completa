import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  CalendarRange, 
  Clock, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  AlertCircle, 
  Sparkles, 
  Landmark, 
  ShieldCheck, 
  Briefcase, 
  Home, 
  Car, 
  Zap, 
  Tv, 
  Tag, 
  Percent, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  SlidersHorizontal, 
  Layers, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  Wallet,
  CheckCircle2,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../Modal';

const MONTH_NAMES = [
  { num: 1, name: 'Ene', full: 'Enero' },
  { num: 2, name: 'Feb', full: 'Febrero' },
  { num: 3, name: 'Mar', full: 'Marzo' },
  { num: 4, name: 'Abr', full: 'Abril' },
  { num: 5, name: 'May', full: 'Mayo' },
  { num: 6, name: 'Jun', full: 'Junio' },
  { num: 7, name: 'Jul', full: 'Julio' },
  { num: 8, name: 'Ago', full: 'Agosto' },
  { num: 9, name: 'Sep', full: 'Septiembre' },
  { num: 10, name: 'Oct', full: 'Octubre' },
  { num: 11, name: 'Nov', full: 'Noviembre' },
  { num: 12, name: 'Dic', full: 'Diciembre' }
];

export default function ContractsAndRulesManager({ api, currentMonth, onDataChanged }) {
  const [transactions, setTransactions] = useState([]);
  const [loans, setLoans] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'paused' | 'with_end'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'gasto' | 'ingreso'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Form State
  const initialFormState = {
    title: '',
    amount: '',
    type: 'gasto',
    category: 'Vivienda',
    frequency: 'mensual',
    dayOfMonth: 1,
    monthOfYear: 1,
    startDate: currentMonth || new Date().toISOString().slice(0, 7),
    hasEndDate: false,
    endDate: '',
    active: true,
    customMonthsEnabled: false,
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    rateSteps: [],
    loanId: '',
    notes: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // Step adding in modal
  const [newStep, setNewStep] = useState({
    name: '',
    startDate: '',
    endDate: '',
    amount: '',
    notes: ''
  });
  const [showStepForm, setShowStepForm] = useState(false);

  // Load all rules and loans
  const loadData = async () => {
    try {
      setLoading(true);
      const [txList, loanList, catList] = await Promise.all([
        api.getFinanceTransactions ? api.getFinanceTransactions() : [],
        api.getLoans ? api.getLoans() : [],
        api.getFinanceCategories ? api.getFinanceCategories() : []
      ]);
      setTransactions(Array.isArray(txList) ? txList : []);
      setLoans(Array.isArray(loanList) ? loanList : []);
      setCategories(Array.isArray(catList) ? catList : []);
    } catch (err) {
      console.error('Error cargando contratos y reglas fijas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 1-Click Toggle Active / Inactive
  const handleToggleActive = async (item) => {
    try {
      if (api.toggleTransactionActive) {
        await api.toggleTransactionActive(item.id);
      } else {
        await api.updateTransactionRule(item.id, { active: !item.active });
      }
      // Optimistic update
      setTransactions(prev => prev.map(t => t.id === item.id ? { ...t, active: !t.active } : t));
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.error('Error alternando estado de la regla:', err);
      loadData();
    }
  };

  // Delete Rule
  const handleDelete = async (id) => {
    try {
      await api.deleteFinanceTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      setConfirmDeleteId(null);
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.error('Error al eliminar regla:', err);
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData(initialFormState);
    setShowStepForm(false);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      amount: item.amount !== undefined ? String(item.amount) : '',
      type: item.type || 'gasto',
      category: item.category || 'Vivienda',
      frequency: item.frequency || 'mensual',
      dayOfMonth: item.dayOfMonth || 1,
      monthOfYear: item.monthOfYear || 1,
      startDate: item.startDate ? item.startDate.slice(0, 7) : (currentMonth || new Date().toISOString().slice(0, 7)),
      hasEndDate: Boolean(item.endDate),
      endDate: item.endDate ? item.endDate.slice(0, 7) : '',
      active: item.active !== false,
      customMonthsEnabled: Array.isArray(item.activeMonths) && item.activeMonths.length < 12,
      activeMonths: Array.isArray(item.activeMonths) && item.activeMonths.length > 0 
        ? item.activeMonths 
        : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      rateSteps: Array.isArray(item.rateSteps) ? [...item.rateSteps] : [],
      loanId: item.loanId || '',
      notes: item.notes || ''
    });
    setShowStepForm(false);
    setIsModalOpen(true);
  };

  // Toggle month selection in modal
  const handleToggleMonthInForm = (monthNum) => {
    setFormData(prev => {
      const current = prev.activeMonths || [];
      const exists = current.includes(monthNum);
      let updated;
      if (exists) {
        if (current.length === 1) return prev; // Keep at least 1 month
        updated = current.filter(m => m !== monthNum);
      } else {
        updated = [...current, monthNum].sort((a, b) => a - b);
      }
      return {
        ...prev,
        customMonthsEnabled: updated.length < 12,
        activeMonths: updated
      };
    });
  };

  // Preset months handlers
  const handleApplyMonthPreset = (preset) => {
    if (preset === 'all') {
      setFormData(prev => ({
        ...prev,
        customMonthsEnabled: false,
        activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      }));
    } else if (preset === '10_sep_jun') {
      // 10 of 12 months: September to June (excludes July & August)
      setFormData(prev => ({
        ...prev,
        customMonthsEnabled: true,
        activeMonths: [1, 2, 3, 4, 5, 6, 9, 10, 11, 12]
      }));
    } else if (preset === '10_first') {
      // First 10 months of the year
      setFormData(prev => ({
        ...prev,
        customMonthsEnabled: true,
        activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      }));
    } else if (preset === 'semestral_jun_dic') {
      setFormData(prev => ({
        ...prev,
        customMonthsEnabled: true,
        activeMonths: [6, 12]
      }));
    } else if (preset === 'trimestral') {
      setFormData(prev => ({
        ...prev,
        customMonthsEnabled: true,
        activeMonths: [3, 6, 9, 12]
      }));
    }
  };

  // Step rates handlers
  const handleAddStep = () => {
    if (!newStep.startDate || !newStep.amount) {
      alert('Por favor indica al menos la fecha de inicio del tramo y el importe.');
      return;
    }
    const stepObj = {
      id: `step-${Date.now()}`,
      name: newStep.name || `Tramo desde ${newStep.startDate}`,
      startDate: newStep.startDate,
      endDate: newStep.endDate || null,
      amount: parseFloat(newStep.amount) || 0,
      notes: newStep.notes || ''
    };
    setFormData(prev => ({
      ...prev,
      rateSteps: [...prev.rateSteps, stepObj].sort((a, b) => a.startDate.localeCompare(b.startDate))
    }));
    setNewStep({ name: '', startDate: '', endDate: '', amount: '', notes: '' });
    setShowStepForm(false);
  };

  const handleRemoveStep = (stepId) => {
    setFormData(prev => ({
      ...prev,
      rateSteps: prev.rateSteps.filter(s => s.id !== stepId)
    }));
  };

  // Submit Form (Create or Update)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.title || formData.amount === '') {
      alert('Título e importe son obligatorios');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: formData.title.trim(),
        amount: parseFloat(formData.amount) || 0,
        type: formData.type,
        category: formData.category,
        frequency: formData.frequency,
        dayOfMonth: parseInt(formData.dayOfMonth, 10) || 1,
        monthOfYear: parseInt(formData.monthOfYear, 10) || 1,
        startDate: formData.startDate || null,
        endDate: formData.hasEndDate && formData.endDate ? formData.endDate : null,
        isIndefinite: !formData.hasEndDate,
        active: formData.active,
        activeMonths: formData.customMonthsEnabled && formData.activeMonths.length < 12 
          ? formData.activeMonths 
          : null,
        rateSteps: formData.rateSteps || [],
        loanId: formData.loanId || null,
        notes: formData.notes || ''
      };

      if (editingItem) {
        await api.updateTransactionRule(editingItem.id, payload);
      } else {
        await api.addFinanceTransaction(payload);
      }

      setIsModalOpen(false);
      await loadData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.error('Error al guardar contrato/regla:', err);
      alert('Error al guardar: ' + (err.message || 'Compruebe los datos'));
    } finally {
      setSubmitting(false);
    }
  };

  // Helper calculation for KPI metrics
  const kpis = useMemo(() => {
    let monthlyFixedIncome = 0;
    let monthlyFixedExpenses = 0;
    let activeLoansCount = 0;
    let totalPendingLoanDebt = 0;

    transactions.forEach(t => {
      if (!t.active) return;
      const amt = Number(t.amount) || 0;
      
      // Calculate monthly equivalent considering active months if custom
      let multiplier = 1;
      if (Array.isArray(t.activeMonths) && t.activeMonths.length > 0) {
        multiplier = t.activeMonths.length / 12;
      } else if (t.frequency === 'anual') {
        multiplier = 1 / 12;
      } else if (t.frequency === 'semestral') {
        multiplier = 2 / 12;
      } else if (t.frequency === 'trimestral') {
        multiplier = 4 / 12;
      } else if (t.frequency === 'puntual') {
        multiplier = 0; // Exclude one-offs from structural fixed budget
      }

      if (t.type === 'ingreso') {
        monthlyFixedIncome += amt * multiplier;
      } else {
        monthlyFixedExpenses += amt * multiplier;
      }
    });

    loans.forEach(loan => {
      activeLoansCount++;
      totalPendingLoanDebt += Number(loan.currentBalance) || 0;
    });

    const netSavingsMargin = monthlyFixedIncome - monthlyFixedExpenses;
    const savingsRate = monthlyFixedIncome > 0 ? (netSavingsMargin / monthlyFixedIncome) * 100 : 0;

    return {
      monthlyFixedIncome,
      monthlyFixedExpenses,
      netSavingsMargin,
      savingsRate,
      activeLoansCount,
      totalPendingLoanDebt
    };
  }, [transactions, loans]);

  // Filtered list
  const filteredList = useMemo(() => {
    return transactions.filter(t => {
      // Type filter
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;

      // Status filter
      if (statusFilter === 'active' && !t.active) return false;
      if (statusFilter === 'paused' && t.active) return false;
      if (statusFilter === 'with_end' && !t.endDate && !t.loanId) return false;

      // Category filter
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (t.title || '').toLowerCase().includes(q);
        const matchesCat = (t.category || '').toLowerCase().includes(q);
        const matchesNotes = (t.notes || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesCat && !matchesNotes) return false;
      }

      return true;
    });
  }, [transactions, typeFilter, statusFilter, categoryFilter, searchQuery]);

  // Helper icon by category/title
  const getItemIcon = (item) => {
    const t = (item.title || '').toLowerCase();
    const c = (item.category || '').toLowerCase();
    if (item.loanId || t.includes('hipoteca') || t.includes('préstamo')) return <Landmark className="w-5 h-5 text-indigo-400" />;
    if (item.type === 'ingreso' || c.includes('sueldo') || c.includes('ingreso') || c.includes('freelance')) return <Briefcase className="w-5 h-5 text-emerald-400" />;
    if (c.includes('seguro') || t.includes('seguro') || t.includes('póliza')) return <ShieldCheck className="w-5 h-5 text-cyan-400" />;
    if (c.includes('vehículo') || c.includes('coche') || t.includes('coche')) return <Car className="w-5 h-5 text-amber-400" />;
    if (c.includes('vivienda') || c.includes('hogar')) return <Home className="w-5 h-5 text-blue-400" />;
    if (c.includes('suministro') || c.includes('luz') || c.includes('agua') || c.includes('gas')) return <Zap className="w-5 h-5 text-amber-300" />;
    if (c.includes('ocio') || c.includes('suscrip')) return <Tv className="w-5 h-5 text-purple-400" />;
    return <Tag className="w-5 h-5 text-slate-400" />;
  };

  // Helper date remaining
  const calculateMonthsRemaining = (endDateStr) => {
    if (!endDateStr) return null;
    const [ey, em] = endDateStr.split('-').map(Number);
    const now = new Date();
    const cy = now.getFullYear();
    const cm = now.getMonth() + 1;
    const diff = (ey - cy) * 12 + (em - cm);
    return diff;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. CUADRO VISTOSO - BANNER DE MÉTRICAS ESTRUCTURALES Y CONTRATOS */}
      <div className="glass-ios p-6 sm:p-7 rounded-[32px] sm:rounded-[36px] border border-white/14 shadow-ambient relative overflow-hidden">
        {/* Glow ambiental */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-gradient-to-br from-indigo-500/10 via-amber-500/8 to-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2 font-display">
                <Layers className="w-4 h-4 text-amber-400" />
                Centro de Contratos, Financiaciones & Gastos Fijos
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight mt-1">
                Gestión Centralizada de Cuotas, Fechas y Tramos
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Controla préstamos, seguros (ej: 10 de 12 meses), nóminas escalonadas y cuotas con diferentes tramos de precio sin alterar el histórico.
              </p>
            </div>

            <button
              onClick={handleOpenAdd}
              className="px-4 sm:px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 touch-press transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Nuevo Contrato / Fijo</span>
            </button>
          </div>

          {/* 4 KPIs Clave */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* KPI 1: Ingresos Fijos */}
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/8">
              <span className="text-[10.5px] font-bold text-emerald-400 uppercase tracking-wider block font-display flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                Ingresos Fijos / Mes
              </span>
              <p className="text-xl sm:text-2xl font-black font-mono text-white mt-1">
                +{kpis.monthlyFixedIncome.toFixed(2)}€
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Nóminas y contratos activos
              </span>
            </div>

            {/* KPI 2: Gastos Fijos Comprometidos */}
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/8">
              <span className="text-[10.5px] font-bold text-amber-400 uppercase tracking-wider block font-display flex items-center gap-1.5">
                <ArrowDownRight className="w-3.5 h-3.5" />
                Compromisos Fijos / Mes
              </span>
              <p className="text-xl sm:text-2xl font-black font-mono text-amber-300 mt-1">
                -{kpis.monthlyFixedExpenses.toFixed(2)}€
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                ~{(kpis.monthlyFixedExpenses * 12).toFixed(0)}€ al año
              </span>
            </div>

            {/* KPI 3: Margen Estructural */}
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/8">
              <span className="text-[10.5px] font-bold text-cyan-400 uppercase tracking-wider block font-display flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Ahorro Estructural Neto
              </span>
              <p className={`text-xl sm:text-2xl font-black font-mono mt-1 ${
                kpis.netSavingsMargin >= 0 ? 'text-cyan-300' : 'text-rose-400'
              }`}>
                {kpis.netSavingsMargin >= 0 ? `+${kpis.netSavingsMargin.toFixed(2)}€` : `${kpis.netSavingsMargin.toFixed(2)}€`}
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Tasa estructural: {Math.max(0, Math.round(kpis.savingsRate))}%
              </span>
            </div>

            {/* KPI 4: Préstamos y Financiación */}
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/8">
              <span className="text-[10.5px] font-bold text-indigo-400 uppercase tracking-wider block font-display flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5" />
                Préstamos Activos ({loans.length})
              </span>
              <p className="text-xl sm:text-2xl font-black font-mono text-indigo-200 mt-1">
                {kpis.totalPendingLoanDebt.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Deuda total pendiente amortizar
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE HERRAMIENTAS: BUSCADOR Y FILTROS */}
      <div className="glass-ios p-4 rounded-2xl sm:rounded-3xl border border-white/10 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Input Buscador */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nombre, seguro, hipoteca, nómina o notas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-400/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="w-5 h-5 rounded-full bg-white/10 text-slate-300 hover:text-white absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtros de Tipo y Estado */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tipo */}
            <div className="p-1 rounded-xl bg-white/[0.05] border border-white/10 flex items-center text-xs">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  typeFilter === 'all' ? 'bg-amber-400 text-black shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                Todos ({transactions.length})
              </button>
              <button
                onClick={() => setTypeFilter('gasto')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  typeFilter === 'gasto' ? 'bg-amber-400 text-black shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                Gastos
              </button>
              <button
                onClick={() => setTypeFilter('ingreso')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  typeFilter === 'ingreso' ? 'bg-emerald-400 text-black shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                Ingresos
              </button>
            </div>

            {/* Estado */}
            <div className="p-1 rounded-xl bg-white/[0.05] border border-white/10 flex items-center text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  statusFilter === 'all' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Cualquiera
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  statusFilter === 'active' ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                Activos
              </button>
              <button
                onClick={() => setStatusFilter('paused')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  statusFilter === 'paused' ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pausados
              </button>
              <button
                onClick={() => setStatusFilter('with_end')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  statusFilter === 'with_end' ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/40' : 'text-slate-400 hover:text-white'
                }`}
                title="Financiaciones o contratos con fecha fin"
              >
                Financiaciones
              </button>
            </div>
          </div>
        </div>

        {/* Píldoras de Categorías */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
              categoryFilter === 'all'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/6'
            }`}
          >
            Todas las categorías
          </button>
          {['Vivienda', 'Sueldo', 'Seguros', 'Vehículo', 'Suministros', 'Comunicaciones', 'Alimentación', 'Ocio', 'Impuestos'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
                categoryFilter === cat
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/6'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. LISTADO DETALLADO DE CONTRATOS, REGLAS Y FINANCIACIONES */}
      {loading ? (
        <div className="glass-ios p-12 text-center text-slate-400 space-y-3 rounded-3xl animate-pulse">
          <Clock className="w-8 h-8 animate-spin mx-auto text-amber-400" />
          <p className="font-bold text-white text-base">Cargando cuadro de contratos y préstamos...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="glass-ios p-12 text-center text-slate-400 space-y-3 rounded-3xl border border-white/10">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center mx-auto text-slate-300">
            <FileText className="w-7 h-7" />
          </div>
          <p className="font-bold text-white text-lg">No se encontraron contratos o reglas fijas</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
              ? 'Prueba a cambiar o resetear los filtros aplicados arriba.'
              : 'Empieza añadiendo tus contratos fijos, préstamos o nóminas con el botón "+ Nuevo Contrato / Fijo".'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredList.map((item) => {
            const isIncome = item.type === 'ingreso';
            const linkedLoan = item.loanId ? loans.find(l => l.id === item.loanId) : null;
            const monthsRemaining = item.endDate ? calculateMonthsRemaining(item.endDate) : null;
            const hasCustomMonths = Array.isArray(item.activeMonths) && item.activeMonths.length > 0 && item.activeMonths.length < 12;
            const activeMonthsCount = hasCustomMonths ? item.activeMonths.length : 12;
            const hasSteps = Array.isArray(item.rateSteps) && item.rateSteps.length > 0;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-ios p-5 rounded-[28px] border transition-all relative overflow-hidden flex flex-col justify-between gap-4 ${
                  item.active 
                    ? 'border-white/12 hover:border-amber-400/30' 
                    : 'border-white/5 opacity-60 bg-black/40'
                }`}
              >
                {/* Cabecera del Contrato */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center flex-shrink-0 shadow-inner">
                        {getItemIcon(item)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-extrabold text-white tracking-tight leading-snug">
                            {item.title}
                          </h4>
                          {linkedLoan && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              Préstamo
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                          <span className="font-semibold text-slate-300">{item.category}</span>
                          <span>•</span>
                          <span className="capitalize">Día {item.dayOfMonth || 1}</span>
                          <span>•</span>
                          <span className="capitalize">{item.frequency || 'mensual'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Switch Rápido Activo / Desactivado */}
                    <button
                      onClick={() => handleToggleActive(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all touch-press border ${
                        item.active
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'bg-white/[0.05] text-slate-400 border-white/10 hover:bg-white/10'
                      }`}
                      title={item.active ? 'Toca para pausar este contrato' : 'Toca para activar este contrato'}
                    >
                      <span className={`w-2 h-2 rounded-full ${item.active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      <span>{item.active ? 'Activo' : 'Pausado'}</span>
                    </button>
                  </div>

                  {/* Importe y Tramos */}
                  <div className="pt-2 flex items-baseline justify-between border-t border-white/6">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                        isIncome ? 'text-emerald-300' : 'text-amber-300'
                      }`}>
                        {isIncome ? `+${item.amount?.toFixed(2)}€` : `${item.amount?.toFixed(2)}€`}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        / cuota {item.frequency === 'anual' ? 'anual' : 'mensual'}
                      </span>
                    </div>

                    {/* Badge de Tramos si tiene escalado */}
                    {hasSteps && (
                      <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <SlidersHorizontal className="w-3 h-3" />
                        {item.rateSteps.length} tramos programados
                      </span>
                    )}
                  </div>
                </div>

                {/* Fechas de Inicio, Fin y Estado de Amortización */}
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/6 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Vigencia:
                    </span>
                    <span className="font-medium text-white">
                      {item.startDate ? `Desde ${item.startDate}` : 'Inicio no fijado'} 
                      {' → '} 
                      {item.endDate ? `Hasta ${item.endDate}` : 'Indefinido (Permanente)'}
                    </span>
                  </div>

                  {/* Si tiene fecha fin, mostrar cuenta atrás de meses restantes */}
                  {item.endDate && (
                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="text-[11px] text-slate-400">
                        {monthsRemaining !== null && monthsRemaining > 0
                          ? `Quedan ${monthsRemaining} meses para finalizar`
                          : monthsRemaining === 0 
                            ? 'Finaliza este mes'
                            : 'Contrato finalizado'}
                      </span>
                      {linkedLoan && linkedLoan.initialAmount > 0 && (
                        <span className="text-[11px] font-mono text-indigo-300">
                          Pendiente: {linkedLoan.currentBalance?.toFixed(0)}€ / {linkedLoan.initialAmount?.toFixed(0)}€
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Mini Grilla Interactiva de 12 Meses (ej: 10 de los 12 meses al año) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <CalendarRange className="w-3.5 h-3.5 text-amber-400/80" />
                      Planificación Anual:
                    </span>
                    <span className={`font-bold ${hasCustomMonths ? 'text-amber-300' : 'text-slate-300'}`}>
                      {hasCustomMonths 
                        ? `Se cobra/paga en ${activeMonthsCount} de 12 meses` 
                        : 'Todos los meses (12/12)'}
                    </span>
                  </div>

                  {/* 12 píldoras de meses */}
                  <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                    {MONTH_NAMES.map(m => {
                      const isActiveMonth = !hasCustomMonths || (item.activeMonths && item.activeMonths.includes(m.num));
                      return (
                        <div
                          key={m.num}
                          title={`${m.full}: ${isActiveMonth ? 'Mes con cargo/abono' : 'Mes libre / sin cuota'}`}
                          className={`py-1 text-center rounded-lg text-[10.5px] font-bold border transition-all ${
                            isActiveMonth
                              ? isIncome 
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35' 
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/35'
                              : 'bg-white/[0.02] text-slate-600 border-white/5 line-through opacity-40'
                          }`}
                        >
                          {m.name}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tramos de Cuota / Salario por Fechas si existen */}
                {hasSteps && (
                  <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/15 space-y-1.5 text-xs">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                      <SlidersHorizontal className="w-3 h-3" />
                      Tramos de Cuota / Salario Configurados:
                    </span>
                    <div className="space-y-1">
                      {item.rateSteps.map((st, idx) => (
                        <div key={st.id || idx} className="flex items-center justify-between text-[11px] text-slate-300">
                          <span className="truncate max-w-[180px]">
                            • {st.name || `Tramo ${idx + 1}`}: {st.startDate} {st.endDate ? `a ${st.endDate}` : 'en adelante'}
                          </span>
                          <span className="font-mono font-bold text-amber-300">
                            {Number(st.amount || 0).toFixed(2)}€/mes
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notas si tiene */}
                {item.notes && (
                  <p className="text-xs text-slate-400 italic bg-white/[0.02] px-3 py-1.5 rounded-xl border border-white/5">
                    "{item.notes}"
                  </p>
                )}

                {/* Botones de Acción */}
                <div className="flex items-center justify-between pt-2 border-t border-white/8">
                  <span className="text-[10.5px] text-slate-500">
                    ID: {item.id}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold flex items-center gap-1.5 transition-all touch-press border border-white/10"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Editar Contrato</span>
                    </button>

                    {confirmDeleteId === item.id ? (
                      <div className="flex items-center gap-1.5 p-1 bg-rose-500/20 border border-rose-500/40 rounded-xl animate-fadeIn">
                        <span className="text-[11px] font-bold text-rose-300 px-1">¿Borrar?</span>
                        <button
                          onClick={() => handleDelete(item.id)}
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
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all touch-press"
                        title="Eliminar este contrato"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 4. MODAL: CREAR O EDITAR CONTRATO, PRÉSTAMO O GASTO FIJO */}
      {isModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          title={editingItem ? 'Editar Contrato o Gasto Fijo' : 'Nuevo Contrato, Préstamo o Fijo'}
          subtitle="Configura cuotas, meses activos (ej: 10 de 12), fechas de vigencia y tramos escalonados."
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSubmitForm} className="space-y-4 pt-2">
            
            {/* Título y Tipo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Nombre del Contrato / Póliza / Préstamo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Seguro Coche Todo Riesgo, Hipoteca BBVA, Nómina"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-white/[0.06] border border-white/12 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400/60"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Tipo
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-white/[0.06] border border-white/12 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/60"
                >
                  <option value="gasto" className="bg-slate-900 text-amber-300">Gasto / Recibo</option>
                  <option value="ingreso" className="bg-slate-900 text-emerald-300">Ingreso / Nómina</option>
                </select>
              </div>
            </div>

            {/* Importe y Categoría */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Importe Cuota Base (€) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full bg-white/[0.06] border border-white/12 rounded-xl px-3.5 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-400/60"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Categoría
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-white/[0.06] border border-white/12 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/60"
                >
                  <option value="Vivienda" className="bg-slate-900">Vivienda (Hipoteca, Comunidad)</option>
                  <option value="Seguros" className="bg-slate-900">Seguros & Pólizas</option>
                  <option value="Vehículo" className="bg-slate-900">Vehículo & Financiación</option>
                  <option value="Suministros" className="bg-slate-900">Suministros (Luz, Agua, Gas)</option>
                  <option value="Comunicaciones" className="bg-slate-900">Comunicaciones (Fibra, Móvil)</option>
                  <option value="Sueldo" className="bg-slate-900">Sueldo / Nómina</option>
                  <option value="Freelance" className="bg-slate-900">Freelance / Facturación</option>
                  <option value="Ocio" className="bg-slate-900">Ocio & Suscripciones</option>
                  <option value="Alimentación" className="bg-slate-900">Alimentación</option>
                  <option value="Impuestos" className="bg-slate-900">Impuestos (IBI, Basuras)</option>
                  <option value="General" className="bg-slate-900">General / Varios</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Día de cobro / cargo
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.dayOfMonth}
                  onChange={(e) => setFormData({ ...formData, dayOfMonth: e.target.value })}
                  className="w-full bg-white/[0.06] border border-white/12 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400/60"
                />
              </div>
            </div>

            {/* Fechas: Inicio y Fin ("Qué fecha de inicio y fecha de fin tienen") */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/8 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  Periodo de Vigencia del Contrato
                </span>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasEndDate}
                    onChange={(e) => setFormData({ ...formData, hasEndDate: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-0 focus:outline-none"
                  />
                  <span>Tiene fecha de finalización</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400 block">
                    Fecha de Inicio (Año-Mes)
                  </label>
                  <input
                    type="month"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-white/[0.06] border border-white/12 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400/60 font-mono"
                  />
                </div>

                {formData.hasEndDate && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400 block">
                      Fecha de Fin (Año-Mes)
                    </label>
                    <input
                      type="month"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full bg-white/[0.06] border border-white/12 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400/60 font-mono"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* SECCIÓN ESTRELLA: Planificación en Meses ("Seguro del coche son 10 de los 12 meses al año") */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/8 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CalendarRange className="w-3.5 h-3.5 text-amber-400" />
                    Meses Activos del Año (Planificación personalizada)
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Toca los meses donde se paga o se cobra. Si no se paga todo el año (ej: 10 de 12 meses), desmarca los meses libres.
                  </p>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25 self-start sm:self-auto">
                  {formData.activeMonths?.length || 12} de 12 meses
                </span>
              </div>

              {/* Botones Presets Rápidos */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => handleApplyMonthPreset('all')}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 text-xs font-medium border border-white/10"
                >
                  Todos (12/12)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyMonthPreset('10_sep_jun')}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30"
                >
                  10 Meses (Sep a Jun)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyMonthPreset('10_first')}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 text-xs font-medium border border-white/10"
                >
                  10 Meses (Ene a Oct)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyMonthPreset('semestral_jun_dic')}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 text-xs font-medium border border-white/10"
                >
                  Junio + Diciembre
                </button>
              </div>

              {/* Grid 12 Botones de Meses */}
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 pt-1">
                {MONTH_NAMES.map(m => {
                  const isSelected = formData.activeMonths?.includes(m.num);
                  return (
                    <button
                      type="button"
                      key={m.num}
                      onClick={() => handleToggleMonthInForm(m.num)}
                      className={`py-2 px-1 rounded-xl text-xs font-extrabold text-center border transition-all touch-press ${
                        isSelected
                          ? 'bg-amber-400 text-black border-amber-300 shadow-md shadow-amber-400/20 scale-[1.02]'
                          : 'bg-white/[0.04] text-slate-400 border-white/10 hover:bg-white/[0.08] hover:text-white line-through opacity-50'
                      }`}
                    >
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECCIÓN ESTRELLA 2: Tramos de Cuota / Salario por Fechas ("Hipoteca: primer año una cuota, a partir del 2do otra") */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/8 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                    Tramos de Cuota o Salario por Fechas (Escalado)
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Ej: Hipoteca año 1 a 500€ y año 2 en adelante a 650€, o subidas salariales desde fecha X.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowStepForm(!showStepForm)}
                  className="px-2.5 py-1 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-amber-300 text-xs font-bold border border-white/10 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>{showStepForm ? 'Cancelar' : 'Añadir Tramo'}</span>
                </button>
              </div>

              {/* Formulario para añadir tramo */}
              {showStepForm && (
                <div className="p-3 rounded-xl bg-white/[0.04] border border-amber-400/30 space-y-2.5 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-0.5">
                      <label className="text-[10.5px] font-bold text-slate-300">Nombre / Etiqueta</label>
                      <input
                        type="text"
                        placeholder="Ej: Año 1 Bonificado"
                        value={newStep.name}
                        onChange={(e) => setNewStep({ ...newStep, name: e.target.value })}
                        className="w-full bg-white/[0.06] border border-white/12 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[10.5px] font-bold text-slate-300">Desde (Año-Mes) *</label>
                      <input
                        type="month"
                        value={newStep.startDate}
                        onChange={(e) => setNewStep({ ...newStep, startDate: e.target.value })}
                        className="w-full bg-white/[0.06] border border-white/12 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[10.5px] font-bold text-slate-300">Hasta (Opcional)</label>
                      <input
                        type="month"
                        value={newStep.endDate}
                        onChange={(e) => setNewStep({ ...newStep, endDate: e.target.value })}
                        className="w-full bg-white/[0.06] border border-white/12 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <label className="text-[10.5px] font-bold text-slate-300">Cuota/Importe (€):</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="500.00"
                        value={newStep.amount}
                        onChange={(e) => setNewStep({ ...newStep, amount: e.target.value })}
                        className="w-28 bg-white/[0.06] border border-white/12 rounded-lg px-2.5 py-1 text-xs text-white font-mono font-bold"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddStep}
                      className="px-3 py-1.5 rounded-lg bg-amber-400 text-black text-xs font-extrabold hover:bg-amber-300"
                    >
                      Guardar Tramo
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de tramos configurados */}
              {formData.rateSteps && formData.rateSteps.length > 0 ? (
                <div className="space-y-1.5">
                  {formData.rateSteps.map((s, idx) => (
                    <div
                      key={s.id || idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/8 text-xs"
                    >
                      <div>
                        <span className="font-bold text-white block">{s.name || `Tramo ${idx + 1}`}</span>
                        <span className="text-[11px] text-slate-400">
                          {s.startDate} {s.endDate ? `→ ${s.endDate}` : '→ En adelante'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-amber-300 text-sm">
                          {Number(s.amount || 0).toFixed(2)}€/mes
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(s.id)}
                          className="text-rose-400 hover:text-rose-300 p-1"
                          title="Eliminar tramo"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  No hay tramos escalonados. Se aplicará siempre la cuota base ({formData.amount || '0'}€).
                </p>
              )}
            </div>

            {/* Notas / Observaciones */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 block">
                Notas / Póliza / Condiciones
              </label>
              <textarea
                rows={2}
                placeholder="Ej: Número de póliza, cláusulas, condiciones de bonificación..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-white/[0.06] border border-white/12 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400/60"
              />
            </div>

            {/* Botones de acción del Modal */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-slate-300 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black shadow-lg shadow-amber-500/20 touch-press disabled:opacity-50"
              >
                {submitting ? 'Guardando...' : editingItem ? 'Actualizar Contrato' : 'Crear Contrato'}
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}
