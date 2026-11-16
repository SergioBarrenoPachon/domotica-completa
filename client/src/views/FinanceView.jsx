import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Landmark,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Wallet,
  Layers,
  Sparkles,
  TrendingUp,
  Zap,
  Repeat,
  Coins,
  Check,
  Clock,
  ArrowRightLeft,
  CreditCard,
  ShieldCheck,
  ChevronDown,
  Info,
  CalendarDays,
  ListFilter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import FinanceCalendar from '../components/finance/FinanceCalendar';
import { notify } from '../components/feedback/feedback';

const AddExpenseModal = React.lazy(() => import('../components/finance/AddExpenseModal'));
const AdjustMonthModal = React.lazy(() => import('../components/finance/AdjustMonthModal'));
const IncomeManager = React.lazy(() => import('../components/finance/IncomeManager'));
const ExpensesManager = React.lazy(() => import('../components/finance/ExpensesManager'));
const LoansManager = React.lazy(() => import('../components/finance/LoansManager'));
const BankCardsCarousel = React.lazy(() => import('../components/finance/BankCardsCarousel'));
const TransferModal = React.lazy(() => import('../components/finance/TransferModal'));

function FinanceView({ api, onRefreshDashboard, refreshKey }) {
  // Current viewing month (YYYY-MM)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [monthData, setMonthData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Active View Tab: 'calendar' | 'incomes' | 'expenses' | 'loans'
  const [activeTab, setActiveTab] = useState('calendar');

  // Sub-view in Calendar: 'feed' (Día a Día / Previsión Rápida) | 'calendar' (Cuadrícula Mensual Completa)
  const [subView, setSubView] = useState('feed');

  // Account filter: null (todas) or 'acc-sabadell', 'acc-revolut', 'acc-ahorro'
  const [selectedAccountId, setSelectedAccountId] = useState(null);

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
  const [transferModalOpen, setTransferModalOpen] = useState(false);

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
      notify.error('Error al eliminar: ' + (err.message || 'Error desconocido'));
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
      const cleanAmount = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/\s+/g, '').replace('€', '').replace(',', '.'));
      await api.addFinanceTransaction({
        title: title.trim(),
        amount: isNaN(cleanAmount) ? 0 : cleanAmount,
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

  // Account balance update
  const handleUpdateAccountBalance = async (accId, newBalance) => {
    try {
      await api.updateBankAccount(accId, { balance: newBalance });
      await loadMonthData(currentMonth);
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      notify.error('Error actualizando saldo: ' + err.message);
    }
  };

  // Transfer submit
  const handleTransferSubmit = async (transferData) => {
    try {
      await api.transferBetweenAccounts(transferData);
      await loadMonthData(currentMonth);
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (err) {
      notify.error('Error en transferencia: ' + err.message);
      throw err;
    }
  };

  const formattedMonthLabel = useMemo(() => {
    const [y, m] = currentMonth.split('-');
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }, [currentMonth]);

  const totalIncome = monthData?.totalIncome || 0;
  const totalExpenses = monthData?.totalExpenses || 0;
  const paidIncome = monthData?.paidIncome || 0;
  const paidExpenses = monthData?.paidExpenses || 0;
  const projectedBalance = monthData?.projectedBalance || 0;
  const pendingExpensesTotal = monthData?.pendingExpensesTotal || 0;
  const pendingExpensesCount = monthData?.pendingExpensesCount || 0;
  const accountsSummary = monthData?.accountsSummary || [];
  const totalCashBalance = monthData?.totalCashBalance || accountsSummary.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  const formatMoney = (val) => {
    const num = Math.round((Number(val) || 0) * 100) / 100;
    return num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Encontrar el recibo o cuota de hipoteca del mes
  const mortgageItem = useMemo(() => {
    if (!monthData?.items) return null;
    return monthData.items.find(i => i.isMortgage || i.loanId || i.title?.toLowerCase().includes('hipoteca'));
  }, [monthData]);

  // Filtrado de movimientos por cuenta bancaria seleccionada
  const filteredItems = useMemo(() => {
    const items = monthData?.items || [];
    if (!selectedAccountId) return items;
    return items.filter(i => (i.accountId === selectedAccountId) || (!i.accountId && selectedAccountId === 'acc-sabadell'));
  }, [monthData, selectedAccountId]);

  // Próximos recibos a 7 días (para el feed diario)
  const upcoming7DaysItems = useMemo(() => {
    if (!monthData?.upcoming7Days) return [];
    if (!selectedAccountId) return monthData.upcoming7Days;
    return monthData.upcoming7Days.filter(i => (i.accountId === selectedAccountId) || (!i.accountId && selectedAccountId === 'acc-sabadell'));
  }, [monthData, selectedAccountId]);

  const selectedAccountObj = accountsSummary.find(a => a.id === selectedAccountId);

  return (
    <div className="space-y-6 pb-28">

      {/* 1. HEADER MODERNO CON SELECTOR DE MES */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight flex items-center gap-2.5">
            <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400/20 to-sky-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30 shadow-inner-light">
              <Landmark className="w-6 h-6" />
            </span>
            Economía & Tesorería
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gestión inteligente multi-banco, calendario interactivo de recibos y amortización de hipoteca.
          </p>
        </div>

        {/* NAVEGADOR MENSUAL + BOTONES DE ACCIÓN */}
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
            className="min-h-touch px-4 sm:px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-amber-400/20 transition-all touch-press"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Nuevo</span>
          </button>
        </div>
      </div>

      {/* 2. SELECTOR DE 4 PESTAÑAS PRINCIPALES */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="p-1 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center gap-1 shadow-inner-light whitespace-nowrap">
          {/* Pestaña 1: Previsión & Cuentas */}
          <button
            onClick={() => setActiveTab('calendar')}
            className={`min-h-[38px] px-3.5 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all touch-press ${
              activeTab === 'calendar'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/25'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <CalendarIcon className="w-4 h-4 stroke-[2.2]" />
            <span>Previsión & Cuentas</span>
          </button>

          {/* Pestaña 2: Ingresos & Nóminas */}
          <button
            onClick={() => setActiveTab('incomes')}
            className={`min-h-[38px] px-3.5 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all touch-press ${
              activeTab === 'incomes'
                ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-400/25'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <TrendingUp className="w-4 h-4 stroke-[2.2]" />
            <span>Ingresos & Nóminas</span>
          </button>

          {/* Pestaña 3: Gastos (Unificado: Fijos, Variables, Puntuales y Atajos) */}
          <button
            onClick={() => setActiveTab('expenses')}
            className={`min-h-[38px] px-3.5 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all touch-press ${
              activeTab === 'expenses' || activeTab === 'recurring' || activeTab === 'punctual'
                ? 'bg-rose-400 text-slate-950 shadow-md shadow-rose-400/25'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Layers className="w-4 h-4 stroke-[2.2]" />
            <span>Gastos</span>
          </button>

          {/* Pestaña 4: Préstamos e Hipotecas */}
          <button
            onClick={() => setActiveTab('loans')}
            className={`min-h-[38px] px-3.5 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all touch-press ${
              activeTab === 'loans'
                ? 'bg-purple-400 text-slate-950 shadow-md shadow-purple-400/25'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Landmark className="w-4 h-4 stroke-[2.2]" />
            <span>Préstamos & Hipotecas</span>
          </button>
        </div>
      </div>

      {/* 3. CONTENIDO: PREVISIÓN & CUENTAS */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">

          {/* HERO SUMMARY COCKPIT (Total Saldo en Bancos + Métricas Clave) */}
          <div className="glass-ios p-5 sm:p-7 rounded-[32px] sm:rounded-[36px] border border-white/14 shadow-ambient relative overflow-hidden space-y-5">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Fila Principal: Saldo Total y Estado de Recibos */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10 relative z-10">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-display">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  Saldo Total en Cuentas Bancarias
                </span>
                <div className="flex items-baseline gap-3 mt-1.5">
                  <span className="text-3xl sm:text-4xl md:text-5xl font-black font-mono tracking-tight text-white drop-shadow-sm">
                    {formatMoney(totalCashBalance)}€
                  </span>
                  <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                    (Suma en vivo de Banco Sabadell, Revolut y Ahorro)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  pendingExpensesCount === 0
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}>
                  {pendingExpensesCount === 0 ? '✓ Recibos al día' : `⏳ ${pendingExpensesCount} recibos por pagar`}
                </span>
              </div>
            </div>

            {/* 3 Métricas Rápidas y Visuales */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 relative z-10">
              <div className="p-4 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/8 shadow-inner-light">
                <span className="text-[10.5px] font-bold text-emerald-400 uppercase tracking-wider block font-display">
                  🟢 Total Ingresos del Mes
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
                  🏁 Previsión Neta Fin de Mes
                </span>
                <p className={`text-xl sm:text-2xl font-black font-mono mt-1 ${projectedBalance >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
                  {projectedBalance >= 0 ? `+${formatMoney(projectedBalance)}€` : `${formatMoney(projectedBalance)}€`}
                </p>
                <span className="text-[10.5px] text-slate-400 mt-0.5 block">
                  Ahorro neto previsto
                </span>
              </div>
            </div>
          </div>

          {/* CARROUSEL INTERACTIVO DE TARJETAS Y BANCOS (Estilo Apple Wallet) */}
          <React.Suspense fallback={<div className="h-40 glass-ios rounded-3xl animate-pulse" />}>
            <BankCardsCarousel
              accounts={accountsSummary}
              selectedAccountId={selectedAccountId}
              onSelectAccount={(accId) => setSelectedAccountId(accId)}
              onOpenTransfer={() => setTransferModalOpen(true)}
              onUpdateAccountBalance={handleUpdateAccountBalance}
            />
          </React.Suspense>

          {/* BANNER DESTACADO DE LA HIPOTECA (Último día hábil + 1ª Cuota Solo Intereses) */}
          {mortgageItem && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-5 rounded-[28px] border transition-all relative overflow-hidden ${
                mortgageItem.isInterestOnlyFirstPayment
                  ? 'bg-gradient-to-r from-amber-500/15 via-amber-600/10 to-transparent border-amber-400/40 shadow-lg shadow-amber-500/10'
                  : 'bg-gradient-to-r from-sky-500/15 via-indigo-500/10 to-transparent border-sky-400/30'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div className="flex items-start gap-3.5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
                    mortgageItem.isInterestOnlyFirstPayment
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/30'
                      : 'bg-sky-500/20 text-sky-300 border-sky-400/30'
                  }`}>
                    <Landmark className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base sm:text-lg font-black text-white font-display tracking-tight">
                        {mortgageItem.title}
                      </h4>
                      {mortgageItem.isInterestOnlyFirstPayment && (
                        <span className="text-[10.5px] px-2.5 py-0.5 rounded-full bg-amber-400/30 text-amber-200 border border-amber-400/50 font-black uppercase tracking-wider animate-pulse">
                          ⭐️ 1ª Cuota Carencia: Solo Intereses
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 font-mono font-bold">
                        🏛️ Domiciliado en Banco Sabadell
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">
                      Fecha de cargo:{' '}
                      <strong className="text-white">
                        Día {mortgageItem.dayOfMonth} de {formattedMonthLabel} (Último día hábil del mes)
                      </strong>
                      {mortgageItem.isInterestOnlyFirstPayment && (
                        <span className="block text-amber-300/90 text-[11px] mt-0.5 font-medium">
                          La amortización de capital comenzará a partir de la 2ª cuota (1.585,98 €/mes).
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0">
                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-black font-mono text-white block">
                      {formatMoney(mortgageItem.amount)}€
                    </span>
                    <span className={`text-[11px] font-bold ${mortgageItem.paid ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {mortgageItem.paid ? '✓ Cobrada en cuenta' : '⏳ Cargo pendiente'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleTogglePaid(mortgageItem)}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all ${
                      mortgageItem.paid
                        ? 'bg-emerald-400 border-emerald-400 text-slate-950 font-black shadow-md'
                        : 'bg-white/10 border-white/20 hover:border-amber-400 text-slate-300'
                    }`}
                    title={mortgageItem.paid ? 'Marcada como pagada (clic para desmarcar)' : 'Marcar como pagada'}
                  >
                    <Check className="w-5 h-5 stroke-[3]" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* SELECTOR DE MODO DÍA A DÍA vs CALENDARIO COMPLETO */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1 p-1 bg-white/[0.04] rounded-2xl border border-white/10 shadow-inner w-full sm:w-auto">
              <button
                onClick={() => setSubView('feed')}
                className={`min-h-[38px] px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 flex-1 sm:flex-initial ${
                  subView === 'feed'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-[0_4px_16px_rgba(255,159,10,0.35)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Feed del Día a Día ({filteredItems.length})</span>
              </button>

              <button
                onClick={() => setSubView('calendar')}
                className={`min-h-[38px] px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 flex-1 sm:flex-initial ${
                  subView === 'calendar'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-[0_4px_16px_rgba(255,159,10,0.35)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                <span>Vista Calendario Mensual</span>
              </button>
            </div>

            {selectedAccountId && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-300 font-semibold flex items-center gap-1.5 bg-amber-400/10 px-3 py-1.5 rounded-xl border border-amber-400/25">
                  <ListFilter className="w-3.5 h-3.5" />
                  Filtrando por: <strong>{selectedAccountObj?.name || 'Banco'}</strong>
                </span>
                <button
                  onClick={() => setSelectedAccountId(null)}
                  className="text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 transition-colors"
                  title="Ver todas las cuentas"
                >
                  ✕ Quitar filtro
                </button>
              </div>
            )}
          </div>

          {/* VISTA A: FEED DEL DÍA A DÍA (Próximos 7 días + Lista de Recibos Organizada) */}
          {subView === 'feed' ? (
            <div className="space-y-6">

              {/* SECCIÓN 1: PRÓXIMOS 7 DÍAS (Lo que te van a cobrar esta semana) */}
              {upcoming7DaysItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-extrabold text-white font-display uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      Próximos 7 Días (Recibos Inminentes)
                    </h3>
                    <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                      -{formatMoney(upcoming7DaysItems.reduce((s, i) => s + (Number(i.amount) || 0), 0))}€
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {upcoming7DaysItems.map((item) => (
                      <div
                        key={`upcoming-${item.id}`}
                        onClick={() => setAdjustModalItem(item)}
                        className="glass-ios p-4 rounded-2xl border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-ambient-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePaid(item);
                            }}
                            className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all flex-shrink-0 ${
                              item.paid
                                ? 'bg-emerald-400 border-emerald-400 text-slate-950 font-black'
                                : 'border-white/30 hover:border-amber-400 text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>

                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-white truncate font-display">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span>Día {item.dayOfMonth}</span>
                              <span>•</span>
                              <span className="text-amber-300 font-semibold font-mono">
                                {item.cardName?.toLowerCase().includes('apple') ? '🍎 Apple Pay' : (item.bankName || 'Banco')}
                              </span>
                            </p>
                          </div>
                        </div>

                        <span className="text-sm sm:text-base font-black font-mono text-rose-300 flex-shrink-0">
                          -{formatMoney(item.amount)}€
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECCIÓN 2: TODOS LOS MOVIMIENTOS DEL MES */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-extrabold text-white font-display uppercase tracking-wider">
                    Todos los Movimientos de {formattedMonthLabel}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {filteredItems.length} registros
                  </span>
                </div>

                {filteredItems.length === 0 ? (
                  <div className="glass-ios p-8 rounded-3xl border border-white/10 text-center space-y-2">
                    <p className="text-sm font-bold text-white">No hay movimientos en esta vista</p>
                    <p className="text-xs text-slate-400">Prueba a seleccionar "Ver todas las cuentas" arriba.</p>
                  </div>
                ) : (
                  <div className="glass-ios p-3 sm:p-5 rounded-[28px] border border-white/10 space-y-2">
                    {filteredItems.map((item) => {
                      const isExpense = item.type === 'gasto';
                      return (
                        <div
                          key={`feed-item-${item.id}`}
                          onClick={() => setAdjustModalItem(item)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            item.paid
                              ? 'bg-white/[0.02] border-white/5 opacity-70'
                              : isExpense
                                ? 'bg-rose-500/[0.05] border-rose-500/20 hover:border-rose-400/40'
                                : 'bg-emerald-500/[0.05] border-emerald-500/20 hover:border-emerald-400/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePaid(item);
                              }}
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border transition-all flex-shrink-0 ${
                                item.paid
                                  ? 'bg-emerald-400 border-emerald-400 text-slate-950 font-black shadow-sm'
                                  : 'border-white/30 hover:border-amber-400 text-transparent'
                              }`}
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                            </button>

                            <div className="min-w-0">
                              <p className={`text-xs sm:text-sm font-bold truncate font-display ${item.paid ? 'line-through text-slate-400' : 'text-white'}`}>
                                {item.title}
                              </p>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="font-mono">Día {item.dayOfMonth}</span>
                                <span>•</span>
                                <span>{item.category}</span>
                                {item.bankName && (
                                  <>
                                    <span>•</span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                                      item.accountId === 'acc-revolut' || item.bankName?.toLowerCase().includes('revolut')
                                        ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                                        : 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                                    }`}>
                                      {item.cardName?.toLowerCase().includes('apple') ? '🍎 Apple Pay' : (item.bankName || 'Banco')}
                                    </span>
                                  </>
                                )}
                                {item.isInterestOnlyFirstPayment && (
                                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-400/25 text-amber-200 border border-amber-400/40">
                                    ⭐️ 1ª Cuota Carencia 702€
                                  </span>
                                )}
                                <span className={item.paid ? 'text-emerald-400 font-bold' : 'text-amber-300 font-semibold'}>
                                  {item.paid ? '✓ Pagado' : '⏳ Pendiente'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <span className={`text-sm sm:text-base font-mono font-black ${isExpense ? 'text-rose-300' : 'text-emerald-300'}`}>
                              {isExpense ? '-' : '+'}{formatMoney(item.amount)}€
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* VISTA B: CALENDARIO MENSUAL COMPLETO (CUADRÍCULA CON DRAG & DROP) */
            monthData ? (
              <FinanceCalendar
                api={api}
                monthData={monthData}
                currentMonth={currentMonth}
                selectedAccountId={selectedAccountId}
                onSelectAccount={(accId) => setSelectedAccountId(accId)}
                onSelectMonth={(m) => setCurrentMonth(m)}
                onTogglePaid={handleTogglePaid}
                onMoveItemDay={handleMoveItemDay}
                onQuickAddTx={handleQuickAddTx}
                onEditItem={(item) => setAdjustModalItem(item)}
                onDeleteItem={handleDeleteTx}
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
                <CalendarIcon className="w-8 h-8 text-amber-400 mx-auto animate-spin" />
                <p className="text-base font-bold text-white">Cargando calendario...</p>
              </div>
            )
          )}

        </div>
      )}

      {/* PESTAÑA 2: INGRESOS & NÓMINAS */}
      {activeTab === 'incomes' && (
        <React.Suspense fallback={
          <div className="glass-ios p-12 text-center text-slate-400 space-y-3 rounded-3xl animate-pulse">
            <TrendingUp className="w-8 h-8 animate-spin mx-auto text-emerald-400" />
            <p className="font-bold text-white text-base">Cargando gestor de nóminas e ingresos...</p>
          </div>
        }>
          <IncomeManager
            api={api}
            currentMonth={currentMonth}
            onDataChanged={() => {
              loadMonthData(currentMonth);
              if (onRefreshDashboard) onRefreshDashboard();
            }}
          />
        </React.Suspense>
      )}

      {/* PESTAÑA 3: GASTOS (UNIFICADO: RECURRENTES, PUNTUALES Y ATAJOS) */}
      {(activeTab === 'expenses' || activeTab === 'recurring' || activeTab === 'punctual') && (
        <React.Suspense fallback={
          <div className="glass-ios p-12 text-center text-slate-400 space-y-3 rounded-3xl animate-pulse">
            <Layers className="w-8 h-8 animate-spin mx-auto text-rose-400" />
            <p className="font-bold text-white text-base">Cargando gestor integral de gastos...</p>
          </div>
        }>
          <ExpensesManager
            api={api}
            currentMonth={currentMonth}
            initialSubTab={activeTab === 'punctual' ? 'punctual' : (activeTab === 'recurring' ? 'recurring' : 'all')}
            onDataChanged={() => {
              loadMonthData(currentMonth);
              if (onRefreshDashboard) onRefreshDashboard();
            }}
          />
        </React.Suspense>
      )}

      {/* PESTAÑA 4: PRÉSTAMOS E HIPOTECAS */}
      {activeTab === 'loans' && (
        <React.Suspense fallback={
          <div className="glass-ios p-12 text-center text-slate-400 space-y-3 rounded-3xl animate-pulse">
            <Landmark className="w-8 h-8 animate-spin mx-auto text-purple-400" />
            <p className="font-bold text-white text-base">Cargando préstamos e hipotecas...</p>
          </div>
        }>
          <LoansManager
            api={api}
            onRefresh={() => {
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

      {/* MODAL 3: TRASPASO ENTRE CUENTAS BANCARIAS */}
      {transferModalOpen && (
        <React.Suspense fallback={null}>
          <TransferModal
            isOpen={true}
            onClose={() => setTransferModalOpen(false)}
            accounts={accountsSummary}
            onTransferSuccess={handleTransferSubmit}
          />
        </React.Suspense>
      )}

    </div>
  );
}

export default React.memo(FinanceView);
