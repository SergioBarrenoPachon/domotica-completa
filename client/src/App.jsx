import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from './services/api';
import Header from './components/Header';
import NavPill from './components/NavPill';

import DashboardView from './views/DashboardView';
import MealsView from './views/MealsView';
import FinanceView from './views/FinanceView';
import DomoticsView from './views/DomoticsView';
import DocumentsView from './views/DocumentsView';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      const summary = await api.getDashboard();
      setDashboardSummary(summary);
    } catch (err) {
      console.error('Error cargando resumen:', err);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Quick Action from Dashboard: Trigger Scene
  const handleQuickToggleScene = async (sceneId) => {
    try {
      await api.activateScene(sceneId);
      fetchSummary();
    } catch (err) {
      console.error(err);
    }
  };

  const alertsCount = (dashboardSummary?.alerts?.criticalCount || 0) + (dashboardSummary?.alerts?.warningCount || 0);
  const shoppingPending = dashboardSummary?.meals?.shoppingPendingCount || 0;

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col selection:bg-brand-500 selection:text-white">
      
      {/* 1. Header con Saludo Dinámico, Reloj y Centro de Alertas */}
      <Header
        dashboardSummary={dashboardSummary}
        onNavigate={(viewId) => setCurrentView(viewId)}
      />

      {/* 2. Main Content View Area with Touch-Friendly Max Width */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 pt-4 md:pt-6">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <DashboardView
                summary={dashboardSummary}
                onNavigate={(viewId) => setCurrentView(viewId)}
                onQuickToggleScene={handleQuickToggleScene}
              />
            </motion.div>
          )}

          {currentView === 'meals' && (
            <motion.div
              key="meals"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <MealsView
                api={api}
                onRefreshDashboard={fetchSummary}
              />
            </motion.div>
          )}

          {currentView === 'finance' && (
            <motion.div
              key="finance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <FinanceView
                api={api}
                onRefreshDashboard={fetchSummary}
              />
            </motion.div>
          )}

          {currentView === 'domotics' && (
            <motion.div
              key="domotics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <DomoticsView
                api={api}
                onRefreshDashboard={fetchSummary}
              />
            </motion.div>
          )}

          {currentView === 'documents' && (
            <motion.div
              key="documents"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <DocumentsView
                api={api}
                onRefreshDashboard={fetchSummary}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 3. Floating Bottom Touch Navigation Pill */}
      <NavPill
        currentView={currentView}
        onChangeView={(viewId) => setCurrentView(viewId)}
        alertsCount={alertsCount}
        shoppingPending={shoppingPending}
      />
    </div>
  );
}
