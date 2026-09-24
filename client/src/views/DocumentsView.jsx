import React, { useState, useEffect } from 'react';
import { 
  FolderCheck, 
  Camera, 
  FileText, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Trash2, 
  Eye, 
  Layers,
  FileCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import Modal from '../components/Modal';

function DocumentsView({ api, onRefreshDashboard }) {
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
    <div className="space-y-6 pb-24">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight flex items-center gap-2.5">
            <span className="w-11 h-11 rounded-2xl bg-purple-500/15 text-purple-300 flex items-center justify-center border border-purple-400/25 shadow-inner-light">
              <FolderCheck className="w-6 h-6" />
            </span>
            Documentación & Garantías
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Digitalización con cámara y control de fechas de caducidad para electrodomésticos y pólizas.
          </p>
        </div>

        {/* Big Touch Upload Button */}
        <button
          onClick={() => setNewDocModal(true)}
          className="min-h-touch px-5 py-3 rounded-2xl bg-white/[0.12] hover:bg-white/[0.18] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/15 shadow-inner-light transition-all touch-press"
        >
          <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-purple-300" />
          <span>Capturar / Subir Documento</span>
        </button>
      </div>

      {/* 1. SEMÁFORO DE ALERTAS DE GARANTÍAS Y VENCIMIENTOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        <div className="glass-ios p-4 sm:p-5 rounded-[26px] border border-rose-500/30 bg-rose-500/[0.05] flex items-center gap-4 shadow-ambient-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-300 flex items-center justify-center border border-rose-500/30 flex-shrink-0 shadow-inner-light">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-rose-200 font-display tracking-tight">{criticalCount}</span>
            <p className="text-xs text-rose-300/80 font-medium">Urgentes / Vencidos (&lt; 30 días)</p>
          </div>
        </div>

        <div className="glass-ios p-4 sm:p-5 rounded-[26px] border border-amber-500/30 bg-amber-500/[0.05] flex items-center gap-4 shadow-ambient-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30 flex-shrink-0 shadow-inner-light">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-amber-200 font-display tracking-tight">{warningCount}</span>
            <p className="text-xs text-amber-300/80 font-medium">Próximos a Vencer (&lt; 90 días)</p>
          </div>
        </div>

        <div className="glass-ios p-4 sm:p-5 rounded-[26px] border border-emerald-500/30 bg-emerald-500/[0.05] flex items-center gap-4 shadow-ambient-sm">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30 flex-shrink-0 shadow-inner-light">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-emerald-200 font-display tracking-tight">
              {documents.filter(d => d.status === 'ok').length}
            </span>
            <p className="text-xs text-emerald-300/80 font-medium">En Cobertura Vigente</p>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE FILTRO Y BÚSQUEDA */}
      <div className="glass-ios p-4 sm:p-5 rounded-[28px] border border-white/12 flex flex-col md:flex-row items-center justify-between gap-3 shadow-ambient-sm">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por marca, modelo o póliza..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-white placeholder-slate-500 text-xs sm:text-sm"
          />
        </div>

        {/* Categories Bar */}
        <div className="p-1 rounded-full bg-white/[0.05] border border-white/10 flex items-center gap-1 overflow-x-auto no-scrollbar w-full md:w-auto">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all flex-shrink-0 touch-press ${
                  isActive
                    ? 'bg-white/15 text-white border border-white/20 shadow-inner-light'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. GRID DE DOCUMENTOS Y TARJETAS VISUALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredDocs.map((doc) => {
          const isCritical = doc.status === 'critical' || doc.status === 'expired';
          const isWarning = doc.status === 'warning';

          return (
            <motion.div
              key={doc.id}
              layout
              className={`glass-ios p-5 sm:p-6 rounded-[28px] sm:rounded-[32px] border transition-all flex flex-col justify-between space-y-4 shadow-ambient-sm ${
                isCritical
                  ? 'border-rose-500/35 bg-rose-500/[0.05]'
                  : isWarning
                  ? 'border-amber-500/30 bg-amber-500/[0.05]'
                  : 'border-white/10 hover:border-purple-400/30'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-300 px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-400/25">
                    {doc.category}
                  </span>

                  {/* BADGE DE SEMÁFORO DE CADUCIDAD */}
                  {isCritical ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-md flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      {doc.daysRemaining <= 0 ? 'Vencida' : `Vence en ${doc.daysRemaining}d`}
                    </span>
                  ) : isWarning ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {doc.daysRemaining} días restantes
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                      Vigente
                    </span>
                  )}
                </div>

                <h4 className="text-lg font-bold text-white font-display mt-2.5 line-clamp-1 tracking-tight">
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
                  <span className="font-semibold text-slate-200 font-mono">{doc.purchaseDate || 'N/A'}</span>
                </div>
                {doc.warrantyExpiryDate && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Fin Garantía / Vencimiento:</span>
                    <span className={`font-bold font-mono ${isCritical ? 'text-rose-300' : isWarning ? 'text-amber-300' : 'text-emerald-300'}`}>
                      {doc.warrantyExpiryDate}
                    </span>
                  </div>
                )}
              </div>

              {/* Touch Actions */}
              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  onClick={() => setViewerModal(doc)}
                  className="flex-1 min-h-[44px] px-4 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/10 touch-press transition-all shadow-inner-light"
                >
                  <Eye className="w-4 h-4 text-purple-300" />
                  <span>Ver Documento</span>
                </button>

                <button
                  onClick={() => handleDelete(doc.id)}
                  className="min-h-[44px] min-w-[44px] rounded-2xl text-slate-500 hover:text-rose-400 hover:bg-white/[0.05] flex items-center justify-center touch-press"
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
              className="w-full px-4 py-3 rounded-2xl glass-input text-white text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Categoría</label>
              <select
                value={docForm.category}
                onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl glass-input text-white text-sm"
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
                className="w-full px-4 py-3 rounded-2xl glass-input text-white text-sm"
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
                className="w-full px-4 py-3 rounded-2xl glass-input text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Fecha de Compra</label>
              <input
                type="date"
                value={docForm.purchaseDate}
                onChange={(e) => setDocForm({ ...docForm, purchaseDate: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl glass-input text-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-amber-300 mb-1">
              📅 Fecha Vencimiento / Fin de Garantía (Para Alertas)
            </label>
            <input
              type="date"
              value={docForm.warrantyExpiryDate}
              onChange={(e) => setDocForm({ ...docForm, warrantyExpiryDate: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl glass-input text-white text-sm"
            />
          </div>

          {/* CÁMARA / FILE UPLOAD CONTROLLER */}
          <div className="p-5 rounded-3xl glass-subtle border border-dashed border-purple-400/40 text-center space-y-2">
            <label className="cursor-pointer block">
              <Camera className="w-8 h-8 text-purple-300 mx-auto mb-1" />
              <span className="text-xs font-bold text-purple-200 block">
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
              className="w-full px-4 py-2.5 rounded-2xl glass-input text-white text-sm"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setNewDocModal(false)}
              className="min-h-touch px-4 py-2.5 rounded-2xl bg-white/[0.08] text-slate-300 hover:text-white font-semibold text-xs sm:text-sm touch-press"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="min-h-touch px-6 py-2.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs sm:text-sm shadow-glow-brand touch-press"
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
          <div className="p-4 rounded-2xl glass-subtle border border-white/10 space-y-2 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div><span className="text-slate-400">Emisor:</span> <p className="font-bold text-white">{viewerModal?.issuer || 'N/A'}</p></div>
              <div><span className="text-slate-400">Modelo/Póliza:</span> <p className="font-bold text-white">{viewerModal?.modelOrPolicy || 'N/A'}</p></div>
              <div><span className="text-slate-400">Compra:</span> <p className="font-bold text-white font-mono">{viewerModal?.purchaseDate || 'N/A'}</p></div>
              <div><span className="text-slate-400">Vencimiento:</span> <p className="font-bold text-amber-300 font-mono">{viewerModal?.warrantyExpiryDate || 'N/A'}</p></div>
            </div>
            {viewerModal?.notes && (
              <p className="pt-2 border-t border-white/5 text-slate-300 italic">{viewerModal.notes}</p>
            )}
          </div>

          {/* Visor preview */}
          <div className="w-full h-80 rounded-2xl bg-slate-950/80 border border-white/10 overflow-hidden flex items-center justify-center">
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
              className="min-h-touch px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm touch-press"
            >
              Cerrar Visor
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

export default React.memo(DocumentsView);
