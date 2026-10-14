/**
 * Sistema global de feedback (toasts + diálogo de confirmación).
 *
 * API imperativa utilizable desde cualquier componente o handler, sin necesidad de
 * contexto de React. Sustituye a los `alert()` y `confirm()` nativos del navegador,
 * que bloquean el hilo, rompen la estética de la PWA y en iOS standalone se ven
 * como diálogos del sistema poco claros.
 *
 *   notify.success('Guardado');
 *   notify.error('No se pudo guardar', { title: 'Error' });
 *   notify.info('Elemento eliminado', { action: { label: 'Deshacer', onClick: fn } });
 *   if (!(await confirmDialog({ message: '¿Eliminar?', danger: true }))) return;
 */

let state = { toasts: [], confirm: null };
const listeners = new Set();
let idSeq = 0;

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  return state;
}

const DEFAULT_DURATION = {
  success: 3200,
  info: 3600,
  warning: 4500,
  error: 6000
};

function push(type, message, opts = {}) {
  const id = ++idSeq;
  const toast = {
    id,
    type,
    title: opts.title,
    message: message == null ? '' : String(message),
    action: opts.action || null,
    duration: opts.duration ?? (opts.action ? 6000 : DEFAULT_DURATION[type])
  };
  // Máximo 4 toasts visibles a la vez
  state = { ...state, toasts: [...state.toasts.slice(-3), toast] };
  emit();
  if (toast.duration > 0) {
    setTimeout(() => dismissToast(id), toast.duration);
  }
  return id;
}

export function dismissToast(id) {
  if (!state.toasts.some((t) => t.id === id)) return;
  state = { ...state, toasts: state.toasts.filter((t) => t.id !== id) };
  emit();
}

export const notify = {
  success: (message, opts) => push('success', message, opts),
  error: (message, opts) => push('error', message, opts),
  info: (message, opts) => push('info', message, opts),
  warning: (message, opts) => push('warning', message, opts)
};

/**
 * Extrae un mensaje legible de un error, con texto alternativo.
 */
export function errorMessage(err, fallback = 'Error desconocido') {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  return err.message || fallback;
}

/**
 * Muestra un diálogo de confirmación y devuelve una promesa que resuelve a true/false.
 * Acepta un string (mensaje) o un objeto de opciones.
 */
export function confirmDialog(input) {
  const opts = typeof input === 'string' ? { message: input } : input || {};
  return new Promise((resolve) => {
    // Si había otro diálogo pendiente, se cancela
    if (state.confirm) state.confirm.resolve(false);
    state = {
      ...state,
      confirm: {
        title: opts.title || '¿Confirmar acción?',
        message: opts.message || '',
        confirmText: opts.confirmText || 'Confirmar',
        cancelText: opts.cancelText || 'Cancelar',
        danger: opts.danger ?? false,
        resolve
      }
    };
    emit();
  });
}

export function resolveConfirm(value) {
  const current = state.confirm;
  if (!current) return;
  state = { ...state, confirm: null };
  emit();
  current.resolve(Boolean(value));
}
