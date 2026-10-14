import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { subscribe, getSnapshot, dismissToast, resolveConfirm } from './feedback';

const TOAST_STYLES = {
  success: { icon: CheckCircle2, ring: 'border-emerald-400/35', iconColor: 'text-emerald-300', bar: 'bg-emerald-400' },
  error: { icon: AlertCircle, ring: 'border-rose-400/40', iconColor: 'text-rose-300', bar: 'bg-rose-400' },
  warning: { icon: AlertTriangle, ring: 'border-amber-400/40', iconColor: 'text-amber-300', bar: 'bg-amber-400' },
  info: { icon: Info, ring: 'border-sky-400/35', iconColor: 'text-sky-300', bar: 'bg-sky-400' }
};

function Toast({ toast }) {
  const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
  const Icon = style.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.96, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', damping: 26, stiffness: 380 }}
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto relative overflow-hidden w-full glass-ios-elevated rounded-2xl border ${style.ring} shadow-ambient pl-4 pr-2 py-3 flex items-start gap-3`}
    >
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${style.iconColor}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        {toast.title && <p className="text-sm font-bold text-white leading-snug">{toast.title}</p>}
        <p className={`text-[13px] leading-snug ${toast.title ? 'text-slate-300 mt-0.5' : 'text-white font-semibold'}`}>
          {toast.message}
        </p>
      </div>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action.onClick?.();
            dismissToast(toast.id);
          }}
          className="flex-shrink-0 self-center px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/15 touch-press"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        className="flex-shrink-0 w-8 h-8 -my-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center"
        aria-label="Cerrar notificación"
      >
        <X className="w-4 h-4" />
      </button>
      {toast.duration > 0 && (
        <span
          className={`absolute bottom-0 left-0 h-[2px] ${style.bar} opacity-60 toast-progress`}
          style={{ animationDuration: `${toast.duration}ms` }}
          aria-hidden="true"
        />
      )}
    </motion.div>
  );
}

function ConfirmDialog({ confirm }) {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (!confirm) return undefined;
    const previouslyFocused = document.activeElement;
    // Enfocar el botón principal para poder confirmar con Enter
    const t = setTimeout(() => confirmBtnRef.current?.focus(), 30);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        resolveConfirm(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey, true);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [confirm]);

  return (
    <AnimatePresence>
      {confirm && (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => resolveConfirm(false)}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="relative w-full max-w-sm glass-ios-elevated rounded-[28px] border border-white/15 shadow-2xl p-6 mb-[env(safe-area-inset-bottom)]"
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border ${
                confirm.danger
                  ? 'bg-rose-500/15 text-rose-300 border-rose-400/30'
                  : 'bg-sky-500/15 text-sky-300 border-sky-400/30'
              }`}
            >
              {confirm.danger ? <AlertTriangle className="w-6 h-6" /> : <Info className="w-6 h-6" />}
            </div>
            <h2 id="confirm-dialog-title" className="text-lg font-bold text-white font-display tracking-tight">
              {confirm.title}
            </h2>
            {confirm.message && (
              <p id="confirm-dialog-message" className="text-sm text-slate-300 mt-1.5 leading-relaxed whitespace-pre-line">
                {confirm.message}
              </p>
            )}
            <div className="mt-6 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => resolveConfirm(false)}
                className="min-h-touch px-4 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-slate-200 font-semibold text-sm touch-press"
              >
                {confirm.cancelText}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={() => resolveConfirm(true)}
                className={`min-h-touch px-4 rounded-2xl font-bold text-sm text-white touch-press ${
                  confirm.danger
                    ? 'bg-rose-500 hover:bg-rose-600 shadow-glow-rose'
                    : 'bg-brand-500 hover:bg-brand-600 shadow-glow-brand'
                }`}
              >
                {confirm.confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default function FeedbackHost() {
  const { toasts, confirm } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return createPortal(
    <>
      <div
        className="fixed inset-x-0 z-[250] flex flex-col items-center gap-2 px-3 pointer-events-none"
        style={{ top: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
        aria-live="polite"
      >
        <div className="w-full max-w-md flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {toasts.map((t) => (
              <Toast key={t.id} toast={t} />
            ))}
          </AnimatePresence>
        </div>
      </div>
      <ConfirmDialog confirm={confirm} />
    </>,
    document.body
  );
}
