import React, { useState } from 'react';
import {
  Landmark,
  CreditCard,
  ShieldCheck,
  ArrowRightLeft,
  Edit2,
  Check,
  X,
  Layers,
  Sparkles,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notify } from '../feedback/feedback';

export default function BankCardsCarousel({
  accounts = [],
  selectedAccountId = null,
  onSelectAccount,
  onOpenTransfer,
  onUpdateAccountBalance
}) {
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [newBalanceInput, setNewBalanceInput] = useState('');

  const formatEuro = (val) => {
    const num = Math.round((Number(val) || 0) * 100) / 100;
    return num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleStartEdit = (acc, e) => {
    e.stopPropagation();
    setEditingAccountId(acc.id);
    setNewBalanceInput(String(acc.balance || 0));
  };

  const handleSaveBalance = async (accId, e) => {
    e.stopPropagation();
    const cleanNum = parseFloat(newBalanceInput.replace(',', '.'));
    if (isNaN(cleanNum)) {
      notify.error('Introduce un saldo numérico válido');
      return;
    }
    try {
      if (onUpdateAccountBalance) {
        await onUpdateAccountBalance(accId, cleanNum);
      }
      setEditingAccountId(null);
      notify.success('Saldo actualizado correctamente');
    } catch (err) {
      notify.error('Error al actualizar saldo: ' + err.message);
    }
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingAccountId(null);
  };

  const totalCash = accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  const getAccountIcon = (iconName) => {
    switch (iconName) {
      case 'Landmark':
        return <Landmark className="w-5 h-5 text-white/90" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-emerald-300" />;
      default:
        return <CreditCard className="w-5 h-5 text-sky-300" />;
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Barra superior de cuentas y total combinado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400/20 to-sky-400/20 border border-white/10 flex items-center justify-center text-amber-300 shadow-inner-light">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white font-display tracking-tight flex items-center gap-2">
              Bancos & Tarjetas Activas
              {selectedAccountId && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono font-bold border border-amber-400/30">
                  Filtrado
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              Toca una tarjeta para ver sus cargos específicos o hacer un traspaso rápido
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {selectedAccountId && (
            <button
              onClick={() => onSelectAccount(null)}
              className="text-xs px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white border border-white/10 transition-all font-semibold touch-press flex items-center gap-1"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Ver todas las cuentas</span>
            </button>
          )}

          {onOpenTransfer && (
            <button
              onClick={onOpenTransfer}
              className="text-xs px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500/20 to-indigo-500/20 hover:from-sky-500/30 hover:to-indigo-500/30 text-sky-200 border border-sky-400/30 transition-all font-bold touch-press flex items-center gap-1.5 shadow-sm"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />
              <span>Traspaso entre bancos</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid horizontal de Tarjetas Bancarias */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {accounts.map((acc) => {
          const isSelected = selectedAccountId === acc.id;
          const isEditing = editingAccountId === acc.id;

          return (
            <motion.div
              key={acc.id}
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={() => onSelectAccount(isSelected ? null : acc.id)}
              className={`relative cursor-pointer rounded-[26px] p-5 border transition-all duration-300 overflow-hidden shadow-ambient select-none ${
                isSelected
                  ? 'ring-2 ring-amber-400 border-amber-400/60 shadow-lg shadow-amber-500/10'
                  : 'border-white/12 hover:border-white/25'
              } bg-gradient-to-br ${acc.bgGradient || 'from-slate-800 to-slate-900'}`}
            >
              {/* Brillo ambiental de tarjeta */}
              <div
                className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-40"
                style={{ backgroundColor: acc.color || '#38bdf8' }}
              />

              {/* Decoración Chip EMV y Ondas Contactless */}
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  {/* EMV Chip metálico dorado/plateado */}
                  <div className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 p-[1.5px] shadow-sm">
                    <div className="w-full h-full rounded-[4px] bg-gradient-to-tr from-amber-500 via-amber-300 to-amber-100 flex items-center justify-center opacity-90">
                      <div className="w-7 h-4 border border-amber-700/50 rounded-[2px] flex items-center justify-around">
                        <div className="w-[1px] h-full bg-amber-800/40" />
                        <div className="w-[1px] h-full bg-amber-800/40" />
                      </div>
                    </div>
                  </div>

                  {/* Icono Contactless */}
                  <div className="flex items-center text-white/50" title="Contactless">
                    <svg className="w-5 h-5 fill-current opacity-70" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" opacity="0.1" />
                      <path d="M7.76 16.24c-1.17-1.17-1.9-2.79-1.9-4.57 0-1.78.73-3.4 1.9-4.57l1.41 1.41C8.36 9.32 7.86 10.46 7.86 12c0 1.54.5 2.68 1.31 3.49l-1.41 1.41zm3.54-1.41c-.78-.78-1.27-1.86-1.27-3.05 0-1.19.49-2.27 1.27-3.05l1.41 1.41c-.42.42-.68 1-.68 1.64 0 .64.26 1.22.68 1.64l-1.41 1.41zm3.53-1.42c-.39-.39-.63-.93-.63-1.53 0-.6.24-1.14.63-1.53l1.41 1.41c-.02.04-.04.08-.04.12s.02.08.04.12l-1.41 1.41z" />
                    </svg>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/15">
                    {getAccountIcon(acc.icon)}
                  </div>
                </div>
              </div>

              {/* Nombre y etiqueta de la cuenta */}
              <div className="relative z-10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-extrabold tracking-wider text-slate-300 font-display">
                    {acc.name}
                  </span>
                  {acc.iban && (
                    <span className="text-[11px] font-mono text-slate-400">
                      {acc.iban}
                    </span>
                  )}
                </div>

                {acc.tag && (
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10 font-medium">
                    {acc.tag}
                  </span>
                )}
              </div>

              {/* Saldo en vivo con opción de edición */}
              <div className="mt-4 pt-3 border-t border-white/10 relative z-10">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block font-display">
                    Saldo Real en Cuenta
                  </span>

                  {!isEditing && (
                    <button
                      onClick={(e) => handleStartEdit(acc, e)}
                      title="Ajustar saldo real"
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-1.5 mt-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number"
                      step="0.01"
                      value={newBalanceInput}
                      onChange={(e) => setNewBalanceInput(e.target.value)}
                      className="w-full px-2.5 py-1 text-base font-black font-mono bg-black/60 text-white rounded-lg border border-amber-400 focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={(e) => handleSaveBalance(acc.id, e)}
                      className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                      title="Guardar saldo"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1.5 rounded-lg bg-rose-500/80 text-white hover:bg-rose-600 transition-colors"
                      title="Cancelar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-baseline justify-between mt-1">
                    <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white drop-shadow-sm">
                      {formatEuro(acc.balance)}€
                    </p>

                    {acc.monthPendingExpenses > 0 && (
                      <span className="text-[11px] font-mono text-amber-300 font-bold" title="Pendiente de pasar por esta cuenta este mes">
                        -{formatEuro(acc.monthPendingExpenses)}€ pend.
                      </span>
                    )}
                  </div>
                )}

                {/* Saldo estimado a fin de mes */}
                {acc.projectedBalance !== undefined && (
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Previsión fin de mes:</span>
                    <span className={`font-mono font-bold ${acc.projectedBalance >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                      {formatEuro(acc.projectedBalance)}€
                    </span>
                  </div>
                )}

                {/* Tarjetas físicas o virtuales vinculadas */}
                {Array.isArray(acc.cards) && acc.cards.length > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap pt-2 border-t border-white/5">
                    {acc.cards.map((card) => (
                      <span
                        key={card.id || card.last4}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-black/30 border border-white/10 text-slate-300 font-mono flex items-center gap-1"
                      >
                        {card.isApplePay ? '🍎' : '💳'} {card.name} (••{card.last4})
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Indicador de Selección */}
              {isSelected && (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-400 text-black px-2 py-0.5 rounded-full text-[10px] font-extrabold shadow-sm">
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Activa</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

