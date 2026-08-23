import React, { useState, useEffect } from 'react';
import { 
  FolderCheck, 
  Camera, 
  Upload, 
  FileText, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Search, 
  Trash2, 
  Eye, 
  ExternalLink, 
  Download, 
  Calendar, 
  Clock, 
  Sparkles,
  Layers,
  FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Modal from '../components/Modal';

export default function DocumentsView({ api, onRefreshDashboard }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [newDocModal, setNewDocModal] = useState(false);
  const [viewerModal, setViewerModal] = useState(null); // document to view
  const [isUploading, setIsUploading] = useState(false);

  // Form State
  const [docForm, setDocForm] = useState({
    title: '',
    category: 'Electrodomésticos',
    issuer: '',
    modelOrPolicy: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    warrantyExpiryDate: '',
    notes: '',
    tags: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await api.getDocuments();
      setDocuments(data || []);
    } catch (err) {
      console.error('Error cargando documentos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!docForm.title) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('title', docForm.title);
      formData.append('category', docForm.category);
      formData.append('issuer', docForm.issuer);
      formData.append('modelOrPolicy', docForm.modelOrPolicy);
      formData.append('purchaseDate', docForm.purchaseDate);
      if (docForm.warrantyExpiryDate) {
        formData.append('warrantyExpiryDate', docForm.warrantyExpiryDate);
      }
      formData.append('notes', docForm.notes);
      formData.append('tags', docForm.tags);

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      await api.uploadDocument(formData);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      setNewDocModal(false);
      setDocForm({
        title: '',
        category: 'Electrodomésticos',
        issuer: '',
        modelOrPolicy: '',
        purchaseDate: new Date().toISOString().slice(0, 10),
        warrantyExpiryDate: '',
        notes: '',
        tags: ''
      });
      setSelectedFile(null);
      loadDocuments();
      onRefreshDashboard();
    } catch (err) {
      alert('Error subiendo documento');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este documento y su archivo digitalizado?')) {
      try {
        await api.deleteDocument(id);
        setDocuments(documents.filter(d => d.id !== id));
        if (viewerModal?.id === id) setViewerModal(null);
        onRefreshDashboard();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const categories = [
    { id: 'all', label: 'Todos', icon: Layers },
    { id: 'Electrodomésticos', label: 'Electrodomésticos', icon: FileCheck },
    { id: 'Seguros', label: 'Seguros & Pólizas', icon: ShieldAlert },
    { id: 'Contratos/Suministros', label: 'Suministros / Contratos', icon: FileText },
    { id: 'Vehículos', label: 'Vehículos', icon: FileText },
    { id: 'Garantías', label: 'Garantías', icon: CheckCircle2 }
  ];

  const filteredDocs = documents.filter(doc => {
    const matchesCat = activeCategory === 'all' || doc.category === activeCategory;
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (doc.issuer && doc.issuer.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (doc.modelOrPolicy && doc.modelOrPolicy.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const criticalCount = documents.filter(d => d.status === 'critical' || d.status === 'expired').length;
  const warningCount = documents.filter(d => d.status === 'warning').length;

  return (
    <div className="space-y-6 pb-28">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <FolderCheck className="w-6 h-6" />
            </span>
            Documentación & Garantías
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Digitalización con cámara y control de fechas de caducidad para electrodomésticos y pólizas.
          </p>
        </div>

        {/* Big Touch Upload Button */}
        <button
          onClick={() => setNewDocModal(true)}
          className="min-h-touch px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-purple-950/60 touch-press"
        >
          <Camera className="w-5 h-5" />
          <span>Capturar / Subir Documento</span>
        </button>
      </div>

      {/* 1. SEMÁFORO DE ALERTAS DE GARANTÍAS Y VENCIMIENTOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-3xl border border-rose-500/30 bg-rose-950/20 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/40 flex-shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-black text-rose-300 font-display">{criticalCount}</span>
            <p className="text-xs text-rose-200/90 font-medium">Urgentes / Vencidos (&lt; 30 días)</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-3xl border border-amber-500/30 bg-amber-950/20 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 flex-shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-black text-amber-300 font-display">{warningCount}</span>
            <p className="text-xs text-amber-200/90 font-medium">Próximos a Vencer (&lt; 90 días)</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-3xl border border-emerald-500/30 bg-emerald-950/20 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-black text-emerald-300 font-display">
              {documents.filter(d => d.status === 'ok').length}
            </span>
            <p className="text-xs text-emerald-200/90 font-medium">En Cobertura Vigente</p>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE FILTRO Y BÚSQUEDA */}
      <div className="glass-panel p-4 rounded-3xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por marca, modelo o póliza..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all flex-shrink-0 ${
                activeCategory === cat.id
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. GRID DE DOCUMENTOS Y TARJETAS VISUALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc) => {
          const isCritical = doc.status === 'critical' || doc.status === 'expired';
          const isWarning = doc.status === 'warning';

          return (
            <motion.div
              key={doc.id}
              layout
              className={`glass-panel p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                isCritical
                  ? 'border-rose-500/40 bg-gradient-to-br from-rose-950/25 to-surface'
                  : isWarning
                  ? 'border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-surface'
                  : 'border-white/10 hover:border-purple-500/30'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-300 px-2 py-0.5 rounded-md bg-purple-500/20">
                    {doc.category}
                  </span>

                  {/* BADGE DE SEMÁFORO DE CADUCIDAD */}
                  {isCritical ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500 text-white shadow-lg flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      {doc.daysRemaining <= 0 ? 'Vencida' : `Vence en ${doc.daysRemaining}d`}
                    </span>
                  ) : isWarning ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {doc.daysRemaining} días restantes
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                      Vigente
                    </span>
                  )}
                </div>

                <h4 className="text-lg font-bold text-white font-display mt-2 line-clamp-1">
                  {doc.title}
                </h4>
                
                {doc.issuer && (
                  <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                    🏢 {doc.issuer} {doc.modelOrPolicy && `• Ref: ${doc.modelOrPolicy}`}
                  </p>
                )}

                {doc.notes && (
                  <p className="text-xs text-slate-300/80 mt-2 line-clamp-2 leading-relaxed">
                    {doc.notes}
                  </p>
                )}
              </div>

              {/* Document Meta & Dates */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Compra / Emisión:</span>
                  <span className="font-semibold text-slate-200">{doc.purchaseDate || 'N/A'}</span>
                </div>
                {doc.warrantyExpiryDate && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Fin Garantía / Vencimiento:</span>
                    <span className={`font-bold font-mono ${isCritical ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {doc.warrantyExpiryDate}
                    </span>
                  </div>
                )}
              </div>

              {/* Touch Actions */}
              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  onClick={() => setViewerModal(doc)}
                  className="flex-1 min-h-[44px] px-3 rounded-2xl bg-white/10 hover:bg-purple-500/20 text-slate-200 hover:text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 touch-press"
                >
                  <Eye className="w-4 h-4" />
                  <span>Ver Póliza / Factura</span>
                </button>

                <button
                  onClick={() => handleDelete(doc.id)}
                  className="min-h-[44px] min-w-[44px] rounded-2xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center touch-press"
                  aria-label="Eliminar documento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* MODAL: SUBIR / CAPTURAR DOCUMENTO CON CÁMARA */}
      <Modal
        isOpen={newDocModal}
        onClose={() => setNewDocModal(false)}
        title="Digitalizar Nuevo Documento"
        subtitle="Sube una factura, garantía o captura directamente con tu cámara"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Título del Documento *</label>
            <input
              type="text"
              required
              placeholder="Ej: Garantía Lavavajillas Balay, Seguro Mapfre..."
              value={docForm.title}
              onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Categoría</label>
              <select
                value={docForm.category}
                onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="Electrodomésticos">Electrodomésticos</option>
                <option value="Seguros">Seguros</option>
                <option value="Contratos/Suministros">Contratos/Suministros</option>
                <option value="Vehículos">Vehículos</option>
                <option value="Garantías">Garantías</option>
                <option value="Facturas">Facturas</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Emisor / Tienda / Aseguradora</label>
              <input
                type="text"
                placeholder="Ej: MediaMarkt, Mapfre, Amazon..."
                value={docForm.issuer}
                onChange={(e) => setDocForm({ ...docForm, issuer: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Nº Póliza / Modelo</label>
              <input
                type="text"
                placeholder="Ej: POL-88912, Serie 6..."
                value={docForm.modelOrPolicy}
                onChange={(e) => setDocForm({ ...docForm, modelOrPolicy: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Fecha de Compra</label>
              <input
                type="date"
                value={docForm.purchaseDate}
                onChange={(e) => setDocForm({ ...docForm, purchaseDate: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-amber-400 mb-1">
              📅 Fecha Vencimiento / Fin de Garantía (Para Alertas)
            </label>
            <input
              type="date"
              value={docForm.warrantyExpiryDate}
              onChange={(e) => setDocForm({ ...docForm, warrantyExpiryDate: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* CÁMARA / FILE UPLOAD CONTROLLER */}
          <div className="p-4 rounded-2xl bg-black/30 border border-dashed border-purple-500/40 text-center space-y-2">
            <label className="cursor-pointer block">
              <Camera className="w-8 h-8 text-purple-400 mx-auto mb-1" />
              <span className="text-xs font-bold text-purple-300 block">
                {selectedFile ? selectedFile.name : 'Toca para tomar foto con la cámara o seleccionar archivo'}
              </span>
              <span className="text-[10px] text-slate-400 block">Soporta PDF, JPG, PNG (hasta 15MB)</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Notas Opcionales</label>
            <textarea
              rows="2"
              placeholder="Detalles sobre coberturas, teléfonos de asistencia, etc..."
              value={docForm.notes}
              onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })}
              className="w-full px-4 py-2.5 rounded-2xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setNewDocModal(false)}
              className="min-h-touch px-4 py-2.5 rounded-2xl bg-white/5 text-slate-300 font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="min-h-touch px-6 py-2.5 rounded-2xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-sm shadow-lg shadow-purple-950/60"
            >
              {isUploading ? 'Digitalizando...' : 'Guardar Documento'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: VISOR INTEGRADO DE DOCUMENTO */}
      <Modal
        isOpen={Boolean(viewerModal)}
        onClose={() => setViewerModal(null)}
        title={viewerModal?.title || 'Visor de Documento'}
        subtitle={`Categoría: ${viewerModal?.category} • ${viewerModal?.issuer || ''}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div><span className="text-slate-400">Emisor:</span> <p className="font-bold text-white">{viewerModal?.issuer || 'N/A'}</p></div>
              <div><span className="text-slate-400">Modelo/Póliza:</span> <p className="font-bold text-white">{viewerModal?.modelOrPolicy || 'N/A'}</p></div>
              <div><span className="text-slate-400">Compra:</span> <p className="font-bold text-white">{viewerModal?.purchaseDate || 'N/A'}</p></div>
              <div><span className="text-slate-400">Vencimiento:</span> <p className="font-bold text-amber-300">{viewerModal?.warrantyExpiryDate || 'N/A'}</p></div>
            </div>
            {viewerModal?.notes && (
              <p className="pt-2 border-t border-white/5 text-slate-300 italic">{viewerModal.notes}</p>
            )}
          </div>

          {/* Visor preview */}
          <div className="w-full h-80 rounded-2xl bg-slate-950 border border-white/10 overflow-hidden flex items-center justify-center">
            {viewerModal?.fileUrl ? (
              <iframe
                src={viewerModal.fileUrl}
                title="Vista previa del documento"
                className="w-full h-full border-0"
              />
            ) : (
              <iframe
                src="/sample-docs/sample-preview.html"
                title="Vista previa digitalizada"
                className="w-full h-full border-0"
              />
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setViewerModal(null)}
              className="min-h-touch px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm"
            >
              Cerrar Visor
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
