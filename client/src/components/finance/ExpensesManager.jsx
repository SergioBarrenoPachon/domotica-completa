import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Repeat,
  Zap,
  Calendar,
  Plus,
  Edit3,
  Trash2,
  Check,
  Sparkles,
  Search,
  Smartphone,
  Receipt,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  Copy,
  ExternalLink,
  ShieldCheck,
  Tag,
  ShoppingBag,
  SlidersHorizontal,
  X
} from 'lucide-react';
import Modal from '../Modal';
import { notify, confirmDialog } from '../feedback/feedback';

const MONTH_NAMES = [
  { num: 1, name: 'Ene', fullName: 'Enero' },
  { num: 2, name: 'Feb', fullName: 'Febrero' },
  { num: 3, name: 'Mar', fullName: 'Marzo' },
  { num: 4, name: 'Abr', fullName: 'Abril' },
  { num: 5, name: 'May', fullName: 'Mayo' },
  { num: 6, name: 'Jun', fullName: 'Junio' },
  { num: 7, name: 'Jul', fullName: 'Julio' },
  { num: 8, name: 'Ago', fullName: 'Agosto' },
  { num: 9, name: 'Sep', fullName: 'Septiembre' },
  { num: 10, name: 'Oct', fullName: 'Octubre' },
  { num: 11, name: 'Nov', fullName: 'Noviembre' },
  { num: 12, name: 'Dic', fullName: 'Diciembre' }
];

const PRESET_QUICK_EXPENSES = [
  { title: 'Supermercado & Compra', category: 'Alimentación', type: 'punctual', defaultAmount: '', icon: '🛒' },
  { title: 'Café / Desayuno', category: 'Restaurantes & Bares', type: 'punctual', defaultAmount: '2.80', icon: '☕' },
  { title: 'Gasolina / Combustible', category: 'Vehículo', type: 'punctual', defaultAmount: '50.00', icon: '⛽' },
  { title: 'Factura Eléctrica (Luz)', category: 'Suministros', type: 'recurring', frequency: 'mensual', defaultDay: 10, icon: '💡' },
  { title: 'Fibra & Móviles', category: 'Comunicaciones', type: 'recurring', frequency: 'mensual', defaultDay: 8, icon: '📶' },
  { title: 'Comunidad de Propietarios', category: 'Vivienda', type: 'recurring', frequency: 'mensual', defaultDay: 5, icon: '🏢' },
  { title: 'Seguro de Coche', category: 'Seguros', type: 'recurring', frequency: 'anual', defaultDay: 20, icon: '🚗' },
  { title: 'Suscripciones Streaming', category: 'Ocio', type: 'recurring', frequency: 'mensual', defaultDay: 3, icon: '🍿' }
];

const parseSafeEuro = (val, fallback = 0) => {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const str = String(val).trim().replace(/\s+/g, '').replace('€', '').replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? fallback : num;
};

