import express from 'express';
import { db } from '../db/database.js';

const router = express.Router();

// GET /api/domotics - Obtener habitaciones, dispositivos, escenas y conectores
router.get('/', (req, res) => {
  try {
    const data = db.getDomotics();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/domotics/device/:id/toggle - Alternar estado ON / OFF
router.post('/device/:id/toggle', (req, res) => {
  try {
    const updated = db.toggleDeviceState(req.params.id);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Dispositivo no encontrado' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/domotics/device/:id - Actualizar brillo, posición de persiana, temperatura, etc.
router.patch('/device/:id', (req, res) => {
  try {
    const updated = db.updateDevice(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Dispositivo no encontrado' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/domotics/scene/:id/activate - Activar escena (Cine, Buenos Días, Salir de Casa, Modo Noche)
router.post('/scene/:id/activate', (req, res) => {
  try {
    const result = db.activateScene(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Escena no encontrada' });
    }
    res.json({ success: true, data: result, message: `Escena "${result.scene.name}" activada correctamente` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/domotics/connectors/:type - Actualizar credenciales de eWeLink o Home Assistant
router.put('/connectors/:type', (req, res) => {
  try {
    const { type } = req.params;
    if (type !== 'ewelink' && type !== 'homeAssistant') {
      return res.status(400).json({ success: false, error: 'Tipo de conector no soportado' });
    }
    const updated = db.updateConnectorConfig(type, req.body);
    res.json({ success: true, data: updated, message: `Conector ${type} configurado exitosamente` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/domotics/sync - Sincronizar dispositivos eWeLink / Sonoff y Home Assistant
router.post('/sync', (req, res) => {
  try {
    const { connectorType = 'ewelink' } = req.body;
    const syncResult = db.syncDomoticDevices(connectorType);
    res.json({
      success: true,
      data: syncResult,
      message: `Sincronizados ${syncResult.syncedDevicesCount} dispositivos correctamente desde ${connectorType}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/domotics/webhook - Webhook receptor para eventos de Home Assistant o Alexa
router.post('/webhook', (req, res) => {
  try {
    const { event, deviceId, state } = req.body;
    console.log(`[Domotics Webhook] Event received:`, req.body);
    if (deviceId) {
      db.updateDevice(deviceId, { state: Boolean(state) });
    }
    res.json({ success: true, received: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
