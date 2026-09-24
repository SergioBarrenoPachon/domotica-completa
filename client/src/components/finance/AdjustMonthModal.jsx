import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Home, 
  ShieldCheck, 
  Zap, 
  ShoppingCart, 
  Sparkles, 
  TrendingUp, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  Calendar, 
  X, 
  Edit3, 
  Tag, 
  Clock, 
  Euro, 
  Save,
  Trash2
} from 'lucide-react';
import Modal from '../Modal';

export default function AdjustMonthModal({
  isOpen,
  onClose,
  item,
  currentMonth,
  formattedMonthLabel,
  onSaved,
  onRemoveOverride,
  onDeleteItem,
  api
}) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('General');
  const [frequency, setFrequency] = useState('mensual');
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [monthOfYear, setMonthOfYear] = useState(1);
  const [specificDate, setSpecificDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showDeleteChoices, setShowDeleteChoices] = useState(false);

  useEffect(() => {
    if (item) {
      setShowDeleteChoices(false);
      setTitle(item.title || '');
      setAmount(item.amount !== undefined ? String(item.amount) : (item.originalAmount !== undefined ? String(item.originalAmount) : ''));
      setCategory(item.category || 'General');
      setFrequency(item.frequency || 'mensual');
      setDayOfMonth(item.dayOfMonth !== undefined ? item.dayOfMonth : (item.originalDayOfMonth || 1));
      setMonthOfYear(item.monthOfYear || 1);
      setSpecificDate(item.date || (currentMonth ? `${currentMonth}-${String(item.dayOfMonth || 1).padStart(2, '0')}` : ''));
      setNotes(item.notes || item.overrideNotes || '');
    }
  }, [item, currentMonth]);

  useEffect(() => {
    if (isOpen && api?.getFinanceCategories) {
      api.getFinanceCategories().then(cats => {
        if (cats && cats.length > 0) setCategories(cats);
      }).catch(console.error);
    }
  }, [isOpen, api]);

  if (!isOpen || !item) return null;

  const isIncome = item.type === 'ingreso';
  const isPunctual = frequency === 'puntual' || item.frequency === 'puntual';
  const monthLabel = formattedMonthLabel || (() => {
    if (!currentMonth) return 'este mes';
    const [y, m] = currentMonth.split('-');
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  })();

  // Group categories for grouped select
  const groupedCategories = categories.reduce((acc, cat) => {
    const grp = cat.group || 'Otros';
    if (!acc[grp]) acc[grp] = [];
    acc[grp].push(cat);
    return acc;
  }, {});
  const existingGroups = Object.keys(groupedCategories);

  // Helper icon for modal header
  const getConceptIcon = () => {
    if (isIncome) return <Briefcase className="w-5 h-5 text-emerald-400" />;
    const t = (item.title || '').toLowerCase();
    const c = (item.category || '').toLowerCase();
    if (item.loanId || t.includes('hipoteca') || t.includes('préstamo') || c.includes('vivienda')) {
      return <Home className="w-5 h-5 text-cyan-400" />;
    }
    if (c.includes('seguro') || c.includes('suscrip') || t.includes('seguro') || t.includes('póliza')) {
      return <ShieldCheck className="w-5 h-5 text-purple-400" />;
    }
    if (c.includes('suministro') || t.includes('luz') || t.includes('agua') || t.includes('gas')) {
      return <Zap className="w-5 h-5 text-amber-400" />;
    }
    return <ShoppingCart className="w-5 h-5 text-rose-400" />;
  };

  // Helper to parse input amount supporting Spanish commas (e.g. "1.585,98" or "1585,98")
  const parseSafeAmount = (val) => {
    if (val === undefined || val === null || val === '') return NaN;
    let str = String(val).trim();
    if (str.includes('.') && str.includes(',')) {
      if (str.lastIndexOf('.') < str.lastIndexOf(',')) {
        str = str.replace(/\./g, '').replace(',', '.');
      } else {
        str = str.replace(/,/g, '');
      }
    } else if (str.includes(',')) {
      str = str.replace(',', '.');
    }
    const num = parseFloat(str);
    return isNaN(num) ? NaN : num;
  };

  // Option 1: Save as Master Rule (All future months)
  const handleSaveFutureRule = async () => {
    const cleanAmount = parseSafeAmount(amount);
    if (isNaN(cleanAmount) || cleanAmount < 0) {
      alert('Por favor introduce un importe válido (ej: 1585.98 o 1585,98)');
      return;
    }
    setSaving(true);
    try {
      const parsedDay = Math.min(31, Math.max(1, Number(dayOfMonth) || 1));
      const updates = {
        title: title.trim() || item.title,
        amount: cleanAmount,
        category: category || item.category,
        frequency: frequency || item.frequency,
        dayOfMonth: parsedDay,
        monthOfYear: (frequency === 'anual' || frequency === 'semestral' || frequency === 'trimestral') ? (Number(monthOfYear) || 1) : null,
        notes: notes.trim()
      };

      await api.updateTransactionRule(item.id, updates);

      // Clean up override if present so new master rule is active immediately
      if (item.isOverridden && item.overrideId) {
        try {
          await api.deleteMonthOverride(item.overrideId);
        } catch (err) {
          console.warn('Error eliminando override previo:', err);
        }
      }

      onSaved();
      onClose();
    } catch (err) {
      alert('Error actualizando regla maestra: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  // Option 2: Save as Monthly Override (Only this month)
  const handleSaveOnlyThisMonth = async (e) => {
    if (e) e.preventDefault();
    const cleanAmount = parseSafeAmount(amount);
    if (isNaN(cleanAmount) || cleanAmount < 0) {
      alert('Por favor introduce un importe válido (ej: 1585.98 o 1585,98)');
      return;
    }
    setSaving(true);
    try {
      const parsedDay = Math.min(31, Math.max(1, Number(dayOfMonth) || item.dayOfMonth || 1));
      await api.createMonthOverride(item.id, currentMonth, {
        title: title.trim() || item.title,
        amount: cleanAmount,
        category: category || item.category,
        dayOfMonth: parsedDay,
        notes: notes.trim() || `Ajuste en ${monthLabel}`
      });
      onSaved();
      onClose();
    } catch (err) {
      alert('Error guardando ajuste puntual: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  // Option 3: Save Punctual Expense / Income
  const handleSavePunctual = async (e) => {
    if (e) e.preventDefault();
    const cleanAmount = parseSafeAmount(amount);
    if (isNaN(cleanAmount) || cleanAmount < 0) {
      alert('Por favor introduce un importe válido (ej: 50.00 o 50,00)');
      return;
    }
    setSaving(true);
    try {
      const parsedDay = Math.min(31, Math.max(1, Number(dayOfMonth) || 1));
      const formattedStartDate = currentMonth ? `${currentMonth}-${String(parsedDay).padStart(2, '0')}` : undefined;
      const updates = {
        title: title.trim() || item.title,
        amount: cleanAmount,
        category: category || item.category,
        startDate: formattedStartDate,
        dayOfMonth: parsedDay,
        notes: notes.trim()
      };
      await api.updateTransactionRule(item.id, updates);
      onSaved();
      onClose();
    } catch (err) {
      alert('Error guardando movimiento puntual: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Editar: ${item.title}`}
    >
      <div className="space-y-4">

        {/* CABECERA RESUMEN DEL CONCEPTO (iOS 27 HERO CAPSULE) */}
        <div className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 flex items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center flex-shrink-0 shadow-sm">
              {getConceptIcon()}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider font-display">
                {isIncome ? '💼 Nómina / Ingreso' : '💳 Gasto / Recibo'} • <span className="capitalize">{frequency}</span>
              </span>
              <p className="text-base font-extrabold text-white truncate font-display">
                {item.title}
              </p>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <span className="text-[10px] text-slate-400 block font-display">Importe Base</span>
            <span className={`text-lg font-black font-mono ${isIncome ? 'text-ios-emerald' : 'text-ios-amber'}`}>
              {isIncome ? '+' : '-'}{item.originalAmount !== undefined ? (Number(item.originalAmount) || 0).toFixed(2) : (Number(amount) || 0).toFixed(2)}€
            </span>
          </div>
        </div>

        {/* EXCEPCIÓN ACTIVA EN ESTE MES (SI LA HAY) */}
        {item.isOverridden && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 text-xs text-amber-300 backdrop-blur-xl">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span className="truncate">Tiene un ajuste temporal activo solo para {monthLabel}.</span>
            </div>
            {onRemoveOverride && (
              <button
                type="button"
                onClick={() => {
                  onRemoveOverride(item.overrideId);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold text-[11px] flex items-center gap-1 active:scale-95 transition-all flex-shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Base</span>
              </button>
            )}
          </div>
        )}

        {/* FORMULARIO DE EDICIÓN COMPLETO */}
        <div className="space-y-3.5">
          
          {/* TÍTULO E IMPORTE */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">
                Concepto / Nombre *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Nómina Sergio, Hipoteca, Seguro Mapfre..."
                className="glass-input rounded-2xl px-4 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">
                Importe (€) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="glass-input rounded-2xl pl-4 pr-8 py-2.5 text-white font-mono font-bold text-base focus:border-white/30 outline-none w-full"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-mono font-bold">
                  €
                </span>
              </div>
            </div>
          </div>

          {/* CATEGORÍA Y PERIODICIDAD */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5 mb-1 font-display">
                <Tag className="w-3.5 h-3.5 text-ios-amber" />
                <span>Categoría</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full"
              >
                {existingGroups.length > 0 ? (
                  existingGroups.map(groupName => (
                    <optgroup key={groupName} label={`📁 ${groupName}`} className="bg-slate-900 text-amber-400 font-bold">
                      {groupedCategories[groupName].map(cat => (
                        <option key={cat.id || cat.name} value={cat.name} className="bg-slate-900 text-white font-normal">
                          {cat.name}
                        </option>
                      ))}
                    </optgroup>
                  ))
                ) : (
                  <option value={category} className="bg-slate-900 text-white">{category}</option>
                )}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">
                Periodicidad / Frecuencia
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full"
              >
                <option value="mensual" className="bg-slate-900 text-white">Mensual (Todos los meses)</option>
                <option value="anual" className="bg-slate-900 text-white">Anual (Pagas Extras / Seguro Anual)</option>
                <option value="trimestral" className="bg-slate-900 text-white">Trimestral (Cada 3 meses)</option>
                <option value="semestral" className="bg-slate-900 text-white">Semestral (Cada 6 meses)</option>
                <option value="puntual" className="bg-slate-900 text-white">Puntual (Solo una vez)</option>
              </select>
            </div>
          </div>

          {/* FECHAS SEGÚN PERIODICIDAD */}
          {frequency === 'puntual' ? (
            <div>
              <label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5 mb-1 font-display">
                <Calendar className="w-3.5 h-3.5 text-orange-400" />
                <span>Fecha del gasto o cobro</span>
              </label>
              <input
                type="date"
                required
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="glass-input rounded-2xl px-4 py-2 text-white text-sm font-mono focus:border-orange-400/50 outline-none w-full"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">
                  Día habitual de Cargo o Cobro (1 - 31)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  className="glass-input rounded-2xl px-3.5 py-2 text-white font-mono text-sm focus:border-white/30 outline-none w-full"
                />
              </div>

              {(frequency === 'anual' || frequency === 'semestral' || frequency === 'trimestral') && (
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">
                    {frequency === 'anual' && 'Mes en que se aplica:'}
                    {frequency === 'semestral' && 'Mes del primer cobro (cada 6 meses):'}
                    {frequency === 'trimestral' && 'Mes del primer cobro (cada 3 meses):'}
                  </label>
                  <select
                    value={monthOfYear}
                    onChange={(e) => setMonthOfYear(Number(e.target.value))}
                    className="glass-input rounded-2xl px-3.5 py-2 text-white text-sm focus:border-white/30 outline-none w-full"
                  >
                    <option value={1} className="bg-slate-900 text-white">Enero</option>
                    <option value={2} className="bg-slate-900 text-white">Febrero</option>
                    <option value={3} className="bg-slate-900 text-white">Marzo (Bonus / Rendimiento)</option>
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
                </div>
              )}
            </div>
          )}

          {/* NOTAS */}
          <div>
            <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">
              Notas adicionales (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Número de póliza, cuenta bancaria, aumentos..."
              className="glass-input rounded-2xl px-3.5 py-2 text-white text-xs outline-none w-full"
            />
          </div>

          {/* BOTONES DE GUARDADO CON OPCIONES CLARAS DE ALCANCE */}
          <div className="space-y-2.5 pt-2">
            
            {frequency === 'puntual' ? (
              /* BOTÓN PARA GASTO PUNTUAL O COTIDIANO */
              <button
                type="button"
                disabled={saving}
                onClick={handleSavePunctual}
                className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(255,159,10,0.3)] active:scale-95 transition-all"
              >
                <Save className="w-4 h-4 stroke-[2.5]" />
                <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            ) : (
              /* DOS OPCIONES PARA CONCEPTOS PERIÓDICOS (NÓMINAS, HIPOTECA, SEGUROS, RECIBOS) */
              <>
                {/* OPCIÓN 1: ACTUALIZAR REGLA MAESTRA PERMANENTE (TODOS LOS MESES) */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveFutureRule}
                  className="w-full p-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 hover:border-emerald-400 text-left transition-all active:scale-[0.99] group flex items-center justify-between backdrop-blur-xl"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-sm font-bold text-emerald-300 flex items-center gap-2 font-display">
                      <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>Guardar para TODOS los meses (Regla Maestra Fija)</span>
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Cambia la nómina o cuota fija permanentemente en la base de datos a <strong className="text-white">{amount || '0'}€</strong>.
                    </p>
                  </div>
                  <span className="text-emerald-400 text-xs font-bold whitespace-nowrap group-hover:translate-x-0.5 transition-transform">
                    Para siempre →
                  </span>
                </button>

                {/* OPCIÓN 2: MODIFICAR SOLO ESTE MES (EXCEPCIÓN TEMPORAL) */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveOnlyThisMonth}
                  className="w-full p-3.5 rounded-2xl bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/30 hover:border-purple-400 text-left transition-all active:scale-[0.99] group flex items-center justify-between backdrop-blur-xl"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-bold text-purple-300 flex items-center gap-2 font-display">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                      <span>Modificar SOLO en {monthLabel}</span>
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Aplica solo para {monthLabel}. Los meses futuros conservarán su regla habitual.
                    </p>
                  </div>
                  <span className="text-purple-400 text-xs font-bold whitespace-nowrap">
                    Solo este mes
                  </span>
                </button>
              </>
            )}

          </div>

          {/* SECCIÓN DE ELIMINACIÓN CON OPCIONES CLARAS */}
          {onDeleteItem && (
            <div className="pt-2 border-t border-white/10">
              {!showDeleteChoices ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteChoices(true)}
                  className="w-full py-2.5 px-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Eliminar este concepto...</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-rose-500/20">
                    <span className="text-xs font-black text-rose-300 flex items-center gap-1.5 font-display">
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>¿Cómo deseas eliminar "{title || item.title}"?</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDeleteChoices(false)}
                      className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded-lg bg-white/5"
                    >
                      ✕ Cancelar
                    </button>
                  </div>

                  {!isPunctual ? (
                    <div className="space-y-2 pt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          onClose();
                          if (onDeleteItem) await onDeleteItem(item, 'this_month');
                        }}
                        className="w-full p-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-left transition-all active:scale-95 flex items-center justify-between group"
                      >
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-400" />
                            <span>Eliminar SOLO de este mes ({monthLabel})</span>
                          </div>
                          <p className="text-[10px] text-rose-200/70 mt-0.5">
                            No se cobrará en este mes. Se mantiene en los demás meses.
                          </p>
                        </div>
                        <span className="text-xs text-rose-300 font-bold group-hover:translate-x-0.5 transition-transform whitespace-nowrap ml-2">
                          Este mes →
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          onClose();
                          if (onDeleteItem) await onDeleteItem(item, 'all');
                        }}
                        className="w-full p-2.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/40 border border-rose-500/50 text-left transition-all active:scale-95 flex items-center justify-between group"
                      >
                        <div>
                          <div className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>Eliminar para TODOS los meses</span>
                          </div>
                          <p className="text-[10px] text-rose-300/60 mt-0.5">
                            Elimina la regla definitivamente de la base de datos.
                          </p>
                        </div>
                        <span className="text-xs text-rose-300 font-bold group-hover:translate-x-0.5 transition-transform whitespace-nowrap ml-2">
                          Todos →
                        </span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        onClose();
                        if (onDeleteItem) await onDeleteItem(item, 'all');
                      }}
                      className="w-full p-2.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/40 border border-rose-500/50 text-left transition-all active:scale-95 flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>Eliminar definitivamente</span>
                        </div>
                        <p className="text-[10px] text-rose-300/60 mt-0.5">
                          Se eliminará por completo este concepto del mes.
                        </p>
                      </div>
                      <span className="text-xs text-rose-300 font-bold group-hover:translate-x-0.5 transition-transform whitespace-nowrap ml-2">
                        Eliminar
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-1 pb-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold active:scale-95 transition-all"
            >
              Cerrar
            </button>
          </div>

        </div>

      </div>
    </Modal>
  );
}
