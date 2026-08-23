import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, 
  Power, 
  Sliders, 
  Settings, 
  RefreshCw, 
  Film, 
  Sunrise, 
  Shield, 
  Moon, 
  Tv, 
  Wind, 
  Zap, 
  Sparkles, 
  Check, 
  Layers, 
  Sun, 
  Radio, 
  Plug, 
  Flame, 
  ArrowUp, 
  ArrowDown, 
  Square,
  Lock,
  Wifi
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Modal from '../components/Modal';

export default function DomoticsView({ api, onRefreshDashboard }) {
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
      case 'Film': return <Film className="w-5 h-5 text-purple-400" />;
      case 'Sunrise': return <Sunrise className="w-5 h-5 text-amber-400" />;
      case 'Shield': return <Shield className="w-5 h-5 text-rose-400" />;
      case 'Moon': return <Moon className="w-5 h-5 text-indigo-400" />;
      default: return <Sparkles className="w-5 h-5 text-cyan-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-28">
      
      {/* Toast */}
      <AnimatePresence>
        {syncToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 p-4 rounded-2xl bg-cyan-600 text-white font-bold text-sm shadow-2xl border border-cyan-400 flex items-center gap-2 max-w-md"
          >
            <Wifi className="w-5 h-5 flex-shrink-0 animate-pulse" />
            <span>{syncToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Connectors Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Lightbulb className="w-6 h-6" />
            </span>
            Domótica & Hogar Inteligente
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Control de estancias, iluminación, persianas y puente eWeLink (Sonoff) / Home Assistant.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* BOTÓN SINCRONIZAR DISPOSITIVOS */}
          <button
            onClick={() => handleSyncDevices('ewelink')}
            disabled={isSyncing}
            className="min-h-touch px-4 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/60 touch-press"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Dispositivos'}</span>
          </button>

          {/* BOTÓN CONFIGURAR CONECTORES */}
          <button
            onClick={() => setConfigModal(true)}
            className="min-h-touch min-w-touch p-3 rounded-2xl bg-surface border border-white/15 hover:border-cyan-500/40 text-slate-300 hover:text-white flex items-center justify-center touch-press"
            title="Configuración de conectores eWeLink y Home Assistant"
            aria-label="Configurar conectores"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 1. SCENES QUICK LAUNCH CAROUSEL */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-display flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            Escenas & Automatizaciones del Hogar
          </span>
          <span className="text-xs text-slate-400">1-Toque para ejecutar</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {scenes.map((scene) => (
            <motion.button
              key={scene.id}
              whileTap={{ scale: 0.94 }}
              onClick={() => handleActivateScene(scene.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 touch-press ${
                scene.active
                  ? 'bg-cyan-500/20 border-cyan-400/60 shadow-glow-cyan text-white'
                  : 'bg-black/30 border-white/10 hover:border-white/20 text-slate-300'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                {getSceneIcon(scene.icon)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate font-display">{scene.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{scene.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* 2. ROOMS FILTER TABS */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setActiveRoomId('all')}
          className={`min-h-[48px] px-5 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all flex-shrink-0 ${
            activeRoomId === 'all'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-glow-cyan'
              : 'glass-panel text-slate-400 hover:text-white border border-white/10'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Todas las Estancias ({devices.length})</span>
        </button>

        {rooms.map((room) => {
          const roomDevices = devices.filter(d => d.roomId === room.id);
          const roomOnCount = roomDevices.filter(d => d.state).length;

          return (
            <button
              key={room.id}
              onClick={() => setActiveRoomId(room.id)}
              className={`min-h-[48px] px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all flex-shrink-0 ${
                activeRoomId === room.id
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-glow-cyan'
                  : 'glass-panel text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              <span>{room.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                roomOnCount > 0 ? 'bg-cyan-400 text-slate-950' : 'bg-white/10 text-slate-400'
              }`}>
                {roomOnCount}/{roomDevices.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. GRID DE DISPOSITIVOS CON CONTROLES TÁCTILES Y SLIDERS GRUESOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDevices.map((device) => {
          const isOn = device.state === true;

          return (
            <motion.div
              key={device.id}
              layout
              className={`glass-panel p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                isOn
                  ? 'border-cyan-500/40 bg-gradient-to-br from-cyan-950/30 to-surface shadow-glow-cyan'
                  : 'border-white/10 bg-surface/80'
              }`}
            >
              {/* Device Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    {device.connector === 'ewelink' ? '⚡ Sonoff / eWeLink' : '🏠 Home Assistant'}
                    {device.powerWatts > 0 && isOn && <span>• {device.powerWatts} W</span>}
                  </span>
                  <h4 className="text-lg font-bold text-white truncate mt-0.5 font-display">
                    {device.name}
                  </h4>
                  <p className="text-xs text-slate-400 truncate">{device.model || 'Dispositivo Inteligente'}</p>
                </div>

                {/* BIG TOGGLE SWITCH */}
                <button
                  onClick={() => handleToggleDevice(device.id)}
                  className={`min-h-[52px] min-w-[52px] rounded-2xl flex items-center justify-center border transition-all touch-press ${
                    isOn
                      ? 'bg-cyan-500 border-cyan-300 text-slate-950 shadow-glow-cyan'
                      : 'bg-slate-800/80 border-white/10 text-slate-400 hover:text-white'
                  }`}
                  aria-label={isOn ? 'Apagar dispositivo' : 'Encender dispositivo'}
                >
                  <Power className="w-6 h-6 stroke-[2.5]" />
                </button>
              </div>

              {/* SPECIAL CONTROLLER: DIMMER SLIDER FOR LIGHTS */}
              {device.type === 'light' && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      Brillo / Intensidad:
                    </span>
                    <span className="font-bold text-white font-mono">{device.brightness || 0}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={device.brightness || 0}
                    onChange={(e) => handleUpdateDeviceProp(device.id, 'brightness', Number(e.target.value))}
                    disabled={!isOn}
                    className={`w-full ${!isOn ? 'opacity-40 pointer-events-none' : ''}`}
                  />
                </div>
              )}

              {/* SPECIAL CONTROLLER: PERSIANAS / MOTORIZED BLINDS */}
              {device.type === 'blind' && (
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Apertura Persiana:</span>
                    <span className="font-bold text-white font-mono">{device.position || 0}%</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={device.position || 0}
                    onChange={(e) => handleUpdateDeviceProp(device.id, 'position', Number(e.target.value))}
                    className="w-full"
                  />

                  {/* Botones de acción rápida: Subir, Parar, Bajar */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleUpdateDeviceProp(device.id, 'position', 100)}
                      className="min-h-[44px] py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-xs font-bold text-slate-200 flex items-center justify-center gap-1 touch-press"
                    >
                      <ArrowUp className="w-4 h-4" />
                      <span>Subir</span>
                    </button>
                    <button
                      onClick={() => handleUpdateDeviceProp(device.id, 'position', device.position)}
                      className="min-h-[44px] py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-xs font-bold text-amber-400 flex items-center justify-center gap-1 touch-press"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>Parar</span>
                    </button>
                    <button
                      onClick={() => handleUpdateDeviceProp(device.id, 'position', 0)}
                      className="min-h-[44px] py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-xs font-bold text-slate-200 flex items-center justify-center gap-1 touch-press"
                    >
                      <ArrowDown className="w-4 h-4" />
                      <span>Bajar</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SPECIAL CONTROLLER: CLIMATIZACIÓN */}
              {device.type === 'climate' && (
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400">Temp. Actual</span>
                    <p className="text-xl font-bold text-white font-mono">{device.currentTemp || 24}°C</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateDeviceProp(device.id, 'targetTemp', Math.max(16, (device.targetTemp || 22) - 1))}
                      disabled={!isOn}
                      className="w-10 h-10 rounded-xl bg-white/10 text-white font-bold text-lg disabled:opacity-40 flex items-center justify-center touch-press"
                    >
                      -
                    </button>
                    <span className="text-lg font-black text-cyan-300 font-mono px-1">
                      {device.targetTemp || 22}°C
                    </span>
                    <button
                      onClick={() => handleUpdateDeviceProp(device.id, 'targetTemp', Math.min(30, (device.targetTemp || 22) + 1))}
                      disabled={!isOn}
                      className="w-10 h-10 rounded-xl bg-white/10 text-white font-bold text-lg disabled:opacity-40 flex items-center justify-center touch-press"
                    >
                      +
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
        <form onSubmit={handleSaveConnectors} className="space-y-6">
          
          {/* SECCIÓN EWELINK SONOFF */}
          <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-cyan-300 font-display flex items-center gap-2">
                <Wifi className="w-4 h-4" />
                eWeLink (Sonoff Cloud API)
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
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
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs"
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
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs"
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
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs"
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
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs"
                >
                  <option value="eu">Europa (EU)</option>
                  <option value="us">América (US)</option>
                  <option value="as">Asia (AS)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECCIÓN HOME ASSISTANT */}
          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
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
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs"
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
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfigModal(false)}
              className="min-h-touch px-4 py-2.5 rounded-2xl bg-white/5 text-slate-300 font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-touch px-6 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-cyan-950/60"
            >
              Guardar Conectores
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
