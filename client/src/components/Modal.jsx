import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-lg' }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          {/* Backdrop de cristal profundo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-2xl z-[100]"
          />

          {/* Modal Card / Bottom Sheet estilo Apple iOS 27 */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className={`relative w-full ${maxWidth} glass-ios-elevated rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-7 z-[101] border border-white/15 max-h-[92vh] flex flex-col shadow-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-7`}
          >
            {/* Grab handle táctil estilo iOS */}
            <div className="w-12 h-1.5 bg-white/25 rounded-full mx-auto mb-3 sm:hidden flex-shrink-0" />

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-white/10 flex-shrink-0">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-display tracking-tight">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5 tracking-normal">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all touch-press flex-shrink-0 shadow-sm"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 py-4 pr-1 space-y-4 no-scrollbar pb-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}


