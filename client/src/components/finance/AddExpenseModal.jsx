import React, { useState, useEffect, useMemo } from 'react';
import { 
  Repeat, 
  Zap, 
  TrendingUp, 
  Plus, 
  Calendar, 
  Check, 
  Sparkles, 
  Tag, 
  FolderPlus, 
  X,
  ChevronDown,
  Info,
  Clock,
  Euro
} from 'lucide-react';
import Modal from '../Modal';

const PRESET_EVERYDAY = [
  { title: 'Supermercado & Compra', category: 'Alimentación', amount: '' },
  { title: 'Café & Desayuno', category: 'Restaurantes & Bares', amount: '2.80' },
  { title: 'Gasolina / Diésel', category: 'Combustible', amount: '50.00' },
  { title: 'Farmacia & Medicamentos', category: 'Salud & Farmacia', amount: '' },
  { title: 'Restaurante / Cena fuera', category: 'Restaurantes & Bares', amount: '' },
  { title: 'Panadería & Prensa', category: 'Alimentación', amount: '3.50' },
  { title: 'Aparcamiento / Peaje', category: 'Transporte Público', amount: '' },
  { title: 'Capricho / Compra online', category: 'Ocio', amount: '' }
];

const PRESET_RECURRING = [
  { title: 'Factura Eléctrica (Luz)', category: 'Suministros', frequency: 'mensual', defaultDay: 10 },
  { title: 'Agua & Basuras', category: 'Suministros', frequency: 'trimestral', defaultDay: 15 },
  { title: 'Gas Natural', category: 'Suministros', frequency: 'mensual', defaultDay: 12 },
  { title: 'Fibra & Líneas Móviles', category: 'Comunicaciones', frequency: 'mensual', defaultDay: 8 },
  { title: 'Comunidad de Propietarios', category: 'Vivienda', frequency: 'mensual', defaultDay: 5 },
  { title: 'Suscripciones Streaming (Netflix/Spotify)', category: 'Suscripciones', frequency: 'mensual', defaultDay: 3 },
  { title: 'Gimnasio / Deporte', category: 'Cuidado Personal', frequency: 'mensual', defaultDay: 1 },
  { title: 'Seguro de Hogar', category: 'Seguros', frequency: 'anual', defaultDay: 15 },
  { title: 'Seguro de Coche', category: 'Seguros', frequency: 'anual', defaultDay: 20 },
  { title: 'Impuesto de Circulación / IBI', category: 'Impuestos', frequency: 'anual', defaultDay: 10 }
];

const PRESET_INCOME = [
  { title: 'Nómina Mensual', category: 'Nómina', frequency: 'mensual', defaultDay: 28 },
  { title: '🏖️ Paga Extra de Verano', category: 'Nómina', frequency: 'anual', defaultDay: 20, monthOfYear: 6 },
  { title: '🎄 Paga Extra de Navidad', category: 'Nómina', frequency: 'anual', defaultDay: 20, monthOfYear: 12 },
  { title: '⭐ Bonus / Rendimiento', category: 'Otros Ingresos', frequency: 'anual', defaultDay: 15, monthOfYear: 3 },
  { title: 'Ingreso Autónomo / Factura', category: 'Actividad Profesional', frequency: 'mensual', defaultDay: 5 },
  { title: 'Devolución IRPF / Hacienda', category: 'Otros Ingresos', frequency: 'puntual', defaultDay: 15 }
];


