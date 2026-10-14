import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Contador global de modales abiertos: evita que al cerrar un modal anidado
// se desbloquee el scroll (y reaparezca la barra inferior) mientras otro sigue abierto.
let openModalCount = 0;

function lockBody() {
  openModalCount += 1;
  if (openModalCount === 1) {
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
  }
}

function unlockBody() {
  openModalCount = Math.max(0, openModalCount - 1);
  if (openModalCount === 0) {
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
  }
}

export default function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-lg' }) {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    lockBody();
    const previouslyFocused = document.activeElement;

    // Enfocar el primer campo del formulario (o el panel) al abrir, sin forzar teclado en móvil
    const focusTimer = setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const isTouch = window.matchMedia('(pointer: coarse)').matches;
      const firstField = !isTouch && panel.querySelector('input:not([type=hidden]):not([disabled]), select, textarea');
      (firstField || panel).focus({ preventScroll: true });
    }, 60);

    // Escape cierra solo el modal superior
    const onKeyDown = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const dialogs = document.querySelectorAll('[data-app-modal="true"]');
      if (dialogs.length && dialogs[dialogs.length - 1] !== panelRef.current) return;
      e.preventDefault();
      onCloseRef.current?.();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKeyDown);
      unlockBody();
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus({ preventScroll: true });
      }
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
            aria-hidden="true"
          />

          {/* Modal Card / Bottom Sheet estilo Apple iOS 27 */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            data-app-modal="true"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className={`relative w-full ${maxWidth} glass-ios-elevated rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-7 z-[101] border border-white/15 max-h-[92dvh] flex flex-col shadow-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-7 outline-none`}
          >
            {/* Grab handle táctil estilo iOS */}
            <div className="w-12 h-1.5 bg-white/25 rounded-full mx-auto mb-3 sm:hidden flex-shrink-0" aria-hidden="true" />

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-white/10 flex-shrink-0">
              <div className="min-w-0">
                <h3 id={titleId} className="text-xl sm:text-2xl font-bold text-white font-display tracking-tight">
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
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all touch-press flex-shrink-0 shadow-sm"
                aria-label="Cerrar"
                title="Cerrar (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto overscroll-contain flex-1 py-4 pr-1 space-y-4 no-scrollbar pb-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
