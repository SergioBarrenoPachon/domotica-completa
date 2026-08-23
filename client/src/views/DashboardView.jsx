import React from 'react';
import { 
  UtensilsCrossed, 
  Landmark, 
  Lightbulb, 
  FolderCheck, 
  ArrowRight, 
  Sparkles, 
  ShieldAlert, 
  Zap, 
  TrendingUp, 
  Calendar, 
  CheckCircle2, 
  Power,
  ScanLine,
  ShoppingCart,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardView({ summary, onNavigate, onQuickToggleScene, onQuickSyncShopping }) {
  const finance = summary?.finance || { totalIncome: 0, totalExpenses: 0, projectedBalance: 0, currentActualBalance: 0 };
  const domotics = summary?.domotics || { activeDevicesCount: 0, totalDevicesCount: 0, totalPowerWatts: 0 };
  const meals = summary?.meals || { today: null, shoppingPendingCount: 0 };
  const alerts = summary?.alerts || { criticalCount: 0, warningCount: 0, lowStockPantryCount: 0 };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 20, stiffness: 300 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-24"
    >
      {/* 1. Quick KPI Widgets Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* KPI: Domótica */}
        <motion.div
          variants={itemVariants}
          onClick={() => onNavigate('domotics')}
          className="glass-panel p-4 rounded-3xl border border-white/10 hover:border-cyan-500/40 cursor-pointer transition-all touch-press group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/5 text-slate-300">
              {domotics.totalPowerWatts} W
            </span>
          </div>
          <p className="text-2xl font-bold text-white mt-3 font-display">
            {domotics.activeDevicesCount} <span className="text-xs font-normal text-slate-400">/ {domotics.totalDevicesCount} ON</span>
          </p>
          <p className="text-xs text-slate-400 truncate mt-0.5">Dispositivos Activos</p>
        </motion.div>

        {/* KPI: Finanzas */}
        <motion.div
          variants={itemVariants}
          onClick={() => onNavigate('finance')}
          className="glass-panel p-4 rounded-3xl border border-white/10 hover:border-amber-500/40 cursor-pointer transition-all touch-press group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
              +{finance.totalIncome}€
            </span>
          </div>
          <p className="text-2xl font-bold text-white mt-3 font-display">
            {finance.projectedBalance >= 0 ? `+${finance.projectedBalance}€` : `${finance.projectedBalance}€`}
          </p>
          <p className="text-xs text-slate-400 truncate mt-0.5">Balance Estimado Mes</p>
        </motion.div>

        {/* KPI: Comidas & Compra */}
        <motion.div
          variants={itemVariants}
          onClick={() => onNavigate('meals')}
          className="glass-panel p-4 rounded-3xl border border-white/10 hover:border-emerald-500/40 cursor-pointer transition-all touch-press group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/5 text-slate-300">
              {meals.shoppingPendingCount} pendientes
            </span>
          </div>
          <p className="text-2xl font-bold text-white mt-3 font-display truncate">
            {meals.today?.lunch ? meals.today.lunch.split(' ')[0] : 'Planificado'}
          </p>
          <p className="text-xs text-slate-400 truncate mt-0.5">Almuerzo de Hoy</p>
        </motion.div>

        {/* KPI: Alertas & Garantías */}
        <motion.div
          variants={itemVariants}
          onClick={() => onNavigate('documents')}
          className="glass-panel p-4 rounded-3xl border border-white/10 hover:border-purple-500/40 cursor-pointer transition-all touch-press group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${alerts.criticalCount > 0 ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50' : 'bg-emerald-500/20 text-emerald-300'}`}>
              {alerts.criticalCount > 0 ? `${alerts.criticalCount} Urgente` : 'Al Día'}
            </span>
          </div>
          <p className="text-2xl font-bold text-white mt-3 font-display">
            {alerts.criticalCount + alerts.warningCount} <span className="text-xs font-normal text-slate-400">Avisos</span>
          </p>
          <p className="text-xs text-slate-400 truncate mt-0.5">Vencimientos & Stock</p>
        </motion.div>
      </div>

      {/* 2. GRID CENTRAL: 4 GRANDES TARJETAS / BOTONES BENTO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        
        {/* TARJETA 1: PLANIFICADOR DE COMIDAS E INVENTARIO */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -3 }}
          className="relative overflow-hidden glass-panel p-6 sm:p-7 rounded-4xl border border-white/15 bg-gradient-to-br from-emerald-950/40 via-surface to-slate-900 shadow-xl group flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-glow-brand">
                  <UtensilsCrossed className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-display">
                    Cocina & Nutrición
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                    Planificador & Despensa
                  </h2>
                </div>
              </div>

              <span className="text-2xl">🍲</span>
            </div>

            <p className="text-slate-300 text-sm mt-4 leading-relaxed">
              Organiza los menús de la semana, controla el stock en nevera y genera automáticamente la lista de la compra contrastando ingredientes.
            </p>

            {/* Live Today Preview */}
            {meals.today && (
              <div className="mt-4 p-3.5 rounded-2xl bg-black/30 border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-emerald-300">📅 Menú de hoy ({meals.today.label}):</span>
                  <span>{meals.shoppingPendingCount} en lista de compra</span>
                </div>
                <p className="text-sm font-medium text-white truncate">
                  🍽️ <span className="text-slate-300">Almuerzo:</span> {meals.today.lunch}
                </p>
                <p className="text-sm font-medium text-white truncate">
                  🌙 <span className="text-slate-300">Cena:</span> {meals.today.dinner}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-2 flex items-center gap-3">
            <button
              onClick={() => onNavigate('meals')}
              className="flex-1 min-h-touch px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 touch-press"
            >
              <span>Abrir Planificador</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* TARJETA 2: ECONOMÍA DOMÉSTICA */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -3 }}
          className="relative overflow-hidden glass-panel p-6 sm:p-7 rounded-4xl border border-white/15 bg-gradient-to-br from-amber-950/40 via-surface to-slate-900 shadow-xl group flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-glow-amber">
                  <Landmark className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-display">
                    Finanzas & Recurrencias
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                    Economía Doméstica
                  </h2>
                </div>
              </div>

              <span className="text-2xl">💶</span>
            </div>

            <p className="text-slate-300 text-sm mt-4 leading-relaxed">
              Gestión mensual con motor de ingresos y gastos periódicos, sistema de excepciones puntuales de este mes y control de pagos.
            </p>

            {/* Financial Progress Bar */}
            <div className="mt-4 p-3.5 rounded-2xl bg-black/30 border border-white/10 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Proyección del mes:</span>
                <span className="font-bold text-white font-mono">
                  {finance.totalIncome}€ - {finance.totalExpenses}€ = <span className={finance.projectedBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{finance.projectedBalance}€</span>
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: `${finance.totalIncome > 0 ? Math.min(100, (finance.paidIncome / finance.totalIncome) * 100) : 0}%` }}
                  title="Ingresos Cobrados"
                />
                <div
                  className="bg-amber-500 h-full"
                  style={{ width: `${finance.totalExpenses > 0 ? Math.min(100, (finance.paidExpenses / (finance.totalIncome || 1)) * 100) : 0}%` }}
                  title="Gastos Pagados"
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span className="text-emerald-400">Cobrado: {finance.paidIncome}€</span>
                <span className="text-amber-400">Pagado: {finance.paidExpenses}€</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-2 flex items-center gap-3">
            <button
              onClick={() => onNavigate('finance')}
              className="flex-1 min-h-touch px-5 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-950/60 touch-press"
            >
              <span>Ver Balance y Transacciones</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* TARJETA 3: DOMÓTICA Y HOGAR */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -3 }}
          className="relative overflow-hidden glass-panel p-6 sm:p-7 rounded-4xl border border-white/15 bg-gradient-to-br from-cyan-950/40 via-surface to-slate-900 shadow-xl group flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-3xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shadow-glow-cyan">
                  <Lightbulb className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-display">
                    Smart Home & eWeLink
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                    Domótica y Hogar
                  </h2>
                </div>
              </div>

              <span className="text-2xl">💡</span>
            </div>

            <p className="text-slate-300 text-sm mt-4 leading-relaxed">
              Control de estancias, reguladores de iluminación, persianas motorizadas y sincronización con Sonoff / eWeLink y Home Assistant.
            </p>

            {/* Quick Scenes Buttons */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => onQuickToggleScene('sc-1')}
                className="p-3 rounded-2xl bg-white/5 hover:bg-cyan-500/20 border border-white/10 text-left text-xs font-medium text-slate-200 flex items-center gap-2 touch-press"
              >
                <span>🎬</span>
                <span className="truncate">Modo Cine</span>
              </button>
              <button
                onClick={() => onQuickToggleScene('sc-2')}
                className="p-3 rounded-2xl bg-white/5 hover:bg-cyan-500/20 border border-white/10 text-left text-xs font-medium text-slate-200 flex items-center gap-2 touch-press"
              >
                <span>🌅</span>
                <span className="truncate">Buenos Días</span>
              </button>
            </div>
          </div>

          <div className="mt-6 pt-2 flex items-center gap-3">
            <button
              onClick={() => onNavigate('domotics')}
              className="flex-1 min-h-touch px-5 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/60 touch-press"
            >
              <span>Controlar Estancias</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* TARJETA 4: DOCUMENTACIÓN DEL HOGAR */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -3 }}
          className="relative overflow-hidden glass-panel p-6 sm:p-7 rounded-4xl border border-white/15 bg-gradient-to-br from-purple-950/40 via-surface to-slate-900 shadow-xl group flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-44 h-44 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-3xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shadow-glow-brand">
                  <FolderCheck className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400 font-display">
                    Pólizas & Garantías
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                    Documentación Hogar
                  </h2>
                </div>
              </div>

              <span className="text-2xl">📁</span>
            </div>

            <p className="text-slate-300 text-sm mt-4 leading-relaxed">
              Digitalización con cámara y PDF de facturas, electrodomésticos, seguros y contratos con semáforo inteligente de caducidad.
            </p>

            {/* Warranty Alert Capsule */}
            <div className="mt-4 p-3.5 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-slate-300">
                  {alerts.criticalCount > 0 ? `${alerts.criticalCount} documento próximo a expirar` : 'Todas las garantías al día'}
                </span>
              </div>
              <span className="text-xs font-bold text-purple-400 font-display">Ver Pólizas</span>
            </div>
          </div>

          <div className="mt-6 pt-2 flex items-center gap-3">
            <button
              onClick={() => onNavigate('documents')}
              className="flex-1 min-h-touch px-5 py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-purple-950/60 touch-press"
            >
              <span>Ver Archivos y Garantías</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
