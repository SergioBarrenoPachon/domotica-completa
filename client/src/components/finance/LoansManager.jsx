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
  Briefcase
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

  // Simulation Form
  const [simForm, setSimForm] = useState({
    extraAmount: 5000,
    mode: 'reduce_term' // 'reduce_term' | 'reduce_payment'
  });

  // Add Loan Form
  const [loanForm, setLoanForm] = useState({
    name: '',
    type: 'hipoteca', // 'hipoteca' | 'coche' | 'personal' | 'reforma'
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
      setLoans(data);
    } catch (err) {
      console.error('Error cargando préstamos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    if (!loanForm.name || !loanForm.initialAmount || !loanForm.monthlyPayment) return;

    try {
      await api.addLoan({
        ...loanForm,
        initialAmount: Number(loanForm.initialAmount),
        currentBalance: Number(loanForm.currentBalance || loanForm.initialAmount),
        interestRate: Number(loanForm.interestRate),
        monthlyPayment: Number(loanForm.monthlyPayment),
        termYears: Number(loanForm.termYears),
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
      loadLoans();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error creando préstamo: ' + err.message);
    }
  };

  const handleDeleteLoan = async (id) => {
    if (window.confirm('¿Eliminar este préstamo/hipoteca?')) {
      try {
        await api.deleteLoan(id);
        loadLoans();
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error(err);
      }
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

  const formatEuro = (num) => `${new Intl.NumberFormat('es-ES').format(num)}€`;

  const totalDebtBalance = loans.reduce((acc, l) => acc + (Number(l.currentBalance) || 0), 0);
  const totalMonthlyDebtPayments = loans.reduce((acc, l) => acc + (Number(l.monthlyPayment) || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Top Banner & KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Total Deuda Pendiente */}
        <div className="glass-panel p-5 rounded-3xl border border-purple-500/20 bg-purple-950/15 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 font-display">
              Capital Pendiente Total
            </span>
            <Landmark className="w-5 h-5 text-purple-400" />
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-white font-mono">
              {formatEuro(totalDebtBalance)}
            </p>
            <p className="text-xs text-purple-300/80 mt-1">
              Repartido en {loans.length} préstamo(s) / hipoteca(s)
            </p>
          </div>
        </div>

        {/* Cuota Mensual Comprometida */}
        <div className="glass-panel p-5 rounded-3xl border border-rose-500/20 bg-rose-950/15 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 font-display">
              Cuota Mensual Total Deuda
            </span>
            <TrendingDown className="w-5 h-5 text-rose-400" />
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-rose-400 font-mono">
              -{formatEuro(totalMonthlyDebtPayments)} / mes
            </p>
            <p className="text-xs text-rose-300/80 mt-1">
              {formatEuro(Math.round(totalMonthlyDebtPayments * 12))} comprometidos al año
            </p>
          </div>
        </div>

        {/* Botón Añadir Préstamo */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 flex flex-col justify-between items-start">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-display block">
              Gestión a Largo Plazo
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Registra nuevas hipotecas, préstamos personales o simula amortizaciones.
            </p>
          </div>
          <button
            onClick={() => setAddModal(true)}
            className="w-full mt-3 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 touch-press shadow-lg shadow-amber-950/50"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Nueva Hipoteca / Préstamo</span>
          </button>
        </div>

      </div>

      {/* LIST OF LOANS */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white font-display">
          Hipotecas y Préstamos Activos ({loans.length})
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {loans.map((loan) => {
            const isMortgage = loan.type === 'hipoteca';

            return (
              <div 
                key={loan.id}
                className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4 hover:border-white/20 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Header of card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                        isMortgage ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {isMortgage ? <Home className="w-5 h-5" /> : <Car className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white font-display">{loan.name}</h4>
                        <p className="text-xs text-slate-400">{loan.bank || 'Entidad Bancaria'} • Tipo {loan.interestType} ({loan.interestRate}%)</p>
                      </div>
                    </div>

                    <span className="text-xs px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-mono font-bold">
                      {loan.monthlyPayment.toFixed(2)}€ / mes
                    </span>
                  </div>

                  {/* Progress Bar of Amortization */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">
                        Amortizado: <strong className="text-emerald-400">{formatEuro(loan.totalPaidSoFar)}</strong> ({loan.progressPercent}%)
                      </span>
                      <span className="text-slate-400">
                        Pendiente: <strong className="text-purple-300">{formatEuro(loan.currentBalance)}</strong>
                      </span>
                    </div>

                    <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-amber-400 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${loan.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/5 text-center text-xs">
                    <div className="p-2 rounded-xl bg-black/30">
                      <span className="text-[10px] text-slate-500 uppercase block">Capital Inicial</span>
                      <span className="font-bold text-white font-mono">{formatEuro(loan.initialAmount)}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-black/30">
                      <span className="text-[10px] text-slate-500 uppercase block">Plazo Total</span>
                      <span className="font-bold text-white font-mono">{loan.termYears} Años</span>
                    </div>
                    <div className="p-2 rounded-xl bg-black/30">
                      <span className="text-[10px] text-slate-500 uppercase block">Fecha Fin</span>
                      <span className="font-bold text-amber-400 font-mono">{loan.endDate || 'N/D'}</span>
                    </div>
                  </div>
                </div>

                {/* Actions bottom bar */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  <button
                    onClick={() => openSimulatorFor(loan)}
                    className="flex-1 px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 font-bold text-xs flex items-center justify-center gap-1.5 touch-press"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Simular Amortización Extra</span>
                  </button>

                  <button
                    onClick={() => handleDeleteLoan(loan.id)}
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 touch-press"
                    title="Eliminar registro"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* AMORTIZATION SIMULATOR MODAL */}
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

            {/* Inputs */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Importe Extraordinario a Amortizar (€)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={simForm.extraAmount}
                    onChange={(e) => setSimForm({ ...simForm, extraAmount: parseFloat(e.target.value) || 0 })}
                    className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-base focus:border-amber-400 outline-none"
                    placeholder="5000"
                  />
                  <button
                    onClick={handleRunSimulation}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl touch-press"
                  >
                    Calcular
                  </button>
                </div>
              </div>

              {/* Mode choice */}
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                  Modalidad de Amortización:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSimForm({ ...simForm, mode: 'reduce_term' });
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-left flex items-center gap-2 transition-all ${
                      simForm.mode === 'reduce_term'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-black/20 border-white/5 text-slate-400'
                    }`}
                  >
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <div>
                      <span>Reducir Plazo</span>
                      <span className="text-[10px] text-slate-400 block font-normal">Máximo ahorro de intereses</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSimForm({ ...simForm, mode: 'reduce_payment' });
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-left flex items-center gap-2 transition-all ${
                      simForm.mode === 'reduce_payment'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-black/20 border-white/5 text-slate-400'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4 flex-shrink-0" />
                    <div>
                      <span>Reducir Cuota</span>
                      <span className="text-[10px] text-slate-400 block font-normal">Mayor liquidez mensual</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Simulation Results Bento */}
            {simulationResult && (
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>Resultado del Estudio Financiero</span>
                </div>

                {simulationResult.mode === 'reduce_term' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-black/40">
                      <span className="text-[10px] text-slate-400 uppercase block">Tiempo Ahorrado</span>
                      <span className="text-xl font-bold font-mono text-emerald-400">
                        {simulationResult.yearsSaved} Años
                      </span>
                      <span className="text-[10px] text-slate-400 block">({simulationResult.monthsSaved} cuotas menos)</span>
                    </div>
                    <div className="p-3 rounded-xl bg-black/40">
                      <span className="text-[10px] text-slate-400 uppercase block">Intereses Ahorrados</span>
                      <span className="text-xl font-bold font-mono text-amber-400">
                        +{formatEuro(simulationResult.interestSaved)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">Ahorro financiero directo</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-black/40">
                      <span className="text-[10px] text-slate-400 uppercase block">Nueva Cuota Mensual</span>
                      <span className="text-xl font-bold font-mono text-emerald-400">
                        {simulationResult.newMonthlyPayment}€ / mes
                      </span>
                      <span className="text-[10px] text-slate-400 block">(-{simulationResult.monthlySavings}€/mes menos)</span>
                    </div>
                    <div className="p-3 rounded-xl bg-black/40">
                      <span className="text-[10px] text-slate-400 uppercase block">Ahorro Acumulado</span>
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
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
              >
                Cerrar Simulador
              </button>
            </div>

          </div>
        </Modal>
      )}

      {/* ADD LOAN MODAL */}
      {addModal && (
        <Modal
          isOpen={true}
          onClose={() => setAddModal(false)}
          title="Registrar Nuevo Préstamo o Hipoteca"
        >
          <form onSubmit={handleCreateLoan} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Nombre / Concepto *</label>
                <input
                  type="text"
                  required
                  value={loanForm.name}
                  onChange={(e) => setLoanForm({ ...loanForm, name: e.target.value })}
                  placeholder="Ej: Hipoteca Fija Piso Centro"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Tipo de Préstamo</label>
                <select
                  value={loanForm.type}
                  onChange={(e) => setLoanForm({ ...loanForm, type: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
                >
                  <option value="hipoteca">Hipoteca Inmobiliaria</option>
                  <option value="coche">Financiación Coche / Vehículo</option>
                  <option value="personal">Préstamo Personal</option>
                  <option value="reforma">Reforma del Hogar</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Entidad Bancaria</label>
                <input
                  type="text"
                  value={loanForm.bank}
                  onChange={(e) => setLoanForm({ ...loanForm, bank: e.target.value })}
                  placeholder="BBVA / Santander..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Capital Inicial (€) *</label>
                <input
                  type="number"
                  required
                  value={loanForm.initialAmount}
                  onChange={(e) => setLoanForm({ ...loanForm, initialAmount: e.target.value })}
                  placeholder="200000"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Capital Pendiente (€)</label>
                <input
                  type="number"
                  value={loanForm.currentBalance}
                  onChange={(e) => setLoanForm({ ...loanForm, currentBalance: e.target.value })}
                  placeholder="175000"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Interés Anual (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={loanForm.interestRate}
                  onChange={(e) => setLoanForm({ ...loanForm, interestRate: e.target.value })}
                  placeholder="2.45"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Cuota Mensual (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={loanForm.monthlyPayment}
                  onChange={(e) => setLoanForm({ ...loanForm, monthlyPayment: e.target.value })}
                  placeholder="850"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Plazo (Años)</label>
                <input
                  type="number"
                  value={loanForm.termYears}
                  onChange={(e) => setLoanForm({ ...loanForm, termYears: e.target.value })}
                  placeholder="25"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Fecha Inicio (AAAA-MM)</label>
                <input
                  type="text"
                  value={loanForm.startDate}
                  onChange={(e) => setLoanForm({ ...loanForm, startDate: e.target.value })}
                  placeholder="2021-06"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Fecha Fin Prevista (AAAA-MM)</label>
                <input
                  type="text"
                  value={loanForm.endDate}
                  onChange={(e) => setLoanForm({ ...loanForm, endDate: e.target.value })}
                  placeholder="2046-06"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="autoCreateTx"
                checked={loanForm.autoCreateTransaction}
                onChange={(e) => setLoanForm({ ...loanForm, autoCreateTransaction: e.target.checked })}
                className="w-4 h-4 rounded accent-amber-500"
              />
              <label htmlFor="autoCreateTx" className="text-xs text-slate-300">
                Crear automáticamente gasto mensual recurrente en el calendario de finanzas
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setAddModal(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-950/50"
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
