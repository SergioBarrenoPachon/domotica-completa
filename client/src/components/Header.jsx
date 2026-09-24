import React, { useState, useEffect, useMemo, memo } from 'react';
import { Clock, ShieldAlert, Sparkles, Bell, Wifi, ChevronDown, AlertTriangle, AlertCircle, ShoppingBag, Package, Database, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DatabaseStatusModal from './DatabaseStatusModal';

// Isolated Digital Clock so Header does not re-render 60 times/minute
const DigitalClock = memo(function DigitalClock() {
  const [timeStr, setTimeStr] = useState(() => 
    new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return <span>{timeStr}</span>;
});

function HeaderComponent({ dashboardSummary, onNavigate, onManualSync, isRefreshing = false }) {
  const [showAlertsDrawer, setShowAlertsDrawer] = useState(false);
  const [showDbModal, setShowDbModal] = useState(false);

  // Greeting calculated only on mount or hourly interval
  const { greeting, greetingIcon, formattedDate } = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    let g = 'Buenas noches';
    let gIcon = '🌙';
    if (hour >= 6 && hour < 13) {
      g = 'Buenos días';
      gIcon = '☀️';
    } else if (hour >= 13 && hour < 20) {
      g = 'Buenas tardes';
      gIcon = '🌤️';
    }
    const fDate = now.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return { greeting: g, greetingIcon: gIcon, formattedDate: fDate };
  }, []);

  const alerts = dashboardSummary?.alerts || { criticalCount: 0, warningCount: 0, criticalItems: [], warningItems: [], lowStockPantryCount: 0 };
  const totalAlertsCount = (alerts.criticalCount || 0) + (alerts.warningCount || 0) + (alerts.lowStockPantryCount || 0);

  return (
    <header className="sticky top-0 z-30 pt-3 pb-2.5 px-3 sm:px-6 md:px-8 glass-ios border-b border-white/10 backdrop-blur-2xl transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        
        {/* Left: Saludo & Fecha */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
            <span className="text-base sm:text-lg">{greetingIcon}</span>
            <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-white truncate font-display">
              {greeting}, <span className="text-white font-black drop-shadow-sm">Familia</span>
            </h1>
            <button
              type="button"
              onClick={() => setShowDbModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] sm:text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all touch-press shadow-inner-light"
              title="Neon PostgreSQL & Automatizaciones de Atajos de Apple"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <Database className="w-3 h-3 hidden xs:inline opacity-80" />
              <span>Neon DB & Atajos</span>
            </button>
          </div>
          <p className="text-[11px] sm:text-xs md:text-sm text-slate-400 capitalize mt-0.5 truncate tracking-normal">
            {formattedDate}
          </p>
        </div>

        {/* Right: Reloj, Sync & Botón de Alertas Táctil */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          
          {/* Botón Sincronizar LAN Táctil */}
          {onManualSync && (
            <motion.button
              whileTap={{ scale: 0.90 }}
              onClick={onManualSync}
              disabled={isRefreshing}
              className="min-h-touch min-w-touch p-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-brand-400 hover:text-white flex items-center justify-center transition-all touch-press shadow-inner-light"
              title="Sincronizar ahora con la base de datos central"
              aria-label="Sincronizar datos"
            >
              <RefreshCw className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isRefreshing ? 'animate-spin text-brand-400' : ''}`} />
            </motion.button>
          )}

          {/* Reloj Digital Monocromo Minimalista */}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/[0.05] border border-white/10 text-slate-200 font-mono text-xs md:text-sm font-medium tracking-tight shadow-inner-light">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <DigitalClock />
          </div>

          {/* Botón de Alertas Notificaciones */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowAlertsDrawer(!showAlertsDrawer)}
            className={`relative min-h-touch min-w-touch px-3 py-2 rounded-2xl border flex items-center gap-2 font-medium text-xs sm:text-sm transition-all touch-press ${
              totalAlertsCount > 0
                ? 'bg-rose-500/15 text-rose-200 border-rose-500/30 shadow-glow-rose'
                : 'bg-white/[0.06] text-slate-300 border-white/10 hover:bg-white/[0.12]'
            }`}
            aria-label="Ver alertas del hogar"
          >
            <Bell className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${totalAlertsCount > 0 ? 'text-rose-400 animate-bounce' : 'text-slate-400'}`} />
            <span className="hidden md:inline font-display font-semibold">
              {totalAlertsCount > 0 ? `${totalAlertsCount} Alertas` : 'Avisos'}
            </span>
            {totalAlertsCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-md">
                {totalAlertsCount}
              </span>
            )}
          </motion.button>
        </div>
      </div>

      {/* Centro de Notificaciones y Alertas Estilo iOS 27 */}
      <AnimatePresence>
        {showAlertsDrawer && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.98 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="overflow-hidden mt-3 pt-2"
          >
            <div className="max-w-7xl mx-auto p-4 sm:p-5 rounded-[28px] glass-ios-elevated border border-rose-500/25 shadow-ambient space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-sm sm:text-base font-display">
                  <ShieldAlert className="w-4.5 h-4.5 text-rose-400" />
                  <span>Centro de Avisos & Vencimientos</span>
                </div>
                <button
                  onClick={() => setShowAlertsDrawer(false)}
                  className="text-xs text-slate-400 hover:text-white px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-full transition-colors touch-press"
                >
                  Cerrar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1 no-scrollbar">
                {/* Garantías Críticas */}
                {alerts.criticalItems?.map(item => (
                  <div
                    key={item.id}
                    onClick={() => { setShowAlertsDrawer(false); onNavigate('documents'); }}
                    className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-start gap-3 cursor-pointer hover:bg-rose-900/30 transition-all touch-press"
                  >
                    <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-rose-100 truncate">{item.title}</p>
                      <p className="text-xs text-rose-300/80 mt-0.5">
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
                    className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3 cursor-pointer hover:bg-amber-900/30 transition-all touch-press"
                  >
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-100 truncate">{item.title}</p>
                      <p className="text-xs text-amber-300/80 mt-0.5">Próximo vencimiento: {item.daysLeft} días restantes</p>
                    </div>
                  </div>
                ))}

                {/* Stock Despensa */}
                {alerts.lowStockItems?.map(item => (
                  <div
                    key={item.id}
                    onClick={() => { setShowAlertsDrawer(false); onNavigate('meals'); }}
                    className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-3 cursor-pointer hover:bg-cyan-900/30 transition-all touch-press"
                  >
                    <Package className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-cyan-100 truncate">{item.name}</p>
                      <p className="text-xs text-cyan-300/80 mt-0.5">Stock agotado en {item.zone} (0 {item.unit})</p>
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

      {/* Modal de Base de Datos y Persistencia */}
      <DatabaseStatusModal
        isOpen={showDbModal}
        onClose={() => setShowDbModal(false)}
      />
    </header>
  );
}

export default memo(HeaderComponent);

