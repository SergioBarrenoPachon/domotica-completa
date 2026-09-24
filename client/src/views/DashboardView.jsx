import React, { memo } from 'react';
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
  ShoppingCart,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';

function DashboardViewComponent({ summary, onNavigate, onQuickToggleScene }) {
  const finance = summary?.finance || { totalIncome: 0, totalExpenses: 0, projectedBalance: 0, currentActualBalance: 0, paidIncome: 0, paidExpenses: 0 };
  const domotics = summary?.domotics || { activeDevicesCount: 0, totalDevicesCount: 0, totalPowerWatts: 0 };
  const meals = summary?.meals || { today: null, shoppingPendingCount: 0 };
  const alerts = summary?.alerts || { criticalCount: 0, warningCount: 0, lowStockPantryCount: 0 };

  const round2 = (val) => Math.round((Number(val) || 0) * 100) / 100;
  const totalIncome = round2(finance.totalIncome);
  const totalExpenses = round2(finance.totalExpenses);
  const projectedBalance = round2(totalIncome - totalExpenses);
  const paidIncome = round2(finance.paidIncome);
  const paidExpenses = round2(finance.paidExpenses);

  const formatMoney = (val) => {
    if (val === undefined || val === null || val === '') return '0,00';
    let num = val;
    if (typeof num === 'string') {
      let str = num.trim().replace('€', '').trim();
      if (str.includes('.') && str.includes(',')) {
        if (str.lastIndexOf('.') < str.lastIndexOf(',')) {
          str = str.replace(/\./g, '').replace(',', '.');
        } else {
          str = str.replace(/,/g, '');
        }
      } else if (str.includes(',')) {
        str = str.replace(',', '.');
      }
      num = parseFloat(str);
    }
    const safeNum = Math.round((Number(num) || 0) * 100) / 100;
    return safeNum.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.07 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 24, stiffness: 320 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-5 sm:space-y-6 pb-20"
    >
      {/* 1. Quick KPI Widgets Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        
        {/* KPI: Domótica */}
        <motion.div
          variants={itemVariants}
          whileTap={{ scale: 0.97 }}
          onClick={() => onNavigate('domotics')}
          className="glass-ios p-4 sm:p-5 rounded-[24px] sm:rounded-[28px] border border-white/12 hover:border-cyan-400/40 cursor-pointer transition-all touch-press group shadow-ambient-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 text-cyan-300 flex items-center justify-center border border-cyan-400/25 group-hover:scale-105 transition-transform shadow-inner-light">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.08] text-slate-300 border border-white/10 font-mono">
              {domotics.totalPowerWatts} W
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white mt-3 font-display tracking-tight">
            {domotics.activeDevicesCount} <span className="text-xs sm:text-sm font-normal text-slate-400">/ {domotics.totalDevicesCount} ON</span>
          </p>
          <p className="text-xs text-slate-400 truncate mt-0.5 font-medium">Dispositivos Activos</p>
        </motion.div>

        {/* KPI: Finanzas */}
        <motion.div
          variants={itemVariants}
          whileTap={{ scale: 0.97 }}
          onClick={() => onNavigate('finance')}
          className="glass-ios p-4 sm:p-5 rounded-[24px] sm:rounded-[28px] border border-white/12 hover:border-amber-400/40 cursor-pointer transition-all touch-press group shadow-ambient-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-300 flex items-center justify-center border border-amber-400/25 group-hover:scale-105 transition-transform shadow-inner-light">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-mono">
              +{formatMoney(totalIncome)}€
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white mt-3 font-display tracking-tight">
            {projectedBalance >= 0 ? `+${formatMoney(projectedBalance)}€` : `${formatMoney(projectedBalance)}€`}
          </p>
          <p className="text-xs text-slate-400 truncate mt-0.5 font-medium">Balance Estimado</p>
        </motion.div>

        {/* KPI: Comidas & Compra */}
        <motion.div
          variants={itemVariants}
          whileTap={{ scale: 0.97 }}
          onClick={() => onNavigate('meals')}
          className="glass-ios p-4 sm:p-5 rounded-[24px] sm:rounded-[28px] border border-white/12 hover:border-emerald-400/40 cursor-pointer transition-all touch-press group shadow-ambient-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center border border-emerald-400/25 group-hover:scale-105 transition-transform shadow-inner-light">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.08] text-slate-300 border border-white/10 font-mono">
              {meals.shoppingPendingCount} en lista
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white mt-3 font-display tracking-tight truncate">
            {meals.today?.lunch ? meals.today.lunch.split(' ')[0] : 'Planificado'}
          </p>
          <p className="text-xs text-slate-400 truncate mt-0.5 font-medium">Almuerzo de Hoy</p>
        </motion.div>

        {/* KPI: Alertas & Garantías */}
        <motion.div
          variants={itemVariants}
          whileTap={{ scale: 0.97 }}
          onClick={() => onNavigate('documents')}
          className="glass-ios p-4 sm:p-5 rounded-[24px] sm:rounded-[28px] border border-white/12 hover:border-purple-400/40 cursor-pointer transition-all touch-press group shadow-ambient-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-300 flex items-center justify-center border border-purple-400/25 group-hover:scale-105 transition-transform shadow-inner-light">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
              alerts.criticalCount > 0 
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/35' 
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
            }`}>
              {alerts.criticalCount > 0 ? `${alerts.criticalCount} Urgente` : 'Al Día'}
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white mt-3 font-display tracking-tight">
            {alerts.criticalCount + alerts.warningCount} <span className="text-xs sm:text-sm font-normal text-slate-400">Avisos</span>
          </p>
          <p className="text-xs text-slate-400 truncate mt-0.5 font-medium">Vencimientos & Stock</p>
        </motion.div>
      </div>

      {/* 2. GRID CENTRAL: 4 GRANDES TARJETAS BENTO ESTILO APPLE iOS 27 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        
        {/* TARJETA 1: PLANIFICADOR DE COMIDAS E INVENTARIO */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -3 }}
          className="relative overflow-hidden glass-ios p-6 sm:p-8 rounded-[32px] sm:rounded-[36px] border border-white/12 shadow-ambient group flex flex-col justify-between bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.12),transparent_65%)]"
        >
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl sm:rounded-[22px] bg-emerald-500/15 text-emerald-300 flex items-center justify-center border border-emerald-400/25 shadow-inner-light flex-shrink-0">
                  <UtensilsCrossed className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-display block">
                    Cocina & Nutrición
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white font-display tracking-tight mt-0.5">
                    Planificador & Despensa
                  </h2>
                </div>
              </div>

              <span className="text-2xl sm:text-3xl p-2 rounded-2xl bg-white/[0.05] border border-white/10">🍲</span>
            </div>

            <p className="text-slate-300 text-sm mt-4 leading-relaxed font-normal">
              Organiza los menús de la semana, controla el stock en nevera y genera automáticamente la lista de la compra contrastando ingredientes.
            </p>

            {/* Live Today Preview Capsule */}
            {meals.today && (
              <div className="mt-4 p-4 rounded-2xl sm:rounded-3xl bg-white/[0.04] border border-white/10 space-y-1.5 shadow-inner-light">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-emerald-300">Menú de hoy ({meals.today.label}):</span>
                  <span className="text-[11px] text-slate-400">{meals.shoppingPendingCount} pendientes en compra</span>
                </div>
                <p className="text-sm font-medium text-white truncate flex items-center gap-1.5">
                  <span className="text-emerald-400 text-xs">🍽️ Comida:</span> 
                  <span>{meals.today.lunch}</span>
                </p>
                <p className="text-sm font-medium text-white truncate flex items-center gap-1.5">
                  <span className="text-indigo-400 text-xs">🌙 Cena:</span> 
                  <span>{meals.today.dinner}</span>
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-2">
            <button
              onClick={() => onNavigate('meals')}
              className="w-full min-h-touch px-5 py-3.5 rounded-2xl sm:rounded-[22px] bg-white/[0.10] hover:bg-white/[0.18] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all touch-press border border-white/15 shadow-inner-light"
            >
              <span>Abrir Planificador</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </button>
          </div>
        </motion.div>

        {/* TARJETA 2: ECONOMÍA DOMÉSTICA */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -3 }}
          className="relative overflow-hidden glass-ios p-6 sm:p-8 rounded-[32px] sm:rounded-[36px] border border-white/12 shadow-ambient group flex flex-col justify-between bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.12),transparent_65%)]"
        >
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl sm:rounded-[22px] bg-amber-500/15 text-amber-300 flex items-center justify-center border border-amber-400/25 shadow-inner-light flex-shrink-0">
                  <Landmark className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 font-display block">
                    Finanzas & Recurrencias
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white font-display tracking-tight mt-0.5">
                    Economía Doméstica
                  </h2>
                </div>
              </div>

              <span className="text-2xl sm:text-3xl p-2 rounded-2xl bg-white/[0.05] border border-white/10">💶</span>
            </div>

            <p className="text-slate-300 text-sm mt-4 leading-relaxed font-normal">
              Gestión mensual con motor de ingresos y gastos periódicos, sistema de excepciones puntuales de este mes y control de pagos.
            </p>

            {/* Financial Progress Bar Capsule */}
            <div className="mt-4 p-4 rounded-2xl sm:rounded-3xl bg-white/[0.04] border border-white/10 space-y-2.5 shadow-inner-light">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Proyección del mes:</span>
                <span className="font-bold text-white font-mono">
                  {formatMoney(totalIncome)}€ - {formatMoney(totalExpenses)}€ = <span className={projectedBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{projectedBalance >= 0 ? `+${formatMoney(projectedBalance)}€` : `${formatMoney(projectedBalance)}€`}</span>
                </span>
              </div>
              <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden flex border border-white/5">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalIncome > 0 ? Math.min(100, (paidIncome / totalIncome) * 100) : 0}%` }}
                  title="Ingresos Cobrados"
                />
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalIncome > 0 ? Math.min(100, (paidExpenses / totalIncome) * 100) : 0}%` }}
                  title="Gastos Pagados"
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span className="text-emerald-300 font-medium">Cobrado: +{formatMoney(paidIncome)}€</span>
                <span className="text-amber-300 font-medium">Pagado: -{formatMoney(paidExpenses)}€</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-2">
            <button
              onClick={() => onNavigate('finance')}
              className="w-full min-h-touch px-5 py-3.5 rounded-2xl sm:rounded-[22px] bg-white/[0.10] hover:bg-white/[0.18] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all touch-press border border-white/15 shadow-inner-light"
            >
              <span>Ver Balance y Transacciones</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            </button>
          </div>
        </motion.div>

        {/* TARJETA 3: DOMÓTICA Y HOGAR */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -3 }}
          className="relative overflow-hidden glass-ios p-6 sm:p-8 rounded-[32px] sm:rounded-[36px] border border-white/12 shadow-ambient group flex flex-col justify-between bg-[radial-gradient(ellipse_at_top_right,rgba(6,182,212,0.12),transparent_65%)]"
        >
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl sm:rounded-[22px] bg-cyan-500/15 text-cyan-300 flex items-center justify-center border border-cyan-400/25 shadow-inner-light flex-shrink-0">
                  <Lightbulb className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 font-display block">
                    Smart Home & eWeLink
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white font-display tracking-tight mt-0.5">
                    Domótica y Hogar
                  </h2>
                </div>
              </div>

              <span className="text-2xl sm:text-3xl p-2 rounded-2xl bg-white/[0.05] border border-white/10">💡</span>
            </div>

            <p className="text-slate-300 text-sm mt-4 leading-relaxed font-normal">
              Control de estancias, reguladores de iluminación, persianas motorizadas y sincronización con Sonoff / eWeLink y Home Assistant.
            </p>

            {/* Quick Scenes Buttons */}
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => onQuickToggleScene('sc-1')}
                className="p-3.5 rounded-2xl bg-white/[0.05] hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-400/30 text-left text-xs font-semibold text-slate-200 flex items-center gap-2.5 transition-all touch-press shadow-inner-light"
              >
                <span className="text-base">🎬</span>
                <span className="truncate">Modo Cine</span>
              </button>

              <button
                onClick={() => onQuickToggleScene('sc-2')}
                className="p-3.5 rounded-2xl bg-white/[0.05] hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-400/30 text-left text-xs font-semibold text-slate-200 flex items-center gap-2.5 transition-all touch-press shadow-inner-light"
              >
                <span className="text-base">🌅</span>
                <span className="truncate">Buenos Días</span>
              </button>
            </div>
          </div>

          <div className="mt-6 pt-2">
            <button
              onClick={() => onNavigate('domotics')}
              className="w-full min-h-touch px-5 py-3.5 rounded-2xl sm:rounded-[22px] bg-white/[0.10] hover:bg-white/[0.18] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all touch-press border border-white/15 shadow-inner-light"
            >
              <span>Controlar Estancias</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
            </button>
          </div>
        </motion.div>

        {/* TARJETA 4: DOCUMENTACIÓN DEL HOGAR */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -3 }}
          className="relative overflow-hidden glass-ios p-6 sm:p-8 rounded-[32px] sm:rounded-[36px] border border-white/12 shadow-ambient group flex flex-col justify-between bg-[radial-gradient(ellipse_at_top_right,rgba(168,85,247,0.12),transparent_65%)]"
        >
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl sm:rounded-[22px] bg-purple-500/15 text-purple-300 flex items-center justify-center border border-purple-400/25 shadow-inner-light flex-shrink-0">
                  <FolderCheck className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 font-display block">
                    Pólizas & Garantías
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white font-display tracking-tight mt-0.5">
                    Documentación Hogar
                  </h2>
                </div>
              </div>

              <span className="text-2xl sm:text-3xl p-2 rounded-2xl bg-white/[0.05] border border-white/10">📁</span>
            </div>

            <p className="text-slate-300 text-sm mt-4 leading-relaxed font-normal">
              Digitalización con cámara y PDF de facturas, electrodomésticos, seguros y contratos con semáforo inteligente de caducidad.
            </p>

            {/* Warranty Alert Capsule */}
            <div className="mt-4 p-4 rounded-2xl sm:rounded-3xl bg-white/[0.04] border border-white/10 flex items-center justify-between shadow-inner-light">
              <div className="flex items-center gap-2.5 text-xs">
                <span className={`w-2.5 h-2.5 rounded-full ${alerts.criticalCount > 0 ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
                <span className="text-slate-300">
                  {alerts.criticalCount > 0 ? `${alerts.criticalCount} documento próximo a expirar` : 'Todas las garantías al día'}
                </span>
              </div>
              <span className="text-xs font-bold text-purple-300 font-display">Ver Pólizas</span>
            </div>
          </div>

          <div className="mt-6 pt-2">
            <button
              onClick={() => onNavigate('documents')}
              className="w-full min-h-touch px-5 py-3.5 rounded-2xl sm:rounded-[22px] bg-white/[0.10] hover:bg-white/[0.18] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all touch-press border border-white/15 shadow-inner-light"
            >
              <span>Ver Archivos y Garantías</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
            </button>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}

export default memo(DashboardViewComponent);
