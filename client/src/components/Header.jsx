import React, { useState, useEffect } from 'react';
import { Clock, ShieldAlert, Sparkles, Bell, Wifi, ChevronDown, AlertTriangle, AlertCircle, ShoppingBag, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header({ dashboardSummary, onNavigate }) {
  const [time, setTime] = useState(new Date());
  const [showAlertsDrawer, setShowAlertsDrawer] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hour = time.getHours();
  let greeting = 'Buenas noches';
  let greetingIcon = '🌙';
  if (hour >= 6 && hour < 13) {
    greeting = 'Buenos días';
    greetingIcon = '☀️';
  } else if (hour >= 13 && hour < 20) {
    greeting = 'Buenas tardes';
    greetingIcon = '🌤️';
  }

  const formattedDate = time.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const formattedTime = time.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const alerts = dashboardSummary?.alerts || { criticalCount: 0, warningCount: 0, criticalItems: [], warningItems: [], lowStockPantryCount: 0 };
  const totalAlertsCount = (alerts.criticalCount || 0) + (alerts.warningCount || 0) + (alerts.lowStockPantryCount || 0);

  return (
    <header className="sticky top-0 z-30 pt-3 pb-2 px-4 md:px-8 glass-panel border-b border-white/10 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        
        {/* Left: Saludo & Fecha */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{greetingIcon}</span>
            <h1 className="text-lg md:text-2xl font-bold tracking-tight text-white truncate font-display">
              {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-cyan-300">Familia</span>
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              En Línea
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-400 capitalize mt-0.5 truncate">
            {formattedDate}
          </p>
        </div>

        {/* Right: Reloj & Botón de Alertas Táctil */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          
          {/* Reloj Digital Bento */}
          <div className="hidden xs:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-surface/90 border border-white/10 text-brand-400 font-mono text-sm md:text-base font-semibold shadow-inner">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>{formattedTime}</span>
          </div>

          {/* Botón de Alertas Notificaciones */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowAlertsDrawer(!showAlertsDrawer)}
            className={`relative min-h-touch min-w-touch px-3 py-2 rounded-2xl border flex items-center gap-2 font-medium text-sm transition-all ${
              totalAlertsCount > 0
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-glow-amber'
                : 'bg-surface/80 text-slate-300 border-white/10 hover:bg-surface-hover'
            }`}
            aria-label="Ver alertas del hogar"
          >
            <Bell className={`w-5 h-5 ${totalAlertsCount > 0 ? 'text-rose-400 animate-bounce' : 'text-slate-400'}`} />
            <span className="hidden md:inline font-display">
              {totalAlertsCount > 0 ? `${totalAlertsCount} Alertas` : 'Sin avisos'}
            </span>
            {totalAlertsCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                {totalAlertsCount}
              </span>
            )}
          </motion.button>
        </div>
      </div>

      {/* Banner Desplegable de Alertas Críticas */}
      <AnimatePresence>
        {showAlertsDrawer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-3 pt-2"
          >
            <div className="max-w-7xl mx-auto p-4 rounded-3xl bg-slate-900/95 border border-rose-500/30 shadow-2xl backdrop-blur-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-base font-display">
                  <ShieldAlert className="w-5 h-5" />
                  <span>Centro de Alertas y Vencimientos del Hogar</span>
                </div>
                <button
                  onClick={() => setShowAlertsDrawer(false)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-white/5 rounded-lg"
                >
                  Cerrar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {/* Garantías Críticas */}
                {alerts.criticalItems?.map(item => (
                  <div
                    key={item.id}
                    onClick={() => { setShowAlertsDrawer(false); onNavigate('documents'); }}
                    className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-3 cursor-pointer hover:bg-rose-900/40 transition-colors"
                  >
                    <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-rose-200 truncate">{item.title}</p>
                      <p className="text-xs text-rose-300/80">
                        {item.daysLeft <= 0 ? '¡Garantía / Póliza VENCIDA!' : `Vence en ${item.daysLeft} días`}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Garantías de Aviso */}
                {alerts.warningItems?.map(item => (
                  <div
                    key={item.id}
                    onClick={() => { setShowAlertsDrawer(false); onNavigate('documents'); }}
                    className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3 cursor-pointer hover:bg-amber-900/40 transition-colors"
                  >
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-200 truncate">{item.title}</p>
                      <p className="text-xs text-amber-300/80">Próximo vencimiento: {item.daysLeft} días restantes</p>
                    </div>
                  </div>
                ))}

                {/* Stock Despensa */}
                {alerts.lowStockItems?.map(item => (
                  <div
                    key={item.id}
                    onClick={() => { setShowAlertsDrawer(false); onNavigate('meals'); }}
                    className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 flex items-start gap-3 cursor-pointer hover:bg-cyan-900/40 transition-colors"
                  >
                    <Package className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-cyan-200 truncate">{item.name}</p>
                      <p className="text-xs text-cyan-300/80">Stock agotado en {item.zone} (0 {item.unit})</p>
                    </div>
                  </div>
                ))}

                {totalAlertsCount === 0 && (
                  <div className="col-span-full py-4 text-center text-slate-400 text-sm">
                    ✨ ¡Todo en orden! No hay garantías próximas a vencer ni productos agotados.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
