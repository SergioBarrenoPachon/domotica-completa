import React, { useState, useEffect, useCallback } from 'react';
import { 
  Landmark, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon, 
  Wallet,
  Layers,
  Sparkles
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import FinanceCalendar from '../components/finance/FinanceCalendar';

const AddExpenseModal = React.lazy(() => import('../components/finance/AddExpenseModal'));
const AdjustMonthModal = React.lazy(() => import('../components/finance/AdjustMonthModal'));
const ContractsAndRulesManager = React.lazy(() => import('../components/finance/ContractsAndRulesManager'));

function FinanceView({ api, onRefreshDashboard, refreshKey }) {
  // Current viewing month (YYYY-MM)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [monthData, setMonthData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Active View Tab: 'calendar' | 'contracts'
  const [activeTab, setActiveTab] = useState('calendar');
  const [calendarFilter, setCalendarFilter] = useState('all');


  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalConfig, setAddModalConfig] = useState({
    mode: 'recurring',
    category: 'Vivienda',
    type: 'gasto',
    title: '',
    frequency: 'mensual',
    dayOfMonth: 1,
    monthOfYear: 1
  });
  const [adjustModalItem, setAdjustModalItem] = useState(null);


  const loadMonthData = useCallback(async (monthKey) => {
    try {
      setLoading(true);
      const data = await api.getMonthFinance(monthKey);
      setMonthData(data);
    } catch (err) {
      console.error('Error cargando finanzas:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadMonthData(currentMonth);

    // Auto-refresh on focus/visibility
    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        loadMonthData(currentMonth);
      }
    };
    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);
    return () => {
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
    };
  }, [currentMonth, loadMonthData, refreshKey]);

  // Month navigation
  const handlePrevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const date = new Date(y, m - 2, 1);
    setCurrentMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const date = new Date(y, m, 1);
    setCurrentMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setCurrentMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  };

  // Toggle Paid / Cobrado checkbox
  const handleTogglePaid = async (item) => {
    try {
      const newPaid = !item.paid;
      await api.togglePaymentStatus(currentMonth, item.id, newPaid);
      if (newPaid) {
        confetti({ particleCount: 35, spread: 55, origin: { y: 0.7 } });
      }
      loadMonthData(currentMonth);
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      console.error('Error actualizando pago:', err);
    }
  };

  // Remove override
  const handleRemoveOverride = async (overrideId) => {
    try {
      await api.deleteMonthOverride(overrideId);
      loadMonthData(currentMonth);
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete transaction (support 'this_month' vs 'all' vs 'restore')
  const handleDeleteTx = async (itemOrId, mode = 'all') => {
    const id = typeof itemOrId === 'object' && itemOrId !== null ? itemOrId.id : itemOrId;
    const item = typeof itemOrId === 'object' && itemOrId !== null ? itemOrId : null;

    try {
      if (mode === 'restore') {
        if (item?.overrideId) {
          await api.deleteMonthOverride(item.overrideId);
        } else {
          await api.deleteMonthOverride(id);
        }
      } else if (mode === 'this_month') {
        await api.excludeTransactionFromMonth(id, currentMonth);
      } else {
        await api.deleteFinanceTransaction(id);
      }
      await loadMonthData(currentMonth);
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      console.error('Error al eliminar concepto:', err);
      alert('Error al eliminar: ' + (err.message || 'Error desconocido'));
    }
  };

  // Move item date for this specific month (handles both punctual and recurring)
  const handleMoveItemDay = async (itemId, targetDay) => {
    try {
      await api.moveTransactionDay(itemId, targetDay, currentMonth);
      await loadMonthData(currentMonth);
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      console.error('Error al mover día del concepto:', err);
    }
  };

  // Quick Add Transaction directly from Calendar day
  const handleQuickAddTx = async ({ title, amount, type, dayOfMonth, frequency, category }) => {
    try {
      const isIncome = type === 'ingreso';
      await api.addFinanceTransaction({
        title: title.trim(),
        amount: parseFloat(amount),
        type: isIncome ? 'ingreso' : 'gasto',
        category: category || (isIncome ? 'Nómina' : 'General'),
        frequency: frequency || 'puntual',
        dayOfMonth: Number(dayOfMonth) || 1,
        startDate: currentMonth,
        initialPaid: false
      });
      await loadMonthData(currentMonth);
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      console.error('Error in handleQuickAddTx:', err);
      throw err;
    }
  };

  const formattedMonthLabel = (() => {
    const [y, m] = currentMonth.split('-');
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  })();

  const totalIncome = monthData?.totalIncome || 0;
  const totalExpenses = monthData?.totalExpenses || 0;
  const paidIncome = monthData?.paidIncome || 0;
  const paidExpenses = monthData?.paidExpenses || 0;
  const projectedBalance = monthData?.projectedBalance || 0;
  const pendingExpensesTotal = monthData?.pendingExpensesTotal || 0;
  const pendingExpensesCount = monthData?.pendingExpensesCount || 0;

  // Dinero en Cuenta Real del mes (lo cobrado hasta hoy menos lo pagado/descontado hasta hoy)
  const currentAvailableMoney = paidIncome - paidExpenses;
  const formatMoney = (val) => (Number(val) || 0).toFixed(2);

  return (
    <div className="space-y-6 pb-28">
      
      {/* 1. HEADER CON NAVEGADOR DE MES */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight flex items-center gap-2.5">
            <span className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-300 flex items-center justify-center border border-amber-400/25 shadow-inner-light">
              <Landmark className="w-6 h-6" />
            </span>
            Economía & Tesorería
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Motor predictivo de pagos, control de nóminas, calendario de recibos y proyección de saldo.
          </p>
        </div>

        {/* NAVEGADOR MENSUAL + BOTÓN AÑADIR */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <div className="p-1 rounded-full bg-white/[0.05] border border-white/10 flex items-center gap-1 shadow-inner-light">
            <button
              onClick={handlePrevMonth}
              className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-white flex items-center justify-center touch-press transition-all"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleCurrentMonth}
              className="px-3.5 py-1 text-center min-w-[125px] touch-press"
              title="Tocar para ir al mes actual"
            >
              <span className="text-[9.5px] uppercase font-bold text-amber-400 block tracking-wider font-display">
                Mes Activo
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-white capitalize font-display tracking-tight">
                {formattedMonthLabel}
              </span>
            </button>

            <button
              onClick={handleNextMonth}
              className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-white flex items-center justify-center touch-press transition-all"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              setAddModalConfig({ mode: 'recurring', category: 'Vivienda', type: 'gasto', title: '', frequency: 'mensual', dayOfMonth: 1, monthOfYear: 1 });
              setAddModalOpen(true);
            }}
            className="min-h-touch px-4 sm:px-5 py-2.5 rounded-2xl bg-white/[0.12] hover:bg-white/[0.18] text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 border border-white/15 shadow-inner-light transition-all touch-press"
          >
            <Plus className="w-4 h-4 text-amber-400 stroke-[2.5]" />
            <span>+ Nuevo</span>
          </button>
        </div>
      </div>

      {/* SELECTOR DE VISTA: CALENDARIO (PRINCIPAL) vs CONTRATOS, PRÉSTAMOS Y FIJOS */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="p-1 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center gap-1 shadow-inner-light">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`min-h-[38px] px-4 sm:px-5 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all touch-press ${
              activeTab === 'calendar'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-400/25'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <CalendarIcon className="w-4 h-4 stroke-[2.2]" />
            <span>Calendario & Previsión</span>
          </button>

          <button
            onClick={() => setActiveTab('contracts')}
            className={`min-h-[38px] px-4 sm:px-5 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all touch-press ${
              activeTab === 'contracts'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-400/25'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Layers className="w-4 h-4 stroke-[2.2]" />
            <span>Contratos, Préstamos y Fijos</span>
          </button>
        </div>

        {activeTab === 'contracts' && (
          <span className="text-xs text-amber-300/80 font-medium hidden sm:inline-block">
            Modificaciones aquí se sincronizan al instante con el calendario
          </span>
        )}
      </div>

      {activeTab === 'calendar' ? (
        <>
          {/* 2. PANEL DE TESORERÍA (Estilo Apple Wallet / Apple Card) */}
          <div className="glass-ios p-5 sm:p-7 rounded-[32px] sm:rounded-[36px] border border-white/14 shadow-ambient space-y-4 sm:space-y-5 relative overflow-hidden">
            {/* Luz difusa ambiental ámbar iOS */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />
            
            {/* Saldo Disponible Hoy */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10 relative z-10">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-display">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  Dinero Disponible Hoy en Cuenta
                </span>
                <div className="flex items-baseline gap-3 mt-1.5">
                  <span className={`text-3xl sm:text-4xl md:text-5xl font-black font-mono tracking-tight ${
                    currentAvailableMoney >= 0 ? 'text-emerald-300 drop-shadow-[0_2px_12px_rgba(48,209,88,0.25)]' : 'text-rose-400 drop-shadow-[0_2px_12px_rgba(255,69,58,0.25)]'
                  }`}>
                    {currentAvailableMoney >= 0 ? `+${formatMoney(currentAvailableMoney)}€` : `${formatMoney(currentAvailableMoney)}€`}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    (Cobrado menos descontado hasta hoy)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  pendingExpensesCount === 0
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}>
                  {pendingExpensesCount === 0 ? '✓ Recibos al día' : `⏳ ${pendingExpensesCount} por pagar`}
                </span>
              </div>
            </div>

            {/* 3 Métricas Claras e Informativas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 relative z-10">
              <div className="p-4 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/8 shadow-inner-light">
                <span className="text-[10.5px] font-bold text-emerald-400 uppercase tracking-wider block font-display">
                  🟢 Total Ingresos
                </span>
                <p className="text-xl sm:text-2xl font-black font-mono text-white mt-1">
                  +{formatMoney(totalIncome)}€
                </p>
                <span className="text-[10.5px] text-slate-400 mt-0.5 block font-mono">
                  Cobrado: +{formatMoney(paidIncome)}€
                </span>
              </div>

              <div className="p-4 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/8 shadow-inner-light">
                <span className="text-[10.5px] font-bold text-amber-400 uppercase tracking-wider block font-display">
                  ⏳ Recibos Pendientes
                </span>
                <p className="text-xl sm:text-2xl font-black font-mono text-amber-300 mt-1">
                  -{formatMoney(pendingExpensesTotal)}€
                </p>
                <span className="text-[10.5px] text-slate-400 mt-0.5 block">
                  Pasarán por el banco este mes
                </span>
              </div>

              <div className="p-4 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/8 shadow-inner-light">
                <span className="text-[10.5px] font-bold text-cyan-400 uppercase tracking-wider block font-display">
                  🏁 Previsión Fin de Mes
                </span>
                <p className={`text-xl sm:text-2xl font-black font-mono mt-1 ${
                  projectedBalance >= 0 ? 'text-cyan-300' : 'text-rose-400'
                }`}>
                  {projectedBalance >= 0 ? `+${formatMoney(projectedBalance)}€` : `${formatMoney(projectedBalance)}€`}
                </p>
                <span className="text-[10.5px] text-slate-400 mt-0.5 block">
                  Saldo estimado a fin de mes
                </span>
              </div>
            </div>
          </div>

          {/* 3. CALENDARIO MENSUAL COMPLETO - CENTRO DE CONTROL FINANCIERO */}
          {monthData ? (
            <FinanceCalendar
              api={api}
              monthData={monthData}
              currentMonth={currentMonth}
              onSelectMonth={(m) => setCurrentMonth(m)}
              onTogglePaid={handleTogglePaid}
              onMoveItemDay={handleMoveItemDay}
              onQuickAddTx={handleQuickAddTx}
              onEditItem={(item) => setAdjustModalItem(item)}
              onDeleteItem={handleDeleteTx}
              initialFilter={calendarFilter}
              onOpenAddTx={({ dayOfMonth }) => {
                setAddModalConfig({ mode: 'recurring', category: 'General', type: 'gasto', title: '', frequency: 'mensual', dayOfMonth: dayOfMonth || 1, monthOfYear: 1 });
                setAddModalOpen(true);
              }}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onCurrentMonth={handleCurrentMonth}
            />
          ) : (
            <div className="glass-ios-elevated p-8 sm:p-12 rounded-[32px] border border-white/10 text-center space-y-4 animate-pulse">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-ios-amber/15 border border-ios-amber/30 flex items-center justify-center text-ios-amber shadow-sm">
                <CalendarIcon className="w-7 h-7 animate-spin" />
              </div>
              <p className="text-base sm:text-lg font-bold text-white tracking-tight">
                Cargando calendario interactivo...
              </p>
              <p className="text-xs text-white/50 max-w-sm mx-auto">
                Preparando desglose diario de cobros, recibos, hipoteca y saldo.
              </p>
            </div>
          )}
        </>
      ) : (
        <React.Suspense fallback={
          <div className="glass-ios p-12 text-center text-slate-400 space-y-3 rounded-3xl animate-pulse">
            <CalendarIcon className="w-8 h-8 animate-spin mx-auto text-amber-400" />
            <p className="font-bold text-white text-base">Cargando contratos y préstamos...</p>
          </div>
        }>
          <ContractsAndRulesManager
            api={api}
            currentMonth={currentMonth}
            onDataChanged={() => {
              loadMonthData(currentMonth);
              if (onRefreshDashboard) onRefreshDashboard();
            }}
          />
        </React.Suspense>
      )}



      {/* MODAL 1: AÑADIR CONCEPTO O RECIBO */}
      {addModalOpen && (
        <React.Suspense fallback={null}>
          <AddExpenseModal
            isOpen={true}
            onClose={() => setAddModalOpen(false)}
            api={api}
            currentMonth={currentMonth}
            initialMode={addModalConfig.mode}
            initialCategory={addModalConfig.category}
            initialType={addModalConfig.type}
            initialTitle={addModalConfig.title}
            initialFrequency={addModalConfig.frequency}
            initialMonthOfYear={addModalConfig.monthOfYear}
            initialDay={addModalConfig.dayOfMonth}
            onCreated={() => {
              loadMonthData(currentMonth);
              if (onRefreshDashboard) onRefreshDashboard();
            }}
          />
        </React.Suspense>
      )}

      {/* MODAL 2: EDITAR CONCEPTO / RECIBO / NÓMINA */}
      {adjustModalItem && (
        <React.Suspense fallback={null}>
          <AdjustMonthModal
            isOpen={true}
            onClose={() => setAdjustModalItem(null)}
            item={adjustModalItem}
            currentMonth={currentMonth}
            formattedMonthLabel={formattedMonthLabel}
            api={api}
            onSaved={() => {
              loadMonthData(currentMonth);
              if (onRefreshDashboard) onRefreshDashboard();
            }}
            onRemoveOverride={handleRemoveOverride}
            onDeleteItem={handleDeleteTx}
          />
        </React.Suspense>
      )}


    </div>
  );
}

export default React.memo(FinanceView);
