import React, { useState, useEffect } from 'react';
import { 
  UtensilsCrossed, 
  Sparkles, 
  Plus, 
  Minus, 
  Trash2, 
  Check, 
  RefreshCw, 
  Refrigerator, 
  Snowflake, 
  Package, 
  ShoppingCart, 
  CalendarDays, 
  CheckCircle, 
  Edit3, 
  AlertCircle,
  Clock,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Modal from '../components/Modal';

export default function MealsView({ api, onRefreshDashboard }) {
  const [activeTab, setActiveTab] = useState('planner'); // 'planner' | 'pantry' | 'shopping'
  const [loading, setLoading] = useState(true);

  // States
  const [mealDays, setMealDays] = useState([]);
  const [pantryItems, setPantryItems] = useState([]);
  const [shoppingItems, setShoppingItems] = useState([]);
  const [recipes, setRecipes] = useState([]);

  // Filter for Pantry
  const [pantryZone, setPantryZone] = useState('all'); // 'all' | 'nevera' | 'congelador' | 'despensa'
  const [pantrySearch, setPantrySearch] = useState('');

  // Modals
  const [editDayModal, setEditDayModal] = useState(null); // { id, label, breakfast, lunch, dinner }
  const [newPantryModal, setNewPantryModal] = useState(false);
  const [newShoppingModal, setNewShoppingModal] = useState(false);
  const [syncToast, setSyncToast] = useState(null);

  // Form states
  const [pantryForm, setPantryForm] = useState({
    name: '',
    zone: 'nevera',
    quantity: 1,
    unit: 'ud',
    minQuantity: 1,
    category: 'Lácteos'
  });

  const [shoppingForm, setShoppingForm] = useState({
    name: '',
    category: 'Frescos',
    quantity: '1 ud',
    notes: ''
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [mealsData, pantryData, shoppingData] = await Promise.all([
        api.getMeals(),
        api.getPantry(),
        api.getShoppingList()
      ]);
      setMealDays(mealsData.days || []);
      setRecipes(mealsData.recipes || []);
      setPantryItems(pantryData || []);
      setShoppingItems(shoppingData || []);
    } catch (err) {
      console.error('Error cargando datos de comidas:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. MEAL PLANNER ACTIONS
  const handleSuggestMenu = async () => {
    try {
      const suggested = await api.suggestMenu();
      setMealDays(suggested);
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      setSyncToast('✨ ¡Nuevo menú semanal sugerido con éxito!');
      setTimeout(() => setSyncToast(null), 3500);
      onRefreshDashboard();
    } catch (err) {
      alert('Error sugiriendo menú');
    }
  };

  const handleSaveDayEdit = async (e) => {
    e.preventDefault();
    if (!editDayModal) return;
    try {
      const updated = await api.updateDayMeal(editDayModal.id, {
        breakfast: editDayModal.breakfast,
        lunch: editDayModal.lunch,
        dinner: editDayModal.dinner
      });
      setMealDays(mealDays.map(d => d.id === editDayModal.id ? updated : d));
      setEditDayModal(null);
      onRefreshDashboard();
    } catch (err) {
      alert('Error guardando plato');
    }
  };

  // 2. PANTRY ACTIONS
  const handleAdjustQuantity = async (id, delta) => {
    try {
      const updated = await api.adjustPantryQty(id, delta);
      setPantryItems(pantryItems.map(p => p.id === id ? updated : p));
      onRefreshDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePantryItem = async (e) => {
    e.preventDefault();
    if (!pantryForm.name) return;
    try {
      const newItem = await api.addPantryItem(pantryForm);
      setPantryItems([...pantryItems, newItem]);
      setNewPantryModal(false);
      setPantryForm({ name: '', zone: 'nevera', quantity: 1, unit: 'ud', minQuantity: 1, category: 'Lácteos' });
      onRefreshDashboard();
    } catch (err) {
      alert('Error añadiendo alimento');
    }
  };

  const handleDeletePantryItem = async (id) => {
    if (window.confirm('¿Eliminar este alimento del inventario?')) {
      try {
        await api.deletePantryItem(id);
        setPantryItems(pantryItems.filter(p => p.id !== id));
        onRefreshDashboard();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // 3. SHOPPING LIST ACTIONS & SMART SYNC
  const handleToggleShopping = async (item) => {
    try {
      const updated = await api.updateShoppingItem(item.id, { checked: !item.checked });
      setShoppingItems(shoppingItems.map(s => s.id === item.id ? updated : s));
      if (!item.checked) {
        confetti({ particleCount: 30, spread: 45, origin: { y: 0.8 } });
      }
      onRefreshDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncShopping = async () => {
    try {
      const res = await api.syncShoppingList();
      setShoppingItems(res.data || []);
      setSyncToast(res.message);
      if (res.newlyAddedCount > 0) {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } });
      }
      setTimeout(() => setSyncToast(null), 4000);
      onRefreshDashboard();
    } catch (err) {
      alert('Error sincronizando lista');
    }
  };

  const handleClearCompleted = async () => {
    try {
      const remaining = await api.clearCompletedShopping();
      setShoppingItems(remaining);
      onRefreshDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateShoppingItem = async (e) => {
    e.preventDefault();
    if (!shoppingForm.name) return;
    try {
      const newItem = await api.addShoppingItem(shoppingForm);
      setShoppingItems([...shoppingItems, newItem]);
      setNewShoppingModal(false);
      setShoppingForm({ name: '', category: 'Frescos', quantity: '1 ud', notes: '' });
      onRefreshDashboard();
    } catch (err) {
      alert('Error añadiendo a la lista');
    }
  };

  const handleDeleteShoppingItem = async (id) => {
    try {
      await api.deleteShoppingItem(id);
      setShoppingItems(shoppingItems.filter(s => s.id !== id));
      onRefreshDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered Pantry
  const filteredPantry = pantryItems.filter(item => {
    const matchesZone = pantryZone === 'all' || item.zone === pantryZone;
    const matchesSearch = item.name.toLowerCase().includes(pantrySearch.toLowerCase()) || 
                          item.category.toLowerCase().includes(pantrySearch.toLowerCase());
    return matchesZone && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-28">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {syncToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 p-4 rounded-2xl bg-emerald-600 text-white font-bold text-sm shadow-2xl border border-emerald-400 flex items-center gap-2 max-w-sm"
          >
            <Sparkles className="w-5 h-5 flex-shrink-0" />
            <span>{syncToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Subtabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <UtensilsCrossed className="w-6 h-6" />
            </span>
            Comidas, Despensa & Compra
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Menú semanal inteligente con sincronización automática de ingredientes faltantes.
          </p>
        </div>

        {/* Big Touch Subtabs */}
        <div className="flex p-1.5 rounded-2xl bg-surface border border-white/10 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('planner')}
            className={`min-h-touch px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'planner'
                ? 'bg-emerald-500 text-white shadow-glow-brand'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Menú Semanal</span>
          </button>

          <button
            onClick={() => setActiveTab('pantry')}
            className={`min-h-touch px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'pantry'
                ? 'bg-emerald-500 text-white shadow-glow-brand'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Refrigerator className="w-4 h-4" />
            <span>Despensa & Stock</span>
            {pantryItems.filter(p => p.quantity <= p.minQuantity).length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('shopping')}
            className={`min-h-touch px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'shopping'
                ? 'bg-emerald-500 text-white shadow-glow-brand'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Lista de la Compra</span>
            {shoppingItems.filter(s => !s.checked).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-emerald-300 font-extrabold">
                {shoppingItems.filter(s => !s.checked).length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: MENÚ SEMANAL */}
      {activeTab === 'planner' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="p-4 rounded-3xl glass-panel border border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white font-display">Planificación Semanal</p>
              <p className="text-xs text-slate-400">Pulsa en cualquier plato para editarlo rápidamente</p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={handleSuggestMenu}
                className="flex-1 sm:flex-initial min-h-touch px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 touch-press"
              >
                <Sparkles className="w-4 h-4" />
                <span>Sugerir Menú Completo</span>
              </button>

              <button
                onClick={handleSyncShopping}
                className="flex-1 sm:flex-initial min-h-touch px-4 py-2.5 rounded-2xl bg-surface-hover hover:bg-surface-active border border-emerald-500/40 text-emerald-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 touch-press"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Sincronizar con Compra</span>
              </button>
            </div>
          </div>

          {/* Cards por Día de la Semana */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {mealDays.map((day) => (
              <motion.div
                key={day.id}
                whileHover={{ y: -2 }}
                className="glass-panel p-5 rounded-3xl border border-white/10 hover:border-emerald-500/30 flex flex-col justify-between space-y-4"
              >
                {/* Day Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <span className="text-lg font-bold text-white font-display capitalize">
                    {day.label}
                  </span>
                  <button
                    onClick={() => setEditDayModal(day)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-emerald-400 touch-press min-h-[40px] min-w-[40px] flex items-center justify-center"
                    aria-label={`Editar menú del ${day.label}`}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>

                {/* Day Meals */}
                <div className="space-y-3">
                  <div
                    onClick={() => setEditDayModal(day)}
                    className="p-3 rounded-2xl bg-black/25 border border-white/5 cursor-pointer hover:bg-black/40 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs text-amber-400 font-bold mb-1">
                      <span>☕ Desayuno</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 line-clamp-2">
                      {day.breakfast || 'Sin asignar'}
                    </p>
                  </div>

                  <div
                    onClick={() => setEditDayModal(day)}
                    className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 cursor-pointer hover:bg-emerald-950/30 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs text-emerald-400 font-bold mb-1">
                      <span>🍽️ Almuerzo / Comida</span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-white line-clamp-2">
                      {day.lunch || 'Sin asignar'}
                    </p>
                  </div>

                  <div
                    onClick={() => setEditDayModal(day)}
                    className="p-3 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 cursor-pointer hover:bg-indigo-950/30 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs text-indigo-300 font-bold mb-1">
                      <span>🌙 Cena</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 line-clamp-2">
                      {day.dinner || 'Sin asignar'}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: DESPENSA & INVENTARIO */}
      {activeTab === 'pantry' && (
        <div className="space-y-6">
          
          {/* Action & Filter Bar */}
          <div className="glass-panel p-4 rounded-3xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-3">
            
            {/* Search Bar */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar en despensa..."
                value={pantrySearch}
                onChange={(e) => setPantrySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Zones Filter */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
              {[
                { id: 'all', label: 'Todos', icon: Package },
                { id: 'nevera', label: 'Nevera', icon: Refrigerator },
                { id: 'congelador', label: 'Congelador', icon: Snowflake },
                { id: 'despensa', label: 'Despensa', icon: Package }
              ].map(zone => (
                <button
                  key={zone.id}
                  onClick={() => setPantryZone(zone.id)}
                  className={`min-h-[44px] px-3.5 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    pantryZone === zone.id
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <zone.icon className="w-3.5 h-3.5" />
                  <span>{zone.label}</span>
                </button>
              ))}
            </div>

            {/* Add Button */}
            <button
              onClick={() => setNewPantryModal(true)}
              className="w-full md:w-auto min-h-touch px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 touch-press"
            >
              <Plus className="w-5 h-5" />
              <span>Añadir Producto</span>
            </button>
          </div>

          {/* Grid de Alimentos con controles + y - TÁCTILES GIGANTES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredPantry.map((item) => {
              const isLowStock = item.quantity <= item.minQuantity;
              const isOutOfStock = item.quantity === 0;

              return (
                <motion.div
                  key={item.id}
                  layout
                  className={`glass-panel p-4 rounded-3xl border transition-all flex flex-col justify-between ${
                    isOutOfStock
                      ? 'border-rose-500/40 bg-rose-950/20'
                      : isLowStock
                      ? 'border-amber-500/30 bg-amber-950/15'
                      : 'border-white/10 hover:border-emerald-500/30'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          {item.zone === 'nevera' ? '❄️ Nevera' : item.zone === 'congelador' ? '🧊 Congelador' : '📦 Despensa'}
                          <span>• {item.category}</span>
                        </span>
                        <h4 className="text-base font-bold text-white truncate mt-0.5">
                          {item.name}
                        </h4>
                      </div>

                      {isOutOfStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/30 text-rose-300 border border-rose-500/40">
                          Agotado
                        </span>
                      ) : isLowStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/30 text-amber-300 border border-amber-500/40">
                          Stock Bajo
                        </span>
                      ) : null}
                    </div>

                    {item.expiration && (
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        Caducidad: {item.expiration}
                      </p>
                    )}
                  </div>

                  {/* CONTROLES TÁCTILES GIGANTES DE STOCK */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                    <button
                      onClick={() => handleAdjustQuantity(item.id, -1)}
                      className="min-h-[48px] min-w-[48px] rounded-2xl bg-white/10 hover:bg-rose-500/30 text-slate-200 hover:text-rose-300 flex items-center justify-center font-bold text-lg border border-white/10 touch-press"
                      aria-label="Restar una unidad"
                    >
                      <Minus className="w-5 h-5" />
                    </button>

                    <div className="text-center min-w-[70px]">
                      <span className="text-2xl font-black text-white font-mono">
                        {item.quantity}
                      </span>
                      <span className="text-xs text-slate-400 block -mt-1 font-medium">
                        {item.unit}
                      </span>
                    </div>

                    <button
                      onClick={() => handleAdjustQuantity(item.id, 1)}
                      className="min-h-[48px] min-w-[48px] rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 flex items-center justify-center font-bold text-lg border border-emerald-500/30 touch-press"
                      aria-label="Añadir una unidad"
                    >
                      <Plus className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => handleDeletePantryItem(item.id)}
                      className="min-h-[48px] min-w-[44px] rounded-2xl text-slate-500 hover:text-rose-400 hover:bg-white/5 flex items-center justify-center touch-press ml-1"
                      aria-label="Eliminar alimento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: LISTA DE LA COMPRA INTELIGENTE */}
      {activeTab === 'shopping' && (
        <div className="space-y-6">
          
          {/* Header Action Bar */}
          <div className="glass-panel p-4 rounded-3xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white font-display">Modo Supermercado Táctil</p>
              <p className="text-xs text-slate-400">Toca cualquier producto para tacharlo al colocarlo en el carrito</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSyncShopping}
                className="flex-1 sm:flex-initial min-h-touch px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 touch-press"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Auto-Sincronizar con Despensa</span>
              </button>

              <button
                onClick={() => setNewShoppingModal(true)}
                className="flex-1 sm:flex-initial min-h-touch px-4 py-2.5 rounded-2xl bg-surface-hover hover:bg-surface-active border border-white/15 text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 touch-press"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir Producto</span>
              </button>

              {shoppingItems.some(s => s.checked) && (
                <button
                  onClick={handleClearCompleted}
                  className="min-h-touch px-3 py-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-rose-500/30 touch-press"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Limpiar Comprados</span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive Shopping List */}
          <div className="space-y-2.5">
            {shoppingItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                onClick={() => handleToggleShopping(item)}
                className={`min-h-touch p-4 rounded-3xl border flex items-center justify-between gap-4 cursor-pointer transition-all touch-press ${
                  item.checked
                    ? 'bg-slate-900/40 border-white/5 opacity-50'
                    : 'glass-panel border-white/10 hover:border-emerald-500/30'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* BIG TOUCH CHECKBOX */}
                  <div
                    className={`w-8 h-8 rounded-2xl flex items-center justify-center border-2 transition-all flex-shrink-0 ${
                      item.checked
                        ? 'bg-emerald-500 border-emerald-400 text-white'
                        : 'border-slate-500 bg-black/20'
                    }`}
                  >
                    {item.checked && <Check className="w-5 h-5 stroke-[3]" />}
                  </div>

                  <div className="min-w-0">
                    <p className={`text-base font-bold truncate ${item.checked ? 'line-through text-slate-400' : 'text-white'}`}>
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-semibold text-emerald-400 font-mono">{item.quantity}</span>
                      <span>• {item.category}</span>
                      {item.fromMealPlan && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Auto-Sincronizado
                        </span>
                      )}
                      {item.notes && <span className="italic text-slate-500 truncate">- {item.notes}</span>}
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteShoppingItem(item.id);
                  }}
                  className="min-h-touch min-w-[44px] p-2 text-slate-500 hover:text-rose-400 rounded-xl hover:bg-white/5 flex items-center justify-center touch-press"
                  aria-label="Eliminar de lista de compras"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}

            {shoppingItems.length === 0 && (
              <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 space-y-3">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-xl font-bold text-white font-display">¡Lista de la compra vacía!</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Pulsa en "Auto-Sincronizar" para comprobar las recetas planificadas y el stock de tu despensa.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: EDITAR PLATO DE UN DÍA */}
      <Modal
        isOpen={Boolean(editDayModal)}
        onClose={() => setEditDayModal(null)}
        title={`Editar Menú: ${editDayModal?.label}`}
        subtitle="Selecciona una receta rápida o escribe los platos del día"
      >
        <form onSubmit={handleSaveDayEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
              ☕ Desayuno
            </label>
            <input
              type="text"
              value={editDayModal?.breakfast || ''}
              onChange={(e) => setEditDayModal({ ...editDayModal, breakfast: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
              placeholder="Ej: Tostadas con aguacate y café"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
              🍽️ Almuerzo / Comida Principal
            </label>
            <input
              type="text"
              value={editDayModal?.lunch || ''}
              onChange={(e) => setEditDayModal({ ...editDayModal, lunch: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
              placeholder="Ej: Salmón al horno con verduras"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">
              🌙 Cena
            </label>
            <input
              type="text"
              value={editDayModal?.dinner || ''}
              onChange={(e) => setEditDayModal({ ...editDayModal, dinner: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
              placeholder="Ej: Crema de calabacín y tortilla"
            />
          </div>

          {/* Quick Recipe Chips */}
          <div className="pt-2">
            <p className="text-xs text-slate-400 mb-2">💡 Sugerencias rápidas de recetas del hogar:</p>
            <div className="flex flex-wrap gap-2">
              {recipes.map((rec) => (
                <button
                  type="button"
                  key={rec.id}
                  onClick={() => setEditDayModal({ ...editDayModal, lunch: rec.name })}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 border border-white/10 text-xs text-slate-200 hover:text-emerald-300 text-left truncate"
                >
                  {rec.name}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditDayModal(null)}
              className="min-h-touch px-4 py-2.5 rounded-2xl bg-white/5 text-slate-300 font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-touch px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm shadow-lg shadow-emerald-950/60"
            >
              Guardar Día
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: AÑADIR PRODUCTO A DESPENSA */}
      <Modal
        isOpen={newPantryModal}
        onClose={() => setNewPantryModal(false)}
        title="Añadir Alimento a la Despensa"
        subtitle="Registra el producto y su zona de conservación"
      >
        <form onSubmit={handleCreatePantryItem} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Nombre del Alimento</label>
            <input
              type="text"
              required
              placeholder="Ej: Leche desnatada, Huevos camperos..."
              value={pantryForm.name}
              onChange={(e) => setPantryForm({ ...pantryForm, name: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Zona</label>
              <select
                value={pantryForm.zone}
                onChange={(e) => setPantryForm({ ...pantryForm, zone: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="nevera">❄️ Nevera</option>
                <option value="congelador">🧊 Congelador</option>
                <option value="despensa">📦 Despensa</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Categoría</label>
              <select
                value={pantryForm.category}
                onChange={(e) => setPantryForm({ ...pantryForm, category: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="Lácteos">Lácteos</option>
                <option value="Huevos">Huevos</option>
                <option value="Carnes">Carnes</option>
                <option value="Pescados">Pescados</option>
                <option value="Verduras">Verduras</option>
                <option value="Frutas">Frutas</option>
                <option value="Legumbres">Legumbres</option>
                <option value="Pastas">Pastas</option>
                <option value="Aceites">Aceites</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Cantidad</label>
              <input
                type="number"
                min="0"
                value={pantryForm.quantity}
                onChange={(e) => setPantryForm({ ...pantryForm, quantity: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Unidad</label>
              <input
                type="text"
                value={pantryForm.unit}
                onChange={(e) => setPantryForm({ ...pantryForm, unit: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
                placeholder="ud, kg, litros..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Mín. Alerta</label>
              <input
                type="number"
                min="0"
                value={pantryForm.minQuantity}
                onChange={(e) => setPantryForm({ ...pantryForm, minQuantity: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setNewPantryModal(false)}
              className="min-h-touch px-4 py-2.5 rounded-2xl bg-white/5 text-slate-300 font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-touch px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm shadow-lg shadow-emerald-950/60"
            >
              Añadir Producto
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: AÑADIR A LISTA DE COMPRA */}
      <Modal
        isOpen={newShoppingModal}
        onClose={() => setNewShoppingModal(false)}
        title="Añadir a la Lista de la Compra"
        subtitle="Nuevo producto para adquirir en el supermercado"
      >
        <form onSubmit={handleCreateShoppingItem} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Producto</label>
            <input
              type="text"
              required
              placeholder="Ej: Tomates cherry, Papel de cocina..."
              value={shoppingForm.name}
              onChange={(e) => setShoppingForm({ ...shoppingForm, name: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Cantidad</label>
              <input
                type="text"
                value={shoppingForm.quantity}
                onChange={(e) => setShoppingForm({ ...shoppingForm, quantity: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
                placeholder="Ej: 2 paquetes, 500g..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Categoría</label>
              <input
                type="text"
                value={shoppingForm.category}
                onChange={(e) => setShoppingForm({ ...shoppingForm, category: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
                placeholder="Frescos, Limpieza..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Notas Opcionales</label>
            <input
              type="text"
              value={shoppingForm.notes}
              onChange={(e) => setShoppingForm({ ...shoppingForm, notes: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
              placeholder="Marca específica, sin gluten..."
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setNewShoppingModal(false)}
              className="min-h-touch px-4 py-2.5 rounded-2xl bg-white/5 text-slate-300 font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-touch px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm shadow-lg shadow-emerald-950/60"
            >
              Añadir a Lista
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
