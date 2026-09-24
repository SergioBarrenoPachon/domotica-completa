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
  FileCode,
  FolderArchive,
  Layers
} from 'lucide-react';
import Modal from './Modal';
import { api } from '../services/api';

export default function DatabaseStatusModal({ isOpen, onClose }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
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

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Base de Datos Central & Persistencia"
    >
      <div className="space-y-4">
        
        {/* Banner de Garantía de Persistencia */}
        <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3.5 backdrop-blur-xl">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 shadow-inner-light">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2 font-display">
              <span>Almacenamiento Central y Permanente</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                100% Persistente
              </span>
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Tus datos <strong>NO residen en la memoria del navegador</strong>. Se guardan físicamente en el disco duro del servidor en un fichero permanente y protegido. Puedes reiniciar el navegador, apagar el dispositivo o cambiar de tablet sin perder ningún dato.
            </p>
          </div>
        </div>

        {/* Multidispositivo Sync Info */}
        <div className="p-4 rounded-3xl glass-subtle border border-white/10 space-y-3">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-2 font-display">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span>Sincronización Multidispositivo en Tiempo Real</span>
          </span>

          <div className="grid grid-cols-3 gap-2.5 text-center text-xs text-slate-300">
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
              <Smartphone className="w-5 h-5 mx-auto text-amber-400" />
              <span className="block font-bold text-[11px] text-white font-display">Tablet Wi-Fi</span>
              <span className="text-[10px] text-slate-400 block">Acceso directo</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
              <Laptop className="w-5 h-5 mx-auto text-cyan-400" />
              <span className="block font-bold text-[11px] text-white font-display">Ordenador</span>
              <span className="text-[10px] text-slate-400 block">Misma base de datos</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
              <HardDrive className="w-5 h-5 mx-auto text-emerald-400" />
              <span className="block font-bold text-[11px] text-white font-display">Servidor Disco</span>
              <span className="text-[10px] text-slate-400 block">data/domotica_db</span>
            </div>
          </div>
        </div>

        {/* Detalles del archivo en disco */}
        {status && (
          <div className="p-4 rounded-3xl glass-subtle border border-white/10 space-y-2 text-xs text-slate-300 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Fichero Base de Datos:</span>
              <span className="text-white font-bold truncate max-w-[200px]">domotica_db.json</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tamaño en Disco:</span>
              <span className="text-emerald-400 font-bold">{(status.sizeBytes / 1024).toFixed(1)} KB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Copias de Seguridad Automáticas:</span>
              <span className="text-amber-400 font-bold">{status.backupsCount} respaldos</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Registros Financieros:</span>
              <span className="text-white">{status.counts?.transactions || 0} movimientos</span>
            </div>
          </div>
        )}

        {/* Acciones de Respaldo y Descarga */}
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
            <span>{backupSuccess ? '¡Respaldo Creado!' : 'Crear Respaldo Ahora'}</span>
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
