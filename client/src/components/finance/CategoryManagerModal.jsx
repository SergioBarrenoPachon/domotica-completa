import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  Tag, 
  Plus, 
  Trash2, 
  Sparkles, 
  Check, 
  X,
  Layers
} from 'lucide-react';
import Modal from '../Modal';

export default function CategoryManagerModal({
  isOpen,
  onClose,
  api,
  onCategoriesChanged
}) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // New category form
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [customGroup, setCustomGroup] = useState('');
  const [isNewGroup, setIsNewGroup] = useState(false);
  const [color, setColor] = useState('#3b82f6');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const cats = await api.getFinanceCategories();
      setCategories(cats || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const grouped = categories.reduce((acc, cat) => {
    const grp = cat.group || 'Otros';
    if (!acc[grp]) acc[grp] = [];
    acc[grp].push(cat);
    return acc;
  }, {});

  const existingGroups = Object.keys(grouped);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalGroup = isNewGroup 
      ? (customGroup.trim() || 'Personalizados')
      : (group || 'Personalizados');

    setSaving(true);
    try {
      await api.addFinanceCategory({
        name: name.trim(),
        group: finalGroup,
        color,
        icon: 'Tag'
      });
      setName('');
      setCustomGroup('');
      setIsNewGroup(false);
      await loadCategories();
      if (onCategoriesChanged) onCategoriesChanged();
    } catch (err) {
      alert('Error creando categoría: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, catName) => {
    if (!window.confirm(`¿Eliminar la categoría "${catName}"?`)) return;
    try {
      await api.deleteFinanceCategory(id);
      await loadCategories();
      if (onCategoriesChanged) onCategoriesChanged();
    } catch (err) {
      alert('Error eliminando categoría');
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gestión de Categorías & Agrupaciones"
    >
      <div className="space-y-5">
        <p className="text-xs text-slate-300">
          Personaliza cómo se clasifican tus gastos e ingresos periódicos y cotidianos. Puedes crear agrupaciones nuevas según las necesidades de tu hogar.
        </p>

        {/* FORMULARIO DE NUEVA CATEGORÍA */}
        <form onSubmit={handleCreate} className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 space-y-3.5 shadow-inner">
          <span className="text-xs font-bold text-ios-amber flex items-center gap-1.5 font-display">
            <Plus className="w-4 h-4" />
            <span>Añadir Nueva Categoría o Agrupación</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-300 block mb-1 font-display">Nombre de la Categoría *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Clases Particulares, Mascotas..."
                className="glass-input rounded-xl px-3 py-2 text-xs text-white outline-none w-full"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-300 block mb-1 font-display">Agrupación / Bloque</label>
              {!isNewGroup ? (
                <div className="flex gap-1">
                  <select
                    value={group}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setIsNewGroup(true);
                      } else {
                        setGroup(e.target.value);
                      }
                    }}
                    className="glass-input rounded-xl px-3 py-2 text-xs text-white outline-none w-full"
                  >
                    <option value="" className="bg-slate-900 text-white">Elegir agrupación existente...</option>
                    {existingGroups.map(g => (
                      <option key={g} value={g} className="bg-slate-900 text-white">{g}</option>
                    ))}
                    <option value="__new__" className="bg-slate-900 text-amber-400">+ Crear NUEVA agrupación...</option>
                  </select>
                </div>
              ) : (
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={customGroup}
                    onChange={(e) => setCustomGroup(e.target.value)}
                    placeholder="Nombre nueva agrupación..."
                    className="glass-input rounded-xl px-3 py-2 text-xs text-white outline-none w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setIsNewGroup(false)}
                    className="px-2.5 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-xl text-slate-300 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium">Color:</span>
              {['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#a855f7', '#06b6d4', '#64748b'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-full transition-transform active:scale-95 ${color === c ? 'scale-125 ring-2 ring-white shadow-md' : 'opacity-80'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md active:scale-95 transition-all"
            >
              {saving ? 'Guardando...' : 'Crear Categoría'}
            </button>
          </div>
        </form>

        {/* LISTA DE CATEGORÍAS AGRUPADAS */}
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {existingGroups.map(grpName => (
            <div key={grpName} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 font-display">
                <Folder className="w-3.5 h-3.5 text-ios-amber" />
                <span>{grpName}</span>
                <span className="text-[10px] text-slate-500 font-mono">({grouped[grpName].length})</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {grouped[grpName].map(cat => (
                  <div
                    key={cat.id || cat.name}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white shadow-sm"
                  >
                    <span 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color || '#f59e0b' }}
                    />
                    <span>{cat.name}</span>
                    {!cat.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="text-slate-500 hover:text-rose-400 p-0.5 ml-1 active:scale-90 transition-transform"
                        title="Eliminar categoría personalizada"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold active:scale-95 transition-all"
          >
            Listo
          </button>
        </div>

      </div>
    </Modal>
  );
}
