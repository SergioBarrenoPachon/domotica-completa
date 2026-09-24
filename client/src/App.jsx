import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api } from './services/api';
import Header from './components/Header';
import NavPill from './components/NavPill';
import DashboardView from './views/DashboardView';
import MealsView from './views/MealsView';
import FinanceView from './views/FinanceView';
import DomoticsView from './views/DomoticsView';
import DocumentsView from './views/DocumentsView';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Lazy tab mounting: únicamente 'dashboard' se monta al inicio para una carga instantánea.
  // Al pulsar otra pestaña por primera vez, se añade a visitedTabs y queda cacheada en memoria (0ms switch).
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(['dashboard']));

  const lastSyncTimeRef = useRef(0);

  const fetchSummary = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const summary = await api.getDashboard();
      setDashboardSummary(summary);
      lastSyncTimeRef.current = Date.now();
    } catch (err) {
      console.error('Error cargando resumen:', err);
    } finally {
      setLoadingSummary(false);
      setTimeout(() => setIsRefreshing(false), 200);
    }
  }, []);

  const handleManualSync = useCallback(async () => {
    await fetchSummary();
    setRefreshKey(prev => prev + 1);
  }, [fetchSummary]);

  const handleNavigate = useCallback((viewId) => {
    setVisitedTabs(prev => {
      if (prev.has(viewId)) return prev;
      const next = new Set(prev);
      next.add(viewId);
      return next;
    });
    setCurrentView(viewId);
  }, []);

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

  // Quick Action from Dashboard: Trigger Scene
  const handleQuickToggleScene = useCallback(async (sceneId) => {
    try {
      await api.activateScene(sceneId);
      fetchSummary();
    } catch (err) {
      console.error(err);
    }
  }, [fetchSummary]);

  const alertsCount = useMemo(() => {
    return (dashboardSummary?.alerts?.criticalCount || 0) + (dashboardSummary?.alerts?.warningCount || 0);
  }, [dashboardSummary?.alerts]);

  const shoppingPending = useMemo(() => {
    return dashboardSummary?.meals?.shoppingPendingCount || 0;
  }, [dashboardSummary?.meals]);

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col selection:bg-brand-500 selection:text-white relative overflow-x-hidden">
      
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
      />

      {/* 2. Main Content View Area con Montaje Bajo Demanda y Persistencia en Memoria */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 md:px-8 pt-3 sm:pt-5 pb-28 sm:pb-36 relative">
        <ErrorBoundary onReset={handleManualSync}>

          {visitedTabs.has('dashboard') && (
            <div style={{ display: currentView === 'dashboard' ? 'block' : 'none' }}>
              <DashboardView
                summary={dashboardSummary}
                onNavigate={handleNavigate}
                onQuickToggleScene={handleQuickToggleScene}
                refreshKey={refreshKey}
              />
            </div>
          )}

          {visitedTabs.has('meals') && (
            <div style={{ display: currentView === 'meals' ? 'block' : 'none' }}>
              <MealsView
                api={api}
                onRefreshDashboard={fetchSummary}
                refreshKey={refreshKey}
              />
            </div>
          )}

          {visitedTabs.has('finance') && (
            <div style={{ display: currentView === 'finance' ? 'block' : 'none' }}>
              <FinanceView
                api={api}
                onRefreshDashboard={fetchSummary}
                refreshKey={refreshKey}
              />
            </div>
          )}

          {visitedTabs.has('domotics') && (
            <div style={{ display: currentView === 'domotics' ? 'block' : 'none' }}>
              <DomoticsView
                api={api}
                onRefreshDashboard={fetchSummary}
                refreshKey={refreshKey}
              />
            </div>
          )}

          {visitedTabs.has('documents') && (
            <div style={{ display: currentView === 'documents' ? 'block' : 'none' }}>
              <DocumentsView
                api={api}
                onRefreshDashboard={fetchSummary}
                refreshKey={refreshKey}
              />
            </div>
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
    </div>
  );
}
