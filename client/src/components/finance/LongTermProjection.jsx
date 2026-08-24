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
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider font-display">
            <Sparkles className="w-4 h-4" />
            <span>Simulador Financiero y Previsional</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-display mt-1">
            Proyección a Largo Plazo ({years} Años: {startYear} – {endYear})
          </h3>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Simula la evolución de tu patrimonio, extinción de hipotecas y préstamos, impacto de la inflación e interés compuesto en tus ahorros a lo largo de décadas.
          </p>
        </div>

        {/* Horizon Pills */}
        <div className="flex flex-wrap items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/10 self-start lg:self-auto">
          {HORIZONS.map((h) => (
            <button
              key={h.value}
              onClick={() => setYears(h.value)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all touch-press ${
                years === h.value
                  ? 'bg-amber-500 text-slate-950 shadow-glow-amber'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
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
        <div className="glass-panel p-5 rounded-3xl border border-amber-500/20 bg-amber-950/15 flex flex-col justify-between">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            Patrimonio Acumulado ({endYear})
          </span>
          <div className="mt-3">
            <p className="text-3xl font-black text-white font-mono">
              {formatEuro(finalProjectedNetWorth)}
            </p>
            <p className="text-xs text-amber-300/80 mt-1">
              Ahorro neto acumulado en efectivo
            </p>
          </div>
        </div>

        {/* Con Inversión / Interés Compuesto */}
        <div className="glass-panel p-5 rounded-3xl border border-emerald-500/20 bg-emerald-950/15 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Con Interés Compuesto (+3.5%)
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-emerald-400 font-mono">
              {formatEuro(finalProjectedWithInvestment)}
            </p>
            <p className="text-xs text-emerald-300/80 mt-1">
              Rendimiento real invirtiendo el excedente
            </p>
          </div>
        </div>

        {/* Ahorro Medio Anual */}
        <div className="glass-panel p-5 rounded-3xl border border-blue-500/20 bg-blue-950/15 flex flex-col justify-between">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
            Capacidad Ahorro Media
          </span>
          <div className="mt-3">
            <p className="text-3xl font-black text-white font-mono">
              {yearlyData.length > 0
                ? formatEuro(Math.round(yearlyData.reduce((acc, y) => acc + y.netSavings, 0) / yearlyData.length))
                : '0€'} / año
            </p>
            <p className="text-xs text-blue-300/80 mt-1">
              Promedio neto por año proyectado
            </p>
          </div>
        </div>

        {/* Tasa Media de Ahorro */}
        <div className="glass-panel p-5 rounded-3xl border border-purple-500/20 bg-purple-950/15 flex flex-col justify-between">
          <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
            Tasa Media de Ahorro
          </span>
          <div className="mt-3">
            <p className="text-3xl font-black text-purple-300 font-mono">
              {yearlyData.length > 0
                ? Math.round(yearlyData.reduce((acc, y) => acc + y.savingsRate, 0) / yearlyData.length)
                : 0}%
            </p>
            <p className="text-xs text-purple-300/80 mt-1">
              Del total de ingresos netos anuales
            </p>
          </div>
        </div>

      </div>

      {/* Simulator Sliders & Controls */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-white font-bold text-sm font-display">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>Ajustes y Parámetros de Simulación Macroeconómica</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Inflación */}
          <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-semibold">Inflación Anual Estimada</span>
              <span className="font-mono font-bold text-amber-400">{inflation}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="8"
              step="0.25"
              value={inflation}
              onChange={(e) => setInflation(parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block">Aumenta suministros, comida y ocio</span>
          </div>

          {/* Crecimiento salarial */}
          <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-semibold">Subida Salarial Anual</span>
              <span className="font-mono font-bold text-emerald-400">{growth}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="8"
              step="0.25"
              value={growth}
              onChange={(e) => setGrowth(parseFloat(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block">Incremento medio anual de ingresos</span>
          </div>

          {/* Patrimonio Inicial */}
          <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1.5">
            <label className="text-xs text-slate-300 font-semibold block">Patrimonio Inicial (€)</label>
            <input
              type="number"
              value={netWorth}
              onChange={(e) => setNetWorth(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono text-sm focus:border-amber-400 outline-none"
              placeholder="15000"
            />
            <span className="text-[10px] text-slate-500 block">Colchón de liquidez actual</span>
          </div>

          {/* Aportación Extra Mensual */}
          <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1.5">
            <label className="text-xs text-slate-300 font-semibold block">Ahorro Extra Mensual (€)</label>
            <input
              type="number"
              value={extraSavings}
              onChange={(e) => setExtraSavings(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono text-sm focus:border-amber-400 outline-none"
              placeholder="0"
            />
            <span className="text-[10px] text-slate-500 block">Aportación recurrente voluntaria</span>
          </div>

        </div>
      </div>

      {/* CHARTS CONTAINER */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/10 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-bold text-white font-display">
              {activeChartTab === 'patrimonio' ? 'Curva de Crecimiento Patrimonial (€)' : 'Flujo Anual: Ingresos vs Gastos (€)'}
            </h4>
          </div>

          {/* Chart Toggle */}
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
            <button
              onClick={() => setActiveChartTab('patrimonio')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeChartTab === 'patrimonio'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Patrimonio Acumulado
            </button>
            <button
              onClick={() => setActiveChartTab('flujo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeChartTab === 'flujo'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
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
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorInvest" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="yearLabel" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} tickFormatter={(val) => `${Math.round(val / 1000)}k€`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
                  formatter={(val) => [`${formatEuro(val)}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="netWorth" name="Ahorro Efectivo Acumulado" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorNetWorth)" />
                <Area type="monotone" dataKey="wealthWithInvestment" name="Patrimonio con Inversión (+3.5%)" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorInvest)" />
              </AreaChart>
            ) : (
              <BarChart data={yearlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="yearLabel" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} tickFormatter={(val) => `${Math.round(val / 1000)}k€`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
                  formatter={(val) => [`${formatEuro(val)}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="income" name="Ingresos Anuales" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="fixedExpenses" name="Gastos Fijos/Hogar" fill="#f43f5e" stackId="exp" radius={[0, 0, 0, 0]} />
                <Bar dataKey="debtPayments" name="Hipotecas y Deudas" fill="#8b5cf6" stackId="exp" radius={[0, 0, 0, 0]} />
                <Bar dataKey="discretionaryExpenses" name="Gastos Variables/Ocio" fill="#fb923c" stackId="exp" radius={[6, 6, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* MILESTONES & EVENTS IN TIME */}
      {milestones.length > 0 && (
        <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm font-display">
            <Award className="w-4 h-4" />
            <span>Hitos Financieros Identificados en el Horizonte</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {milestones.map((m, idx) => (
              <div 
                key={idx}
                className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/20 text-amber-300 font-mono">
                      Año {m.year}
                    </span>
                    <span className="text-xs text-emerald-400 font-bold">
                      {m.type === 'loan_finished' ? '🎉 Deuda Liquidada' : '🎯 Meta Cumplida'}
                    </span>
                  </div>
                  <h5 className="text-sm font-bold text-white mt-1.5">{m.title}</h5>
                  <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* YEAR-BY-YEAR CASHFLOW TABLE */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/10 space-y-3">
        <h4 className="text-base font-bold text-white font-display">
          Tabla Detallada de Flujo de Caja Proyectado Año a Año
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm font-mono">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Año</th>
                <th className="py-2.5 px-3">Ingresos Totales</th>
                <th className="py-2.5 px-3">Gastos Fijos</th>
                <th className="py-2.5 px-3">Hipotecas/Deudas</th>
                <th className="py-2.5 px-3">Ahorro Neto</th>
                <th className="py-2.5 px-3">Tasa Ahorro</th>
                <th className="py-2.5 px-3 text-right">Patrimonio Efectivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {yearlyData.map((row) => (
                <tr key={row.year} className="hover:bg-white/5 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-white">{row.year}</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-semibold">+{formatEuro(row.income)}</td>
                  <td className="py-2.5 px-3 text-rose-300">-{formatEuro(row.fixedExpenses)}</td>
                  <td className="py-2.5 px-3 text-purple-300">-{formatEuro(row.debtPayments)}</td>
                  <td className={`py-2.5 px-3 font-bold ${row.netSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {row.netSavings >= 0 ? '+' : ''}{formatEuro(row.netSavings)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 font-bold">{row.savingsRate}%</td>
                  <td className="py-2.5 px-3 text-right font-black text-amber-400">{formatEuro(row.netWorth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
