import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Check, 
  Clock, 
  Plus, 
  Briefcase, 
  Home, 
  ShieldCheck, 
  Zap, 
  ShoppingCart, 
  Edit3, 
  Trash2, 
  MoreVertical,
  X,
  ArrowRightLeft,
  GripVertical,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  List,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const FinanceYearView = React.lazy(() => import('./FinanceYearView'));

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function FinanceCalendar({ 
  api,
  monthData, 
  currentMonth, 
  onSelectMonth,
  onTogglePaid, 
  onOpenAddTx, 
  onMoveItemDay, 
  onQuickAddTx,
  onEditItem, 
  onDeleteItem,
  onPrevMonth,
  onNextMonth,
  onCurrentMonth
}) {
  const today = new Date();
  
  // View mode: 'grid' (Cuadrícula Mensual) | 'agenda' (Lista por Días) | 'month' (Evolución Anual Multimes)
  const [viewMode, setViewMode] = useState('grid');

  // Selected day
  const [selectedDay, setSelectedDay] = useState(() => {
    if (!monthData) return today.getDate() || 1;
    const isCurrent = (today.getFullYear() === monthData.year && (today.getMonth() + 1) === monthData.monthNumber);
    return isCurrent ? today.getDate() : 1;
  });

  // Active item in action sheet (for move, edit, delete)
  const [actionItem, setActionItem] = useState(null);
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
  const [targetDayInput, setTargetDayInput] = useState(1);

  // Drag and drop & Touch Move state
  const [draggingItem, setDraggingItem] = useState(null);
  const [dragOverDay, setDragOverDay] = useState(null);

  // Quick Add state directly for a specific day
  const [quickAddDay, setQuickAddDay] = useState(null);
  const [quickType, setQuickType] = useState('gasto'); // 'gasto' | 'ingreso'
  const [quickTitle, setQuickTitle] = useState('');
  const [quickAmount, setQuickAmount] = useState('');
  const [quickFrequency, setQuickFrequency] = useState('puntual'); // 'puntual' | 'mensual'
  const [quickSaving, setQuickSaving] = useState(false);

  // Sync selected day safely
  useEffect(() => {
    if (monthData) {
      const isCurrent = (today.getFullYear() === monthData.year && (today.getMonth() + 1) === monthData.monthNumber);
      setSelectedDay(prev => {
        if (!prev || prev < 1 || prev > (monthData.daysInMonth || 31)) {
          return isCurrent ? today.getDate() : 1;
        }
        return prev;
      });
    }
  }, [monthData, currentMonth]);

  const {
    year = today.getFullYear(),
    monthNumber = today.getMonth() + 1,
    daysInMonth = 30,
    firstDayOfWeek = 0, // 0 = Lunes, 6 = Domingo
    dailyBreakdown = {},
    items = [],
    totalIncome = 0,
    totalExpenses = 0
  } = (monthData || {});

  const isCurrentViewingMonth = today.getFullYear() === year && (today.getMonth() + 1) === monthNumber;
  const currentDayNumber = today.getDate();

  const leadingBlanks = Array.from({ length: Math.max(0, firstDayOfWeek) }, (_, i) => i);
  const days = Array.from({ length: Math.max(1, daysInMonth) }, (_, i) => i + 1);

  const formattedMonthLabel = useMemo(() => {
    if (!year || !monthNumber) return '';
    const d = new Date(year, monthNumber - 1, 1);
    return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }, [year, monthNumber]);

  // Days that have items for Agenda view
  const daysWithItems = useMemo(() => {
    const list = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const data = dailyBreakdown[d];
      if (data && data.items && data.items.length > 0) {
        list.push(data);
      }
    }
    return list;
  }, [dailyBreakdown, daysInMonth]);

  const formatEuro = (val) => {
    const num = Number(val) || 0;
    return num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatEuroBadge = (val) => {
    const num = Number(val) || 0;
    if (Number.isInteger(num)) {
      return num.toLocaleString('es-ES', { maximumFractionDigits: 0 });
    }
    return num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getItemCategoryType = (item) => {
    if (!item) return 'everyday';
    if (item.type === 'ingreso') return 'income';
    const title = (item.title || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    if (item.loanId || title.includes('hipoteca') || title.includes('préstamo') || title.includes('prestamo')) {
      return 'mortgage';
    }
    const insuranceKeywords = [
      'seguro', 'póliza', 'poliza', 'mutua', 'mapfre', 'allianz', 'axa', 
      'sanitas', 'adeslas', 'pelayo', 'zurich', 'caser', 'linea directa', 
      'línea directa', 'ocaso', 'santa lucia', 'santa lucía', 'netflix', 'spotify'
    ];
    if (cat.includes('seguro') || cat.includes('suscrip') || insuranceKeywords.some(kw => title.includes(kw) || cat.includes(kw))) {
      return 'insurance';
    }
    if (cat.includes('vivienda') || cat.includes('alquiler') || cat.includes('comunidad')) {
      return 'mortgage';
    }
    if (cat.includes('suministro') || cat.includes('comunica') || title.includes('luz') || title.includes('agua') || title.includes('gas') || title.includes('fibra')) {
      return 'utilities';
    }
    return 'everyday';
  };

  const getItemIcon = (item) => {
    const type = getItemCategoryType(item);
    if (type === 'income') return <Briefcase className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />;
    if (type === 'mortgage') return <Home className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />;
    if (type === 'insurance') return <ShieldCheck className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />;
    if (type === 'utilities') return <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />;
    return <ShoppingCart className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />;
  };

  // Open action sheet for an item
  const handleOpenActionSheet = (item, e) => {
    if (e) e.stopPropagation();
    setActionItem(item);
    setShowDeleteOptions(false);
    setTargetDayInput(item.dayOfMonth || 1);
  };

  // Confirm moving day via modal
  const handleConfirmMove = (targetDay) => {
    const day = targetDay !== undefined ? targetDay : targetDayInput;
    if (actionItem && onMoveItemDay) {
      onMoveItemDay(actionItem.id, day);
      setSelectedDay(day);
      confetti({ particleCount: 35, spread: 55, origin: { y: 0.7 } });
    }
    setActionItem(null);
    setDraggingItem(null);
  };

  // Drag and drop event handlers
  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: item.id, title: item.title, dayOfMonth: item.dayOfMonth }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingItem(item);
  };

  const handleDragEnd = () => {
    setDraggingItem(null);
    setDragOverDay(null);
  };

  const handleDragOver = (e, dayNum) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDay !== dayNum) {
      setDragOverDay(dayNum);
    }
  };

  const handleDragLeave = (dayNum) => {
    if (dragOverDay === dayNum) {
      setDragOverDay(null);
    }
  };

  const handleDropOnDay = (e, targetDay) => {
    e.preventDefault();
    setDragOverDay(null);
    let itemToMove = draggingItem;
    try {
      const raw = e.dataTransfer.getData('text/plain');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.id) itemToMove = parsed;
      }
    } catch {
      // fallback to draggingItem
    }

    if (itemToMove?.id && onMoveItemDay) {
      onMoveItemDay(itemToMove.id, targetDay);
      setSelectedDay(targetDay);
      confetti({ particleCount: 35, spread: 55, origin: { y: 0.6 } });
    }
    setDraggingItem(null);
  };

  // Quick Add submit for a day
  const handleQuickSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanAmt = parseFloat(String(quickAmount).replace(',', '.'));
    if (!quickTitle.trim() || isNaN(cleanAmt) || cleanAmt <= 0) return;
    setQuickSaving(true);
    try {
      if (onQuickAddTx) {
        await onQuickAddTx({
          title: quickTitle.trim(),
          amount: cleanAmt,
          type: quickType,
          dayOfMonth: quickAddDay || selectedDay || 1,
          frequency: quickFrequency
        });
        setQuickTitle('');
        setQuickAmount('');
        setQuickAddDay(null);
        confetti({ particleCount: 35, spread: 55, origin: { y: 0.6 } });
      } else if (onOpenAddTx) {
        onOpenAddTx({ dayOfMonth: quickAddDay || selectedDay || 1 });
      }
    } catch (err) {
      alert('Error creando concepto: ' + (err.message || 'Error desconocido'));
    } finally {
      setQuickSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 w-full">
      
      {/* 1. SELECTOR SUPERIOR CON VISTAS: CUADRÍCULA | AGENDA | MULTIMES (iOS 27 SEGMENTED CONTROLLER) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-1 p-1 bg-white/[0.04] rounded-2xl border border-white/10 shadow-inner w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 whitespace-nowrap ${
              viewMode === 'grid'
                ? 'bg-amber-400 text-slate-950 font-black shadow-[0_4px_16px_rgba(255,159,10,0.35)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Cuadrícula</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('agenda')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 whitespace-nowrap ${
              viewMode === 'agenda'
                ? 'bg-amber-400 text-slate-950 font-black shadow-[0_4px_16px_rgba(255,159,10,0.35)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Lista por Días ({daysWithItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 whitespace-nowrap ${
              viewMode === 'month'
                ? 'bg-amber-400 text-slate-950 font-black shadow-[0_4px_16px_rgba(255,159,10,0.35)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Evolución Anual</span>
          </button>
        </div>

        {viewMode !== 'month' && (
          <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto">
            <span className="text-xs text-slate-400 font-mono hidden md:inline">
              {items.length} movimientos
            </span>
            <span className="font-bold text-white capitalize bg-white/[0.05] px-3 py-1.5 rounded-xl border border-white/10 shadow-sm text-xs sm:text-sm">
              {formattedMonthLabel}
            </span>
          </div>
        )}
      </div>

      {/* 2. SI ESTÁ ACTIVA LA VISTA POR MES (EVOLUCIÓN MULTIMES) */}
      {viewMode === 'month' ? (
        <React.Suspense fallback={
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
            <div className="h-44 rounded-[28px] glass-ios border border-white/10" />
            <div className="h-44 rounded-[28px] glass-ios border border-white/10" />
            <div className="h-44 rounded-[28px] glass-ios border border-white/10" />
          </div>
        }>
          <FinanceYearView
            api={api}
            currentMonth={currentMonth}
            onSelectMonth={(selectedMonthStr) => {
              if (onSelectMonth) onSelectMonth(selectedMonthStr);
              setViewMode('grid');
            }}
          />
        </React.Suspense>
      ) : viewMode === 'agenda' ? (
        /* 3. VISTA AGENDA / LISTA POR DÍAS (IDEAL PARA TABLET VERTICAL Y LECTURA CÓMODA) */
        <div className="space-y-3 w-full">
          {daysWithItems.length === 0 ? (
            <div className="glass-ios p-8 rounded-[32px] border border-white/10 text-center space-y-3">
              <CalendarIcon className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-base font-bold text-white font-display">
                No hay movimientos registrados en {formattedMonthLabel}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Puedes añadir cobros, nóminas o gastos pulsando el botón "+ Nuevo" superior o en la vista Cuadrícula.
              </p>
            </div>
          ) : (
            daysWithItems.map(dayData => {
              const dNum = dayData.day;
              const dDate = new Date(year, monthNumber - 1, dNum);
              const dayOfWeekStr = dDate.toLocaleDateString('es-ES', { weekday: 'long' });
              const isToday = isCurrentViewingMonth && dNum === currentDayNumber;

              return (
                <div 
                  key={`agenda-day-${dNum}`}
                  className={`glass-ios p-3.5 sm:p-5 rounded-[26px] sm:rounded-[30px] border transition-all space-y-3 shadow-ambient-sm ${
                    isToday
                      ? 'border-amber-400/50 bg-amber-500/[0.05] ring-1 ring-amber-400/30'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Cabecera del Día en Lista */}
                  <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/8 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-9 h-9 rounded-2xl font-mono font-black text-sm flex items-center justify-center ${
                        isToday ? 'bg-amber-400 text-slate-950 shadow-sm' : 'bg-white/10 text-white'
                      }`}>
                        {dNum}
                      </span>
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-white capitalize font-display flex items-center gap-2">
                          <span>{dayOfWeekStr}, {dNum} de {formattedMonthLabel}</span>
                          {isToday && (
                            <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                              Hoy
                            </span>
                          )}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {dayData.dayIncome > 0 && (
                        <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-xl border border-emerald-500/25">
                          +{formatEuro(dayData.dayIncome)}€
                        </span>
                      )}
                      {dayData.dayExpenses > 0 && (
                        <span className="text-xs font-mono font-bold text-rose-300 bg-rose-500/15 px-2.5 py-1 rounded-xl border border-rose-500/25">
                          -{formatEuro(dayData.dayExpenses)}€
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setQuickAddDay(dNum)}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-amber-400 hover:text-slate-950 text-slate-300 flex items-center justify-center transition-all"
                        title="Añadir a este día"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Lista de Conceptos de este Día con Ancho Completo */}
                  <div className="space-y-2">
                    {dayData.items.map(item => {
                      const isExpense = item.type === 'gasto';

                      return (
                        <div
                          key={`agenda-item-${item.id}`}
                          onClick={(e) => handleOpenActionSheet(item, e)}
                          className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all cursor-pointer select-none active:scale-[0.99] ${
                            item.paid
                              ? 'bg-white/[0.02] border-white/5 opacity-70'
                              : isExpense
                              ? 'bg-rose-500/[0.06] border-rose-500/20 hover:border-rose-400/40'
                              : 'bg-emerald-500/[0.06] border-emerald-500/20 hover:border-emerald-400/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Checkmark táctil */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onTogglePaid) onTogglePaid(item);
                              }}
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border transition-all flex-shrink-0 ${
                                item.paid
                                  ? 'bg-emerald-400 border-emerald-400 text-slate-950 font-black shadow-sm'
                                  : 'border-white/30 hover:border-amber-400 text-transparent'
                              }`}
                              title={item.paid ? 'Marcado (clic para desmarcar)' : 'Marcar como pagado'}
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                            </button>

                            <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                              {getItemIcon(item)}
                            </div>

                            <div className="min-w-0">
                              <p className={`text-sm font-bold truncate font-display ${
                                item.paid ? 'line-through text-slate-400' : 'text-white'
                              }`}>
                                {item.title}
                              </p>
                              <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                                <span>{item.category}</span>
                                <span>•</span>
                                <span className={item.paid ? 'text-emerald-400 font-bold' : 'text-amber-300 font-semibold'}>
                                  {item.paid ? '✓ Listo' : '⏳ Pendiente'}
                                </span>
                                {item.activeRateStep && (
                                  <>
                                    <span>•</span>
                                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/25">
                                      {item.activeRateStep.name || 'Tramo cuota'}
                                    </span>
                                  </>
                                )}
                                {Array.isArray(item.activeMonths) && item.activeMonths.length < 12 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/15 px-1.5 py-0.5 rounded border border-indigo-500/25">
                                      {item.activeMonths.length} de 12 meses
                                    </span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                            <span className={`text-sm sm:text-base font-mono font-black ${
                              isExpense ? 'text-rose-300' : 'text-emerald-300'
                            }`}>
                              {isExpense ? '-' : '+'}{formatEuro(item.amount)}€
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleOpenActionSheet(item, e)}
                              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
                              title="Opciones"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* 4. CALENDARIO CUADRÍCULA CON ERGONOMÍA ANTI-SUPERPOSICIÓN (2 FILAS POR TARJETA) */
        <div className="space-y-4 w-full">
          
          {/* BANNER CUANDO SE ESTÁ MOVIENDO UN ÍTEM TOCANDO EL CALENDARIO */}
          <AnimatePresence>
            {draggingItem && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/20 backdrop-blur-2xl border border-amber-400/60 shadow-[0_4px_24px_rgba(255,159,10,0.3)] flex items-center justify-between gap-3 text-amber-200"
              >
                <div className="flex items-center gap-2.5 min-w-0 text-xs sm:text-sm font-bold font-display">
                  <Sparkles className="w-5 h-5 text-amber-400 animate-spin flex-shrink-0" />
                  <span className="truncate">
                    Moviendo: <strong className="text-white font-extrabold">{draggingItem.title}</strong>
                  </span>
                  <span className="text-xs text-amber-300 font-normal hidden sm:inline">
                    👉 Toca o suelta en cualquier casilla del calendario para cambiar su fecha.
                  </span>
                </div>
                <button
                  onClick={() => {
                    setDraggingItem(null);
                    setDragOverDay(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white active:scale-95 transition-all flex-shrink-0"
                >
                  Cancelar
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CONTENEDOR DEL CALENDARIO CON PADDING OPTIMIZADO Y WRAPPER DE SEGURIDAD */}
          <div className="w-full glass-ios p-2.5 sm:p-4 md:p-5 lg:p-6 rounded-[28px] sm:rounded-[34px] border border-white/12 shadow-ambient space-y-3 sm:space-y-4">
            
            {/* Wrapper de desplazamiento horizontal suave para pantallas muy estrechas */}
            <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
              <div className="min-w-[620px] sm:min-w-full">
                
                {/* Cabecera de Días de la Semana */}
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2 mb-1.5 sm:mb-2">
                  {WEEKDAYS.map((w, idx) => (
                    <div 
                      key={w} 
                      className={`text-center py-1.5 px-1 text-[11px] sm:text-xs font-bold uppercase tracking-wider font-display rounded-xl ${
                        idx >= 5 
                          ? 'text-amber-400/90 bg-amber-500/[0.04] border border-amber-500/10' 
                          : 'text-slate-400 bg-white/[0.02] border border-white/5'
                      }`}
                    >
                      {w}
                    </div>
                  ))}
                </div>

                {/* Cuadrícula de Casillas del Mes (7 Columnas) */}
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2">
                  
                  {/* Casillas en blanco de inicio de mes */}
                  {leadingBlanks.map(blankIdx => (
                    <div 
                      key={`blank-${blankIdx}`} 
                      className="min-h-[145px] sm:min-h-[165px] md:min-h-[185px] lg:min-h-[205px] rounded-[18px] sm:rounded-[22px] md:rounded-[26px] bg-white/[0.01] border border-white/[0.03] opacity-20 pointer-events-none"
                    />
                  ))}

                  {/* Días del Mes */}
                  {days.map(dayNum => {
                    const dayData = dailyBreakdown ? dailyBreakdown[dayNum] : null;
                    const dayItems = dayData?.items || [];
                    const isToday = isCurrentViewingMonth && dayNum === currentDayNumber;
                    const isSelected = selectedDay === dayNum;
                    const isDragOver = dragOverDay === dayNum;
                    const isTargetForMove = Boolean(draggingItem);
                    const hasIncome = (dayData?.dayIncome || 0) > 0;
                    const hasExpenses = (dayData?.dayExpenses || 0) > 0;
                    const hasPending = dayItems.some(i => !i.paid);

                    return (
                      <div
                        key={`day-${dayNum}`}
                        onClick={() => {
                          if (draggingItem && onMoveItemDay) {
                            onMoveItemDay(draggingItem.id, dayNum);
                            setSelectedDay(dayNum);
                            setDraggingItem(null);
                            setDragOverDay(null);
                            confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
                            return;
                          }
                          setSelectedDay(dayNum);
                        }}
                        onDragOver={(e) => handleDragOver(e, dayNum)}
                        onDragLeave={() => handleDragLeave(dayNum)}
                        onDrop={(e) => handleDropOnDay(e, dayNum)}
                        className={`relative min-h-[145px] sm:min-h-[165px] md:min-h-[185px] lg:min-h-[205px] h-auto p-1.5 sm:p-2 rounded-[18px] sm:rounded-[22px] md:rounded-[26px] border transition-all duration-200 flex flex-col justify-between overflow-hidden group ${
                          isDragOver
                            ? 'bg-amber-500/30 border-amber-400 ring-2 ring-amber-400 shadow-[0_0_30px_rgba(255,159,10,0.35)] scale-[1.02] z-30'
                            : isTargetForMove
                            ? 'bg-amber-500/[0.06] border-amber-400/40 hover:border-amber-400 hover:bg-amber-500/15 cursor-pointer shadow-sm'
                            : isSelected
                            ? 'bg-white/[0.06] border-amber-400/80 ring-1 ring-amber-400/50 shadow-[0_0_20px_rgba(255,159,10,0.15)] z-10'
                            : isToday 
                            ? 'bg-amber-500/[0.08] border-amber-400/50 shadow-sm' 
                            : dayItems.length > 0 
                            ? 'bg-white/[0.035] border-white/10 hover:border-white/25 hover:bg-white/[0.06]' 
                            : 'bg-white/[0.015] border-white/[0.05] hover:border-white/15'
                        }`}
                      >
                        
                        {/* PARTE SUPERIOR DE LA CASILLA: NÚMERO DE DÍA + BOTÓN AÑADIR */}
                        <div className="flex items-center justify-between gap-1 pb-1 border-b border-white/5 flex-shrink-0">
                          
                          <div className="flex items-center gap-1 min-w-0">
                            <span className={`text-xs sm:text-sm font-mono font-black px-1.5 sm:px-2 py-0.5 rounded-lg transition-all ${
                              isToday
                                ? 'bg-amber-400 text-slate-950 shadow-sm'
                                : isSelected
                                ? 'bg-white/20 text-white border border-white/20'
                                : 'text-slate-200'
                            }`}>
                              {dayNum}
                            </span>

                            {isToday && (
                              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-amber-300 font-display">
                                Hoy
                              </span>
                            )}
                          </div>

                          {/* Botón Rápido de Añadir a este día */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickAddDay(dayNum);
                              setSelectedDay(dayNum);
                              setQuickTitle('');
                              setQuickAmount('');
                            }}
                            className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-md bg-white/5 hover:bg-amber-400 hover:text-slate-950 text-slate-400 flex items-center justify-center transition-all opacity-70 group-hover:opacity-100 flex-shrink-0"
                            title={`Añadir concepto al día ${dayNum}`}
                          >
                            <Plus className="w-3 h-3 stroke-[2.5]" />
                          </button>

                        </div>

                        {/* OVERLAY CUANDO SE ARRASTRA DIRECTAMENTE SOBRE ESTA CASILLA */}
                        {isDragOver && (
                          <div className="absolute inset-0 rounded-[18px] sm:rounded-[22px] md:rounded-[26px] bg-amber-500/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-none z-30 p-2 text-center">
                            <span className="text-xs font-black text-slate-950 bg-amber-400 px-3 py-1 rounded-xl shadow-lg border border-white/50">
                              Soltar en día {dayNum}
                            </span>
                          </div>
                        )}

                        {/* CUERPO CENTRAL DE LA CASILLA: TARJETAS EN 2 FILAS (FILA 1: STATUS & IMPORTE, FILA 2: TÍTULO COMPLETO) */}
                        <div className="flex-1 my-1 space-y-1.5 overflow-y-auto max-h-[110px] sm:max-h-[130px] md:max-h-[150px] pr-0.5 no-scrollbar">
                          {dayItems.length === 0 ? (
                            <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-40 transition-opacity py-3">
                              <span className="text-[9.5px] text-slate-500 font-mono">Vacío</span>
                            </div>
                          ) : (
                            dayItems.map(item => {
                              const isExpense = item.type === 'gasto';
                              const isBeingDragged = draggingItem?.id === item.id;

                              return (
                                <div
                                  key={item.id}
                                  draggable={true}
                                  onDragStart={(e) => handleDragStart(e, item)}
                                  onDragEnd={handleDragEnd}
                                  onClick={(e) => handleOpenActionSheet(item, e)}
                                  className={`p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] ${
                                    isBeingDragged
                                      ? 'opacity-30 border-dashed border-amber-400 bg-amber-500/20'
                                      : item.paid
                                      ? 'bg-white/[0.02] border-white/5 opacity-65 hover:opacity-90'
                                      : isExpense
                                      ? 'bg-rose-500/[0.08] border-rose-500/25 hover:border-rose-400/50 hover:bg-rose-500/[0.12]'
                                      : 'bg-emerald-500/[0.08] border-emerald-500/25 hover:border-emerald-400/50 hover:bg-emerald-500/[0.12]'
                                  }`}
                                  title={`${item.title}: ${isExpense ? '-' : '+'}${formatEuro(item.amount)}€ (${item.paid ? 'Pagado' : 'Pendiente'}). Clic para opciones.`}
                                >
                                  {/* FILA 1: Checkbox + Icono + Importe destacado a la derecha */}
                                  <div className="flex items-center justify-between gap-1 w-full pb-0.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (onTogglePaid) onTogglePaid(item);
                                        }}
                                        className={`w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full flex items-center justify-center border transition-all flex-shrink-0 ${
                                          item.paid
                                            ? 'bg-emerald-400 border-emerald-400 text-slate-950 font-black shadow-sm'
                                            : 'border-white/30 hover:border-amber-400 text-transparent'
                                        }`}
                                        title={item.paid ? 'Marcado (clic para desmarcar)' : 'Marcar como pagado'}
                                      >
                                        <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
                                      </button>

                                      <span className="flex-shrink-0">
                                        {getItemIcon(item)}
                                      </span>
                                    </div>

                                    {/* Importe en cápsula compacta y clara */}
                                    <span className={`text-[10px] sm:text-[11px] font-mono font-black px-1.5 py-0.2 rounded-md flex-shrink-0 ${
                                      isExpense
                                        ? (item.paid ? 'text-slate-400 bg-white/[0.04]' : 'text-rose-300 bg-rose-500/15')
                                        : (item.paid ? 'text-slate-400 bg-white/[0.04]' : 'text-emerald-300 bg-emerald-500/15')
                                    }`}>
                                      {isExpense ? '-' : '+'}{formatEuroBadge(item.amount)}€
                                    </span>
                                  </div>

                                  {/* FILA 2: TÍTULO COMPLETO CON ANCHO COMPLETO (HASTA 2 LÍNEAS, SIN CORTAR) */}
                                  <div className="w-full mt-0.5">
                                    <p 
                                      className={`text-[10.5px] sm:text-xs font-bold leading-snug line-clamp-2 break-words font-display ${
                                        item.paid ? 'line-through text-slate-400' : 'text-slate-100'
                                      }`}
                                    >
                                      {item.title}
                                    </p>
                                    {(item.activeRateStep || (Array.isArray(item.activeMonths) && item.activeMonths.length < 12)) && (
                                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                        {item.activeRateStep && (
                                          <span className="text-[8px] sm:text-[9px] font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                            {item.activeRateStep.name || 'Tramo cuota'}
                                          </span>
                                        )}
                                        {Array.isArray(item.activeMonths) && item.activeMonths.length < 12 && (
                                          <span className="text-[8px] sm:text-[9px] font-bold px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                            {item.activeMonths.length}/12m
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* PARTE INFERIOR DE LA CASILLA: RESUMEN DEL DÍA (+INGRESOS | -GASTOS) */}
                        {(hasIncome || hasExpenses) ? (
                          <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[9px] sm:text-[10px] font-mono font-bold flex-shrink-0">
                            {hasIncome ? (
                              <span className="text-emerald-300 truncate">
                                +{formatEuroBadge(dayData.dayIncome)}€
                              </span>
                            ) : <span />}
                            {hasExpenses && (
                              <span className={`${hasPending ? 'text-amber-300' : 'text-slate-400'} truncate`}>
                                -{formatEuroBadge(dayData.dayExpenses)}€
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="h-2 flex-shrink-0" />
                        )}

                      </div>
                    );
                  })}

                </div>

              </div>
            </div>

            {/* PIE DE PÁGINA INFORMATIVO DEL CALENDARIO */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 border-t border-white/10">
              <p className="flex items-center gap-1.5 flex-wrap">
                <span>💡 <strong>Consejo:</strong> En tablet puedes usar <strong>"Lista por Días"</strong> arriba para ver todos los conceptos con ancho expandido.</span>
              </p>
              <div className="flex items-center gap-3 font-mono font-bold">
                <span className="text-emerald-300">Ingresos: +{formatEuro(totalIncome)}€</span>
                <span className="text-rose-400">Gastos: -{formatEuro(totalExpenses)}€</span>
              </div>
            </div>

          </div>

          {/* MODAL 1: ACCIONES DEL CONCEPTO (EDITAR / MOVER DE DÍA / ELIMINAR) */}
          <AnimatePresence>
            {actionItem && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="glass-ios-elevated p-6 rounded-[32px] border border-white/20 shadow-glass-ambient max-w-md w-full space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center flex-shrink-0">
                        {getItemIcon(actionItem)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-base font-extrabold text-white truncate font-display">
                          {actionItem.title}
                        </h4>
                        <p className="text-xs text-slate-400 font-mono">
                          Importe: <span className="font-bold text-white">{formatEuro(actionItem.amount)}€</span> • Día {actionItem.dayOfMonth}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActionItem(null)}
                      className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Opción A: Mover tocando cualquier día del calendario */}
                  <button
                    type="button"
                    onClick={() => {
                      const it = actionItem;
                      setActionItem(null);
                      setDraggingItem(it);
                    }}
                    className="w-full min-h-[46px] px-4 py-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                    <span>Mover tocando una casilla del calendario</span>
                  </button>

                  {/* Opción B: Selector Numérico de Día Rápido (1 al 31) */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-display">
                      <CalendarIcon className="w-4 h-4 text-cyan-400" />
                      <span>O pulsa el día del mes al que quieres moverlo:</span>
                    </span>
                    <div className="grid grid-cols-7 gap-1.5 max-h-[140px] overflow-y-auto p-1">
                      {days.map(d => (
                        <button
                          key={`target-day-${d}`}
                          type="button"
                          onClick={() => handleConfirmMove(d)}
                          className={`py-1.5 rounded-xl text-xs font-mono font-bold transition-all active:scale-95 ${
                            actionItem.dayOfMonth === d
                              ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-amber-400'
                              : 'bg-white/10 hover:bg-cyan-500 hover:text-slate-950 text-white'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Opción C: Editar Importe y Detalles */}
                  <button
                    type="button"
                    onClick={() => {
                      const itemToEdit = actionItem;
                      setActionItem(null);
                      if (onEditItem) onEditItem(itemToEdit);
                    }}
                    className="w-full min-h-[46px] px-4 py-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/12 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Edit3 className="w-4 h-4 text-amber-400" />
                    <span>Modificar Importe o Datos</span>
                  </button>

                  {/* Opción D: Eliminar Concepto con selector claro */}
                  {!showDeleteOptions ? (
                    <button
                      type="button"
                      onClick={() => setShowDeleteOptions(true)}
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                      <span>Eliminar este concepto...</span>
                    </button>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-2.5">
                      <div className="flex items-center justify-between pb-1 border-b border-rose-500/20">
                        <span className="text-xs font-black text-rose-300 flex items-center gap-1.5 font-display">
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>¿Cómo deseas eliminarlo?</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowDeleteOptions(false)}
                          className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded-lg bg-white/5"
                        >
                          ✕ Cancelar
                        </button>
                      </div>

                      {actionItem.isRecurring ? (
                        <div className="space-y-2 pt-1">
                          {/* Opción 1: Solo este mes */}
                          <button
                            type="button"
                            onClick={() => {
                              const it = actionItem;
                              setActionItem(null);
                              setShowDeleteOptions(false);
                              if (onDeleteItem) onDeleteItem(it, 'this_month');
                            }}
                            className="w-full p-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-left transition-all active:scale-95 flex items-center justify-between group"
                          >
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                <CalendarIcon className="w-3.5 h-3.5 text-amber-400" />
                                <span>Eliminar SOLO de este mes</span>
                              </div>
                              <p className="text-[10px] text-rose-200/70 mt-0.5">
                                No se cobrará en {formattedMonthLabel}. Se mantiene en los demás meses.
                              </p>
                            </div>
                            <span className="text-xs text-rose-300 font-bold group-hover:translate-x-0.5 transition-transform whitespace-nowrap ml-2">
                              Este mes →
                            </span>
                          </button>

                          {/* Opción 2: Todos los meses */}
                          <button
                            type="button"
                            onClick={() => {
                              const it = actionItem;
                              setActionItem(null);
                              setShowDeleteOptions(false);
                              if (onDeleteItem) onDeleteItem(it, 'all');
                            }}
                            className="w-full p-2.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/40 border border-rose-500/50 text-left transition-all active:scale-95 flex items-center justify-between group"
                          >
                            <div>
                              <div className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
                                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                <span>Eliminar regla para TODOS los meses</span>
                              </div>
                              <p className="text-[10px] text-rose-300/60 mt-0.5">
                                Borra la regla fija definitivamente de la base de datos.
                              </p>
                            </div>
                            <span className="text-xs text-rose-300 font-bold group-hover:translate-x-0.5 transition-transform whitespace-nowrap ml-2">
                              Todos →
                            </span>
                          </button>

                          {/* Opción 3 (si está sobreescrito): Restablecer regla original */}
                          {actionItem.isOverridden && (
                            <button
                              type="button"
                              onClick={() => {
                                const it = actionItem;
                                setActionItem(null);
                                setShowDeleteOptions(false);
                                if (onDeleteItem) onDeleteItem(it, 'restore');
                              }}
                              className="w-full p-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-left transition-all active:scale-95 flex items-center justify-between group"
                            >
                              <div>
                                <div className="text-xs font-bold text-cyan-200 flex items-center gap-1.5">
                                  <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>Restablecer regla original</span>
                                </div>
                                <p className="text-[10px] text-cyan-200/60 mt-0.5">
                                  Quita el ajuste de este mes y vuelve al valor original ({formatEuro(actionItem.originalAmount || actionItem.amount)}€).
                                </p>
                              </div>
                              <span className="text-xs text-cyan-300 font-bold group-hover:translate-x-0.5 transition-transform whitespace-nowrap ml-2">
                                Restablecer
                              </span>
                            </button>
                          )}
                        </div>
                      ) : (
                        /* Para conceptos puntuales */
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const it = actionItem;
                              setActionItem(null);
                              setShowDeleteOptions(false);
                              if (onDeleteItem) onDeleteItem(it, 'all');
                            }}
                            className="w-full p-2.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/40 border border-rose-500/50 text-left transition-all active:scale-95 flex items-center justify-between group"
                          >
                            <div>
                              <div className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
                                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                <span>Eliminar definitivamente</span>
                              </div>
                              <p className="text-[10px] text-rose-300/60 mt-0.5">
                                Este concepto puntual desaparecerá del calendario.
                              </p>
                            </div>
                            <span className="text-xs text-rose-300 font-bold group-hover:translate-x-0.5 transition-transform whitespace-nowrap ml-2">
                              Eliminar
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* MODAL 2: AÑADIR CONCEPTO DIRECTO A UN DÍA */}
          <AnimatePresence>
            {quickAddDay !== null && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <motion.form 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  onSubmit={handleQuickSubmit} 
                  className="glass-ios-elevated p-6 rounded-[32px] border border-amber-400/30 max-w-md w-full space-y-4 shadow-glass-ambient"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-sm font-black text-white font-display flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Añadir concepto al día {quickAddDay}</span>
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setQuickAddDay(null)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Tipo: Gasto o Ingreso */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-white/[0.04] rounded-2xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => setQuickType('gasto')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                        quickType === 'gasto'
                          ? 'bg-rose-500 text-white shadow-md font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🔴 Gasto (-€)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickType('ingreso')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                        quickType === 'ingreso'
                          ? 'bg-emerald-400 text-slate-950 shadow-md font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🟢 Ingreso (+€)
                    </button>
                  </div>

                  {/* Concepto e Importe */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">
                        Concepto / Nombre *
                      </label>
                      <input
                        type="text"
                        autoFocus
                        required
                        value={quickTitle}
                        onChange={(e) => setQuickTitle(e.target.value)}
                        placeholder={quickType === 'ingreso' ? 'Ej: Nómina, Extra, Transferencia...' : 'Ej: Mercadona, Luz, Cena...'}
                        className="glass-input rounded-2xl px-4 py-2.5 text-white text-sm focus:border-amber-400 outline-none w-full"
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
                          value={quickAmount}
                          onChange={(e) => setQuickAmount(e.target.value)}
                          placeholder="0,00"
                          className="glass-input rounded-2xl pl-4 pr-8 py-2.5 text-white font-mono font-bold text-base focus:border-amber-400 outline-none w-full"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-mono font-bold">
                          €
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Periodicidad: Solo este mes o recurrente */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setQuickFrequency('puntual')}
                      className={`p-2.5 rounded-xl border text-center transition-all active:scale-95 ${
                        quickFrequency === 'puntual'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                          : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      Solo este mes
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickFrequency('mensual')}
                      className={`p-2.5 rounded-xl border text-center transition-all active:scale-95 ${
                        quickFrequency === 'mensual'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                          : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      Todos los meses
                    </button>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const day = quickAddDay;
                        setQuickAddDay(null);
                        if (onOpenAddTx) onOpenAddTx({ dayOfMonth: day });
                      }}
                      className="text-xs text-slate-400 hover:text-amber-300 underline font-medium"
                    >
                      Formulario completo...
                    </button>

                    <button
                      type="submit"
                      disabled={quickSaving || !quickTitle || !quickAmount}
                      className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm shadow-[0_4px_16px_rgba(255,159,10,0.3)] active:scale-95 transition-all disabled:opacity-50"
                    >
                      {quickSaving ? 'Guardando...' : `Guardar en día ${quickAddDay}`}
                    </button>
                  </div>
                </motion.form>
              </div>
            )}
          </AnimatePresence>

        </div>
      )}

    </div>
  );
}

export default React.memo(FinanceCalendar);
