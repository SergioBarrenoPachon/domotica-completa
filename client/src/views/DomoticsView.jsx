import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, 
  Power, 
  Settings, 
  RefreshCw, 
  Film, 
  Sunrise, 
  Shield, 
  Moon, 
  Zap, 
  Sparkles, 
  Layers, 
  Sun, 
  ArrowUp, 
  ArrowDown, 
  Square,
  Wifi,
  Plus,
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Modal from '../components/Modal';

function DomoticsView({ api, onRefreshDashboard }) {
  const [domoticsData, setDomoticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeRoomId, setActiveRoomId] = useState('all'); // 'all' | 'salon' | 'cocina' ...

  // Modals
  const [configModal, setConfigModal] = useState(false);
  const [syncToast, setSyncToast] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Connector config forms
  const [connectorForm, setConnectorForm] = useState({
    ewelink: {
      appId: '',
      appSecret: '',
      region: 'eu',
      email: '',
      mode: 'simulated'
    },
    homeAssistant: {
      baseUrl: '',
      token: '',
      webhookUrl: '',
      mode: 'simulated'
    }
  });

  useEffect(() => {
    loadDomotics();
  }, []);

  const loadDomotics = async () => {
    try {
      setLoading(true);
      const data = await api.getDomotics();
      setDomoticsData(data);
      if (data?.connectors) {
        setConnectorForm({
          ewelink: {
            appId: data.connectors.ewelink?.appId || '',
            appSecret: data.connectors.ewelink?.appSecret || '',
            region: data.connectors.ewelink?.region || 'eu',
            email: data.connectors.ewelink?.email || '',
            mode: data.connectors.ewelink?.mode || 'simulated'
          },
          homeAssistant: {
            baseUrl: data.connectors.homeAssistant?.baseUrl || '',
            token: data.connectors.homeAssistant?.token || '',
            webhookUrl: data.connectors.homeAssistant?.webhookUrl || '',
            mode: data.connectors.homeAssistant?.mode || 'simulated'
          }
        });
      }
    } catch (err) {
      console.error('Error cargando domótica:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle device state (On/Off)
  const handleToggleDevice = async (id) => {
    try {
      const updated = await api.toggleDevice(id);
      setDomoticsData(prev => ({
        ...prev,
        devices: prev.devices.map(d => d.id === id ? updated : d)
      }));
      onRefreshDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  // Update Brightness / Position / Temp
  const handleUpdateDeviceProp = async (id, propName, value) => {
    try {
      const updated = await api.updateDevice(id, { [propName]: value });
      setDomoticsData(prev => ({
        ...prev,
        devices: prev.devices.map(d => d.id === id ? updated : d)
      }));
      onRefreshDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  // Activate Scene
  const handleActivateScene = async (sceneId) => {
    try {
      const res = await api.activateScene(sceneId);
      setDomoticsData(prev => ({
        ...prev,
        scenes: prev.scenes.map(s => ({ ...s, active: s.id === sceneId })),
        devices: res.devices || prev.devices
      }));
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      setSyncToast(res.message);
      setTimeout(() => setSyncToast(null), 3500);
      onRefreshDashboard();
    } catch (err) {
      alert('Error activando escena');
    }
  };

  // Sync devices with eWeLink / Home Assistant
  const handleSyncDevices = async (type = 'ewelink') => {
    try {
      setIsSyncing(true);
      const res = await api.syncDevices(type);
      setDomoticsData(prev => ({
        ...prev,
        devices: res.data.devices || prev.devices
      }));
      confetti({ particleCount: 70, spread: 65, origin: { y: 0.5 } });
      setSyncToast(`✨ ${res.message}`);
      setTimeout(() => setSyncToast(null), 4000);
      onRefreshDashboard();
    } catch (err) {
      alert('Error sincronizando dispositivos');
    } finally {
      setIsSyncing(false);
    }
  };

  // Save connector settings
  const handleSaveConnectors = async (e) => {
    e.preventDefault();
    try {
      await api.updateConnector('ewelink', connectorForm.ewelink);
      await api.updateConnector('homeAssistant', connectorForm.homeAssistant);
      setConfigModal(false);
      setSyncToast('Credenciales domóticas guardadas con éxito');
      setTimeout(() => setSyncToast(null), 3000);
      loadDomotics();
    } catch (err) {
      alert('Error guardando configuración');
    }
  };

  const rooms = domoticsData?.rooms || [];
  const devices = domoticsData?.devices || [];
  const scenes = domoticsData?.scenes || [];
  const connectors = domoticsData?.connectors || {};

  const filteredDevices = devices.filter(d => activeRoomId === 'all' || d.roomId === activeRoomId);

  const getSceneIcon = (iconName) => {
    switch (iconName) {
      case 'Film': return <Film className="w-5 h-5 text-purple-300" />;
      case 'Sunrise': return <Sunrise className="w-5 h-5 text-amber-300" />;
      case 'Shield': return <Shield className="w-5 h-5 text-rose-300" />;
      case 'Moon': return <Moon className="w-5 h-5 text-indigo-300" />;
      default: return <Sparkles className="w-5 h-5 text-cyan-300" />;
    }
  };

  return (
    <div className="space-y-6 pb-24">
      
      {/* Toast Notificación Dinámica iOS */}
      <AnimatePresence>
        {syncToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 rounded-full glass-ios-elevated text-white font-semibold text-xs sm:text-sm shadow-ambient border border-cyan-400/30 flex items-center gap-2.5 max-w-md"
          >
            <Wifi className="w-4 h-4 text-cyan-300 flex-shrink-0 animate-pulse" />
            <span>{syncToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Connectors Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight flex items-center gap-2.5">
            <span className="w-11 h-11 rounded-2xl bg-cyan-500/15 text-cyan-300 flex items-center justify-center border border-cyan-400/25 shadow-inner-light">
              <Lightbulb className="w-6 h-6" />
            </span>
            Domótica & Hogar Inteligente
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Control de estancias, iluminación, persianas y puente eWeLink (Sonoff) / Home Assistant.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Botón Sincronizar */}
          <button
            onClick={() => handleSyncDevices('ewelink')}
            disabled={isSyncing}
            className="min-h-touch px-4 sm:px-5 py-2.5 rounded-2xl bg-white/[0.12] hover:bg-white/[0.18] disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/15 shadow-inner-light transition-all touch-press"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-300 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>

          {/* Botón Configurar */}
          <button
            onClick={() => setConfigModal(true)}
            className="min-h-touch min-w-touch p-3 rounded-2xl bg-white/[0.08] border border-white/12 hover:bg-white/[0.14] text-slate-300 hover:text-white flex items-center justify-center transition-all touch-press shadow-inner-light"
            title="Configuración de conectores eWeLink y Home Assistant"
            aria-label="Configurar conectores"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 1. SCENES QUICK LAUNCH (Estilo Accesos Rápidos iOS 27) */}
      <div className="glass-ios p-4 sm:p-5 rounded-[28px] sm:rounded-[32px] border border-white/12 space-y-3.5 shadow-ambient-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-display flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Escenas & Automatizaciones
          </span>
          <span className="text-[11px] text-slate-400">1-Toque para ejecutar</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {scenes.map((scene) => (
            <motion.button
              key={scene.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleActivateScene(scene.id)}
              className={`p-3.5 sm:p-4 rounded-2xl sm:rounded-[22px] border text-left transition-all flex items-center gap-3 touch-press ${
                scene.active
                  ? 'bg-cyan-500/20 border-cyan-400/40 text-white shadow-glow-cyan'
                  : 'bg-white/[0.04] border-white/10 hover:border-white/20 text-slate-200'
              }`}
            >
              <div className="w-10 h-10 rounded-2xl bg-white/[0.08] border border-white/10 flex items-center justify-center flex-shrink-0 shadow-inner-light">
                {getSceneIcon(scene.icon)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate font-display tracking-tight">{scene.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{scene.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* 2. ROOMS FILTER (Segment Controller Integrado) */}
      <div className="p-1.5 rounded-full bg-white/[0.05] border border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-inner-light">
        <button
          onClick={() => setActiveRoomId('all')}
          className={`min-h-[42px] px-4 sm:px-5 py-1.5 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 transition-all flex-shrink-0 touch-press ${
            activeRoomId === 'all'
              ? 'bg-white/15 text-white border border-white/20 shadow-inner-light'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Todas ({devices.length})</span>
        </button>

        {rooms.map((room) => {
          const roomDevices = devices.filter(d => d.roomId === room.id);
          const roomOnCount = roomDevices.filter(d => d.state).length;
          const isActive = activeRoomId === room.id;

          return (
            <button
              key={room.id}
              onClick={() => setActiveRoomId(room.id)}
              className={`min-h-[42px] px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 transition-all flex-shrink-0 touch-press ${
                isActive
                  ? 'bg-white/15 text-white border border-white/20 shadow-inner-light'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{room.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                roomOnCount > 0 ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30' : 'bg-white/10 text-slate-400'
              }`}>
                {roomOnCount}/{roomDevices.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. GRID DE DISPOSITIVOS CON TOGGLE SWITCH NATIVO DE APPLE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredDevices.map((device) => {
          const isOn = device.state === true;

          return (
            <motion.div
              key={device.id}
              layout
              className={`glass-ios p-5 sm:p-6 rounded-[28px] sm:rounded-[32px] border transition-all flex flex-col justify-between space-y-4 shadow-ambient-sm relative overflow-hidden ${
                isOn
                  ? 'border-cyan-400/35 bg-gradient-to-br from-cyan-500/[0.08] to-transparent'
                  : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              {/* Glow sutil en esquina cuando el dispositivo está encendido */}
              {isOn && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
              )}

              {/* Device Header */}
              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="min-w-0">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    {device.connector === 'ewelink' ? '⚡ Sonoff / eWeLink' : '🏠 Home Assistant'}
                    {device.powerWatts > 0 && isOn && <span className="text-cyan-300">• {device.powerWatts} W</span>}
                  </span>
                  <h4 className="text-lg font-bold text-white truncate mt-0.5 font-display tracking-tight">
                    {device.name}
                  </h4>
                  <p className="text-xs text-slate-400 truncate">{device.model || 'Dispositivo Inteligente'}</p>
                </div>

                {/* NATIVE iOS TOGGLE SWITCH (Interruptor de palanca nativo Apple) */}
                <button
                  type="button"
                  onClick={() => handleToggleDevice(device.id)}
                  className={`w-14 h-8 rounded-full transition-colors duration-300 p-1 flex items-center touch-press flex-shrink-0 border ${
                    isOn
                      ? 'bg-accent-green border-emerald-400/50 shadow-glow-green justify-end'
                      : 'bg-white/10 border-white/15 justify-start'
                  }`}
                  aria-label={isOn ? 'Apagar dispositivo' : 'Encender dispositivo'}
                >
                  <motion.div
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                    className="w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center"
                  >
                    <Power className={`w-3.5 h-3.5 ${isOn ? 'text-emerald-600' : 'text-slate-400'}`} />
                  </motion.div>
                </button>
              </div>

              {/* SPECIAL CONTROLLER: REGULADOR DE BRILLO (Control Center Slider) */}
              {device.type === 'light' && (
                <div className="space-y-2 pt-2.5 border-t border-white/10 relative z-10">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      Intensidad de Brillo:
                    </span>
                    <span className="font-bold text-white font-mono">{device.brightness || 0}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateDeviceProp(device.id, 'brightness', Math.max(0, (device.brightness || 0) - 10))}
                      disabled={!isOn}
                      className="w-10 h-10 rounded-2xl bg-white/[0.08] hover:bg-white/[0.15] text-white font-bold flex items-center justify-center disabled:opacity-30 border border-white/10 touch-press flex-shrink-0 shadow-inner-light"
                      title="-10% brillo"
                      aria-label="Reducir brillo 10%"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={device.brightness || 0}
                      onChange={(e) => handleUpdateDeviceProp(device.id, 'brightness', Number(e.target.value))}
                      disabled={!isOn}
                      className={`flex-1 ${!isOn ? 'opacity-30 pointer-events-none' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateDeviceProp(device.id, 'brightness', Math.min(100, (device.brightness || 0) + 10))}
                      disabled={!isOn}
                      className="w-10 h-10 rounded-2xl bg-white/[0.08] hover:bg-white/[0.15] text-white font-bold flex items-center justify-center disabled:opacity-30 border border-white/10 touch-press flex-shrink-0 shadow-inner-light"
                      title="+10% brillo"
                      aria-label="Aumentar brillo 10%"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* SPECIAL CONTROLLER: PERSIANAS / MOTORIZED BLINDS */}
              {device.type === 'blind' && (
                <div className="space-y-3 pt-2.5 border-t border-white/10 relative z-10">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Apertura Persiana:</span>
                    <span className="font-bold text-white font-mono">{device.position || 0}%</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateDeviceProp(device.id, 'position', Math.max(0, (device.position || 0) - 10))}
                      className="w-10 h-10 rounded-2xl bg-white/[0.08] hover:bg-white/[0.15] text-white font-bold flex items-center justify-center border border-white/10 touch-press flex-shrink-0 shadow-inner-light"
                      title="-10% apertura"
                      aria-label="Bajar persiana 10%"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={device.position || 0}
                      onChange={(e) => handleUpdateDeviceProp(device.id, 'position', Number(e.target.value))}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateDeviceProp(device.id, 'position', Math.min(100, (device.position || 0) + 10))}
                      className="w-10 h-10 rounded-2xl bg-white/[0.08] hover:bg-white/[0.15] text-white font-bold flex items-center justify-center border border-white/10 touch-press flex-shrink-0 shadow-inner-light"
                      title="+10% apertura"
                      aria-label="Subir persiana 10%"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Mandos Segmentados Rápidos: Subir / Parar / Bajar */}
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/10">
                    <button
                      onClick={() => handleUpdateDeviceProp(device.id, 'position', 100)}
                      className="py-2 rounded-xl hover:bg-white/10 text-xs font-bold text-slate-200 flex items-center justify-center gap-1 touch-press transition-all"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                      <span>Subir</span>
                    </button>
                    <button
                      onClick={() => handleUpdateDeviceProp(device.id, 'position', device.position)}
                      className="py-2 rounded-xl hover:bg-white/10 text-xs font-bold text-amber-300 flex items-center justify-center gap-1 touch-press transition-all"
                    >
                      <Square className="w-3 h-3" />
                      <span>Parar</span>
                    </button>
                    <button
                      onClick={() => handleUpdateDeviceProp(device.id, 'position', 0)}
                      className="py-2 rounded-xl hover:bg-white/10 text-xs font-bold text-slate-200 flex items-center justify-center gap-1 touch-press transition-all"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                      <span>Bajar</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SPECIAL CONTROLLER: CLIMATIZACIÓN */}
              {device.type === 'climate' && (
                <div className="pt-2.5 border-t border-white/10 flex items-center justify-between relative z-10">
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium">Temp. Actual</span>
                    <p className="text-xl font-bold text-white font-mono">{device.currentTemp || 24}°C</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateDeviceProp(device.id, 'targetTemp', Math.max(16, (device.targetTemp || 22) - 1))}
                      disabled={!isOn}
                      className="w-10 h-10 rounded-2xl bg-white/[0.08] hover:bg-white/[0.15] text-white font-bold text-base disabled:opacity-30 flex items-center justify-center border border-white/10 touch-press shadow-inner-light"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-lg font-black text-cyan-300 font-mono px-1 min-w-[54px] text-center">
                      {device.targetTemp || 22}°C
                    </span>
                    <button
                      onClick={() => handleUpdateDeviceProp(device.id, 'targetTemp', Math.min(30, (device.targetTemp || 22) + 1))}
                      disabled={!isOn}
                      className="w-10 h-10 rounded-2xl bg-white/[0.08] hover:bg-white/[0.15] text-white font-bold text-base disabled:opacity-30 flex items-center justify-center border border-white/10 touch-press shadow-inner-light"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* MODAL: CONFIGURACIÓN DE CONECTORES EWELINK Y HOME ASSISTANT */}
      <Modal
        isOpen={configModal}
        onClose={() => setConfigModal(false)}
        title="Conectores Domóticos & API Keys"
        subtitle="Configura eWeLink (Sonoff) y puentes Home Assistant / Webhooks"
      >
        <form onSubmit={handleSaveConnectors} className="space-y-5">
          
          {/* SECCIÓN EWELINK SONOFF */}
          <div className="p-4 sm:p-5 rounded-3xl glass-subtle border border-cyan-400/25 space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-cyan-300 font-display flex items-center gap-2">
                <Wifi className="w-4 h-4" />
                eWeLink (Sonoff Cloud API)
              </h4>
              <span className="text-[10.5px] px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/20 font-medium">
                {connectors.ewelink?.mode === 'live' ? 'En Vivo' : 'Modo Simulado Activo'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">App ID</label>
                <input
                  type="text"
                  value={connectorForm.ewelink.appId}
                  onChange={(e) => setConnectorForm({
                    ...connectorForm,
                    ewelink: { ...connectorForm.ewelink, appId: e.target.value }
                  })}
                  placeholder="ewelink_app_id"
                  className="w-full px-3.5 py-2.5 rounded-2xl glass-input text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">App Secret</label>
                <input
                  type="password"
                  value={connectorForm.ewelink.appSecret}
                  onChange={(e) => setConnectorForm({
                    ...connectorForm,
                    ewelink: { ...connectorForm.ewelink, appSecret: e.target.value }
                  })}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-2xl glass-input text-white text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Email de Cuenta</label>
                <input
                  type="email"
                  value={connectorForm.ewelink.email}
                  onChange={(e) => setConnectorForm({
                    ...connectorForm,
                    ewelink: { ...connectorForm.ewelink, email: e.target.value }
                  })}
                  placeholder="cuenta@ejemplo.com"
                  className="w-full px-3.5 py-2.5 rounded-2xl glass-input text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Región</label>
                <select
                  value={connectorForm.ewelink.region}
                  onChange={(e) => setConnectorForm({
                    ...connectorForm,
                    ewelink: { ...connectorForm.ewelink, region: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-2xl glass-input text-white text-xs"
                >
                  <option value="eu">Europa (EU)</option>
                  <option value="us">América (US)</option>
                  <option value="as">Asia (AS)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECCIÓN HOME ASSISTANT */}
          <div className="p-4 sm:p-5 rounded-3xl glass-subtle border border-indigo-400/25 space-y-3.5">
            <h4 className="text-sm font-bold text-indigo-300 font-display flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Home Assistant / Webhook Puente
            </h4>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">URL de Instancia</label>
              <input
                type="text"
                value={connectorForm.homeAssistant.baseUrl}
                onChange={(e) => setConnectorForm({
                  ...connectorForm,
                  homeAssistant: { ...connectorForm.homeAssistant, baseUrl: e.target.value }
                })}
                placeholder="http://homeassistant.local:8123"
                className="w-full px-3.5 py-2.5 rounded-2xl glass-input text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">URL Webhook</label>
              <input
                type="text"
                value={connectorForm.homeAssistant.webhookUrl}
                onChange={(e) => setConnectorForm({
                  ...connectorForm,
                  homeAssistant: { ...connectorForm.homeAssistant, webhookUrl: e.target.value }
                })}
                placeholder="https://hook.eu.home-assistant.io/..."
                className="w-full px-3.5 py-2.5 rounded-2xl glass-input text-white text-xs"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfigModal(false)}
              className="min-h-touch px-4 py-2.5 rounded-2xl bg-white/[0.08] text-slate-300 hover:text-white font-semibold text-xs sm:text-sm touch-press"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-touch px-6 py-2.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs sm:text-sm shadow-glow-brand touch-press"
            >
              Guardar Conectores
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}

export default React.memo(DomoticsView);
