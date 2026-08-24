import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Clock, 
  AlertTriangle, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Modal from '../Modal';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function FinanceCalendar({ monthData, currentMonth, onTogglePaid, onOpenAddTx, onPrevMonth, onNextMonth, onCurrentMonth }) {
  const [selectedDay, setSelectedDay] = useState(null);

  if (!monthData) return null;

  const {
    year,
    monthNumber,
    daysInMonth,
    firstDayOfWeek, // 0 = Lunes, 6 = Domingo
    dailyBreakdown,
    totalIncome,
    totalExpenses,
    projectedBalance,
    pendingExpensesCount
  } = monthData;

  const today = new Date();
  const isCurrentViewingMonth = today.getFullYear() === year && (today.getMonth() + 1) === monthNumber;
  const currentDayNumber = today.getDate();

  // Create empty slots for padding before the 1st day of the month
  const leadingBlanks = Array.from({ length: firstDayOfWeek }, (_, i) => i);
  // Days array 1..daysInMonth
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const selectedDayData = selectedDay && dailyBreakdown ? dailyBreakdown[selectedDay] : null;

  const formattedMonthTitle = new Date(year, monthNumber - 1, 1).toLocaleDateString('es-ES', { 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="space-y-6">
      
      {/* Calendar Top Bar */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white capitalize font-display">
              Calendario de Vencimientos: {formattedMonthTitle}
            </h3>
            <p className="text-xs text-slate-400">
              {pendingExpensesCount > 0 
                ? `${pendingExpensesCount} pago(s) pendiente(s) por liquidar este mes` 
                : '✓ Todos los recibos y gastos de este mes están al día'}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-300">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Ingresos
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span> Gastos
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> Pendiente
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 font-semibold">
            <AlertTriangle className="w-3 h-3 text-red-400" /> Gran Desembolso
          </span>
        </div>
      </div>

      {/* CALENDAR GRID */}
      <div className="glass-panel p-3 sm:p-5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
          {WEEKDAYS.map((w, idx) => (
            <div 
              key={w} 
              className={`text-center py-2 text-xs font-bold uppercase tracking-wider font-display ${
                idx >= 5 ? 'text-amber-400/70' : 'text-slate-400'
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {/* Leading empty slots */}
          {leadingBlanks.map(blankIdx => (
            <div 
              key={`blank-${blankIdx}`} 
              className="min-h-[75px] sm:min-h-[110px] rounded-2xl bg-white/[0.02] border border-white/[0.03] opacity-30"
            />
          ))}

          {/* Days */}
          {days.map(dayNum => {
            const dayData = dailyBreakdown ? dailyBreakdown[dayNum] : null;
            const items = dayData?.items || [];
            const isToday = isCurrentViewingMonth && dayNum === currentDayNumber;
            const hasPending = dayData?.hasPending;
            const isHeavy = dayData?.isHeavyBillDay;
            const dayIncome = dayData?.dayIncome || 0;
            const dayExpenses = dayData?.dayExpenses || 0;

            return (
              <motion.div
                key={`day-${dayNum}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedDay(dayNum)}
                className={`relative min-h-[85px] sm:min-h-[115px] p-1.5 sm:p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                  isToday 
                    ? 'bg-amber-500/15 border-amber-400 shadow-glow-amber ring-2 ring-amber-400/40' 
                    : isHeavy
                    ? 'bg-rose-950/25 border-rose-500/40 hover:border-rose-400'
                    : items.length > 0 
                    ? 'bg-surface/90 border-white/10 hover:border-brand-400/50 hover:bg-surface' 
                    : 'bg-surface/40 border-white/5 hover:border-white/20'
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs sm:text-sm font-bold font-mono px-1.5 py-0.5 rounded-lg ${
                    isToday 
                      ? 'bg-amber-400 text-slate-950 font-black' 
                      : 'text-slate-300'
                  }`}>
                    {dayNum}
                  </span>

                  <div className="flex items-center gap-1">
                    {isHeavy && (
                      <span className="p-0.5 rounded bg-rose-500/30 text-rose-300" title="Día de gasto fuerte">
                        <AlertTriangle className="w-3 h-3" />
                      </span>
                    )}
                    {hasPending && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Pagos pendientes"></span>
                    )}
                  </div>
                </div>

                {/* Day Items List (mini badges) */}
                <div className="my-1 space-y-1 overflow-hidden">
                  {items.slice(0, 2).map((item) => (
                    <div
                      key={item.id}
                      className={`text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-md truncate font-medium flex items-center justify-between gap-1 ${
                        item.type === 'ingreso'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : item.paid
                          ? 'bg-slate-800/80 text-slate-400 border border-slate-700/50 line-through'
                          : 'bg-rose-500/20 text-rose-200 border border-rose-500/40'
                      }`}
                      title={`${item.title} (${item.amount}€) - ${item.paid ? 'Pagado' : 'Pendiente'}`}
                    >
                      <span className="truncate">{item.title}</span>
                      <span className="font-mono font-bold flex-shrink-0">
                        {item.type === 'ingreso' ? '+' : '-'}{Math.round(item.amount)}€
                      </span>
                    </div>
                  ))}

                  {items.length > 2 && (
                    <div className="text-[9px] sm:text-[10px] text-amber-300/90 font-bold text-center bg-white/5 rounded py-0.2">
                      +{items.length - 2} más...
                    </div>
                  )}
                </div>

                {/* Day Totals Footer */}
                <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                  {dayIncome > 0 ? (
                    <span className="text-emerald-400 font-bold truncate">+{Math.round(dayIncome)}€</span>
                  ) : <span></span>}
                  {dayExpenses > 0 && (
                    <span className="text-rose-400 font-bold truncate">-{Math.round(dayExpenses)}€</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* DAY DETAILS MODAL / SLIDE-OVER */}
      {selectedDay !== null && (
        <Modal 
          isOpen={true} 
          onClose={() => setSelectedDay(null)}
          title={`Agenda Financiera: Día ${selectedDay} de ${formattedMonthTitle}`}
        >
          <div className="space-y-4">
            
            {/* Header Totals of this day */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/20">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Ingresos del Día</span>
                <span className="text-xl font-bold font-mono text-white">+{selectedDayData?.dayIncome.toFixed(2) || 0}€</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/20">
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">Gastos del Día</span>
                <span className="text-xl font-bold font-mono text-white">-{selectedDayData?.dayExpenses.toFixed(2) || 0}€</span>
              </div>
            </div>

            {/* Items list */}
            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
              {(!selectedDayData || selectedDayData.items.length === 0) ? (
                <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10">
                  <Clock className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">No hay movimientos programados para el día {selectedDay}</p>
                  <p className="text-xs text-slate-500 mt-1">Puedes programar un gasto o cobro recurrente para este día.</p>
                </div>
              ) : (
                selectedDayData.items.map(item => {
                  const isExpense = item.type === 'gasto';

                  return (
                    <div 
                      key={item.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                        item.paid 
                          ? 'bg-surface/50 border-white/10' 
                          : isExpense 
                          ? 'bg-rose-950/20 border-rose-500/30 shadow-lg' 
                          : 'bg-emerald-950/20 border-emerald-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Checkbox button */}
                        <button
                          onClick={() => onTogglePaid(item)}
                          className={`min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center border-2 transition-all flex-shrink-0 touch-press ${
                            item.paid
                              ? 'bg-emerald-500 border-emerald-400 text-white shadow-glow-brand'
                              : 'border-slate-500 bg-black/40 text-transparent hover:border-slate-400'
                          }`}
                        >
                          <Check className={`w-5 h-5 stroke-[3] ${item.paid ? 'opacity-100' : 'opacity-0'}`} />
                        </button>

                        <div className="min-w-0">
                          <h4 className={`text-sm font-bold truncate ${item.paid ? 'line-through text-slate-400' : 'text-white'}`}>
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                            <span className="font-semibold text-slate-300">{item.category}</span>
                            <span>•</span>
                            <span className={item.paid ? 'text-emerald-400 font-bold' : 'text-amber-400 font-semibold'}>
                              {item.paid ? '✓ Pagado' : '⏳ Pendiente de cobro/pago'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className={`text-lg font-black font-mono ${
                          isExpense ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          {isExpense ? '-' : '+'}{item.amount.toFixed(2)}€
                        </span>
                        <span className="text-[10px] text-slate-500 block capitalize">{item.frequency}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Actions in modal */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedDay(null);
                  onOpenAddTx({ dayOfMonth: selectedDay });
                }}
                className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 touch-press shadow-lg shadow-amber-950/50"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir Movimiento en Día {selectedDay}</span>
              </button>
            </div>

          </div>
        </Modal>
      )}

    </div>
  );
}
