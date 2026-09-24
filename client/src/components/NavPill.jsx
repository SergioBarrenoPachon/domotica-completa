import React, { memo } from 'react';
import { Home, UtensilsCrossed, Landmark, Lightbulb, FolderCheck } from 'lucide-react';
import { motion } from 'framer-motion';

function NavPillComponent({ currentView, onChangeView, alertsCount = 0, shoppingPending = 0 }) {
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
    <nav className="fixed bottom-3 sm:bottom-5 inset-x-0 z-40 px-3 pointer-events-none pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md md:max-w-lg mx-auto pointer-events-auto">
        <div className="glass-ios-dock rounded-[28px] sm:rounded-[32px] p-1.5 sm:p-2 flex items-center justify-around shadow-ambient border border-white/15">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;

            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.90 }}
                onClick={() => onChangeView(tab.id)}
                className={`relative flex flex-col items-center justify-center min-h-[54px] sm:min-h-[58px] flex-1 py-1 px-1 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                aria-label={tab.label}
              >
                {/* Active Indicator Background Squircle */}
                {isActive && (
                  <motion.div
                    layoutId="activePillIndicator"
                    className="absolute inset-0 bg-white/[0.12] rounded-2xl border border-white/20 shadow-inner-light backdrop-blur-xl"
                    transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                  />
                )}

                {/* Icon with subtle elevation */}
                <div className="relative z-10">
                  <Icon
                    className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-200 ${
                      isActive
                        ? 'scale-110 text-white stroke-[2.2] drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]'
                        : 'stroke-[1.6]'
                    }`}
                  />

                  {/* Badge */}
                  {tab.badge && (
                    <span
                      className={`absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full text-[9.5px] font-extrabold text-white flex items-center justify-center shadow-md ${
                        tab.badgeColor || 'bg-brand-500'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span className={`relative z-10 text-[10.5px] mt-0.5 tracking-tight font-medium ${
                  isActive ? 'text-white font-bold' : 'text-slate-400'
                }`}>
                  {tab.label}
                </span>

                {/* Micro-dot under active tab */}
                {isActive && (
                  <motion.span
                    layoutId="activeDot"
                    className="relative z-10 w-1 h-1 rounded-full bg-white mt-0.5 shadow-sm"
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

export default memo(NavPillComponent);

