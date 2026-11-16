import React, { useState } from 'react';
import {
  X,
  ArrowRightLeft,
  ArrowDown,
  Landmark,
  CreditCard,
  ShieldCheck,
  Check,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notify } from '../feedback/feedback';
import confetti from 'canvas-confetti';

export default function TransferModal({
  isOpen,
  onClose,
  accounts = [],
  onTransferSuccess
}) {
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || 'acc-sabadell');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || 'acc-revolut');
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('Traspaso de fondos');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const fromAcc = accounts.find(a => a.id === fromAccountId);
  const toAcc = accounts.find(a => a.id === toAccountId);

  const handleSwap = () => {
    const temp = fromAccountId;
    setFromAccountId(toAccountId);
    setToAccountId(temp);
  };

  const handleQuickAmount = (val) => {
    setAmount(String(val));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanAmount = parseFloat(String(amount).replace(',', '.'));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      notify.error('Introduce un importe válido mayor que 0');
      return;
    }
    if (fromAccountId === toAccountId) {
      notify.error('La cuenta de origen y destino deben ser distintas');
      return;
    }

    try {
      setIsSubmitting(true);
      if (onTransferSuccess) {
        await onTransferSuccess({
          fromAccountId,
          toAccountId,
          amount: cleanAmount,
          concept: concept.trim() || 'Traspaso de fondos'
        });
      }
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 } });
      notify.success(`Traspaso de ${cleanAmount.toFixed(2)}€ completado con éxito`);
      onClose();
    } catch (err) {
      console.error('Error en transferencia:', err);
      notify.error('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-white/14 rounded-[32px] p-6 shadow-2xl z-10 overflow-hidden"
        >
          {/* Luz ambiental */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/15 text-sky-300 border border-sky-400/25 flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white font-display tracking-tight">
                  Traspaso entre Cuentas
                </h3>
                <p className="text-xs text-slate-400">
                  Mueve saldo en tiempo real entre tus bancos
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4 relative z-10">
            {/* Origen */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display">
                Cuenta de Origen (Sale el dinero)
              </label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/12 text-white font-semibold focus:outline-none focus:border-sky-400"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id} className="bg-slate-900 text-white">
                    {acc.name} — Saldo: {(acc.balance || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
                  </option>
                ))}
              </select>
            </div>

            {/* Botón Swap */}
            <div className="flex justify-center -my-1">
              <button
                type="button"
                onClick={handleSwap}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-sky-300 border border-white/10 transition-transform active:rotate-180"
                title="Invertir origen y destino"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>

            {/* Destino */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display">
                Cuenta de Destino (Entra el dinero)
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/12 text-white font-semibold focus:outline-none focus:border-sky-400"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id} className="bg-slate-900 text-white">
                    {acc.name} — Saldo: {(acc.balance || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
                  </option>
                ))}
              </select>
            </div>

            {/* Importe */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display">
                Importe a Transferir (€)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/12 text-2xl font-black font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
                <span className="absolute right-4 top-3 text-2xl font-mono text-slate-400">€</span>
              </div>

              {/* Botones rápidos de importe */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {[50, 100, 200, 500, 1000].map(val => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => handleQuickAmount(val)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-mono font-bold border border-white/10 transition-colors"
                  >
                    +{val}€
                  </button>
                ))}
              </div>
            </div>

            {/* Concepto */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display">
                Concepto / Motivo
              </label>
              <input
                type="text"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="Ej: Aportación mensual gastos Revolut"
                className="w-full px-3.5 py-2 rounded-2xl bg-white/5 border border-white/12 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>

            {/* Botón Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 transition-all touch-press disabled:opacity-50"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isSubmitting ? 'Procesando Traspaso...' : 'Confirmar Traspaso de Fondos'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

