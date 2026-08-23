import React from 'react';
import { Home, UtensilsCrossed, Landmark, Lightbulb, FolderCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NavPill({ currentView, onChangeView, alertsCount = 0, shoppingPending = 0 }) {
  const tabs = [
    {
      id: 'dashboard',
      label: 'Inicio',
      icon: Home,
      color: 'from-brand-500 to-cyan-500'
    },
    {
      id: 'meals',
      label: 'Comidas',
      icon: UtensilsCrossed,
      color: 'from-emerald-500 to-teal-500',
      badge: shoppingPending > 0 ? shoppingPending : null
    },
    {
      id: 'finance',
      label: 'Economía',
      icon: Landmark,
      color: 'from-amber-500 to-orange-500'
    },
    {
      id: 'domotics',
      label: 'Domótica',
      icon: Lightbulb,
      color: 'from-cyan-500 to-blue-500'
    },
    {
      id: 'documents',
      label: 'Documentos',
      icon: FolderCheck,
      color: 'from-purple-500 to-indigo-500',
      badge: alertsCount > 0 ? alertsCount : null,
      badgeColor: 'bg-rose-500'
    }
  ];

  return (
    <nav className="fixed bottom-3 inset-x-0 z-40 px-3 pointer-events-none">
      <div className="max-w-md md:max-w-xl mx-auto pointer-events-auto">
        <div className="glass-pill rounded-3xl p-1.5 flex items-center justify-around shadow-2xl border border-white/15">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;

            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.88 }}
                onClick={() => onChangeView(tab.id)}
                className={`relative flex flex-col items-center justify-center min-h-[56px] flex-1 py-1.5 px-1 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? 'text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200 font-medium'
                }`}
                aria-label={tab.label}
              >
                {/* Active Indicator Background */}
                {isActive && (
                  <motion.div
                    layoutId="activePillIndicator"
                    className={`absolute inset-0 bg-gradient-to-tr ${tab.color} opacity-20 rounded-2xl border border-white/20`}
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}

                {/* Icon with motion */}
                <div className="relative">
                  <Icon
                    className={`w-6 h-6 transition-transform ${
                      isActive ? 'scale-110 text-white stroke-[2.5]' : 'stroke-[1.75]'
                    }`}
                  />

                  {/* Badge */}
                  {tab.badge && (
                    <span
                      className={`absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-lg ${
                        tab.badgeColor || 'bg-brand-500'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span className={`text-[11px] mt-0.5 tracking-tight font-display ${isActive ? 'text-white' : 'text-slate-400'}`}>
                  {tab.label}
                </span>

                {/* Dot under active tab */}
                {isActive && (
                  <motion.span
                    layoutId="activeDot"
                    className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-0.5 shadow-glow-brand"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
