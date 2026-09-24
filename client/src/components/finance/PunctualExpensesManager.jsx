import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  Smartphone, 
  Search, 
  Trash2, 
  Calendar, 
  CreditCard, 
  Tag, 
  Check, 
  Copy, 
  ExternalLink,
  Receipt,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import Modal from '../Modal';

export default function PunctualExpensesManager({ api, currentMonth, onDataChanged }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: 'Alimentación',
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: 'Apple Pay',
    notes: ''
  });

  const webhookUrl = api.getShortcutsWebhookUrl ? api.getShortcutsWebhookUrl() : `${window.location.origin}/api/finance/shortcuts/gasto`;

  useEffect(() => {
    loadPunctualExpenses();
  }, [currentMonth]);

  const loadPunctualExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.getPunctualExpenses(100);
      setExpenses(res?.data || []);
    } catch (err) {
      console.error('Error cargando gastos puntuales:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount) return;

    try {
      await api.addPunctualExpense({
        titulo: form.title,
        importe: parseFloat(String(form.amount).replace(',', '.')),
        categoria: form.category,
        fecha: form.date,
        metodo_pago: form.paymentMethod,
        notas: form.notes
      });

      setIsAddModalOpen(false);
      setForm({
        title: '',
        amount: '',
        category: 'Alimentación',
        date: new Date().toISOString().slice(0, 10),
        paymentMethod: 'Apple Pay',
        notes: ''
      });
      await loadPunctualExpenses();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert('Error guardando gasto puntual: ' + err.message);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!confirm('¿Eliminar este gasto puntual?')) return;
    try {
      await api.deletePunctualExpense(id);
      await loadPunctualExpenses();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  // Filtrado
  const filtered = expenses.filter(exp => {
    if (categoryFilter !== 'all' && exp.categoria !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (exp.titulo || '').toLowerCase().includes(q);
      const matchCat = (exp.categoria || '').toLowerCase().includes(q);
      const matchNotes = (exp.notas || '').toLowerCase().includes(q);
      if (!matchTitle && !matchCat && !matchNotes) return false;
    }
    return true;
  });

  const totalSpent = filtered.reduce((acc, e) => acc + (parseFloat(e.importe) || 0), 0);
  const categoriesList = Array.from(new Set(expenses.map(e => e.categoria).filter(Boolean)));

  return (
    <div className="space-y-6">
      
      {/* 1. Header & KPI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-white font-display flex items-center gap-2">
            <span className="w-9 h-9 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </span>
            Gastos Puntuales & Atajos de Apple
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Gastos del día a día (compras, ocio, imprevistos) registrados manualmente o automáticamente desde Siri y Apple Pay en iPhone.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="min-h-touch px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 transition-all touch-press"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Nuevo Gasto Puntual</span>
        </button>
      </div>

      {/* 2. Tarjetas de Resumen & Atajos Webhook */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        
        {/* Total Gastado en Puntuales */}
        <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/10 shadow-inner-light">
          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block font-display">
            Total Gastado (Gastos Puntuales)
          </span>
          <p className="text-3xl font-black font-mono text-amber-300 mt-1">
            -{totalSpent.toFixed(2)} €
          </p>
          <span className="text-[11px] text-slate-400 block mt-0.5 font-display">
            {filtered.length} transacciones registradas
          </span>
        </div>

        {/* Automatismo Apple Shortcuts Card */}
        <div className="md:col-span-2 p-5 rounded-3xl bg-gradient-to-r from-blue-500/[0.08] to-purple-500/[0.08] border border-blue-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5 font-display uppercase tracking-wider">
              <Smartphone className="w-4 h-4 text-blue-400" />
              Automatización con Atajos de iOS / Apple Pay
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Webhook Activo
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Puedes añadir un atajo en tu iPhone que al pagar con Apple Pay envíe automáticamente el importe a la base de datos Neon:
          </p>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="flex-1 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-slate-300 text-xs font-mono outline-none"
            />
            <button
              onClick={() => copyToClipboard(webhookUrl)}
              className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 font-bold text-xs flex items-center gap-1 transition-all"
            >
              {copiedWebhook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedWebhook ? 'Copiado' : 'Copiar URL'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* 3. Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar gasto o nota..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-2xl bg-white/[0.05] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              categoryFilter === 'all'
                ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
                : 'bg-white/[0.05] text-slate-300 hover:text-white border border-white/10'
            }`}
          >
            Todas ({expenses.length})
          </button>
          {categoriesList.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
                  : 'bg-white/[0.05] text-slate-300 hover:text-white border border-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Listado de Gastos Puntuales */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 space-y-3">
          <Zap className="w-8 h-8 animate-pulse text-amber-400 mx-auto" />
          <p className="text-sm font-bold text-white">Cargando gastos puntuales de Neon PostgreSQL...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-white">No hay gastos puntuales registrados</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Añade tus tickets o compras del supermercado, cenas, gasolina o activa el atajo de Apple para que se sincronicen solos.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.06] transition-all flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-sm">{item.titulo}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.06] text-slate-300 border border-white/10">
                      {item.categoria || 'General'}
                    </span>
                    {item.metodo_pago && (
                      <span className="text-[10px] text-slate-400">
                        ({item.metodo_pago})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>{item.fecha ? item.fecha.slice(0, 10) : 'Hoy'}</span>
                    {item.notas && (
                      <>
                        <span>•</span>
                        <span className="italic">{item.notas}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-base sm:text-lg font-black font-mono text-amber-300">
                  -{parseFloat(item.importe).toFixed(2)} €
                </span>
                <button
                  onClick={() => handleDeleteExpense(item.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Eliminar gasto puntual"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR GASTO PUNTUAL */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Nuevo Gasto Puntual"
        >
          <form onSubmit={handleCreateExpense} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Concepto / Comercio</label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ej: Compra Mercadona, Gasolinera Repsol, Cena"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Importe (€) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 34.50"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Fecha</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Categoría</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400"
                >
                  <option value="Alimentación">Alimentación / Supermercado</option>
                  <option value="Restaurantes">Restaurantes / Ocio</option>
                  <option value="Vehículo">Gasolina / Vehículo</option>
                  <option value="Farmacia">Farmacia / Salud</option>
                  <option value="Hogar">Compras Hogar</option>
                  <option value="Ropa">Ropa / Moda</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Método de Pago</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400"
                >
                  <option value="Apple Pay">Apple Pay</option>
                  <option value="Tarjeta">Tarjeta Bancaria</option>
                  <option value="Bizum">Bizum</option>
                  <option value="Efectivo">Efectivo</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Notas / Descripción (Opcional)</label>
              <input
                type="text"
                placeholder="Detalles de la compra..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-lg shadow-amber-400/20"
              >
                Guardar Gasto Puntual
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}
