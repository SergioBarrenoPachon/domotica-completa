import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Sparkles, 
  Briefcase, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2,
  Clock,
  BarChart3,
  LineChart as LineChartIcon,
  Percent,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  SlidersHorizontal
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine
} from 'recharts';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_SHORT_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

const PERIOD_FILTERS = [
  { id: '12m', label: 'Todo el Año (12M)' },
  { id: 's1', label: '1er Semestre (Ene-Jun)' },
  { id: 's2', label: '2º Semestre (Jul-Dic)' },
  { id: 'trailing6', label: 'Últimos 6 Meses' },
  { id: 'q1', label: 'T1 (Ene-Mar)' },
  { id: 'q2', label: 'T2 (Abr-Jun)' },
  { id: 'q3', label: 'T3 (Jul-Sep)' },
  { id: 'q4', label: 'T4 (Oct-Dic)' },
];

export default function FinanceYearView({ 
  api, 
  currentMonth, 
  onSelectMonth 
}) {
  const currentYear = useMemoYear(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [yearData, setYearData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState('12m');
  const [chartType, setChartType] = useState('flow'); // 'flow' | 'bars' | 'cumulative'

  function useMemoYear(m) {
    if (!m) return new Date().getFullYear();
    const y = parseInt(m.split('-')[0], 10);
    return isNaN(y) ? new Date().getFullYear() : y;
  }

  useEffect(() => {
    loadYearData(selectedYear);
  }, [selectedYear]);

  const loadYearData = async (year) => {
    setLoading(true);
    try {
      const res = await api.getYearFinance(year);
      const data = (res && res.data) ? res.data : res;
      if (data && data.months) {
        setYearData(data);
      }
    } catch (err) {
      console.error('Error cargando proyección anual:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevYear = () => setSelectedYear(y => y - 1);
  const handleNextYear = () => setSelectedYear(y => y + 1);
  const handleCurrentYear = () => setSelectedYear(new Date().getFullYear());

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthNumber = now.getMonth() + 1;

  const formatMoney = (val) => (Number(val) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // 1. Calcular dataset consolidado de los 12 meses con acumulado progresivo
  const fullYearMonths = useMemo(() => {
    if (!yearData?.months) return [];
    let runningCumulative = 0;
    return yearData.months.map((m) => {
      const income = Number(m.totalIncome) || 0;
      const expenses = Number(m.totalExpenses) || 0;
      const balance = Number(m.projectedBalance) || (income - expenses);
      runningCumulative += balance;
      const rate = income > 0 ? Math.round((balance / income) * 100) : 0;
      const monthIdx = m.monthNumber - 1;

      return {
        ...m,
        income,
        expenses,
        balance,
        cumulativeSavings: runningCumulative,
        savingsRate: rate,
        monthName: MONTH_NAMES[monthIdx],
        shortName: MONTH_SHORT_NAMES[monthIdx],
      };
    });
  }, [yearData]);

  // 2. Filtrar dataset según el periodo seleccionado
  const displayMonths = useMemo(() => {
    if (fullYearMonths.length === 0) return [];
    switch (periodFilter) {
      case 's1':
        return fullYearMonths.filter(m => m.monthNumber >= 1 && m.monthNumber <= 6);
      case 's2':
        return fullYearMonths.filter(m => m.monthNumber >= 7 && m.monthNumber <= 12);
      case 'trailing6': {
        const start = Math.max(1, currentMonthNumber - 5);
        const end = Math.min(12, currentMonthNumber);
        return fullYearMonths.filter(m => m.monthNumber >= start && m.monthNumber <= end);
      }
      case 'q1':
        return fullYearMonths.filter(m => m.monthNumber >= 1 && m.monthNumber <= 3);
      case 'q2':
        return fullYearMonths.filter(m => m.monthNumber >= 4 && m.monthNumber <= 6);
      case 'q3':
        return fullYearMonths.filter(m => m.monthNumber >= 7 && m.monthNumber <= 9);
      case 'q4':
        return fullYearMonths.filter(m => m.monthNumber >= 10 && m.monthNumber <= 12);
      case '12m':
      default:
        return fullYearMonths;
    }
  }, [fullYearMonths, periodFilter, currentMonthNumber]);

  // 3. Métricas y KPIs agregados para el período visualizado
  const periodMetrics = useMemo(() => {
    if (displayMonths.length === 0) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netSavings: 0,
        avgNetPerMonth: 0,
        avgSavingsRate: 0,
        bestMonth: null,
        highestExpenseMonth: null,
      };
    }

    let totalIncome = 0;
    let totalExpenses = 0;
    let netSavings = 0;
    let bestMonth = displayMonths[0];
    let highestExpenseMonth = displayMonths[0];

    displayMonths.forEach((m) => {
      totalIncome += m.income;
      totalExpenses += m.expenses;
      netSavings += m.balance;

      if (m.balance > (bestMonth.balance || -Infinity)) {
        bestMonth = m;
      }
      if (m.expenses > (highestExpenseMonth.expenses || -Infinity)) {
        highestExpenseMonth = m;
      }
    });

    const avgNetPerMonth = netSavings / displayMonths.length;
    const avgSavingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

    return {
      totalIncome,
      totalExpenses,
      netSavings,
      avgNetPerMonth,
      avgSavingsRate,
      bestMonth,
      highestExpenseMonth,
    };
  }, [displayMonths]);

  // Custom Glass Tooltip para el gráfico Recharts
  const CustomChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const dataPoint = payload[0]?.payload;
    if (!dataPoint) return null;

    const isSurplus = dataPoint.balance >= 0;

    return (
      <div className="glass-ios-elevated p-4 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-2xl text-xs space-y-2 min-w-[200px]">
        <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
          <span className="font-bold text-sm text-white">{dataPoint.monthName} {selectedYear}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isSurplus ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
            {isSurplus ? 'Superávit' : 'Déficit'}
          </span>
        </div>

        <div className="space-y-1 font-mono">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-slate-300">Ingresos:</span>
            <span className="font-bold">+{formatMoney(dataPoint.income)}€</span>
          </div>

          <div className="flex items-center justify-between text-rose-400">
            <span className="text-slate-300">Gastos:</span>
            <span className="font-bold">-{formatMoney(dataPoint.expenses)}€</span>
          </div>

          <div className={`flex items-center justify-between font-bold pt-1 border-t border-white/10 ${isSurplus ? 'text-cyan-300' : 'text-rose-400'}`}>
            <span>Saldo Neto Mes:</span>
            <span>{isSurplus ? `+${formatMoney(dataPoint.balance)}€` : `${formatMoney(dataPoint.balance)}€`}</span>
          </div>

          <div className="flex items-center justify-between text-amber-300 pt-0.5">
            <span className="text-slate-400">Ahorro Acumulado:</span>
            <span className="font-bold">{dataPoint.cumulativeSavings >= 0 ? `+${formatMoney(dataPoint.cumulativeSavings)}€` : `${formatMoney(dataPoint.cumulativeSavings)}€`}</span>
          </div>

          {dataPoint.income > 0 && (
            <div className="flex items-center justify-between text-slate-300 pt-0.5 text-[11px]">
              <span className="text-slate-400">Tasa de Ahorro:</span>
              <span className="font-semibold">{dataPoint.savingsRate}%</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 1. CABECERA PRINCIPAL: SELECTOR DE AÑO Y TARJETA CONTEXTUAL */}
      <div className="glass-ios-elevated p-6 sm:p-7 rounded-[32px] border border-white/15 shadow-ios-diffuse space-y-6 relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Selector de Año y Título */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-sm">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase font-black text-amber-400 tracking-wider block">
                  Visión Multimes y Flujo Anual
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.08] text-slate-300 border border-white/10">
                  {displayMonths.length} Meses en Vista
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Evolución Multimes de {selectedYear}
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="p-1 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center gap-1 backdrop-blur-xl">
              <button
                type="button"
                onClick={handlePrevYear}
                className="w-9 h-9 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center touch-press transition-all"
                title="Año anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <span className="px-3.5 py-1 text-white font-mono font-black text-base min-w-[70px] text-center tracking-tight">
                {selectedYear}
              </span>

              <button
                type="button"
                onClick={handleNextYear}
                className="w-9 h-9 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center touch-press transition-all"
                title="Año siguiente"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {selectedYear !== now.getFullYear() && (
              <button
                type="button"
                onClick={handleCurrentYear}
                className="px-4 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black touch-press transition-all shadow-md"
              >
                Año actual ({now.getFullYear()})
              </button>
            )}
          </div>
        </div>

        {/* Selector de Rango / Filtro Temporal (Multimes) */}
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span>Ventana de visualización temporal:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 p-1.5 bg-white/[0.03] rounded-2xl border border-white/10">
            {PERIOD_FILTERS.map(pf => {
              const isActive = periodFilter === pf.id;
              return (
                <button
                  key={pf.id}
                  type="button"
                  onClick={() => setPeriodFilter(pf.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all touch-press ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 font-black shadow-[0_4px_16px_rgba(255,159,10,0.35)]'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {pf.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 Métricas Clave del Periodo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 relative z-10">
          
          <div className="glass-ios p-4 rounded-2xl border border-emerald-500/20 hover:border-emerald-500/35 transition-all space-y-1">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Ingresos ({periodFilter === '12m' ? 'Anual' : 'Período'})</span>
            </span>
            <p className="text-2xl font-bold font-mono text-white tracking-tight">
              +{formatMoney(periodMetrics.totalIncome)}€
            </p>
            <p className="text-[11px] text-slate-400">
              Media: ~{formatMoney(displayMonths.length > 0 ? periodMetrics.totalIncome / displayMonths.length : 0)}€ / mes
            </p>
          </div>

          <div className="glass-ios p-4 rounded-2xl border border-rose-500/20 hover:border-rose-500/35 transition-all space-y-1">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Gastos ({periodFilter === '12m' ? 'Anual' : 'Período'})</span>
            </span>
            <p className="text-2xl font-bold font-mono text-white tracking-tight">
              -{formatMoney(periodMetrics.totalExpenses)}€
            </p>
            <p className="text-[11px] text-slate-400">
              Media: ~{formatMoney(displayMonths.length > 0 ? periodMetrics.totalExpenses / displayMonths.length : 0)}€ / mes
            </p>
          </div>

          <div className="glass-ios p-4 rounded-2xl border border-cyan-500/20 hover:border-cyan-500/35 transition-all space-y-1">
            <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              <span>Ahorro Neto Período</span>
            </span>
            <div className="flex items-baseline gap-2">
              <p className={`text-2xl font-bold font-mono tracking-tight ${periodMetrics.netSavings >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
                {periodMetrics.netSavings >= 0 ? `+${formatMoney(periodMetrics.netSavings)}€` : `${formatMoney(periodMetrics.netSavings)}€`}
              </p>
              {periodMetrics.totalIncome > 0 && (
                <span className="text-xs font-black text-cyan-300 font-mono">
                  ({periodMetrics.avgSavingsRate}%)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Media neta: {periodMetrics.avgNetPerMonth >= 0 ? `+${formatMoney(periodMetrics.avgNetPerMonth)}€` : `${formatMoney(periodMetrics.avgNetPerMonth)}€`} / mes
            </p>
          </div>

          <div className="glass-ios p-4 rounded-2xl border border-amber-500/20 hover:border-amber-500/35 transition-all space-y-1">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Hito Destacado</span>
            </span>
            {periodMetrics.bestMonth ? (
              <div>
                <p className="text-sm font-bold text-white truncate">
                  Mejor mes: <span className="text-amber-300">{periodMetrics.bestMonth.monthName}</span>
                </p>
                <p className="text-xs font-bold font-mono text-emerald-400">
                  +{formatMoney(periodMetrics.bestMonth.balance)}€ saldo neto
                </p>
                {periodMetrics.highestExpenseMonth && periodMetrics.highestExpenseMonth.month !== periodMetrics.bestMonth.month && (
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    Mayor gasto: {periodMetrics.highestExpenseMonth.monthName} (-{formatMoney(periodMetrics.highestExpenseMonth.expenses)}€)
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Sin datos de periodo</p>
            )}
          </div>

        </div>

      </div>

      {/* 2. GRÁFICO DE EVOLUCIÓN MULTIMES (RECHARTS) */}
      <div className="glass-ios-elevated p-6 sm:p-7 rounded-[32px] border border-white/15 shadow-ios-diffuse space-y-4">
        
        {/* Cabecera del Gráfico y Switcher de Modalidad */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <h4 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <LineChartIcon className="w-5 h-5 text-amber-400" />
              <span>Curva de Evolución Financiera Multimes</span>
            </h4>
            <p className="text-xs text-slate-400">
              Tendencia visual y comparativa directa a lo largo de los meses de {selectedYear}
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-white/[0.04] rounded-2xl border border-white/10 w-fit">
            <button
              type="button"
              onClick={() => setChartType('flow')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all touch-press ${
                chartType === 'flow'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Flujo y Balance
            </button>
            <button
              type="button"
              onClick={() => setChartType('bars')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all touch-press ${
                chartType === 'bars'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Barras Comparativas
            </button>
            <button
              type="button"
              onClick={() => setChartType('cumulative')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all touch-press ${
                chartType === 'cumulative'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Ahorro Acumulado
            </button>
          </div>
        </div>

        {/* Gráfico Recharts */}
        <div className="h-[320px] sm:h-[380px] w-full pt-2">
          {loading ? (
            <div className="h-full w-full flex items-center justify-center animate-pulse">
              <div className="text-slate-400 text-sm flex items-center gap-2">
                <Clock className="w-5 h-5 animate-spin text-amber-400" />
                <span>Calculando evolución de {selectedYear}...</span>
              </div>
            </div>
          ) : displayMonths.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-slate-400 text-sm">
              No hay datos disponibles para el periodo seleccionado.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'flow' ? (
                <AreaChart data={displayMonths} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#30d158" stopOpacity={0.45}/>
                      <stop offset="95%" stopColor="#30d158" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff453a" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#ff453a" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0a84ff" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#0a84ff" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                  <XAxis dataKey="shortName" stroke="rgba(255, 255, 255, 0.45)" fontSize={12} tickLine={false} />
                  <YAxis stroke="rgba(255, 255, 255, 0.45)" fontSize={12} tickLine={false} tickFormatter={(val) => `${Math.round(val)}€`} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <ReferenceLine y={0} stroke="rgba(255, 255, 255, 0.2)" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="income" name="Ingresos (+€)" stroke="#30d158" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="expenses" name="Gastos (-€)" stroke="#ff453a" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpenses)" />
                  <Line type="monotone" dataKey="balance" name="Saldo Neto Mes" stroke="#0a84ff" strokeWidth={3} dot={{ fill: '#0a84ff', r: 4 }} activeDot={{ r: 6 }} />
                </AreaChart>
              ) : chartType === 'bars' ? (
                <BarChart data={displayMonths} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                  <XAxis dataKey="shortName" stroke="rgba(255, 255, 255, 0.45)" fontSize={12} tickLine={false} />
                  <YAxis stroke="rgba(255, 255, 255, 0.45)" fontSize={12} tickLine={false} tickFormatter={(val) => `${Math.round(val)}€`} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="income" name="Ingresos (+€)" fill="#30d158" radius={[8, 8, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="expenses" name="Gastos (-€)" fill="#ff453a" radius={[8, 8, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="balance" name="Saldo Neto" fill="#0a84ff" radius={[6, 6, 0, 0]} maxBarSize={20} />
                </BarChart>
              ) : (
                <AreaChart data={displayMonths} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                  <XAxis dataKey="shortName" stroke="rgba(255, 255, 255, 0.45)" fontSize={12} tickLine={false} />
                  <YAxis stroke="rgba(255, 255, 255, 0.45)" fontSize={12} tickLine={false} tickFormatter={(val) => `${Math.round(val)}€`} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <ReferenceLine y={0} stroke="rgba(255, 255, 255, 0.2)" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="cumulativeSavings" name="Ahorro Neto Acumulado Progresivo (€)" stroke="#f59e0b" strokeWidth={3.5} fillOpacity={1} fill="url(#colorCumulative)" dot={{ fill: '#f59e0b', r: 4 }} activeDot={{ r: 7 }} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

      </div>

      {/* 3. CUADRÍCULA DETALLADA DE MESES (1-CLICK NAVEGACIÓN A CADA MES) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h4 className="text-lg font-bold text-white tracking-tight">
              Desglose Individual de los Meses ({displayMonths.length})
            </h4>
          </div>
          <span className="text-xs text-slate-400">
            Haz clic en cualquier tarjeta para abrir su calendario diario
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-52 rounded-[28px] bg-white/[0.03] border border-white/5 p-5 space-y-3" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayMonths.map((m) => {
              const isCurrentMonth = m.month === currentMonthKey;
              const isViewingThisMonth = m.month === currentMonth;
              const isPositive = m.balance >= 0;

              return (
                <motion.div
                  key={m.month}
                  whileHover={{ y: -3 }}
                  onClick={() => onSelectMonth(m.month)}
                  className={`group p-5 rounded-[28px] border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3.5 select-none touch-press ${
                    isCurrentMonth
                      ? 'bg-gradient-to-b from-amber-500/15 via-white/[0.06] to-white/[0.02] border-amber-400/40 shadow-[0_8px_24px_rgba(255,159,10,0.15)] ring-1 ring-amber-400/30'
                      : isViewingThisMonth
                      ? 'bg-gradient-to-b from-cyan-500/15 via-white/[0.06] to-white/[0.02] border-cyan-400/40 ring-1 ring-cyan-400/30 shadow-ios-ambient'
                      : 'glass-ios border-white/10 hover:border-white/25 hover:bg-white/[0.06] shadow-ios-ambient'
                  }`}
                >
                  {/* Cabecera de la Tarjeta del Mes */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <h5 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        {m.monthName}
                      </h5>
                      {isCurrentMonth && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950 shadow-md">
                          Actual
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {m.itemsCount} {m.itemsCount === 1 ? 'recibo' : 'recibos'}
                    </span>
                  </div>

                  {/* Métricas del Mes: Ingresos vs Gastos */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Ingresos:</span>
                      <span className="font-bold font-mono text-emerald-400">
                        +{formatMoney(m.income)}€
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Gastos:</span>
                      <span className="font-bold font-mono text-rose-400">
                        -{formatMoney(m.expenses)}€
                      </span>
                    </div>

                    {/* Balance Neto de Cierre del Mes */}
                    <div className={`p-2.5 rounded-2xl border flex items-center justify-between mt-2.5 ${
                      isPositive 
                        ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300' 
                        : 'bg-rose-500/15 border-rose-400/30 text-rose-300'
                    }`}>
                      <span className="text-[11px] font-bold">Saldo Neto Mes:</span>
                      <span className="text-sm font-black font-mono tracking-tight">
                        {isPositive ? `+${formatMoney(m.balance)}€` : `${formatMoney(m.balance)}€`}
                      </span>
                    </div>

                    {/* Ahorro acumulado progresivo */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Acumulado año:</span>
                      <span className="font-mono font-bold text-amber-300">
                        {m.cumulativeSavings >= 0 ? `+${formatMoney(m.cumulativeSavings)}€` : `${formatMoney(m.cumulativeSavings)}€`}
                      </span>
                    </div>
                  </div>

                  {/* Hitos Clave del Mes (Pagas Extras, Seguros, etc.) */}
                  <div className="min-h-[38px] flex flex-wrap gap-1 content-start">
                    {m.highlights && m.highlights.length > 0 ? (
                      m.highlights.slice(0, 2).map((h, idx) => (
                        <span 
                          key={idx}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${
                            h.type === 'ingreso'
                              ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                              : 'bg-white/[0.08] border-white/15 text-slate-200'
                          }`}
                          title={h.title}
                        >
                          <span className="truncate max-w-[125px]">{h.title}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">
                        Gastos corrientes habituales
                      </span>
                    )}
                  </div>

                  {/* Botón de Entrada al Mes */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMonth(m.month);
                    }}
                    className="w-full py-2.5 px-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 border border-white/10 hover:border-white/25 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <span>Ver detalle diario de {m.monthName}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>

                </motion.div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
