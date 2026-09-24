import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Sparkles, 
  Sliders, 
  ShieldAlert, 
  Award, 
  CheckCircle2, 
  Calendar, 
  DollarSign, 
  Layers, 
  HelpCircle,
  Clock,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { motion } from 'framer-motion';

const HORIZONS = [
  { label: '1 Año', value: 1 },
  { label: '3 Años', value: 3 },
  { label: '5 Años', value: 5 },
  { label: '10 Años', value: 10 },
  { label: '20 Años', value: 20 },
  { label: '30 Años', value: 30 }
];

export default function LongTermProjection({ api }) {
  const [years, setYears] = useState(10);
  const [inflation, setInflation] = useState(2.5);
  const [growth, setGrowth] = useState(2.0);
  const [netWorth, setNetWorth] = useState(15000);
  const [extraSavings, setExtraSavings] = useState(0);

  const [projectionData, setProjectionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeChartTab, setActiveChartTab] = useState('patrimonio'); // 'patrimonio' | 'flujo'

  useEffect(() => {
    fetchProjection();
  }, [years, inflation, growth, netWorth, extraSavings]);

  const fetchProjection = async () => {
    try {
      setLoading(true);
      const data = await api.getLongTermProjection({
        years,
        inflation,
        growth,
        netWorth,
        extraSavings
      });
      setProjectionData(data);
    } catch (err) {
      console.error('Error calculando proyección a largo plazo:', err);
    } finally {
      setLoading(false);
    }
  };

  const yearlyData = projectionData?.yearlyData || [];
  const milestones = projectionData?.milestones || [];
  const finalProjectedNetWorth = projectionData?.finalProjectedNetWorth || 0;
  const finalProjectedWithInvestment = projectionData?.finalProjectedWithInvestment || 0;
  const startYear = projectionData?.startYear || new Date().getFullYear();
  const endYear = projectionData?.endYear || startYear + years - 1;

  // Format currency
  const formatEuro = (val) => `${new Intl.NumberFormat('es-ES').format(val)}€`;

  return (
    <div className="space-y-6">
      
      {/* Header & Horizon Selector */}
      <div className="glass-ios-elevated p-6 sm:p-7 rounded-[32px] border border-white/15 shadow-ios-diffuse flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-ios-amber/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-ios-amber font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Simulador Financiero y Previsional</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
            Proyección a Largo Plazo ({years} Años: {startYear} – {endYear})
          </h3>
          <p className="text-sm text-white/50 mt-1 max-w-2xl">
            Simula la evolución de tu patrimonio, extinción de hipotecas y préstamos, impacto de la inflación e interés compuesto en tus ahorros a lo largo de décadas.
          </p>
        </div>

        {/* Horizon Pills (Segment Controller) */}
        <div className="ios-segment-track p-1.5 rounded-2xl border border-white/10 flex flex-wrap items-center gap-1.5 self-start lg:self-auto relative z-10">
          {HORIZONS.map((h) => (
            <button
              key={h.value}
              onClick={() => setYears(h.value)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all touch-press ${
                years === h.value
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Patrimonio Proyectado */}
        <div className="glass-ios p-5 sm:p-6 rounded-[28px] border border-ios-amber/25 hover:border-ios-amber/40 shadow-ios-ambient flex flex-col justify-between transition-all">
          <span className="text-xs font-semibold text-ios-amber uppercase tracking-wider">
            Patrimonio Acumulado ({endYear})
          </span>
          <div className="mt-4">
            <p className="text-3xl font-bold text-white font-mono tracking-tight">
              {formatEuro(finalProjectedNetWorth)}
            </p>
            <p className="text-xs text-ios-amber/80 mt-1 font-medium">
              Ahorro neto acumulado en efectivo
            </p>
          </div>
        </div>

        {/* Con Inversión / Interés Compuesto */}
        <div className="glass-ios p-5 sm:p-6 rounded-[28px] border border-ios-emerald/25 hover:border-ios-emerald/40 shadow-ios-ambient flex flex-col justify-between transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ios-emerald uppercase tracking-wider">
              Con Interés Compuesto (+3.5%)
            </span>
            <TrendingUp className="w-4 h-4 text-ios-emerald" />
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-ios-emerald font-mono tracking-tight">
              {formatEuro(finalProjectedWithInvestment)}
            </p>
            <p className="text-xs text-ios-emerald/80 mt-1 font-medium">
              Rendimiento real invirtiendo el excedente
            </p>
          </div>
        </div>

        {/* Ahorro Medio Anual */}
        <div className="glass-ios p-5 sm:p-6 rounded-[28px] border border-ios-electric/25 hover:border-ios-electric/40 shadow-ios-ambient flex flex-col justify-between transition-all">
          <span className="text-xs font-semibold text-ios-electric uppercase tracking-wider">
            Capacidad Ahorro Media
          </span>
          <div className="mt-4">
            <p className="text-3xl font-bold text-white font-mono tracking-tight">
              {yearlyData.length > 0
                ? formatEuro(Math.round(yearlyData.reduce((acc, y) => acc + y.netSavings, 0) / yearlyData.length))
                : '0€'} <span className="text-sm font-normal text-white/50">/ año</span>
            </p>
            <p className="text-xs text-ios-electric/80 mt-1 font-medium">
              Promedio neto por año proyectado
            </p>
          </div>
        </div>

        {/* Tasa Media de Ahorro */}
        <div className="glass-ios p-5 sm:p-6 rounded-[28px] border border-ios-purple/25 hover:border-ios-purple/40 shadow-ios-ambient flex flex-col justify-between transition-all">
          <span className="text-xs font-semibold text-ios-purple uppercase tracking-wider">
            Tasa Media de Ahorro
          </span>
          <div className="mt-4">
            <p className="text-3xl font-bold text-ios-purple font-mono tracking-tight">
              {yearlyData.length > 0
                ? Math.round(yearlyData.reduce((acc, y) => acc + y.savingsRate, 0) / yearlyData.length)
                : 0}%
            </p>
            <p className="text-xs text-ios-purple/80 mt-1 font-medium">
              Del total de ingresos netos anuales
            </p>
          </div>
        </div>

      </div>

      {/* Simulator Sliders & Controls */}
      <div className="glass-ios p-6 sm:p-7 rounded-[32px] border border-white/10 space-y-5 shadow-ios-ambient">
        <div className="flex items-center gap-2 text-white font-bold text-sm tracking-tight">
          <Sliders className="w-4 h-4 text-ios-amber" />
          <span>Ajustes y Parámetros de Simulación Macroeconómica</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Inflación */}
          <div className="p-4.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/70 font-semibold">Inflación Anual Estimada</span>
              <span className="font-mono font-bold text-ios-amber text-sm">{inflation}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="8"
              step="0.25"
              value={inflation}
              onChange={(e) => setInflation(parseFloat(e.target.value))}
              className="w-full accent-ios-amber cursor-pointer h-2 bg-white/10 rounded-full appearance-none"
            />
            <span className="text-[10px] text-white/40 block">Aumenta suministros, comida y ocio</span>
          </div>

          {/* Crecimiento salarial */}
          <div className="p-4.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/70 font-semibold">Subida Salarial Anual</span>
              <span className="font-mono font-bold text-ios-emerald text-sm">{growth}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="8"
              step="0.25"
              value={growth}
              onChange={(e) => setGrowth(parseFloat(e.target.value))}
              className="w-full accent-ios-emerald cursor-pointer h-2 bg-white/10 rounded-full appearance-none"
            />
            <span className="text-[10px] text-white/40 block">Incremento medio anual de ingresos</span>
          </div>

          {/* Patrimonio Inicial */}
          <div className="p-4.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <label className="text-xs text-white/70 font-semibold block">Patrimonio Inicial (€)</label>
            <input
              type="number"
              value={netWorth}
              onChange={(e) => setNetWorth(Math.max(0, parseFloat(e.target.value) || 0))}
              className="glass-input w-full rounded-xl px-3.5 py-2 text-white font-mono text-sm outline-none"
              placeholder="15000"
            />
            <span className="text-[10px] text-white/40 block">Colchón de liquidez actual</span>
          </div>

          {/* Aportación Extra Mensual */}
          <div className="p-4.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <label className="text-xs text-white/70 font-semibold block">Ahorro Extra Mensual (€)</label>
            <input
              type="number"
              value={extraSavings}
              onChange={(e) => setExtraSavings(Math.max(0, parseFloat(e.target.value) || 0))}
              className="glass-input w-full rounded-xl px-3.5 py-2 text-white font-mono text-sm outline-none"
              placeholder="0"
            />
            <span className="text-[10px] text-white/40 block">Aportación recurrente voluntaria</span>
          </div>

        </div>
      </div>

      {/* CHARTS CONTAINER */}
      <div className="glass-ios p-6 sm:p-7 rounded-[32px] border border-white/10 space-y-5 shadow-ios-diffuse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-bold text-white tracking-tight">
              {activeChartTab === 'patrimonio' ? 'Curva de Crecimiento Patrimonial (€)' : 'Flujo Anual: Ingresos vs Gastos (€)'}
            </h4>
          </div>

          {/* Chart Toggle (Segment Controller) */}
          <div className="ios-segment-track p-1 rounded-2xl border border-white/10 flex items-center gap-1 self-start sm:self-auto">
            <button
              onClick={() => setActiveChartTab('patrimonio')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all touch-press ${
                activeChartTab === 'patrimonio'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Patrimonio Acumulado
            </button>
            <button
              onClick={() => setActiveChartTab('flujo')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all touch-press ${
                activeChartTab === 'flujo'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Ingresos vs Gastos
            </button>
          </div>
        </div>

        {/* Recharts Component */}
        <div className="h-[320px] sm:h-[380px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {activeChartTab === 'patrimonio' ? (
              <AreaChart data={yearlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorInvest" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#30d158" stopOpacity={0.45}/>
                    <stop offset="95%" stopColor="#30d158" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                <XAxis dataKey="yearLabel" stroke="rgba(255, 255, 255, 0.4)" fontSize={12} tickLine={false} />
                <YAxis stroke="rgba(255, 255, 255, 0.4)" fontSize={12} tickLine={false} tickFormatter={(val) => `${Math.round(val / 1000)}k€`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.85)', 
                    borderColor: 'rgba(255, 255, 255, 0.15)', 
                    borderRadius: '20px', 
                    color: '#fff', 
                    fontSize: '12px',
                    backdropFilter: 'blur(24px)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                  }}
                  formatter={(val) => [`${formatEuro(val)}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="netWorth" name="Ahorro Efectivo Acumulado" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorNetWorth)" />
                <Area type="monotone" dataKey="wealthWithInvestment" name="Patrimonio con Inversión (+3.5%)" stroke="#30d158" strokeWidth={2.5} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorInvest)" />
              </AreaChart>
            ) : (
              <BarChart data={yearlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                <XAxis dataKey="yearLabel" stroke="rgba(255, 255, 255, 0.4)" fontSize={12} tickLine={false} />
                <YAxis stroke="rgba(255, 255, 255, 0.4)" fontSize={12} tickLine={false} tickFormatter={(val) => `${Math.round(val / 1000)}k€`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.85)', 
                    borderColor: 'rgba(255, 255, 255, 0.15)', 
                    borderRadius: '20px', 
                    color: '#fff', 
                    fontSize: '12px',
                    backdropFilter: 'blur(24px)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                  }}
                  formatter={(val) => [`${formatEuro(val)}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="income" name="Ingresos Anuales" fill="#30d158" radius={[8, 8, 0, 0]} />
                <Bar dataKey="fixedExpenses" name="Gastos Fijos/Hogar" fill="#ff375f" stackId="exp" radius={[0, 0, 0, 0]} />
                <Bar dataKey="debtPayments" name="Hipotecas y Deudas" fill="#bf5af2" stackId="exp" radius={[0, 0, 0, 0]} />
                <Bar dataKey="discretionaryExpenses" name="Gastos Variables/Ocio" fill="#ff9f0a" stackId="exp" radius={[8, 8, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* MILESTONES & EVENTS IN TIME */}
      {milestones.length > 0 && (
        <div className="glass-ios p-6 sm:p-7 rounded-[32px] border border-white/10 space-y-4 shadow-ios-ambient">
          <div className="flex items-center gap-2 text-ios-amber font-bold text-sm tracking-tight">
            <Award className="w-4 h-4" />
            <span>Hitos Financieros Identificados en el Horizonte</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {milestones.map((m, idx) => (
              <div 
                key={idx}
                className="p-4.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 space-y-2 flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-ios-amber/15 text-ios-amber border border-ios-amber/30 font-mono">
                      Año {m.year}
                    </span>
                    <span className="text-xs text-ios-emerald font-semibold">
                      {m.type === 'loan_finished' ? '🎉 Deuda Liquidada' : '🎯 Meta Cumplida'}
                    </span>
                  </div>
                  <h5 className="text-sm font-bold text-white mt-2 tracking-tight">{m.title}</h5>
                  <p className="text-xs text-white/60 mt-0.5">{m.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* YEAR-BY-YEAR CASHFLOW TABLE */}
      <div className="glass-ios p-6 sm:p-7 rounded-[32px] border border-white/10 space-y-4 shadow-ios-ambient">
        <h4 className="text-base font-bold text-white tracking-tight">
          Tabla Detallada de Flujo de Caja Proyectado Año a Año
        </h4>

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-left text-xs sm:text-sm font-mono">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-white/50 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3.5">Año</th>
                <th className="py-3 px-3.5">Ingresos Totales</th>
                <th className="py-3 px-3.5">Gastos Fijos</th>
                <th className="py-3 px-3.5">Hipotecas/Deudas</th>
                <th className="py-3 px-3.5">Ahorro Neto</th>
                <th className="py-3 px-3.5">Tasa Ahorro</th>
                <th className="py-3 px-3.5 text-right">Patrimonio Efectivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {yearlyData.map((row) => (
                <tr key={row.year} className="hover:bg-white/[0.04] transition-colors">
                  <td className="py-3 px-3.5 font-bold text-white">{row.year}</td>
                  <td className="py-3 px-3.5 text-ios-emerald font-semibold">+{formatEuro(row.income)}</td>
                  <td className="py-3 px-3.5 text-ios-rose">-{formatEuro(row.fixedExpenses)}</td>
                  <td className="py-3 px-3.5 text-ios-purple">-{formatEuro(row.debtPayments)}</td>
                  <td className={`py-3 px-3.5 font-bold ${row.netSavings >= 0 ? 'text-ios-emerald' : 'text-ios-rose'}`}>
                    {row.netSavings >= 0 ? '+' : ''}{formatEuro(row.netSavings)}
                  </td>
                  <td className="py-3 px-3.5 text-white/70 font-semibold">{row.savingsRate}%</td>
                  <td className="py-3 px-3.5 text-right font-bold text-ios-amber">{formatEuro(row.netWorth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