export default function AddExpenseModal({ 
  isOpen, 
  onClose, 
  onCreated, 
  api, 
  currentMonth,
  initialDay = 1,
  initialType = 'gasto',
  initialMode = 'recurring',
  initialCategory = '',
  initialTitle = '',
  initialFrequency = 'mensual',
  initialMonthOfYear
}) {
  // Mode: 'recurring' | 'everyday' | 'income'
  const [entryMode, setEntryMode] = useState(initialMode);

  // Compute default month of year from currentMonth if not specified
  const defaultMonthOfYear = useMemo(() => {
    if (initialMonthOfYear) return initialMonthOfYear;
    if (currentMonth) {
      const m = parseInt(currentMonth.split('-')[1], 10);
      if (!isNaN(m) && m >= 1 && m <= 12) return m;
    }
    return new Date().getMonth() + 1;
  }, [initialMonthOfYear, currentMonth]);

  // Form State
  const [title, setTitle] = useState(initialTitle || '');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(initialCategory || 'Vivienda');
  const [frequency, setFrequency] = useState(initialFrequency || 'mensual');
  const [dayOfMonth, setDayOfMonth] = useState(initialDay || 1);
  const [monthOfYear, setMonthOfYear] = useState(initialMonthOfYear || defaultMonthOfYear);
  const [specificDate, setSpecificDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [isPaidImmediately, setIsPaidImmediately] = useState(true);
  const [notes, setNotes] = useState('');
  const [endDate, setEndDate] = useState('');
  const [yearlyIncreasePct, setYearlyIncreasePct] = useState(0);

  // Categories & Groups State
  const [categories, setCategories] = useState([]);
  const [showNewCatForm, setShowNewCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatGroup, setNewCatGroup] = useState('');
  const [newCatColor, setNewCatColor] = useState('#f59e0b');
  const [isCustomGroup, setIsCustomGroup] = useState(false);
  const [customGroupName, setCustomGroupName] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialMode) setEntryMode(initialMode);
      if (initialCategory) setCategory(initialCategory);
      if (initialDay) setDayOfMonth(initialDay);
      if (initialTitle) setTitle(initialTitle);
      if (initialFrequency) setFrequency(initialFrequency);
      setMonthOfYear(initialMonthOfYear || defaultMonthOfYear);
      loadCategories();
    }
  }, [isOpen, initialDay, initialMode, initialCategory, initialTitle, initialFrequency, initialMonthOfYear, defaultMonthOfYear]);

  const loadCategories = async () => {
    try {
      const cats = await api.getFinanceCategories();
      if (cats && cats.length > 0) {
        setCategories(cats);
        if (entryMode === 'income') {
          const incCat = cats.find(c => c.group === 'Ingresos');
          if (incCat) setCategory(incCat.name);
        }
      }
    } catch (err) {
      console.error('Error cargando categorías:', err);
    }
  };

  // Group categories by group
  const groupedCategories = categories.reduce((acc, cat) => {
    const grp = cat.group || 'Otros';
    if (!acc[grp]) acc[grp] = [];
    acc[grp].push(cat);
    return acc;
  }, {});

  const existingGroups = Object.keys(groupedCategories);

  // Switch entry modes
  const handleModeChange = (mode) => {
    setEntryMode(mode);
    if (mode === 'everyday') {
      setFrequency('puntual');
      setIsPaidImmediately(true);
      const foodCat = categories.find(c => c.name.toLowerCase().includes('alimentaci'));
      if (foodCat) setCategory(foodCat.name);
    } else if (mode === 'recurring') {
      setFrequency('mensual');
      setIsPaidImmediately(false);
      const vivCat = categories.find(c => c.name === 'Vivienda' || c.name === 'Suministros');
      if (vivCat) setCategory(vivCat.name);
    } else if (mode === 'income') {
      setFrequency('mensual');
      setIsPaidImmediately(false);
      const incCat = categories.find(c => c.group === 'Ingresos');
      if (incCat) setCategory(incCat.name);
    }
  };

  // Quick preset click
  const handleApplyEverydayPreset = (preset) => {
    setTitle(preset.title);
    if (preset.amount) setAmount(preset.amount);
    const found = categories.find(c => c.name.toLowerCase() === preset.category.toLowerCase());
    if (found) setCategory(found.name);
  };

  const handleApplyRecurringPreset = (preset) => {
    setTitle(preset.title);
    setFrequency(preset.frequency);
    setDayOfMonth(preset.defaultDay);
    if (preset.monthOfYear) setMonthOfYear(preset.monthOfYear);
    const found = categories.find(c => c.name.toLowerCase() === preset.category.toLowerCase());
    if (found) setCategory(found.name);
  };

  const handleApplyIncomePreset = (preset) => {
    setTitle(preset.title);
    if (preset.frequency) setFrequency(preset.frequency);
    if (preset.defaultDay) setDayOfMonth(preset.defaultDay);
    if (preset.monthOfYear) setMonthOfYear(preset.monthOfYear);
    const found = categories.find(c => c.name.toLowerCase() === preset.category.toLowerCase()) || 
                  categories.find(c => c.group === 'Ingresos');
    if (found) setCategory(found.name);
  };


  // Quick date selector for everyday expenses
  const handleSetQuickDate = (type) => {
    const today = new Date();
    if (type === 'today') {
      setSpecificDate(today.toISOString().slice(0, 10));
    } else if (type === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      setSpecificDate(yesterday.toISOString().slice(0, 10));
    }
  };

  // Add new category
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const finalGroup = isCustomGroup 
      ? (customGroupName.trim() || 'Personalizados')
      : (newCatGroup || 'Personalizados');

    try {
      const created = await api.addFinanceCategory({
        name: newCatName.trim(),
        group: finalGroup,
        color: newCatColor,
        icon: 'Tag'
      });
      setCategories(prev => [...prev, created]);
      setCategory(created.name);
      setShowNewCatForm(false);
      setNewCatName('');
      setCustomGroupName('');
      setIsCustomGroup(false);
    } catch (err) {
      alert('Error creando categoría: ' + err.message);
    }
  };

  // Submit main transaction
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !amount) return;

    setSaving(true);
    try {
      const isIncome = entryMode === 'income';
      const isEveryday = entryMode === 'everyday';

      let computedStartDate = currentMonth;
      let finalDay = Number(dayOfMonth) || 1;

      if (isEveryday) {
        computedStartDate = specificDate; // YYYY-MM-DD
        const dayPart = parseInt(specificDate.split('-')[2], 10);
        if (!isNaN(dayPart)) finalDay = dayPart;
      }

      await api.addFinanceTransaction({
        title: title.trim(),
        amount: parseFloat(amount),
        type: isIncome ? 'ingreso' : 'gasto',
        category,
        frequency: isEveryday ? 'puntual' : frequency,
        dayOfMonth: finalDay,
        monthOfYear: (frequency === 'anual' || frequency === 'semestral' || frequency === 'trimestral') ? Number(monthOfYear) : null,
        startDate: computedStartDate,
        endDate: (!isEveryday && endDate.trim()) ? endDate.trim() : null,
        yearlyIncreasePct: Number(yearlyIncreasePct) || 0,
        notes: notes.trim(),
        initialPaid: isEveryday ? isPaidImmediately : false
      });

      setTitle('');
      setAmount('');
      setNotes('');
      onCreated();
      onClose();
    } catch (err) {
      alert('Error guardando transacción: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo Movimiento Financiero"
    >
      <div className="space-y-5">
        
        {/* TOP SELECTOR: 3 MODALIDADES INTUITIVAS (iOS 27 SEGMENTED CONTROLLER) */}
        <div className="p-1.5 bg-white/[0.04] backdrop-blur-2xl rounded-2xl border border-white/10 grid grid-cols-3 gap-1.5 shadow-inner">
          <button
            type="button"
            onClick={() => handleModeChange('recurring')}
            className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.98] ${
              entryMode === 'recurring'
                ? 'bg-amber-400 text-slate-950 shadow-[0_4px_16px_rgba(255,159,10,0.35)] font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Repeat className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Recibo Periódico</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('everyday')}
            className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.98] ${
              entryMode === 'everyday'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-[0_4px_16px_rgba(249,115,22,0.35)] font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Zap className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Gasto Cotidiano</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('income')}
            className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.98] ${
              entryMode === 'income'
                ? 'bg-emerald-400 text-slate-950 shadow-[0_4px_16px_rgba(48,209,88,0.35)] font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <TrendingUp className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Ingreso</span>
          </button>
        </div>

        {/* PLANTILLAS RÁPIDAS (CHIPS PRESETS) */}
        {entryMode === 'everyday' && (
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block font-display">
              Atajos cotidianos:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_EVERYDAY.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyEverydayPreset(p)}
                  className="text-xs px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 hover:border-orange-500/50 transition-all duration-200 active:scale-95 shadow-sm"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {entryMode === 'recurring' && (
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block font-display">
              Recibos habituales recomendados:
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
              {PRESET_RECURRING.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyRecurringPreset(p)}
                  className="text-xs px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 hover:border-ios-amber/50 transition-all duration-200 active:scale-95 shadow-sm"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {entryMode === 'income' && (
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ios-emerald block font-display">
              Plantillas de Nóminas y Pagas Extras:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_INCOME.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyIncomePreset(p)}
                  className="text-xs px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 hover:border-emerald-400 transition-all duration-200 active:scale-95 shadow-sm"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* TÍTULO E IMPORTE */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">
                {entryMode === 'income' ? 'Concepto del Ingreso' : 'Concepto o Comercio'} *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  entryMode === 'recurring'
                    ? 'Ej: Luz Endesa, Comunidad, Seguro...'
                    : entryMode === 'everyday'
                    ? 'Ej: Mercadona, Repsol, Farmacia...'
                    : 'Ej: Nómina, Devolución IRPF, Extra...'
                }
                className="glass-input rounded-2xl px-4 py-3 text-white text-sm focus:border-white/30 outline-none w-full"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">
                Importe (€) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="glass-input rounded-2xl pl-4 pr-8 py-3 text-white font-mono font-bold text-base focus:border-white/30 outline-none w-full"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-mono font-bold">
                  €
                </span>
              </div>
            </div>
          </div>

          {/* SELECTOR DE CATEGORÍA Y AGRUPACIÓN */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5 font-display">
                <Tag className="w-3.5 h-3.5 text-ios-amber" />
                <span>Categoría & Agrupación</span>
              </label>

              <button
                type="button"
                onClick={() => setShowNewCatForm(!showNewCatForm)}
                className="text-xs text-ios-amber hover:text-amber-300 font-bold flex items-center gap-1 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva Agrupación / Categoría</span>
              </button>
            </div>

            {/* Formulario desplegable para nueva categoría */}
            {showNewCatForm && (
              <div className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-ios-amber/30 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 font-display">
                    <FolderPlus className="w-4 h-4" />
                    Crear Nueva Agrupación o Categoría
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNewCatForm(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Nombre Categoría *</label>
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="Ej: Veterinario, Netflix..."
                      className="glass-input rounded-xl px-3 py-2 text-xs text-white outline-none w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Agrupación / Familia</label>
                    {!isCustomGroup ? (
                      <div className="flex gap-1">
                        <select
                          value={newCatGroup}
                          onChange={(e) => {
                            if (e.target.value === '__new__') {
                              setIsCustomGroup(true);
                            } else {
                              setNewCatGroup(e.target.value);
                            }
                          }}
                          className="glass-input rounded-xl px-3 py-2 text-xs text-white outline-none w-full"
                        >
                          <option value="" className="bg-slate-900 text-white">Seleccionar agrupación existente...</option>
                          {existingGroups.map(g => (
                            <option key={g} value={g} className="bg-slate-900 text-white">{g}</option>
                          ))}
                          <option value="__new__" className="bg-slate-900 text-amber-400">+ Nueva agrupación personalizada...</option>
                        </select>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={customGroupName}
                          onChange={(e) => setCustomGroupName(e.target.value)}
                          placeholder="Nombre del nuevo grupo (ej: Mascotas)"
                          className="glass-input rounded-xl px-3 py-2 text-xs text-white outline-none w-full"
                        />
                        <button
                          type="button"
                          onClick={() => setIsCustomGroup(false)}
                          className="px-2.5 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-xl text-slate-300 hover:text-white"
                          title="Volver a lista"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-medium">Color:</span>
                    {['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#a855f7', '#64748b'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewCatColor(c)}
                        className={`w-5 h-5 rounded-full transition-transform active:scale-95 ${newCatColor === c ? 'scale-125 ring-2 ring-white shadow-md' : 'opacity-80'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md active:scale-95 transition-all"
                  >
                    Guardar Categoría
                  </button>
                </div>
              </div>
            )}

            {/* Selector agrupado estándar */}
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="glass-input rounded-2xl px-4 py-3 text-white text-sm focus:border-white/30 outline-none w-full appearance-none pr-10"
              >
                {existingGroups.map(groupName => (
                  <optgroup key={groupName} label={`📁 ${groupName}`} className="bg-slate-900 text-amber-400 font-bold">
                    {groupedCategories[groupName].map(cat => (
                      <option key={cat.id || cat.name} value={cat.name} className="bg-slate-900 text-white font-normal">
                        {cat.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* FECHAS & FRECUENCIA DEPENDIENDO DEL MODO */}
          {entryMode === 'everyday' ? (
            /* MODO GASTO COTIDIANO */
            <div className="p-4 rounded-2xl bg-orange-500/[0.07] border border-orange-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-orange-300 font-bold flex items-center gap-1.5 font-display">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Fecha de Realización</span>
                </label>

                {/* Atajos Hoy / Ayer */}
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSetQuickDate('today')}
                    className="px-3 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[11px] text-orange-200 border border-white/10 active:scale-95 transition-all"
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetQuickDate('yesterday')}
                    className="px-3 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[11px] text-orange-200 border border-white/10 active:scale-95 transition-all"
                  >
                    Ayer
                  </button>
                </div>
              </div>

              <input
                type="date"
                required
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="glass-input rounded-2xl px-4 py-2.5 text-white text-sm focus:border-orange-400/50 outline-none font-mono w-full"
              />

              {/* Checkbox "Pagado en el momento" */}
              <label className="flex items-center gap-2.5 cursor-pointer pt-1 select-none">
                <input
                  type="checkbox"
                  checked={isPaidImmediately}
                  onChange={(e) => setIsPaidImmediately(e.target.checked)}
                  className="w-4 h-4 rounded-md text-orange-500 bg-white/10 border-white/20 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs text-slate-300 font-medium">
                  Marcar como ya pagado en cuenta / tarjeta (Gasto real ejecutado)
                </span>
              </label>
            </div>
          ) : (
            /* MODO GASTO PERIÓDICO O INGRESO */
            <div className="space-y-3.5 p-4 rounded-2xl bg-amber-500/[0.07] border border-amber-500/20">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-amber-300 font-semibold block mb-1 font-display">
                    Periodicidad / Frecuencia
                  </label>
                  <div className="relative">
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-amber-400/50 outline-none w-full appearance-none pr-8"
                    >
                      <option value="mensual" className="bg-slate-900 text-white">Mensual (Todos los meses)</option>
                      <option value="anual" className="bg-slate-900 text-white">Anual (Pagas Extras / Recibo Anual)</option>
                      <option value="trimestral" className="bg-slate-900 text-white">Trimestral (Cada 3 meses)</option>
                      <option value="semestral" className="bg-slate-900 text-white">Semestral (Cada 6 meses)</option>
                      <option value="puntual" className="bg-slate-900 text-white">Puntual (Solo este mes)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-amber-300 font-semibold block mb-1 font-display">
                    Día previsto / Cobro (1 - 31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-amber-400/50 outline-none font-mono w-full"
                  />
                </div>
              </div>

              {(frequency === 'anual' || frequency === 'semestral' || frequency === 'trimestral') && (
                <div>
                  <label className="text-xs text-amber-300 font-semibold block mb-1 font-display">
                    {frequency === 'anual' && 'Mes de Cobro / Pago (Pagas Extras y Anuales):'}
                    {frequency === 'semestral' && 'Mes del Primer Cobro / Pago (se repetirá cada 6 meses):'}
                    {frequency === 'trimestral' && 'Mes del Primer Cobro / Pago (se repetirá cada 3 meses):'}
                  </label>
                  <div className="relative">
                    <select
                      value={monthOfYear}
                      onChange={(e) => setMonthOfYear(Number(e.target.value))}
                      className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-amber-400/50 outline-none w-full appearance-none pr-8"
                    >
                      <option value={1} className="bg-slate-900 text-white">Enero</option>
                      <option value={2} className="bg-slate-900 text-white">Febrero</option>
                      <option value={3} className="bg-slate-900 text-white">Marzo (Bonus / Incentivos)</option>
                      <option value={4} className="bg-slate-900 text-white">Abril</option>
                      <option value={5} className="bg-slate-900 text-white">Mayo</option>
                      <option value={6} className="bg-slate-900 text-white">Junio (🏖️ Paga Extra de Verano)</option>
                      <option value={7} className="bg-slate-900 text-white">Julio</option>
                      <option value={8} className="bg-slate-900 text-white">Agosto</option>
                      <option value={9} className="bg-slate-900 text-white">Septiembre</option>
                      <option value={10} className="bg-slate-900 text-white">Octubre</option>
                      <option value={11} className="bg-slate-900 text-white">Noviembre</option>
                      <option value={12} className="bg-slate-900 text-white">Diciembre (🎄 Paga Extra de Navidad)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              )}

              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                <Info className="w-3.5 h-3.5 text-ios-amber flex-shrink-0" />
                <span>
                  Este recibo se proyectará automáticamente todos los meses el día {dayOfMonth} para calcular tus previsiones de saldo bancario.
                </span>
              </div>
            </div>
          )}

          {/* NOTAS OPCIONALES */}
          <div>
            <label className="text-xs text-slate-400 block mb-1 font-display">Notas o Referencia (Opcional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Contrato #892, factura con recargo, etc."
              className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-xs outline-none w-full"
            />
          </div>

          {/* BOTONES DE ACCIÓN STICKY */}
          <div className="sticky bottom-0 backdrop-blur-2xl bg-slate-950/90 -mx-5 sm:-mx-7 px-5 sm:px-7 py-3.5 sm:py-4 border-t border-white/10 flex items-center justify-end gap-2.5 z-20 rounded-b-[32px] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs sm:text-sm font-bold active:scale-95 transition-all"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm shadow-[0_4px_20px_rgba(255,159,10,0.3)] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>
                    {entryMode === 'recurring' ? 'Guardar Recibo Periódico' : entryMode === 'everyday' ? 'Registrar Gasto Cotidiano' : 'Guardar Ingreso'}
                  </span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </Modal>
  );
}
