import React, { useState, useEffect } from 'react';
import { 
  Landmark, 
  Plus, 
  Calculator, 
  Trash2, 
  Edit3, 
  TrendingDown, 
  Clock, 
  Calendar, 
  Sparkles, 
  Check, 
  ShieldCheck,
  Percent,
  Car,
  Home,
  Briefcase,
  Users,
  HandCoins,
  History,
  ChevronDown,
  ChevronUp,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../Modal';

export default function LoansManager({ api, onRefresh }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [addModal, setAddModal] = useState(false);
  const [simulateModal, setSimulateModal] = useState(null); // loan selected for simulation
  const [simulationResult, setSimulationResult] = useState(null);
  const [repayModal, setRepayModal] = useState(null); // loan selected for repayment
  const [expandedRepayments, setExpandedRepayments] = useState({});

  // Simulation Form
  const [simForm, setSimForm] = useState({
    extraAmount: 5000,
    mode: 'reduce_term' // 'reduce_term' | 'reduce_payment'
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Repayment Form
  const [repayForm, setRepayForm] = useState({
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    notes: 'Devolución extraordinaria',
    registerExpense: true
  });

  // Add Loan Form
  const [loanForm, setLoanForm] = useState({
    name: '',
    type: 'hipoteca', // 'hipoteca' | 'familiar' | 'coche' | 'personal' | 'reforma'
    bank: '',
    initialAmount: '',
    currentBalance: '',
    interestRate: 2.5,
    interestType: 'fijo',
    monthlyPayment: '',
    startDate: new Date().toISOString().slice(0, 7),
    endDate: '',
    termYears: 25,
    propertyValue: '',
    notes: '',
    autoCreateTransaction: true
  });

  useEffect(() => {
    loadLoans();
  }, []);

  const loadLoans = async () => {
    try {
      setLoading(true);
      const data = await api.getLoans();
      setLoans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando préstamos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    if (!loanForm.name || !loanForm.initialAmount) return;

    const isFamily = loanForm.type === 'familiar';
    if (!isFamily && !loanForm.monthlyPayment) {
      alert('Por favor especifica la cuota mensual para este préstamo');
      return;
    }

    try {
      await api.addLoan({
        ...loanForm,
        bank: isFamily ? (loanForm.bank || 'Padres / Familia') : loanForm.bank,
        initialAmount: Number(loanForm.initialAmount),
        currentBalance: Number(loanForm.currentBalance || loanForm.initialAmount),
        interestRate: isFamily ? (Number(loanForm.interestRate) || 0) : Number(loanForm.interestRate),
        monthlyPayment: isFamily ? (Number(loanForm.monthlyPayment) || 0) : Number(loanForm.monthlyPayment),
        termYears: isFamily ? (Number(loanForm.termYears) || 0) : Number(loanForm.termYears),
        autoCreateTransaction: isFamily ? false : loanForm.autoCreateTransaction,
        propertyValue: loanForm.propertyValue ? Number(loanForm.propertyValue) : null
      });

      setAddModal(false);
      setLoanForm({
        name: '',
        type: 'hipoteca',
        bank: '',
        initialAmount: '',
        currentBalance: '',
        interestRate: 2.5,
        interestType: 'fijo',
        monthlyPayment: '',
        startDate: new Date().toISOString().slice(0, 7),
        endDate: '',
        termYears: 25,
        propertyValue: '',
        notes: '',
        autoCreateTransaction: true
      });
      await loadLoans();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error creando préstamo: ' + err.message);
    }
  };

  const handleDeleteLoan = async (id) => {
    try {
      await api.deleteLoan(id);
      setConfirmDeleteId(null);
      await loadLoans();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Run Amortization Simulation
  const handleRunSimulation = async (e) => {
    e?.preventDefault();
    if (!simulateModal || !simForm.extraAmount) return;

    try {
      const res = await api.simulateLoanAmortization(simulateModal.id, simForm.extraAmount, simForm.mode);
      setSimulationResult(res);
    } catch (err) {
      alert('Error en simulación: ' + err.message);
    }
  };

  const openSimulatorFor = (loan) => {
    setSimulateModal(loan);
    setSimForm({
      extraAmount: Math.min(5000, Math.round(loan.currentBalance * 0.1) || 1000),
      mode: 'reduce_term'
    });
    setSimulationResult(null);
  };

  const openRepayModalFor = (loan) => {
    setRepayModal(loan);
    setRepayForm({
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      notes: loan.type === 'familiar' ? 'Devolución préstamo padres' : 'Amortización anticipada libre',
      registerExpense: true
    });
  };

  const handleRegisterRepayment = async (e) => {
    e.preventDefault();
    if (!repayModal || !repayForm.amount || Number(repayForm.amount) <= 0) {
      alert('Introduce un importe válido a amortizar/devolver');
      return;
    }

    try {
      await api.addLoanRepayment(repayModal.id, {
        amount: parseFloat(repayForm.amount),
        date: repayForm.date,
        notes: repayForm.notes,
        registerExpense: repayForm.registerExpense
      });

      setRepayModal(null);
      await loadLoans();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error registrando devolución: ' + err.message);
    }
  };

  const handleDeleteRepayment = async (loanId, repaymentId) => {
    if (!confirm('¿Eliminar esta devolución registrada? Se reajustará el capital pendiente.')) return;
    try {
      await api.deleteLoanRepayment(loanId, repaymentId);
      await loadLoans();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error eliminando devolución: ' + err.message);
    }
  };

  const toggleRepaymentsExpand = (loanId) => {
    setExpandedRepayments(prev => ({ ...prev, [loanId]: !prev[loanId] }));
  };

  const formatEuro = (num) => `${new Intl.NumberFormat('es-ES').format(Math.round(num || 0))}€`;

  // Cálculos agregados
  const totalDebtBalance = loans.reduce((acc, l) => acc + (Number(l.currentBalance) || 0), 0);
  const totalMonthlyDebtPayments = loans.reduce((acc, l) => acc + (Number(l.monthlyPayment) || 0), 0);
  const familyLoans = loans.filter(l => l.type === 'familiar' || l.isFamilyLoan);
  const totalFamilyDebt = familyLoans.reduce((acc, l) => acc + (Number(l.currentBalance) || 0), 0);
  const totalFamilyPaid = familyLoans.reduce((acc, l) => acc + (Number(l.totalPaidSoFar || 0)), 0);

  return (
    <div className="space-y-6">
      
      {/* Top Banner & KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Deuda Pendiente */}
        <div className="glass-ios p-5 rounded-[28px] border border-purple-500/20 bg-purple-500/[0.05] flex flex-col justify-between shadow-glass-ambient">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-purple-400 font-display">
              Capital Pendiente Total
            </span>
            <div className="w-9 h-9 rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
              <Landmark className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
              {formatEuro(totalDebtBalance)}
            </p>
            <p className="text-[11px] text-purple-300/80 mt-0.5 font-display">
              {loans.length} deuda(s) / préstamo(s)
            </p>
          </div>
        </div>

        {/* Deuda con Padres / Familia */}
        <div className="glass-ios p-5 rounded-[28px] border border-emerald-500/20 bg-emerald-500/[0.05] flex flex-col justify-between shadow-glass-ambient">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-400 font-display">
              Deuda con Padres / Familia
            </span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono tracking-tight">
              {formatEuro(totalFamilyDebt)}
            </p>
            <p className="text-[11px] text-emerald-400/80 mt-0.5 font-display">
              Devuelto ya a padres: {formatEuro(totalFamilyPaid)}
            </p>
          </div>
        </div>

        {/* Cuota Mensual Comprometida Bancaria */}
        <div className="glass-ios p-5 rounded-[28px] border border-rose-500/20 bg-rose-500/[0.05] flex flex-col justify-between shadow-glass-ambient">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-rose-400 font-display">
              Cuota Fija Mensual (Bancos)
            </span>
            <div className="w-9 h-9 rounded-2xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-rose-400" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-rose-400 font-mono tracking-tight">
              -{formatEuro(totalMonthlyDebtPayments)} / mes
            </p>
            <p className="text-[11px] text-rose-300/80 mt-0.5 font-display">
              {formatEuro(Math.round(totalMonthlyDebtPayments * 12))} al año comprometidos
            </p>
          </div>
        </div>

        {/* Botón Añadir Préstamo */}
        <div className="glass-ios p-5 rounded-[28px] border border-amber-500/20 bg-amber-500/[0.04] flex flex-col justify-between items-start shadow-glass-ambient">
          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-amber-400 font-display block">
              Hipotecas, Padres & Coches
            </span>
            <p className="text-[11px] text-slate-300 mt-1 font-display">
              Registra préstamos bancarios o familiares sin cuota periódica obligatoria.
            </p>
          </div>
          <button
            onClick={() => setAddModal(true)}
            className="w-full mt-3 px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-[0_4px_16px_rgba(255,159,10,0.35)]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Registrar Préstamo</span>
          </button>
        </div>

      </div>

      {/* LIST OF LOANS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-white font-display tracking-tight flex items-center gap-2">
            <span>Hipotecas y Préstamos Activos</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-slate-300">
              {loans.length}
            </span>
          </h3>
        </div>

        {loans.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <Landmark className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-white">No tienes préstamos o hipotecas registrados</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Registra la hipoteca de la vivienda, el dinero prestado por tus padres o la financiación del coche para seguir la amortización.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {loans.map((loan) => {
              const isMortgage = loan.type === 'hipoteca';
              const isFamily = loan.type === 'familiar' || loan.isFamilyLoan;
              const isCar = loan.type === 'coche';
              const repayments = Array.isArray(loan.repayments) ? loan.repayments : [];
              const isRepaymentsExpanded = Boolean(expandedRepayments[loan.id]);

              return (
                <div 
                  key={loan.id}
                  className={`p-5 sm:p-6 rounded-[28px] border transition-all flex flex-col justify-between gap-4 shadow-glass-ambient ${
                    isFamily
                      ? 'bg-emerald-500/[0.03] border-emerald-500/20 hover:border-emerald-500/40'
                      : isMortgage
                        ? 'bg-amber-500/[0.03] border-amber-500/20 hover:border-amber-500/40'
                        : 'bg-white/[0.04] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div>
                    {/* Header of card */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                          isFamily
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : isMortgage 
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' 
                              : isCar
                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                        }`}>
                          {isFamily ? <Users className="w-6 h-6" /> : isMortgage ? <Home className="w-6 h-6" /> : isCar ? <Car className="w-6 h-6" /> : <Landmark className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-bold text-white font-display">{loan.name}</h4>
                            {isFamily && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Préstamo Padres (Devolución Libre)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 font-display">
                            {loan.bank || (isFamily ? 'Padres / Familia' : 'Entidad')} • {isFamily ? 'Sin intereses (0%)' : `Tipo ${loan.interestType || 'fijo'} (${loan.interestRate}%)`}
                          </p>
                        </div>
                      </div>

                      {loan.monthlyPayment > 0 ? (
                        <span className="text-xs px-3 py-1 rounded-xl bg-white/[0.06] border border-white/10 text-slate-200 font-mono font-bold shadow-sm whitespace-nowrap">
                          {loan.monthlyPayment.toFixed(2)}€ / mes
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold whitespace-nowrap">
                          Sin cuota fija
                        </span>
                      )}
                    </div>

                    {/* Prominent Capital Pendiente */}
                    <div className="mt-4 p-4 rounded-2xl bg-white/[0.03] border border-white/8 flex items-baseline justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-display font-bold block">
                          {isFamily ? 'Te queda por devolver a tus padres:' : 'Capital Pendiente de Amortizar:'}
                        </span>
                        <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                          isFamily ? 'text-emerald-300' : 'text-purple-300'
                        }`}>
                          {formatEuro(loan.currentBalance)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-display block">
                          Total devuelto
                        </span>
                        <span className="text-base font-bold text-white font-mono">
                          {formatEuro(loan.totalPaidSoFar || (loan.initialAmount - loan.currentBalance))}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar of Amortization */}
                    <div className="mt-3 space-y-1.5">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-400">
                          Devuelto: <strong className="text-emerald-400 font-bold">{loan.progressPercent || 0}%</strong>
                        </span>
                        <span className="text-slate-400">
                          Inicial: <strong className="text-slate-200 font-bold">{formatEuro(loan.initialAmount)}</strong>
                        </span>
                      </div>

                      <div className="w-full bg-white/[0.05] h-2.5 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                            isFamily 
                              ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
                              : 'bg-gradient-to-r from-emerald-400 via-amber-400 to-amber-500'
                          }`} 
                          style={{ width: `${Math.min(100, Math.max(0, loan.progressPercent || 0))}%` }}
                        />
                      </div>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5 text-center text-xs">
                      <div className="p-2 rounded-2xl bg-white/[0.03] border border-white/5">
                        <span className="text-[10px] text-slate-400 uppercase block font-display font-semibold">Prestado Inicial</span>
                        <span className="font-bold text-white font-mono">{formatEuro(loan.initialAmount)}</span>
                      </div>
                      <div className="p-2 rounded-2xl bg-white/[0.03] border border-white/5">
                        <span className="text-[10px] text-slate-400 uppercase block font-display font-semibold">
                          {isFamily ? 'Devoluciones' : 'Plazo Total'}
                        </span>
                        <span className="font-bold text-white font-mono">
                          {isFamily ? `${repayments.length} pagos` : `${loan.termYears || 0} Años`}
                        </span>
                      </div>
                      <div className="p-2 rounded-2xl bg-white/[0.03] border border-white/5">
                        <span className="text-[10px] text-slate-400 uppercase block font-display font-semibold">
                          {isFamily ? 'Periodicidad' : 'Fecha Fin'}
                        </span>
                        <span className={`font-bold font-mono ${isFamily ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {isFamily ? 'Cuando quieras' : (loan.endDate || 'N/D')}
                        </span>
                      </div>
                    </div>

                    {/* Repayments History (Desplegable) */}
                    {repayments.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => toggleRepaymentsExpand(loan.id)}
                          className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-white py-1 transition-colors"
                        >
                          <span className="flex items-center gap-1.5 font-bold">
                            <History className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Historial de devoluciones realizadas ({repayments.length})</span>
                          </span>
                          {isRepaymentsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {isRepaymentsExpanded && (
                          <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {repayments.map((rep) => (
                              <div 
                                key={rep.id} 
                                className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-emerald-300 font-mono">
                                      +{formatEuro(rep.amount)}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {rep.date}
                                    </span>
                                  </div>
                                  {rep.notes && (
                                    <p className="text-[10.5px] text-slate-400 italic">
                                      {rep.notes}
                                    </p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRepayment(loan.id, rep.id)}
                                  className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                                  title="Eliminar devolución"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions bottom bar */}
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
                    {/* Botón principal: Registrar Devolución Libre (destacado para padres y amortizaciones libres) */}
                    <button
                      onClick={() => openRepayModalFor(loan)}
                      className="flex-1 min-w-[150px] px-3.5 py-2.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
                    >
                      <HandCoins className="w-4 h-4" />
                      <span>{isFamily ? 'Registrar Devolución a Padres' : 'Registrar Amortización Extra'}</span>
                    </button>

                    {/* Botón secundario para bancos: Simular impacto */}
                    {!isFamily && (
                      <button
                        onClick={() => openSimulatorFor(loan)}
                        className="px-3.5 py-2.5 rounded-2xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
                        title="Simular ahorro de intereses o cuotas"
                      >
                        <Calculator className="w-4 h-4" />
                        <span className="hidden sm:inline">Simular</span>
                      </button>
                    )}

                    {confirmDeleteId === loan.id ? (
                      <div className="flex items-center gap-1.5 p-1 bg-rose-500/20 border border-rose-500/40 rounded-xl animate-fadeIn">
                        <span className="text-[11px] font-bold text-rose-300 px-1">¿Borrar?</span>
                        <button
                          onClick={() => handleDeleteLoan(loan.id)}
                          className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] rounded-lg shadow-sm"
                        >
                          Sí
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white font-medium text-[11px] rounded-lg"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(loan.id)}
                        className="p-2.5 rounded-2xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 active:scale-90 transition-all"
                        title="Eliminar préstamo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: REGISTRAR DEVOLUCIÓN O AMORTIZACIÓN LIBRE */}
      {repayModal && (
        <Modal
          isOpen={true}
          onClose={() => setRepayModal(null)}
          title={repayModal.type === 'familiar' ? `Devolver dinero a los padres (${repayModal.name})` : `Registrar Amortización Extra (${repayModal.name})`}
        >
          <form onSubmit={handleRegisterRepayment} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 leading-relaxed">
              {repayModal.type === 'familiar' ? (
                <>Registra cualquier cantidad que vayáis a devolver a vuestros padres (por Bizum, transferencia o efectivo). <strong>Se restará inmediatamente del total pendiente ({formatEuro(repayModal.currentBalance)})</strong>.</>
              ) : (
                <>Registra una amortización de capital anticipada. Se descontará del capital pendiente de tu préstamo bancario.</>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">
                Importe a Devolver / Amortizar (€) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                autoFocus
                value={repayForm.amount}
                onChange={(e) => setRepayForm({ ...repayForm, amount: e.target.value })}
                placeholder="Ej: 500"
                className="w-full glass-input rounded-2xl px-4 py-2.5 text-white font-mono text-lg focus:border-emerald-400 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">
                  Fecha del Pago / Devolución *
                </label>
                <input
                  type="date"
                  required
                  value={repayForm.date}
                  onChange={(e) => setRepayForm({ ...repayForm, date: e.target.value })}
                  className="w-full glass-input rounded-2xl px-3.5 py-2 text-white text-sm focus:border-emerald-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">
                  Concepto / Notas
                </label>
                <input
                  type="text"
                  value={repayForm.notes}
                  onChange={(e) => setRepayForm({ ...repayForm, notes: e.target.value })}
                  placeholder="Ej: Bizum paga extra, transferencia mensual..."
                  className="w-full glass-input rounded-2xl px-3.5 py-2 text-white text-sm focus:border-emerald-400 outline-none"
                />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center gap-2.5">
              <input
                type="checkbox"
                id="registerExp"
                checked={repayForm.registerExpense}
                onChange={(e) => setRepayForm({ ...repayForm, registerExpense: e.target.checked })}
                className="w-4 h-4 rounded-md accent-emerald-500 bg-white/10 border-white/20"
              />
              <label htmlFor="registerExp" className="text-xs text-slate-300 cursor-pointer select-none">
                <strong>Descontar del saldo en cuenta de este mes</strong> (Computará como gasto real pagado de tesorería)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setRepayModal(null)}
                className="px-4 py-2 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md active:scale-95 transition-all"
              >
                Guardar Devolución
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: SIMULADOR DE AMORTIZACIÓN BANCARIA */}
      {simulateModal && (
        <Modal
          isOpen={true}
          onClose={() => setSimulateModal(null)}
          title={`Simulador de Amortización: ${simulateModal.name}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-300">
              Introduce una aportación extraordinaria de capital para ver el impacto directo en el ahorro de intereses y tiempo.
            </p>

            <div className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 space-y-3.5 shadow-inner">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">
                  Importe Extraordinario a Amortizar (€)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={simForm.extraAmount}
                    onChange={(e) => setSimForm({ ...simForm, extraAmount: parseFloat(e.target.value) || 0 })}
                    className="flex-1 glass-input rounded-2xl px-4 py-2 text-white font-mono text-base focus:border-amber-400 outline-none"
                    placeholder="5000"
                  />
                  <button
                    onClick={handleRunSimulation}
                    className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-2xl active:scale-95 transition-all shadow-md"
                  >
                    Calcular
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1.5 font-display">
                  Modalidad de Amortización:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSimForm({ ...simForm, mode: 'reduce_term' })}
                    className={`p-3 rounded-2xl text-xs font-bold border text-left flex items-center gap-2.5 transition-all active:scale-95 ${
                      simForm.mode === 'reduce_term'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                        : 'bg-white/[0.03] border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Clock className="w-4 h-4 flex-shrink-0 text-amber-400" />
                    <div>
                      <span className="font-display">Reducir Plazo</span>
                      <span className="text-[10px] text-slate-400 block font-normal">Máximo ahorro de intereses</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimForm({ ...simForm, mode: 'reduce_payment' })}
                    className={`p-3 rounded-2xl text-xs font-bold border text-left flex items-center gap-2.5 transition-all active:scale-95 ${
                      simForm.mode === 'reduce_payment'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                        : 'bg-white/[0.03] border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4 flex-shrink-0 text-amber-400" />
                    <div>
                      <span className="font-display">Reducir Cuota</span>
                      <span className="text-[10px] text-slate-400 block font-normal">Mayor liquidez mensual</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {simulationResult && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider font-display">
                  <Sparkles className="w-4 h-4" />
                  <span>Resultado del Estudio Financiero</span>
                </div>

                {simulationResult.mode === 'reduce_term' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-black/40">
                      <span className="text-[10px] text-slate-400 uppercase block font-display">Tiempo Ahorrado</span>
                      <span className="text-xl font-bold font-mono text-emerald-400">
                        {simulationResult.yearsSaved} Años
                      </span>
                      <span className="text-[10px] text-slate-400 block">({simulationResult.monthsSaved} cuotas menos)</span>
                    </div>
                    <div className="p-3 rounded-xl bg-black/40">
                      <span className="text-[10px] text-slate-400 uppercase block font-display">Intereses Ahorrados</span>
                      <span className="text-xl font-bold font-mono text-amber-400">
                        +{formatEuro(simulationResult.interestSaved)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">Ahorro financiero directo</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-black/40">
                      <span className="text-[10px] text-slate-400 uppercase block font-display">Nueva Cuota Mensual</span>
                      <span className="text-xl font-bold font-mono text-emerald-400">
                        {simulationResult.newMonthlyPayment}€ / mes
                      </span>
                      <span className="text-[10px] text-slate-400 block">(-{simulationResult.monthlySavings}€/mes menos)</span>
                    </div>
                    <div className="p-3 rounded-xl bg-black/40">
                      <span className="text-[10px] text-slate-400 uppercase block font-display">Ahorro Acumulado</span>
                      <span className="text-xl font-bold font-mono text-amber-400">
                        +{formatEuro(simulationResult.totalSavingsOverTerm)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">Durante el plazo restante</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSimulateModal(null)}
                className="px-5 py-2 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold active:scale-95 transition-all"
              >
                Cerrar Simulador
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: REGISTRAR NUEVO PRÉSTAMO / HIPOTECA / FAMILIAR */}
      {addModal && (
        <Modal
          isOpen={true}
          onClose={() => setAddModal(false)}
          title="Registrar Nuevo Préstamo o Hipoteca"
        >
          <form onSubmit={handleCreateLoan} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Tipo de Financiación *</label>
                <select
                  value={loanForm.type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    const isFam = newType === 'familiar';
                    setLoanForm({ 
                      ...loanForm, 
                      type: newType,
                      interestRate: isFam ? 0 : 2.5,
                      monthlyPayment: isFam ? 0 : loanForm.monthlyPayment,
                      bank: isFam ? 'Padres / Familia' : (loanForm.bank || ''),
                      autoCreateTransaction: isFam ? false : true
                    });
                  }}
                  className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full"
                >
                  <option value="hipoteca" className="bg-slate-900 text-white">🏠 Hipoteca Inmobiliaria</option>
                  <option value="familiar" className="bg-slate-900 text-white">👨‍👩‍👧 Préstamo de Padres / Familiares (Devolución Libre)</option>
                  <option value="coche" className="bg-slate-900 text-white">🚗 Financiación Coche / Vehículo</option>
                  <option value="personal" className="bg-slate-900 text-white">💳 Préstamo Personal Bancario</option>
                  <option value="reforma" className="bg-slate-900 text-white">🔨 Reforma del Hogar</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Nombre / Concepto *</label>
                <input
                  type="text"
                  required
                  value={loanForm.name}
                  onChange={(e) => setLoanForm({ ...loanForm, name: e.target.value })}
                  placeholder={loanForm.type === 'familiar' ? 'Ej: Préstamo Padres Entrada Piso' : 'Ej: Hipoteca Fija Piso Centro'}
                  className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full"
                />
              </div>
            </div>

            {loanForm.type === 'familiar' && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                💡 <strong>Préstamo familiar configurado:</strong> No se exigirá cuota mensual obligatoria ni intereses. Podréis incluir los pagos cuando queráis ("cuando os dé la gana") y veréis en todo momento cuánto os queda por pagar.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Entidad / Prestamista</label>
                <input
                  type="text"
                  value={loanForm.bank}
                  onChange={(e) => setLoanForm({ ...loanForm, bank: e.target.value })}
                  placeholder={loanForm.type === 'familiar' ? 'Padres' : 'BBVA / Santander...'}
                  className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Capital Prestado Inicial (€) *</label>
                <input
                  type="number"
                  required
                  value={loanForm.initialAmount}
                  onChange={(e) => setLoanForm({ ...loanForm, initialAmount: e.target.value })}
                  placeholder="20000"
                  className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Capital Pendiente Actual (€)</label>
                <input
                  type="number"
                  value={loanForm.currentBalance}
                  onChange={(e) => setLoanForm({ ...loanForm, currentBalance: e.target.value })}
                  placeholder={loanForm.initialAmount || '20000'}
                  className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full font-mono"
                />
              </div>
            </div>

            {loanForm.type !== 'familiar' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Interés Anual (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={loanForm.interestRate}
                    onChange={(e) => setLoanForm({ ...loanForm, interestRate: e.target.value })}
                    placeholder="2.45"
                    className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Cuota Mensual (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required={loanForm.type !== 'familiar'}
                    value={loanForm.monthlyPayment}
                    onChange={(e) => setLoanForm({ ...loanForm, monthlyPayment: e.target.value })}
                    placeholder="850"
                    className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Plazo (Años)</label>
                  <input
                    type="number"
                    value={loanForm.termYears}
                    onChange={(e) => setLoanForm({ ...loanForm, termYears: e.target.value })}
                    placeholder="25"
                    className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full font-mono"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Fecha Inicio (AAAA-MM)</label>
                <input
                  type="text"
                  value={loanForm.startDate}
                  onChange={(e) => setLoanForm({ ...loanForm, startDate: e.target.value })}
                  placeholder="2024-01"
                  className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 font-display">Fecha Fin Prevista (Opcional)</label>
                <input
                  type="text"
                  value={loanForm.endDate}
                  onChange={(e) => setLoanForm({ ...loanForm, endDate: e.target.value })}
                  placeholder="2049-01"
                  className="glass-input rounded-2xl px-3.5 py-2.5 text-white text-sm focus:border-white/30 outline-none w-full font-mono"
                />
              </div>
            </div>

            {loanForm.type !== 'familiar' && (
              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="autoCreateTx"
                  checked={loanForm.autoCreateTransaction}
                  onChange={(e) => setLoanForm({ ...loanForm, autoCreateTransaction: e.target.checked })}
                  className="w-4 h-4 rounded-md accent-amber-500 bg-white/10 border-white/20"
                />
                <label htmlFor="autoCreateTx" className="text-xs text-slate-300 cursor-pointer select-none">
                  Crear automáticamente gasto mensual recurrente en el calendario de finanzas
                </label>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setAddModal(false)}
                className="px-4 py-2 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-[0_4px_16px_rgba(255,159,10,0.35)] active:scale-95 transition-all"
              >
                Guardar Préstamo
              </button>
            </div>

          </form>
        </Modal>
      )}

    </div>
  );
}

