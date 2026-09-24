import React, { useState, useEffect } from 'react';
import { 
  Database, 
  ShieldCheck, 
  HardDrive, 
  Smartphone, 
  Laptop, 
  Download, 
  RefreshCw, 
  Check, 
  AlertCircle,
  Copy,
  Zap,
  Trash2,
  FolderArchive,
  Layers,
  Send,
  PlusCircle,
  ExternalLink
} from 'lucide-react';
import Modal from './Modal';
import { api } from '../services/api';

export default function DatabaseStatusModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('database'); // 'database' | 'shortcuts'
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Gastos puntuales state
  const [punctualExpenses, setPunctualExpenses] = useState([]);
  const [testForm, setTestForm] = useState({
    titulo: 'Café & Desayuno',
    importe: '3.50',
    categoria: 'Ocio y Restaurantes',
    metodo_pago: 'Apple Pay',
    notas: 'Atajo rápido desde iPhone'
  });
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      loadPunctualExpenses();
    }
  }, [isOpen]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const data = await api.getDatabaseStatus();
      setStatus(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPunctualExpenses = async () => {
    try {
      const res = await api.getPunctualExpenses(20);
      if (res.success && res.data) {
        setPunctualExpenses(res.data);
      }
    } catch (err) {
      console.error('Error cargando gastos puntuales:', err);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setBackingUp(true);
      await api.createDatabaseBackup();
      setBackupSuccess(true);
      setTimeout(() => setBackupSuccess(false), 4000);
      loadStatus();
    } catch (err) {
      alert('Error creando respaldo: ' + err.message);
    } finally {
      setBackingUp(false);
    }
  };

  const webhookUrl = api.getShortcutsWebhookUrl();

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 3000);
  };

  const sampleJsonBody = JSON.stringify({
    titulo: "Supermercado Mercadona",
    importe: 38.50,
    categoria: "Alimentación",
    metodo_pago: "Apple Pay",
    notas: "Compra puntual con Atajo de iOS"
  }, null, 2);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(sampleJsonBody);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 3000);
  };

  const handleSendTestExpense = async (e) => {
    e.preventDefault();
    if (!testForm.titulo || !testForm.importe) return;
    try {
      setSendingTest(true);
      setTestResult(null);
      const res = await api.addPunctualExpense({
        titulo: testForm.titulo,
        importe: parseFloat(testForm.importe.replace(',', '.')),
        categoria: testForm.categoria,
        metodo_pago: testForm.metodo_pago,
        notas: testForm.notas,
        fecha: new Date().toISOString().slice(0, 10)
      });
      setTestResult({ success: true, message: res.message || 'Gasto registrado correctamente en Neon' });
      loadPunctualExpenses();
      loadStatus();
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setSendingTest(false);
    }
  };

  const handleDeletePunctual = async (id) => {
    if (!confirm('¿Deseas eliminar este gasto puntual de Neon PostgreSQL y de las finanzas?')) return;
    try {
      await api.deletePunctualExpense(id);
      loadPunctualExpenses();
      loadStatus();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Base de Datos Neon Cloud & Atajos de Apple"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        
        {/* Navegación por pestañas */}
        <div className="flex rounded-2xl bg-white/[0.05] p-1 border border-white/10 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'database'
                ? 'bg-brand-500 text-white shadow-glow-brand'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Base de Datos Neon</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shortcuts')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'shortcuts'
                ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Atajos de Apple (Automatizaciones)</span>
          </button>
        </div>

        {/* --- PESTAÑA 1: BASE DE DATOS NEON --- */}
        {activeTab === 'database' && (
          <div className="space-y-4">
            {/* Banner de Garantía de Persistencia en Neon */}
            <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3.5 backdrop-blur-xl">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 shadow-inner-light">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                  <span>Neon Serverless PostgreSQL Conectada</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    En la Nube (AWS Frankfurt)
                  </span>
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Toda la información financiera, pagos mensuales, histórico de transacciones y gastos puntuales de Apple Shortcuts se guardan de forma permanente e indestructible en <strong>Neon PostgreSQL</strong>.
                </p>
              </div>
            </div>

            {/* Tarjeta de métricas de PostgreSQL */}
            {status?.postgres && (
              <div className="p-4 rounded-3xl glass-subtle border border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <span className="text-xs font-bold text-white flex items-center gap-2 font-display">
                    <Database className="w-4 h-4 text-cyan-400" />
                    <span>Tablas Relacionales Activas en Neon</span>
                  </span>
                  <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                    Latencia: {status.postgres.latencyMs || 0} ms
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10">
                    <span className="text-[10px] text-slate-400 block font-sans">Gastos Puntuales</span>
                    <span className="text-lg font-black text-amber-400 font-display">
                      {status.postgres.counts?.gastosPuntuales || 0}
                    </span>
                    <span className="text-[9px] text-slate-500 block">tabla gastos_puntuales</span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10">
                    <span className="text-[10px] text-slate-400 block font-sans">Transacciones</span>
                    <span className="text-lg font-black text-emerald-400 font-display">
                      {status.postgres.counts?.transacciones || 0}
                    </span>
                    <span className="text-[9px] text-slate-500 block">tabla transacciones</span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10">
                    <span className="text-[10px] text-slate-400 block font-sans">Pagos Meses</span>
                    <span className="text-lg font-black text-cyan-400 font-display">
                      {status.postgres.counts?.pagos || 0}
                    </span>
                    <span className="text-[9px] text-slate-500 block">tabla pagos_mensuales</span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10">
                    <span className="text-[10px] text-slate-400 block font-sans">Préstamos / Metas</span>
                    <span className="text-lg font-black text-violet-400 font-display">
                      {(status.postgres.counts?.prestamos || 0) + (status.postgres.counts?.metas || 0)}
                    </span>
                    <span className="text-[9px] text-slate-500 block">tablas financieras</span>
                  </div>
                </div>
              </div>
            )}

            {/* Sincronización Multidispositivo */}
            <div className="p-4 rounded-3xl glass-subtle border border-white/10 space-y-2.5">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-2 font-display">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span>Sincronización Multidispositivo en Tiempo Real</span>
              </span>

              <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-300">
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
                  <Smartphone className="w-5 h-5 mx-auto text-amber-400" />
                  <span className="block font-bold text-[11px] text-white font-display">iPhone & iPad</span>
                  <span className="text-[10px] text-slate-400 block">Atajos & PWA</span>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
                  <Laptop className="w-5 h-5 mx-auto text-cyan-400" />
                  <span className="block font-bold text-[11px] text-white font-display">PC / Mac</span>
                  <span className="text-[10px] text-slate-400 block">Panel de Control</span>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
                  <Database className="w-5 h-5 mx-auto text-emerald-400" />
                  <span className="block font-bold text-[11px] text-white font-display">Neon Postgres</span>
                  <span className="text-[10px] text-slate-400 block">Nube permanente</span>
                </div>
              </div>
            </div>

            {/* Respaldo y exportación */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                disabled={backingUp}
                onClick={handleCreateBackup}
                className="p-3.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/12 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all touch-press disabled:opacity-50 shadow-inner-light"
              >
                {backingUp ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                ) : backupSuccess ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <FolderArchive className="w-4 h-4 text-amber-400" />
                )}
                <span>{backupSuccess ? '¡Respaldo Creado!' : 'Crear Respaldo Local en Servidor'}</span>
              </button>

              <a
                href={api.getDatabaseExportUrl()}
                download
                className="p-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-glow-brand transition-all touch-press"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Copia JSON</span>
              </a>
            </div>
          </div>
        )}

        {/* --- PESTAÑA 2: ATAJOS DE APPLE --- */}
        {activeTab === 'shortcuts' && (
          <div className="space-y-4">
            
            {/* Banner explicativo */}
            <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3.5 backdrop-blur-xl">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center flex-shrink-0 shadow-inner-light">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white font-display">
                  Automatización de Gastos con Atajos de Apple (iOS / Siri)
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Con esta integración puedes añadir cualquier gasto puntual (café, gasolina, parking, farmacia) al instante desde tu <strong>iPhone, Apple Watch o diciendo a Siri</strong>: <em>"Añadir gasto de 15 euros en gasolina"</em>. Se guarda directamente en la tabla <code className="text-amber-300 bg-amber-500/20 px-1 py-0.5 rounded font-mono">gastos_puntuales</code> de Neon y se suma al mes correspondiente.
                </p>
              </div>
            </div>

            {/* URL del Webhook */}
            <div className="p-4 rounded-3xl glass-subtle border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-display">
                  <span>URL del Endpoint para Atajos de Apple</span>
                  <span className="text-[10px] bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full font-mono">POST</span>
                </label>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold transition-colors"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? '¡Copiado!' : 'Copiar URL'}</span>
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 font-mono text-xs text-amber-300 break-all select-all flex items-center justify-between gap-2">
                <span>{webhookUrl}</span>
              </div>
            </div>

            {/* Configuración en la app Atajos de iOS */}
            <div className="p-4 rounded-3xl glass-subtle border border-white/10 space-y-3">
              <h5 className="text-xs font-bold text-white flex items-center gap-2 font-display">
                <span>¿Cómo configurarlo en la app "Atajos" de Apple?</span>
              </h5>

              <ol className="text-xs text-slate-300 space-y-2.5 list-decimal list-inside leading-relaxed">
                <li>
                  Abre la app <strong>Atajos</strong> en tu iPhone/iPad y crea un nuevo atajo (o automatización de pago con Apple Pay).
                </li>
                <li>
                  Añade la acción <strong>"Pedir entrada"</strong> dos veces:
                  <ul className="pl-6 list-disc list-inside text-slate-400 text-[11px] mt-1 space-y-0.5">
                    <li>Texto: <em>"¿En qué has gastado?"</em> (ej: Café, Supermercado)</li>
                    <li>Número: <em>"¿Cuánto ha sido?"</em> (ej: 4.50)</li>
                  </ul>
                </li>
                <li>
                  Añade la acción <strong>"Obtener contenido de URL"</strong>:
                  <ul className="pl-6 list-disc list-inside text-slate-400 text-[11px] mt-1 space-y-0.5">
                    <li>URL: <span className="text-amber-300 font-mono text-[10px]">{webhookUrl}</span></li>
                    <li>Método: <strong>POST</strong></li>
                    <li>Cabeceras: Clave <code className="text-cyan-300">Content-Type</code> = <code className="text-cyan-300">application/json</code></li>
                    <li>Cuerpo de la petición: <strong>JSON</strong> con claves:
                      <br /><code className="text-amber-300">titulo</code> (Entrada de texto)
                      <br /><code className="text-amber-300">importe</code> (Entrada de número)
                      <br /><code className="text-amber-300">metodo_pago</code> (texto: "Apple Pay")
                    </li>
                  </ul>
                </li>
                <li>
                  <em>(Opcional)</em> Añade la acción <strong>"Leer texto con voz"</strong> con el resultado devuelto para que Siri te confirme en voz alta.
                </li>
              </ol>

              <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                <span className="text-[11px] text-slate-400">Ejemplo de JSON enviado:</span>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedJson ? '¡JSON Copiado!' : 'Copiar JSON modelo'}</span>
                </button>
              </div>
            </div>

            {/* Probador en vivo de gasto puntual */}
            <div className="p-4 rounded-3xl bg-white/[0.04] border border-white/10 space-y-3">
              <h5 className="text-xs font-bold text-white flex items-center gap-2 font-display">
                <Send className="w-4 h-4 text-emerald-400" />
                <span>Probar Envío de Gasto Puntual a Neon PostgreSQL</span>
              </h5>

              <form onSubmit={handleSendTestExpense} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Concepto / Título</label>
                    <input
                      type="text"
                      value={testForm.titulo}
                      onChange={(e) => setTestForm({ ...testForm, titulo: e.target.value })}
                      placeholder="Ej: Café, Gasolina, Almuerzo"
                      required
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Importe (€)</label>
                    <input
                      type="text"
                      value={testForm.importe}
                      onChange={(e) => setTestForm({ ...testForm, importe: e.target.value })}
                      placeholder="Ej: 4.80"
                      required
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Categoría</label>
                    <input
                      type="text"
                      value={testForm.categoria}
                      onChange={(e) => setTestForm({ ...testForm, categoria: e.target.value })}
                      placeholder="Ocio, Alimentación, etc."
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Método de Pago</label>
                    <select
                      value={testForm.metodo_pago}
                      onChange={(e) => setTestForm({ ...testForm, metodo_pago: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                    >
                      <option value="Apple Pay">Apple Pay</option>
                      <option value="Tarjeta">Tarjeta Bancaria</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Bizum">Bizum</option>
                    </select>
                  </div>
                </div>

                {testResult && (
                  <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                    testResult.success 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {testResult.success ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                    <span>{testResult.message}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={sendingTest}
                  className="w-full py-2.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all touch-press disabled:opacity-50"
                >
                  {sendingTest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Enviar Gasto de Prueba a Neon PostgreSQL</span>
                </button>
              </form>
            </div>

            {/* Listado de últimos gastos puntuales registrados */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Últimos Gastos Puntuales en Neon ({punctualExpenses.length})</span>
                <button
                  type="button"
                  onClick={loadPunctualExpenses}
                  className="text-slate-400 hover:text-white text-[11px] flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Actualizar</span>
                </button>
              </h5>

              {punctualExpenses.length === 0 ? (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-xs text-slate-400">
                  Aún no hay gastos puntuales registrados. ¡Usa el probador o tu atajo de iOS para añadir el primero!
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {punctualExpenses.map((exp) => (
                    <div 
                      key={exp.id} 
                      className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white font-display">{exp.titulo}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {exp.metodo_pago || 'Apple Pay'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>{exp.fecha}</span>
                          <span>•</span>
                          <span>{exp.categoria || 'Puntual'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white font-mono text-sm">
                          -{parseFloat(exp.importe).toFixed(2)} €
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeletePunctual(exp.id)}
                          title="Eliminar de Neon"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold touch-press"
          >
            Cerrar
          </button>
        </div>

      </div>
    </Modal>
  );
}