const formatMoney = (num) => {
  const safe = Math.round((Number(num) || 0) * 100) / 100;
  return safe.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function getLocalISODate(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ExpensesManager({ api, currentMonth, onDataChanged, initialSubTab = 'all' }) {
  // Sub-tabs: 'all' | 'recurring' | 'punctual' | 'shortcuts'
  const [activeTab, setActiveTab] = useState(initialSubTab);

  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [punctualExpenses, setPunctualExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Unified Add / Edit Expense Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [expenseKind, setExpenseKind] = useState('recurring'); // 'recurring' | 'punctual'
  const [editingItem, setEditingItem] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: 'Vivienda',
    frequency: 'mensual',
    dayOfMonth: 1,
    monthOfYear: 1,
    startDate: getLocalISODate().slice(0, 7),
    endDate: '',
    isIndefinite: true,
    notes: '',
    paymentMethod: 'Apple Pay',
    date: getLocalISODate(),
    customMonthsEnabled: false,
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  });

  // Tramos / RateSteps Modal for recurring expenses
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [selectedExpenseForPeriod, setSelectedExpenseForPeriod] = useState(null);
  const [periodForm, setPeriodForm] = useState({
    startDate: getLocalISODate().slice(0, 7),
    endDate: '',
    amount: '',
    frequency: 'mensual',
    monthOfYear: 1,
    dayOfMonth: 1,
    notes: 'Revisión de tarifa / nuevo periodo'
  });

  // Expandable rateSteps history accordion
  const [expandedExpenses, setExpandedExpenses] = useState({});

  // Webhook copy feedback
  const [copiedKey, setCopiedKey] = useState(null);

  const webhookUrl = api.getShortcutsWebhookUrl ? api.getShortcutsWebhookUrl() : `${window.location.origin}/api/finance/shortcuts/gasto`;

  useEffect(() => {
    loadAllExpenses();
  }, [currentMonth]);

  const loadAllExpenses = async () => {
    try {
      setLoading(true);
      const [allTx, punctualRes, allCats] = await Promise.all([
        api.getFinanceTransactions ? api.getFinanceTransactions() : [],
        api.getPunctualExpenses ? api.getPunctualExpenses(300) : { data: [] },
        api.getFinanceCategories ? api.getFinanceCategories() : []
      ]);

      const isLoanOrMortgage = (t) => {
        if (t.loanId) return true;
        const cat = (t.category || '').toLowerCase();
        if (cat === 'préstamos' || cat === 'prestamos') return true;
        const title = (t.title || '').toLowerCase();
        if (title.includes('hipoteca') || title.includes('préstamo') || title.includes('prestamo')) return true;
        return false;
      };

      // 1. Recurring expenses
      const recurring = (allTx || []).filter(t => t.type === 'gasto' && t.frequency !== 'puntual' && !isLoanOrMortgage(t));
      setRecurringExpenses(recurring);

      // 2. Punctual expenses: deduplicate between Postgres Neon and local finance transactions
      const pgList = punctualRes?.data || [];
      const txPunctual = (allTx || [])
        .filter(t => t.type === 'gasto' && t.frequency === 'puntual')
        .map(t => ({
          id: t.id,
          titulo: t.title,
          importe: t.amount,
          categoria: t.category,
          fecha: t.startDate || (t.createdAt ? t.createdAt.slice(0, 10) : ''),
          metodo_pago: t.paymentMethod || 'Manual / App',
          notas: t.notes,
          origen: t.source || 'app_manual'
        }));

      const seenIds = new Set();
      const unifiedPunctual = [];
      [...pgList, ...txPunctual].forEach(item => {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          unifiedPunctual.push(item);
        }
      });
      unifiedPunctual.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
      setPunctualExpenses(unifiedPunctual);

      setCategories(allCats || []);
    } catch (err) {
      console.error('Error cargando gastos:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    notify.success('Copiado al portapapeles');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const toggleExpand = (id) => {
    setExpandedExpenses(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- RECURRING: ACTIVE MONTHS LOGIC ---
  const handleToggleMonthInForm = (monthNum) => {
    setForm(prev => {
      const current = prev.activeMonths || [];
      const exists = current.includes(monthNum);
      let updated;
      if (exists) {
        if (current.length === 1) return prev;
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

  const handleApplyMonthPreset = (preset) => {
    if (preset === 'all') {
      setForm(prev => ({
        ...prev,
        customMonthsEnabled: false,
        activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      }));
    } else if (preset === '10_first') {
      setForm(prev => ({
        ...prev,
        customMonthsEnabled: true,
        activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      }));
    } else if (preset === '10_sep_jun') {
      setForm(prev => ({
        ...prev,
        customMonthsEnabled: true,
        activeMonths: [1, 2, 3, 4, 5, 6, 9, 10, 11, 12]
      }));
    } else if (preset === 'semestral') {
      setForm(prev => ({
        ...prev,
        customMonthsEnabled: true,
        activeMonths: [6, 12]
      }));
    } else if (preset === 'trimestral') {
      setForm(prev => ({
        ...prev,
        customMonthsEnabled: true,
        activeMonths: [3, 6, 9, 12]
      }));
    }
  };

  // --- OPEN MODALS ---
  const handleOpenCreate = (presetKind = 'recurring') => {
    setModalMode('create');
    setExpenseKind(presetKind);
    setEditingItem(null);
    setForm({
      title: '',
      amount: '',
      category: presetKind === 'recurring' ? 'Suministros' : 'Alimentación',
      frequency: 'mensual',
      dayOfMonth: 1,
      monthOfYear: 1,
      startDate: getLocalISODate().slice(0, 7),
      endDate: '',
      isIndefinite: true,
      notes: '',
      paymentMethod: 'Apple Pay',
      date: getLocalISODate(),
      customMonthsEnabled: false,
      activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    });
    setIsModalOpen(true);
  };

  const handleApplyPreset = (preset) => {
    setExpenseKind(preset.type);
    setForm(prev => ({
      ...prev,
      title: preset.title,
      category: preset.category,
      amount: preset.defaultAmount || prev.amount,
      frequency: preset.frequency || prev.frequency,
      dayOfMonth: preset.defaultDay || prev.dayOfMonth
    }));
  };

  const handleOpenEditRecurring = (exp) => {
    setModalMode('edit');
    setExpenseKind('recurring');
    setEditingItem(exp);
    const hasCustomMonths = Array.isArray(exp.activeMonths) && exp.activeMonths.length > 0 && exp.activeMonths.length < 12;
    setForm({
      title: exp.title || '',
      amount: exp.amount || '',
      category: exp.category || 'Vivienda',
      frequency: exp.frequency || 'mensual',
      dayOfMonth: exp.dayOfMonth || 1,
      monthOfYear: exp.monthOfYear || 1,
      startDate: exp.startDate || '',
      endDate: exp.endDate || '',
      isIndefinite: exp.isIndefinite !== false,
      notes: exp.notes || '',
      paymentMethod: 'Transferencia',
      date: getLocalISODate(),
      customMonthsEnabled: hasCustomMonths,
      activeMonths: Array.isArray(exp.activeMonths) && exp.activeMonths.length > 0
        ? exp.activeMonths
        : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    });
    setIsModalOpen(true);
  };

  const handleOpenEditPunctual = (item) => {
    setModalMode('edit');
    setExpenseKind('punctual');
    setEditingItem(item);
    setForm({
      title: item.titulo || '',
      amount: item.importe !== undefined ? String(item.importe) : '',
      category: item.categoria || 'Alimentación',
      frequency: 'puntual',
      dayOfMonth: 1,
      monthOfYear: 1,
      startDate: '',
      endDate: '',
      isIndefinite: false,
      notes: item.notas || '',
      paymentMethod: item.metodo_pago || 'Apple Pay',
      date: item.fecha ? item.fecha.slice(0, 10) : getLocalISODate(),
      customMonthsEnabled: false,
      activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    });
    setIsModalOpen(true);
  };

  // --- SAVE FORM ---
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    const cleanAmount = parseSafeEuro(form.amount);
    if (!form.title.trim() || cleanAmount <= 0) {
      notify.warning('Introduce un título y un importe válido');
      return;
    }

    try {
      if (expenseKind === 'recurring') {
        const hasCustom = form.customMonthsEnabled && form.activeMonths && form.activeMonths.length < 12;
        const payload = {
          title: form.title.trim(),
          type: 'gasto',
          amount: cleanAmount,
          category: form.category,
          frequency: form.frequency,
          dayOfMonth: parseInt(form.dayOfMonth, 10) || 1,
          monthOfYear: parseInt(form.monthOfYear, 10) || 1,
          startDate: form.startDate,
          endDate: form.endDate || null,
          isIndefinite: Boolean(form.isIndefinite),
          notes: form.notes.trim(),
          activeMonths: hasCustom ? form.activeMonths : null,
          rateSteps: editingItem ? (editingItem.rateSteps || []) : []
        };

        if (modalMode === 'edit' && editingItem) {
          await api.updateFinanceTransaction(editingItem.id, payload);
          notify.success('Gasto periódico actualizado');
        } else {
          await api.addFinanceTransaction(payload);
          notify.success('Gasto periódico añadido');
        }
      } else {
        // Punctual Expense
        if (modalMode === 'edit' && editingItem) {
          await api.updatePunctualExpense(editingItem.id, {
            titulo: form.title.trim(),
            importe: cleanAmount,
            categoria: form.category,
            fecha: form.date,
            metodo_pago: form.paymentMethod,
            notas: form.notes.trim()
          });
          notify.success('Gasto puntual actualizado');
        } else {
          await api.addPunctualExpense({
            titulo: form.title.trim(),
            importe: cleanAmount,
            categoria: form.category,
            fecha: form.date,
            metodo_pago: form.paymentMethod,
            notas: form.notes.trim()
          });
          notify.success('Gasto puntual registrado');
        }
      }

      setIsModalOpen(false);
      setEditingItem(null);
      await loadAllExpenses();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      notify.error('Error guardando gasto: ' + err.message);
    }
  };

  // --- DELETE LOGIC ---
  const handleDeleteRecurring = async (id) => {
    if (!(await confirmDialog({ title: 'Confirmar eliminación', message: '¿Eliminar este gasto periódico y sus tramos?', confirmText: 'Eliminar', danger: true }))) return;
    try {
      await api.deleteFinanceTransaction(id);
      notify.success('Gasto periódico eliminado');
      await loadAllExpenses();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      notify.error('Error: ' + err.message);
    }
  };

  const handleDeletePunctual = async (id) => {
    if (!(await confirmDialog({ title: 'Confirmar eliminación', message: '¿Eliminar este gasto puntual?', confirmText: 'Eliminar', danger: true }))) return;
    try {
      if (typeof id === 'string' && (id.startsWith('fin-') || id.startsWith('gasto-apple-'))) {
        await api.deleteFinanceTransaction(id);
      }
      try {
        await api.deletePunctualExpense(id);
      } catch (_) { }
      notify.success('Gasto puntual eliminado');
      await loadAllExpenses();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      notify.error('Error: ' + err.message);
    }
  };

  const handleToggleActiveRecurring = async (id) => {
    try {
      await api.toggleTransactionActive(id);
      await loadAllExpenses();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      notify.error('Error cambiando estado: ' + err.message);
    }
  };

  // --- TRAMOS / RATESTEPS MODAL ---
  const handleOpenAddPeriod = (exp) => {
    setSelectedExpenseForPeriod(exp);
    setPeriodForm({
      startDate: getLocalISODate().slice(0, 7),
      endDate: '',
      amount: exp.amount ? String(exp.amount) : '',
      frequency: exp.frequency || 'mensual',
      monthOfYear: exp.monthOfYear || 1,
      dayOfMonth: exp.dayOfMonth || 1,
      notes: 'Nueva cuota / revisión'
    });
    setIsPeriodModalOpen(true);
  };

  const handleAddPeriod = async (e) => {
    e.preventDefault();
    if (!selectedExpenseForPeriod || !periodForm.startDate || !periodForm.amount) return;

    try {
      const cleanAmt = parseSafeEuro(periodForm.amount);
      const newStep = {
        id: `step-${Date.now()}`,
        startDate: periodForm.startDate,
        endDate: periodForm.endDate || null,
        amount: cleanAmt,
        frequency: periodForm.frequency,
        monthOfYear: parseInt(periodForm.monthOfYear, 10) || null,
        dayOfMonth: parseInt(periodForm.dayOfMonth, 10) || null,
        notes: periodForm.notes.trim()
      };

      const existingSteps = Array.isArray(selectedExpenseForPeriod.rateSteps) ? selectedExpenseForPeriod.rateSteps : [];
      const updatedSteps = [...existingSteps, newStep].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

      await api.updateFinanceTransaction(selectedExpenseForPeriod.id, {
        rateSteps: updatedSteps
      });

      setIsPeriodModalOpen(false);
      setSelectedExpenseForPeriod(null);
      notify.success('Tramo temporal añadido');
      await loadAllExpenses();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      notify.error('Error al añadir tramo: ' + err.message);
    }
  };

  const handleDeletePeriod = async (exp, stepId) => {
    if (!(await confirmDialog({ title: 'Eliminar tramo', message: '¿Eliminar este tramo de precio?', confirmText: 'Eliminar', danger: true }))) return;
    try {
      const existing = Array.isArray(exp.rateSteps) ? exp.rateSteps : [];
      const updated = existing.filter(s => s.id !== stepId);
      await api.updateFinanceTransaction(exp.id, { rateSteps: updated });
      notify.success('Tramo eliminado');
      await loadAllExpenses();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      notify.error('Error eliminando tramo: ' + err.message);
    }
  };

  // --- METRICS CALCULATION ---
  const currentMonthNum = parseInt((currentMonth || '').split('-')[1], 10) || (new Date().getMonth() + 1);

  // 1. Coste mensual prorrateado de fijos
  const totalMonthlyRecurring = useMemo(() => {
    return recurringExpenses.reduce((sum, exp) => {
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

      let monthsFactor = 1;
      if (Array.isArray(exp.activeMonths) && exp.activeMonths.length > 0 && exp.activeMonths.length < 12) {
        monthsFactor = exp.activeMonths.length / 12;
      }

      if (freq === 'mensual') return sum + (amt * monthsFactor);
      if (freq === 'trimestral') return sum + (amt / 3);
      if (freq === 'semestral') return sum + (amt / 6);
      if (freq === 'anual') return sum + (amt / 12);
      return sum + (amt * monthsFactor);
    }, 0);
  }, [recurringExpenses, currentMonth]);

  // 2. Total gastado en puntuales este mes
  const totalPunctualThisMonth = useMemo(() => {
    return punctualExpenses
      .filter(p => !currentMonth || (p.fecha && p.fecha.startsWith(currentMonth)))
      .reduce((acc, p) => acc + (parseFloat(p.importe) || 0), 0);
  }, [punctualExpenses, currentMonth]);

  const totalAllPunctual = useMemo(() => {
    return punctualExpenses.reduce((acc, p) => acc + (parseFloat(p.importe) || 0), 0);
  }, [punctualExpenses]);

  // --- FILTERING ---
  const filteredRecurring = useMemo(() => {
    return recurringExpenses.filter(exp => {
      if (categoryFilter !== 'all' && exp.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = exp.title?.toLowerCase().includes(q);
        const matchCat = exp.category?.toLowerCase().includes(q);
        const matchNotes = exp.notes?.toLowerCase().includes(q);
        if (!matchTitle && !matchCat && !matchNotes) return false;
      }
      return true;
    });
  }, [recurringExpenses, categoryFilter, searchQuery]);

  const filteredPunctual = useMemo(() => {
    return punctualExpenses.filter(exp => {
      if (categoryFilter !== 'all' && exp.categoria !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (exp.titulo || '').toLowerCase().includes(q);
        const matchCat = (exp.categoria || '').toLowerCase().includes(q);
        const matchNotes = (exp.notas || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCat && !matchNotes) return false;
      }
      return true;
    });
  }, [punctualExpenses, categoryFilter, searchQuery]);

  // Unified list for 'all' tab
  const unifiedAllExpenses = useMemo(() => {
    const list = [
      ...filteredRecurring.map(r => ({
        ...r,
        kind: 'recurring',
        displayTitle: r.title,
        displayAmount: r.amount,
        displayCategory: r.category || 'General',
        displayDate: `Día ${r.dayOfMonth || 1} • ${r.frequency}`,
        displayNotes: r.notes
      })),
      ...filteredPunctual.map(p => ({
        ...p,
        kind: 'punctual',
        displayTitle: p.titulo,
        displayAmount: p.importe,
        displayCategory: p.categoria || 'General',
        displayDate: p.fecha || 'Sin fecha',
        displayNotes: p.notas
      }))
    ];

    // Sort: punctual by date descending, recurring alphabetically
    return list.sort((a, b) => {
      if (a.kind === 'punctual' && b.kind === 'punctual') {
        return (b.fecha || '').localeCompare(a.fecha || '');
      }
      return (a.displayTitle || '').localeCompare(b.displayTitle || '');
    });
  }, [filteredRecurring, filteredPunctual]);

  const allCategoriesList = useMemo(() => {
    const set = new Set();
    recurringExpenses.forEach(e => { if (e.category) set.add(e.category); });
    punctualExpenses.forEach(e => { if (e.categoria) set.add(e.categoria); });
    categories.forEach(c => { if (c.name) set.add(c.name); });
    return Array.from(set);
  }, [recurringExpenses, punctualExpenses, categories]);

  return (
    <div className="space-y-6">

      {/* 1. HEADER & SUB-TABS SELECTOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-white font-display flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shadow-inner-light">
              <Layers className="w-5 h-5" />
            </span>
            Gestión de Gastos
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Control integral de recibos periódicos, tramos de tarifas, compras día a día y atajos de Apple Pay.
          </p>
        </div>

        {/* Action Button: Nuevo Gasto */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleOpenCreate('punctual')}
            className="min-h-touch px-4 py-2 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/15 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all touch-press"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>+ Ticket / Puntual</span>
          </button>

          <button
            onClick={() => handleOpenCreate('recurring')}
            className="min-h-touch px-4.5 py-2 rounded-2xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-rose-500/25 transition-all touch-press"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Gasto Fijo</span>
          </button>
        </div>
      </div>

      {/* 2. SUB-TABS SEGMENTED PILL */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="p-1 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center gap-1 shadow-inner-light whitespace-nowrap">
          <button
            onClick={() => setActiveTab('all')}
            className={`min-h-[36px] px-3.5 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all touch-press ${activeTab === 'all'
                ? 'bg-rose-400 text-black shadow-md shadow-rose-400/25'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
              }`}
          >
            <Layers className="w-4 h-4 stroke-[2.2]" />
            <span>Todos ({recurringExpenses.length + punctualExpenses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('recurring')}
            className={`min-h-[36px] px-3.5 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all touch-press ${activeTab === 'recurring'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-400/25'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
              }`}
          >
            <Repeat className="w-4 h-4 stroke-[2.2]" />
            <span>Fijos / Recurrentes ({recurringExpenses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('punctual')}
            className={`min-h-[36px] px-3.5 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all touch-press ${activeTab === 'punctual'
                ? 'bg-emerald-400 text-black shadow-md shadow-emerald-400/25'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
              }`}
          >
            <Zap className="w-4 h-4 stroke-[2.2]" />
            <span>Puntuales & Día a Día ({punctualExpenses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`min-h-[36px] px-3.5 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all touch-press ${activeTab === 'shortcuts'
                ? 'bg-blue-400 text-black shadow-md shadow-blue-400/25'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
              }`}
          >
            <Smartphone className="w-4 h-4 stroke-[2.2]" />
            <span>📱 Atajos Apple & Siri</span>
          </button>
        </div>
      </div>

      {/* 3. RESUMEN FINANCIERO COMPACTO */}
      {activeTab !== 'shortcuts' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-3xl bg-white/[0.03] border border-white/8 shadow-inner-light">
            <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block font-display">
              🔴 Fijos / Recurrentes Mensuales
            </span>
            <p className="text-xl sm:text-2xl font-black font-mono text-white mt-1">
              -{formatMoney(totalMonthlyRecurring)} € / mes
            </p>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {recurringExpenses.filter(e => e.active).length} recibos fijos activos
            </span>
          </div>

          <div className="p-4 rounded-3xl bg-white/[0.03] border border-white/8 shadow-inner-light">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block font-display">
              ⚡ Puntuales de {currentMonth || 'este mes'}
            </span>
            <p className="text-xl sm:text-2xl font-black font-mono text-amber-300 mt-1">
              -{formatMoney(totalPunctualThisMonth)} €
            </p>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Compras en supermercados, gasolina y tickets
            </span>
          </div>

          <div className="p-4 rounded-3xl bg-white/[0.03] border border-white/8 shadow-inner-light">
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block font-display">
              🏁 Total Gasto Estimado del Mes
            </span>
            <p className="text-xl sm:text-2xl font-black font-mono text-cyan-300 mt-1">
              -{formatMoney(totalMonthlyRecurring + totalPunctualThisMonth)} €
            </p>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Fijos presupuestados + Puntuales registrados
            </span>
          </div>
        </div>
      )}

      {/* 4. BUSCADOR & FILTRO POR CATEGORÍA */}
      {activeTab !== 'shortcuts' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar gasto, concepto o nota..."
              className="w-full glass-input rounded-2xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:border-rose-400 outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${categoryFilter === 'all'
                  ? 'bg-rose-400 text-slate-950 font-black shadow-md shadow-rose-400/20'
                  : 'bg-white/[0.05] text-slate-300 hover:text-white border border-white/10'
                }`}
            >
              Todas las categorías
            </button>
            {allCategoriesList.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${categoryFilter === cat
                    ? 'bg-rose-400 text-slate-950 font-black shadow-md shadow-rose-400/20'
                    : 'bg-white/[0.05] text-slate-300 hover:text-white border border-white/10'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. CONTENIDO SEGÚN LA SUB-PESTAÑA SELECCIONADA */}
      {loading ? (
        <div className="glass-ios p-12 text-center text-slate-400 space-y-3 rounded-3xl animate-pulse">
          <Layers className="w-8 h-8 animate-spin mx-auto text-rose-400" />
          <p className="font-bold text-white text-base">Cargando todos tus gastos...</p>
        </div>
      ) : (
        <>
          {/* VISTA 1: TODOS LOS GASTOS (UNIFICADO) */}
          {activeTab === 'all' && (
            <div className="space-y-3">
              {unifiedAllExpenses.length === 0 ? (
                <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
                    <Layers className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-white">No hay gastos encontrados con los filtros actuales</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Añade un nuevo gasto fijo periódico o registra un ticket puntual.
                  </p>
                </div>
              ) : (
                unifiedAllExpenses.map((item) => {
                  const isRecurring = item.kind === 'recurring';
                  return (
                    <div
                      key={item.id}
                      className="p-4 sm:p-4.5 rounded-3xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.06] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border ${isRecurring
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/25'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                          }`}>
                          {isRecurring ? <Repeat className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-white text-sm sm:text-base font-display">
                              {item.displayTitle}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isRecurring
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              }`}>
                              {isRecurring ? 'Fijo / Recurrente' : 'Puntual / Ticket'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.06] text-slate-300 border border-white/10">
                              {item.displayCategory}
                            </span>
                            {item.metodo_pago && (
                              <span className="text-[10px] text-slate-400">
                                ({item.metodo_pago})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                            <span>{item.displayDate}</span>
                            {item.displayNotes && (
                              <>
                                <span>•</span>
                                <span className="italic">{item.displayNotes}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                        <span className="text-base sm:text-lg font-black font-mono text-white">
                          -{formatMoney(item.displayAmount)} €
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => isRecurring ? handleOpenEditRecurring(item) : handleOpenEditPunctual(item)}
                            className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/10 transition-colors"
                            title="Editar gasto"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => isRecurring ? handleDeleteRecurring(item.id) : handleDeletePunctual(item.id)}
                            className="p-2 rounded-xl bg-white/[0.06] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/10 transition-colors"
                            title="Eliminar gasto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VISTA 2: GASTOS FIJOS / RECURRENTES */}
          {activeTab === 'recurring' && (
            <div className="space-y-3">
              {filteredRecurring.length === 0 ? (
                <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                    <Repeat className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-white">No hay gastos fijos o periódicos registrados</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Añade tus seguros, suministros, fibra o suscripciones para tener previsión en el calendario.
                  </p>
                </div>
              ) : (
                filteredRecurring.map((exp) => {
                  const tramos = Array.isArray(exp.rateSteps) ? exp.rateSteps : [];
                  const isExpanded = Boolean(expandedExpenses[exp.id]);

                  // Determine active rateStep for current viewing month
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
                      className={`p-4 sm:p-5 rounded-3xl border transition-all ${exp.active
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
                              -{formatMoney(currentAmt)} € / {currentFreq}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.06] text-slate-300 border border-white/10">
                              {exp.category || 'General'}
                            </span>
                            {Array.isArray(exp.activeMonths) && exp.activeMonths.length > 0 && exp.activeMonths.length < 12 && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                <CalendarRange className="w-3 h-3 text-amber-400" />
                                <span>{exp.activeMonths.length} de 12 meses</span>
                              </span>
                            )}
                            {Array.isArray(exp.activeMonths) && exp.activeMonths.length > 0 && !exp.activeMonths.includes(currentMonthNum) && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/25">
                                Libre este mes
                              </span>
                            )}
                            {activeStep && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                <span>Tramo en vigor: {activeStep.notes || 'Tarifa actual'}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
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

                          {/* Chips de los 12 meses si tiene meses activos restringidos */}
                          {Array.isArray(exp.activeMonths) && exp.activeMonths.length > 0 && exp.activeMonths.length < 12 && (
                            <div className="flex items-center gap-1 pt-1 flex-wrap">
                              <span className="text-[10px] text-slate-400 font-semibold mr-1 flex items-center gap-1">
                                <CalendarRange className="w-3 h-3 text-amber-400" />
                                Meses de cobro:
                              </span>
                              <div className="flex items-center gap-1 flex-wrap">
                                {MONTH_NAMES.map(m => {
                                  const isAct = exp.activeMonths.includes(m.num);
                                  const isThisMonth = m.num === currentMonthNum;
                                  return (
                                    <span
                                      key={m.num}
                                      className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold transition-all ${isAct
                                          ? isThisMonth
                                            ? 'bg-amber-400 text-slate-950 font-black shadow-sm ring-1 ring-amber-300'
                                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                          : 'bg-white/[0.02] text-slate-600 line-through opacity-40'
                                        }`}
                                    >
                                      {m.name}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
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
                            onClick={() => handleToggleActiveRecurring(exp.id)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${exp.active
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                : 'bg-white/[0.05] text-slate-400 border-white/10 hover:text-white'
                              }`}
                          >
                            {exp.active ? 'Activo' : 'Pausado'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditRecurring(exp)}
                            className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/10 transition-colors"
                            title="Editar gasto"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteRecurring(exp.id)}
                            className="p-2 rounded-xl bg-white/[0.06] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/10 transition-colors"
                            title="Eliminar gasto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Acordeón de Tramos Históricos / Futuros */}
                      {tramos.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => toggleExpand(exp.id)}
                            className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <span>{isExpanded ? 'Ocultar tramos temporales' : `Ver histórico de tramos y tarifas (${tramos.length})`}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {isExpanded && (
                            <div className="mt-2.5 space-y-2 pl-2 border-l-2 border-amber-500/30">
                              {tramos.map((step) => (
                                <div
                                  key={step.id}
                                  className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3 text-xs"
                                >
                                  <div>
                                    <span className="font-bold text-white">
                                      {step.startDate || 'Inicio'} → {step.endDate || 'Actualidad'}
                                    </span>
                                    <span className="text-amber-300 font-mono font-bold ml-2">
                                      {formatMoney(step.amount)} € / {step.frequency || exp.frequency}
                                    </span>
                                    {step.notes && <span className="text-slate-400 ml-2 italic">({step.notes})</span>}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePeriod(exp, step.id)}
                                    className="text-slate-500 hover:text-rose-400 p-1"
                                    title="Eliminar este tramo"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VISTA 3: GASTOS PUNTUALES & DÍA A DÍA */}
          {activeTab === 'punctual' && (
            <div className="space-y-3">
              {filteredPunctual.length === 0 ? (
                <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-white">No hay gastos puntuales registrados</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Añade tickets del supermercado, cenas, combustible o sincronízalos desde Atajos de Apple Pay.
                  </p>
                </div>
              ) : (
                filteredPunctual.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.06] transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm">{item.titulo}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.06] text-slate-300 border border-white/10">
                            {item.categoria || 'General'}
                          </span>
                          {item.metodo_pago && (
                            <span className="text-[10px] text-slate-400">
                              ({item.metodo_pago})
                            </span>
                          )}
                          {item.origen && item.origen.includes('apple') && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                              <Smartphone className="w-3 h-3" />
                              Apple Pay
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>{item.fecha || 'Sin fecha'}</span>
                          {item.notas && (
                            <>
                              <span>•</span>
                              <span className="italic">{item.notas}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-base sm:text-lg font-black font-mono text-white">
                        -{formatMoney(item.importe)} €
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPunctual(item)}
                          className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/10 transition-colors"
                          title="Editar gasto puntual"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePunctual(item.id)}
                          className="p-2 rounded-xl bg-white/[0.06] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/10 transition-colors"
                          title="Eliminar gasto puntual"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* VISTA 4: CONFIGURACIÓN ATAJOS APPLE & SIRI */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-6 max-w-4xl">
              <div className="p-6 rounded-3xl bg-blue-500/10 border border-blue-500/20 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white font-display">
                      Automatización Apple Pay & Atajos de iOS
                    </h4>
                    <p className="text-xs text-blue-200">
                      Registra gastos automáticamente cada vez que pagues con tu iPhone, Apple Watch o diciéndole a Siri: «Oye Siri, apunta 14 euros de gasolina».
                    </p>
                  </div>
                </div>

                {/* URL del Webhook */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Endpoint Webhook (POST)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={webhookUrl}
                      className="flex-1 glass-input rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(webhookUrl, 'url')}
                      className="px-3.5 py-2 rounded-xl bg-blue-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 touch-press"
                    >
                      {copiedKey === 'url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copiar</span>
                    </button>
                  </div>
                </div>

                {/* Formato JSON */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Cuerpo de la Solicitud (JSON)</label>
                  <pre className="p-3 rounded-2xl bg-slate-950/80 border border-white/10 text-emerald-400 font-mono text-xs overflow-x-auto">
                    {`{
  "titulo": "Mercadona / Café / Gasolina",
  "importe": 14.50,
  "categoria": "Alimentación",
  "fecha": "${getLocalISODate()}",
  "metodo_pago": "Apple Pay"
}`}
                  </pre>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`{\n  "titulo": "Compra",\n  "importe": 15.00,\n  "categoria": "Alimentación",\n  "fecha": "${getLocalISODate()}",\n  "metodo_pago": "Apple Pay"\n}`, 'json')}
                    className="text-xs text-blue-300 hover:text-white font-bold flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar plantilla JSON</span>
                  </button>
                </div>
              </div>

              {/* Pasos de configuración */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 font-bold text-xs flex items-center justify-center">1</span>
                  <h5 className="font-bold text-white text-sm">Abrir app Atajos</h5>
                  <p className="text-xs text-slate-400">Ve a la pestaña Automatización en tu iPhone y selecciona "Cuando pague con Apple Pay".</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 font-bold text-xs flex items-center justify-center">2</span>
                  <h5 className="font-bold text-white text-sm">Añadir acción URL</h5>
                  <p className="text-xs text-slate-400">Añade la acción "Obtener contenido de URL", método POST y pega el endpoint arriba.</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 font-bold text-xs flex items-center justify-center">3</span>
                  <h5 className="font-bold text-white text-sm">¡Listo y Sincronizado!</h5>
                  <p className="text-xs text-slate-400">Cada pago guardará automáticamente el gasto en Neon PostgreSQL y en tus finanzas.</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* --- MODAL 1: AÑADIR O EDITAR GASTO (UNIFICADO) --- */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
          title={modalMode === 'edit' ? `Editar ${expenseKind === 'recurring' ? 'Gasto Fijo' : 'Gasto Puntual'}` : 'Nuevo Gasto'}
        >
          <form onSubmit={handleSaveExpense} className="space-y-4">

            {/* Si es creación, selector rápido del tipo de gasto */}
            {modalMode === 'create' && (
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1.5">Tipo de Gasto</label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-white/[0.05] border border-white/10">
                  <button
                    type="button"
                    onClick={() => setExpenseKind('recurring')}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${expenseKind === 'recurring'
                        ? 'bg-rose-500 text-slate-950 font-black shadow-md'
                        : 'text-slate-300 hover:text-white'
                      }`}
                  >
                    <Repeat className="w-4 h-4" />
                    <span>Fijo / Recurrente</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpenseKind('punctual')}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${expenseKind === 'punctual'
                        ? 'bg-emerald-400 text-slate-950 font-black shadow-md'
                        : 'text-slate-300 hover:text-white'
                      }`}
                  >
                    <Zap className="w-4 h-4" />
                    <span>Puntual / Ticket</span>
                  </button>
                </div>
              </div>
            )}

            {/* Presets Rápidos en Modo Creación */}
            {modalMode === 'create' && (
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Plantillas Rápidas Frecuentes
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {PRESET_QUICK_EXPENSES.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="px-2.5 py-1 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 text-xs text-slate-300 whitespace-nowrap flex items-center gap-1 transition-all"
                    >
                      <span>{p.icon}</span>
                      <span>{p.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Título e Importe */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Concepto / Nombre *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ej: Factura Luz, Mercadona, Gasolina..."
                  className="w-full glass-input rounded-2xl px-3.5 py-2.5 text-sm text-white focus:border-rose-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Importe (€) *</label>
                <input
                  type="text"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="Ej: 45,50"
                  className="w-full glass-input rounded-2xl px-3.5 py-2.5 text-sm font-mono text-white focus:border-rose-400 outline-none"
                />
              </div>
            </div>

            {/* Categoría y Campos específicos según tipo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Categoría</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full glass-input rounded-2xl px-3.5 py-2.5 text-sm text-white focus:border-rose-400 outline-none"
                >
                  {allCategoriesList.map(cat => (
                    <option key={cat} value={cat} className="bg-slate-900 text-white">{cat}</option>
                  ))}
                </select>
              </div>

              {expenseKind === 'recurring' ? (
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">Frecuencia</label>
                  <select
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                    className="w-full glass-input rounded-2xl px-3.5 py-2.5 text-sm text-white focus:border-rose-400 outline-none"
                  >
                    <option value="mensual" className="bg-slate-900 text-white">Mensual</option>
                    <option value="trimestral" className="bg-slate-900 text-white">Trimestral (cada 3 meses)</option>
                    <option value="semestral" className="bg-slate-900 text-white">Semestral (cada 6 meses)</option>
                    <option value="anual" className="bg-slate-900 text-white">Anual (1 vez al año)</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">Fecha del Gasto</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full glass-input rounded-2xl px-3.5 py-2.5 text-sm text-white focus:border-rose-400 outline-none"
                  />
                </div>
              )}
            </div>

            {/* Campos adicionales para Recurrentes: Día del mes y meses de cobro */}
            {expenseKind === 'recurring' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">Día del mes (1 - 31)</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={form.dayOfMonth}
                      onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })}
                      className="w-full glass-input rounded-2xl px-3.5 py-2.5 text-sm text-white focus:border-rose-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">Mes de cobro base</label>
                    <select
                      value={form.monthOfYear}
                      onChange={(e) => setForm({ ...form, monthOfYear: e.target.value })}
                      disabled={form.frequency === 'mensual'}
                      className={`w-full glass-input rounded-2xl px-3.5 py-2.5 text-sm text-white focus:border-rose-400 outline-none ${form.frequency === 'mensual' ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                      {MONTH_NAMES.map(m => (
                        <option key={m.num} value={m.num} className="bg-slate-900 text-white">{m.fullName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Meses de cobro personalizados */}
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/8 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <CalendarRange className="w-3.5 h-3.5 text-amber-400" />
                      Meses en los que se cobra
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleApplyMonthPreset('all')}
                        className="px-2 py-0.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[10px] text-slate-300"
                      >
                        12 meses
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyMonthPreset('10_first')}
                        className="px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-[10px] text-amber-300"
                        title="10 primeros meses del año (Ej: Seguro Coche)"
                      >
                        10 primeros
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-6 gap-1.5">
                    {MONTH_NAMES.map(m => {
                      const isSel = (form.activeMonths || []).includes(m.num);
                      return (
                        <button
                          key={m.num}
                          type="button"
                          onClick={() => handleToggleMonthInForm(m.num)}
                          className={`py-1.5 rounded-xl text-xs font-bold transition-all ${isSel
                              ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                              : 'bg-white/[0.04] text-slate-500 hover:text-white'
                            }`}
                        >
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Método de pago para puntuales */}
            {expenseKind === 'punctual' && (
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Método de Pago</label>
                <div className="flex gap-2">
                  {['Apple Pay', 'Tarjeta', 'Efectivo', 'Transferencia'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm({ ...form, paymentMethod: m })}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${form.paymentMethod === m
                          ? 'bg-emerald-500 text-slate-950 font-black border-emerald-400 shadow-md'
                          : 'bg-white/[0.05] text-slate-300 border-white/10 hover:text-white'
                        }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notas opcionales */}
            <div>
              <label className="text-xs text-slate-300 font-bold block mb-1">Notas u observaciones (opcional)</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Ej: Contrato anual, incluye seguro de cristales, compra semanal..."
                className="w-full glass-input rounded-2xl px-3.5 py-2.5 text-sm text-white focus:border-rose-400 outline-none"
              />
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); setEditingItem(null); }}
                className="px-4 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
              >
                {modalMode === 'edit' ? 'Guardar Cambios' : 'Crear Gasto'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- MODAL 2: AÑADIR TRAMO / REVISIÓN DE TARIFA --- */}
      {isPeriodModalOpen && selectedExpenseForPeriod && (
        <Modal
          isOpen={isPeriodModalOpen}
          onClose={() => { setIsPeriodModalOpen(false); setSelectedExpenseForPeriod(null); }}
          title={`Gestionar Periodo / Tarifa: ${selectedExpenseForPeriod.title}`}
        >
          <form onSubmit={handleAddPeriod} className="space-y-4">
            <p className="text-xs text-slate-300">
              Registra un cambio de precio o periodicidad (ej: revisión de tarifa de luz o subida de seguro) a partir de una fecha concreta sin perder los datos históricos.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Desde el mes (YYYY-MM) *</label>
                <input
                  type="month"
                  required
                  value={periodForm.startDate}
                  onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
                  className="w-full glass-input rounded-2xl px-3.5 py-2.5 text-sm text-white focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Hasta el mes (opcional)</label>
                <input
                  type="month"
                  value={periodForm.endDate}
                  onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
                  placeholder="Indefinido"
                  className="w-full glass-input rounded-2xl px-3.5 py-2.5 text-sm text-white focus:border-amber-400 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Nuevo Importe (€) *</label>
                <input
                  type="text"
                  required
                  value={periodForm.amount}
                  onChange={(e) => setPeriodForm({ ...periodForm, amount: e.target.value })}
                  placeholder="Ej: 52,00"
                  className="w-full glass-input rounded-2xl px-3.5 py-2.5 text-sm font-mono text-white focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Frecuencia en este tramo</label>
                <select
                  value={periodForm.frequency}
                  onChange={(e) => setPeriodForm({ ...periodForm, frequency: e.target.value })}
                  className="w-full glass-input rounded-2xl px-3.5 py-2.5 text-sm text-white focus:border-amber-400 outline-none"
                >
                  <option value="mensual" className="bg-slate-900 text-white">Mensual</option>
                  <option value="trimestral" className="bg-slate-900 text-white">Trimestral</option>
                  <option value="semestral" className="bg-slate-900 text-white">Semestral</option>
                  <option value="anual" className="bg-slate-900 text-white">Anual</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-bold block mb-1">Motivo / Notas del cambio</label>
              <input
                type="text"
                value={periodForm.notes}
                onChange={(e) => setPeriodForm({ ...periodForm, notes: e.target.value })}
                placeholder="Ej: Subida IPC, promoción 12 meses..."
                className="w-full glass-input rounded-2xl px-3.5 py-2.5 text-sm text-white focus:border-amber-400 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => { setIsPeriodModalOpen(false); setSelectedExpenseForPeriod(null); }}
                className="px-4 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-400/20 active:scale-95 transition-all"
              >
                Guardar Tramo
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

