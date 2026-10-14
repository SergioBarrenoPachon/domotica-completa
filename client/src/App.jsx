import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from './services/api';
import Header from './components/Header';
import NavPill from './components/NavPill';
import DashboardView from './views/DashboardView';
import MealsView from './views/MealsView';
import FinanceView from './views/FinanceView';
import DomoticsView from './views/DomoticsView';
import DocumentsView from './views/DocumentsView';
import ErrorBoundary from './components/ErrorBoundary';
import FeedbackHost from './components/feedback/FeedbackHost';
import { notify } from './components/feedback/feedback';

// Rutas por hash: permiten usar el botón "atrás" del navegador / gesto de iOS,
// recargar sin perder la sección y compartir enlaces directos (#/economia).
const VIEWS = {
  dashboard: { slug: 'inicio', title: 'Inicio' },
  meals: { slug: 'comidas', title: 'Comidas' },
  finance: { slug: 'economia', title: 'Economía' },
  domotics: { slug: 'domotica', title: 'Domótica' },
  documents: { slug: 'documentos', title: 'Documentos' }
};
const SLUG_TO_VIEW = Object.fromEntries(Object.entries(VIEWS).map(([id, v]) => [v.slug, id]));
const APP_TITLE = 'Hogar Inteligente';

function viewFromHash() {
  const slug = window.location.hash.replace(/^#\/?/, '').split(/[/?]/)[0];
  return SLUG_TO_VIEW[slug] || 'dashboard';
}

function useOnlineStatus() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export default function App() {
  const [currentView, setCurrentView] = useState(viewFromHash);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const isOnline = useOnlineStatus();

  // Lazy tab mounting: solo la vista inicial se monta al arrancar para una carga instantánea.
  // Al pulsar otra pestaña por primera vez, se añade a visitedTabs y queda cacheada en memoria (0ms switch).
  const [visitedTabs, setVisitedTabs] = useState(() => new Set([viewFromHash()]));

  const lastSyncTimeRef = useRef(0);
  const scrollPositionsRef = useRef({});
  const currentViewRef = useRef(currentView);

  const fetchSummary = useCallback(async ({ silent = true } = {}) => {
    try {
      setIsRefreshing(true);
      const summary = await api.getDashboard();
      setDashboardSummary(summary);
      lastSyncTimeRef.current = Date.now();
      setLastSyncAt(Date.now());
      return true;
    } catch (err) {
      console.error('Error cargando resumen:', err);
      if (!silent) notify.error(err.message, { title: 'No se pudo sincronizar' });
      return false;
    } finally {
      setLoadingSummary(false);
      setTimeout(() => setIsRefreshing(false), 200);
    }
  }, []);

  // El callback que reciben las vistas no debe mostrar errores (se llama tras cada acción)
  const refreshDashboard = useCallback(() => fetchSummary({ silent: true }), [fetchSummary]);

  const handleManualSync = useCallback(async () => {
    const ok = await fetchSummary({ silent: false });
    setRefreshKey((prev) => prev + 1);
    if (ok) notify.success('Datos sincronizados');
  }, [fetchSummary]);

  // Activa una vista (llamado al cambiar el hash)
  const activateView = useCallback((viewId) => {
    const prev = currentViewRef.current;
    if (prev === viewId) return;
    scrollPositionsRef.current[prev] = window.scrollY;
    currentViewRef.current = viewId;
    setVisitedTabs((prevSet) => {
      if (prevSet.has(viewId)) return prevSet;
      const next = new Set(prevSet);
      next.add(viewId);
      return next;
    });
    setCurrentView(viewId);
  }, []);

  const handleNavigate = useCallback((viewId) => {
    if (!VIEWS[viewId]) return;
    if (viewId === currentViewRef.current) {
      // Pulsar la pestaña activa vuelve arriba (comportamiento estándar de iOS)
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.location.hash = `/${VIEWS[viewId].slug}`;
  }, []);

  // Sincronizar vista con el hash (navegación atrás/adelante)
  useEffect(() => {
    const onHashChange = () => activateView(viewFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [activateView]);

  // Restaurar la posición de scroll de cada pestaña y actualizar el título del documento
  useLayoutEffect(() => {
    window.scrollTo(0, scrollPositionsRef.current[currentView] || 0);
    document.title = currentView === 'dashboard'
      ? `${APP_TITLE} | Domótica & Gestión Integral`
      : `${VIEWS[currentView].title} · ${APP_TITLE}`;
  }, [currentView]);

  useEffect(() => {
    fetchSummary();

    // Sincronización en segundo plano con enfriamiento de 60s al volver a la pestaña
    const handleSync = () => {
      if (document.visibilityState === 'visible' && (Date.now() - lastSyncTimeRef.current > 60000)) {
        fetchSummary();
      }
    };
    document.addEventListener('visibilitychange', handleSync);
    return () => {
      document.removeEventListener('visibilitychange', handleSync);
    };
  }, [fetchSummary]);

  // Al recuperar la conexión, refrescar datos automáticamente
  const wasOfflineRef = useRef(false);
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
    } else if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      notify.success('Conexión recuperada');
      fetchSummary();
      setRefreshKey((prev) => prev + 1);
    }
  }, [isOnline, fetchSummary]);

  // Quick Action from Dashboard: Trigger Scene
  const handleQuickToggleScene = useCallback(async (sceneId) => {
    try {
      const res = await api.activateScene(sceneId);
      notify.success(res?.message || 'Escena activada');
      fetchSummary();
    } catch (err) {
      notify.error(err.message, { title: 'No se pudo activar la escena' });
    }
  }, [fetchSummary]);

  const alertsCount = useMemo(() => {
    return (dashboardSummary?.alerts?.criticalCount || 0) + (dashboardSummary?.alerts?.warningCount || 0);
  }, [dashboardSummary?.alerts]);

  const shoppingPending = useMemo(() => {
    return dashboardSummary?.meals?.shoppingPendingCount || 0;
  }, [dashboardSummary?.meals]);

  const paneStyle = (id) => ({ display: currentView === id ? 'block' : 'none' });

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col selection:bg-brand-500 selection:text-white relative overflow-x-hidden">

      {/* Enlace de salto para usuarios de teclado / lector de pantalla */}
      <a href="#main-content" className="skip-link">Saltar al contenido</a>

      {/* Zero-overhead static ambient gradient mesh */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            radial-gradient(at 10% 0%, rgba(245, 158, 11, 0.08) 0px, transparent 50%),
            radial-gradient(at 90% 15%, rgba(6, 182, 212, 0.08) 0px, transparent 50%),
            radial-gradient(at 0% 75%, rgba(168, 85, 247, 0.07) 0px, transparent 50%),
            radial-gradient(at 85% 85%, rgba(16, 185, 129, 0.07) 0px, transparent 50%)
          `
        }}
        aria-hidden="true"
      />

      {/* 1. Header con Saludo Dinámico, Reloj, Centro de Alertas y Sync Rápido LAN */}
      <Header
        dashboardSummary={dashboardSummary}
        onNavigate={handleNavigate}
        onManualSync={handleManualSync}
        isRefreshing={isRefreshing}
        lastSyncAt={lastSyncAt}
      />

      {/* Aviso sin conexión */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="relative z-20 overflow-hidden"
            role="status"
          >
            <div className="max-w-7xl mx-auto px-3 sm:px-6 md:px-8 pt-3">
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-amber-500/12 border border-amber-400/30 text-amber-200 text-xs sm:text-sm font-semibold">
                <WifiOff className="w-4 h-4 flex-shrink-0" />
                <span>Sin conexión. Los cambios no se guardarán hasta que vuelva la red.</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Main Content View Area con Montaje Bajo Demanda y Persistencia en Memoria */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 md:px-8 pt-3 sm:pt-5 pb-28 sm:pb-36 relative outline-none"
      >
        <ErrorBoundary onReset={handleManualSync}>

          {visitedTabs.has('dashboard') && (
            <section className="view-pane" style={paneStyle('dashboard')} aria-label="Inicio">
              <DashboardView
                summary={dashboardSummary}
                loading={loadingSummary}
                onNavigate={handleNavigate}
                onQuickToggleScene={handleQuickToggleScene}
                refreshKey={refreshKey}
              />
            </section>
          )}

          {visitedTabs.has('meals') && (
            <section className="view-pane" style={paneStyle('meals')} aria-label="Comidas">
              <MealsView
                api={api}
                onRefreshDashboard={refreshDashboard}
                refreshKey={refreshKey}
              />
            </section>
          )}

          {visitedTabs.has('finance') && (
            <section className="view-pane" style={paneStyle('finance')} aria-label="Economía">
              <FinanceView
                api={api}
                onRefreshDashboard={refreshDashboard}
                refreshKey={refreshKey}
              />
            </section>
          )}

          {visitedTabs.has('domotics') && (
            <section className="view-pane" style={paneStyle('domotics')} aria-label="Domótica">
              <DomoticsView
                api={api}
                onRefreshDashboard={refreshDashboard}
                refreshKey={refreshKey}
              />
            </section>
          )}

          {visitedTabs.has('documents') && (
            <section className="view-pane" style={paneStyle('documents')} aria-label="Documentos">
              <DocumentsView
                api={api}
                onRefreshDashboard={refreshDashboard}
                refreshKey={refreshKey}
              />
            </section>
          )}

        </ErrorBoundary>
      </main>

      {/* 3. Floating Bottom Touch Navigation Pill */}
      <NavPill
        currentView={currentView}
        onChangeView={handleNavigate}
        alertsCount={alertsCount}
        shoppingPending={shoppingPending}
      />

      {/* 4. Toasts y diálogos de confirmación globales */}
      <FeedbackHost />
    </div>
  );
}
