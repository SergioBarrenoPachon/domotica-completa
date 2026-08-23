import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initialSeedData } from './seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'domotica_db.json');
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

class Database {
  constructor() {
    this.data = null;
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
      } else {
        this.data = JSON.parse(JSON.stringify(initialSeedData));
        this.save();
      }
    } catch (err) {
      console.error('Error loading database, resetting to seed data:', err);
      this.data = JSON.parse(JSON.stringify(initialSeedData));
      this.save();
    }
  }

  save() {
    try {
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  // --- DASHBOARD & SUMMARY ---
  getDashboardSummary() {
    const today = new Date();
    
    // Calculate document warranty alerts
    const docs = this.data.documents || [];
    let criticalWarranties = [];
    let warningWarranties = [];

    docs.forEach(doc => {
      if (doc.warrantyExpiryDate) {
        const expiry = new Date(doc.warrantyExpiryDate);
        const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          criticalWarranties.push({ ...doc, daysLeft: diffDays, urgency: diffDays <= 0 ? 'expired' : 'critical' });
        } else if (diffDays <= 90) {
          warningWarranties.push({ ...doc, daysLeft: diffDays, urgency: 'warning' });
        }
      }
    });

    // Pantry low stock
    const lowStockPantry = (this.data.pantry || []).filter(p => p.quantity <= (p.minQuantity || 0));

    // Devices on
    const devices = this.data.domotics.devices || [];
    const devicesOnCount = devices.filter(d => d.state === true).length;
    const totalPowerWatts = devices.reduce((sum, d) => sum + (d.state ? (d.powerWatts || 0) : 0), 0);

    // Current month finance overview
    const currentMonthKey = today.toISOString().slice(0, 7); // '2026-08'
    const financeSummary = this.calculateMonthFinance(currentMonthKey);

    // Today's meal
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const currentDayId = dayNames[today.getDay()];
    const todayMeal = (this.data.meals.days || []).find(d => d.id === currentDayId) || this.data.meals.days[0];

    return {
      alerts: {
        criticalCount: criticalWarranties.length,
        warningCount: warningWarranties.length,
        criticalItems: criticalWarranties,
        warningItems: warningWarranties,
        lowStockPantryCount: lowStockPantry.length,
        lowStockItems: lowStockPantry
      },
      domotics: {
        activeDevicesCount: devicesOnCount,
        totalDevicesCount: devices.length,
        totalPowerWatts
      },
      finance: financeSummary,
      meals: {
        today: todayMeal,
        shoppingPendingCount: (this.data.shoppingList || []).filter(s => !s.checked).length
      }
    };
  }

  // --- MEALS & RECIPES ---
  getMeals() {
    return this.data.meals;
  }

  updateMealPlan(days) {
    this.data.meals.days = days;
    this.save();
    return this.data.meals.days;
  }

  updateDayMeal(dayId, updates) {
    const day = this.data.meals.days.find(d => d.id === dayId);
    if (day) {
      Object.assign(day, updates);
      this.save();
    }
    return day;
  }

  suggestRandomMenu() {
    const sampleDishes = {
      breakfast: [
        "Tostadas con Aguacate y Huevo Poché",
        "Avena Caliente con Plátano y Crema de Cacahuete",
        "Yogur Griego con Chía, Frutos Rojos y Miel",
        "Tostada de Pan de Centeno con Tomate y AOVE",
        "Batido Detox de Espinacas, Manzana y Jengibre",
        "Tortilla de Claras con Pavo y Queso Fresco",
        "Pancakes Proteicos con Fresas Frescas"
      ],
      lunch: [
        "Salmón a la Plancha con Espárragos Trigueros",
        "Lentejas Pardinas con Calabaza y Laurel",
        "Pasta Integral al Pesto con Tomates Cherry",
        "Pechuga de Pollo al Limón con Arroz Salvaje",
        "Arroz Mediterráneo con Verduras de Temporada",
        "Guiso Tradicional de Garbanzos y Espinacas",
        "Pescado Blanco al Papillote con Verduras"
      ],
      dinner: [
        "Crema de Calabacín con Semillas de Girasol",
        "Ensalada Templada de Quinoa y Atún",
        "Revuelto de Champiñones y Ajetes Tiernos",
        "Wrap Integral de Hummus, Espinacas y Pavo",
        "Sopa Ligera de Miso y Fideos de Arroz",
        "Tartar de Salmón con Aguacate",
        "Tortilla Francesa con Ensalada Mixta"
      ]
    };

    const newDays = this.data.meals.days.map((day, idx) => ({
      ...day,
      breakfast: sampleDishes.breakfast[idx % sampleDishes.breakfast.length],
      lunch: sampleDishes.lunch[idx % sampleDishes.lunch.length],
      dinner: sampleDishes.dinner[idx % sampleDishes.dinner.length]
    }));

    this.data.meals.days = newDays;
    this.save();
    return this.data.meals.days;
  }

  // --- PANTRY ---
  getPantry() {
    return this.data.pantry || [];
  }

  addPantryItem(item) {
    const newItem = {
      id: `pan-${Date.now()}`,
      name: item.name,
      zone: item.zone || 'despensa', // 'nevera' | 'congelador' | 'despensa'
      quantity: Number(item.quantity) || 1,
      unit: item.unit || 'ud',
      minQuantity: Number(item.minQuantity) || 1,
      category: item.category || 'General',
      expiration: item.expiration || null,
      updatedAt: new Date().toISOString()
    };
    this.data.pantry.push(newItem);
    this.save();
    return newItem;
  }

  updatePantryItem(id, updates) {
    const item = this.data.pantry.find(p => p.id === id);
    if (item) {
      if (updates.quantity !== undefined) updates.quantity = Math.max(0, Number(updates.quantity));
      Object.assign(item, updates, { updatedAt: new Date().toISOString() });
      this.save();
    }
    return item;
  }

  adjustPantryQuantity(id, delta) {
    const item = this.data.pantry.find(p => p.id === id);
    if (item) {
      item.quantity = Math.max(0, (item.quantity || 0) + delta);
      item.updatedAt = new Date().toISOString();
      this.save();
    }
    return item;
  }

  deletePantryItem(id) {
    this.data.pantry = this.data.pantry.filter(p => p.id !== id);
    this.save();
    return { success: true, id };
  }

  // --- SHOPPING LIST & SMART SYNC ---
  getShoppingList() {
    return this.data.shoppingList || [];
  }

  addShoppingItem(item) {
    const newItem = {
      id: `shop-${Date.now()}`,
      name: item.name,
      category: item.category || 'Varios',
      quantity: item.quantity || '1 ud',
      checked: Boolean(item.checked),
      fromMealPlan: Boolean(item.fromMealPlan),
      notes: item.notes || ''
    };
    this.data.shoppingList.push(newItem);
    this.save();
    return newItem;
  }

  updateShoppingItem(id, updates) {
    const item = this.data.shoppingList.find(s => s.id === id);
    if (item) {
      Object.assign(item, updates);
      this.save();
    }
    return item;
  }

  deleteShoppingItem(id) {
    this.data.shoppingList = this.data.shoppingList.filter(s => s.id !== id);
    this.save();
    return { success: true, id };
  }

  clearCheckedShoppingItems() {
    this.data.shoppingList = this.data.shoppingList.filter(s => !s.checked);
    this.save();
    return this.data.shoppingList;
  }

  // Smart Sync: compare weekly meal plan & low pantry stock to auto-generate missing items
  syncShoppingListFromPlan() {
    const pantry = this.data.pantry || [];
    const recipes = this.data.meals.recipes || [];
    const mealDays = this.data.meals.days || [];
    const existingShopping = this.data.shoppingList || [];
    
    const addedItems = [];

    // 1. Check ingredients needed for the planned lunch/dinner recipes
    mealDays.forEach(day => {
      [day.lunch, day.dinner].forEach(mealName => {
        if (!mealName) return;
        const matchingRecipe = recipes.find(r => mealName.toLowerCase().includes(r.name.toLowerCase()) || r.name.toLowerCase().includes(mealName.toLowerCase()));
        if (matchingRecipe && matchingRecipe.ingredients) {
          matchingRecipe.ingredients.forEach(ing => {
            const inPantry = pantry.find(p => p.name.toLowerCase().includes(ing.name.toLowerCase()) || ing.name.toLowerCase().includes(p.name.toLowerCase()));
            const isOutOfStock = !inPantry || inPantry.quantity <= 0;
            const alreadyInShopping = existingShopping.some(s => s.name.toLowerCase() === ing.name.toLowerCase());
            
            if (isOutOfStock && !alreadyInShopping && !addedItems.some(a => a.name.toLowerCase() === ing.name.toLowerCase())) {
              const newItem = {
                id: `shop-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                name: ing.name,
                category: ing.zone === 'nevera' ? 'Frescos' : 'Despensa',
                quantity: `${ing.amount} ${ing.unit}`,
                checked: false,
                fromMealPlan: true,
                notes: `Necesario para ${matchingRecipe.name}`
              };
              this.data.shoppingList.push(newItem);
              addedItems.push(newItem);
            }
          });
        }
      });
    });

    // 2. Also check items below minQuantity in pantry
    pantry.forEach(p => {
      if (p.quantity <= (p.minQuantity || 0)) {
        const alreadyInShopping = this.data.shoppingList.some(s => s.name.toLowerCase() === p.name.toLowerCase());
        if (!alreadyInShopping) {
          const newItem = {
            id: `shop-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: p.name,
            category: p.category || 'Despensa',
            quantity: `${Math.max(1, p.minQuantity - p.quantity)} ${p.unit}`,
            checked: false,
            fromMealPlan: true,
            notes: `Stock bajo en ${p.zone} (disponible: ${p.quantity} ${p.unit})`
          };
          this.data.shoppingList.push(newItem);
          addedItems.push(newItem);
        }
      }
    });

    this.save();
    return {
      shoppingList: this.data.shoppingList,
      newlyAddedCount: addedItems.length,
      addedItems
    };
  }

  // --- FINANCE ENGINE WITH RECURRENCE & OVERRIDES ---
  getFinanceTransactions() {
    return this.data.finance.transactions || [];
  }

  addFinanceTransaction(tx) {
    const newTx = {
      id: `fin-${Date.now()}`,
      title: tx.title,
      amount: Number(tx.amount) || 0,
      type: tx.type || 'gasto', // 'ingreso' | 'gasto'
      category: tx.category || 'General',
      frequency: tx.frequency || 'mensual', // 'mensual' | 'trimestral' | 'semestral' | 'anual' | 'puntual'
      dayOfMonth: Number(tx.dayOfMonth) || 1,
      monthOfYear: tx.monthOfYear ? Number(tx.monthOfYear) : null,
      active: tx.active !== false,
      startDate: tx.startDate || new Date().toISOString().slice(0, 7)
    };
    this.data.finance.transactions.push(newTx);
    this.save();
    return newTx;
  }

  updateFinanceTransaction(id, updates, mode = 'future') {
    // mode can be:
    // 'future' -> updates master recurring transaction rule
    // 'month'  -> creates an override exception for a specific month
    if (mode === 'future') {
      const tx = this.data.finance.transactions.find(t => t.id === id);
      if (tx) {
        if (updates.amount !== undefined) updates.amount = Number(updates.amount);
        Object.assign(tx, updates);
        this.save();
        return { type: 'rule_updated', transaction: tx };
      }
    }
    return null;
  }

  createMonthOverride(txId, month, updates) {
    if (!this.data.finance.overrides) this.data.finance.overrides = [];
    
    // Find existing override for this tx + month
    const existingIndex = this.data.finance.overrides.findIndex(o => o.transactionId === txId && o.month === month);
    const tx = this.data.finance.transactions.find(t => t.id === txId);

    const overrideObj = {
      id: existingIndex >= 0 ? this.data.finance.overrides[existingIndex].id : `ovr-${Date.now()}`,
      transactionId: txId,
      month: month,
      title: updates.title || (tx ? tx.title : 'Modificación Puntual'),
      amount: Number(updates.amount),
      category: updates.category || (tx ? tx.category : 'General'),
      notes: updates.notes || 'Modificado solo para este mes',
      createdAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      this.data.finance.overrides[existingIndex] = overrideObj;
    } else {
      this.data.finance.overrides.push(overrideObj);
    }

    this.save();
    return overrideObj;
  }

  deleteMonthOverride(overrideId) {
    if (this.data.finance.overrides) {
      this.data.finance.overrides = this.data.finance.overrides.filter(o => o.id !== overrideId);
      this.save();
    }
    return { success: true };
  }

  deleteFinanceTransaction(id) {
    this.data.finance.transactions = this.data.finance.transactions.filter(t => t.id !== id);
    if (this.data.finance.overrides) {
      this.data.finance.overrides = this.data.finance.overrides.filter(o => o.transactionId !== id);
    }
    this.save();
    return { success: true, id };
  }

  togglePaymentStatus(month, txId, paid) {
    if (!this.data.finance.payments) this.data.finance.payments = {};
    if (!this.data.finance.payments[month]) this.data.finance.payments[month] = {};

    this.data.finance.payments[month][txId] = {
      paid: Boolean(paid),
      date: paid ? new Date().toISOString().slice(0, 10) : null
    };

    this.save();
    return this.data.finance.payments[month][txId];
  }

  calculateMonthFinance(monthKey) { // 'YYYY-MM'
    const [yearStr, monthStr] = monthKey.split('-');
    const currentMonthNumber = parseInt(monthStr, 10); // 1 - 12
    
    const transactions = this.data.finance.transactions || [];
    const overrides = (this.data.finance.overrides || []).filter(o => o.month === monthKey);
    const monthPayments = (this.data.finance.payments && this.data.finance.payments[monthKey]) || {};

    const items = [];

    transactions.forEach(tx => {
      if (!tx.active) return;

      // Check frequency applicability
      let applies = false;
      if (tx.frequency === 'mensual') {
        applies = true;
      } else if (tx.frequency === 'trimestral') {
        applies = (currentMonthNumber % 3 === 0);
      } else if (tx.frequency === 'semestral') {
        applies = (currentMonthNumber === 6 || currentMonthNumber === 12);
      } else if (tx.frequency === 'anual') {
        applies = (tx.monthOfYear ? tx.monthOfYear === currentMonthNumber : currentMonthNumber === 1);
      } else if (tx.frequency === 'puntual') {
        applies = tx.startDate === monthKey;
      }

      if (applies) {
        const override = overrides.find(o => o.transactionId === tx.id);
        const paymentInfo = monthPayments[tx.id] || { paid: false, date: null };

        items.push({
          id: tx.id,
          title: override ? override.title : tx.title,
          originalAmount: tx.amount,
          amount: override ? override.amount : tx.amount,
          type: tx.type,
          category: override ? override.category : tx.category,
          frequency: tx.frequency,
          dayOfMonth: tx.dayOfMonth,
          isOverridden: Boolean(override),
          overrideId: override ? override.id : null,
          overrideNotes: override ? override.notes : null,
          paid: Boolean(paymentInfo.paid),
          paidDate: paymentInfo.date
        });
      }
    });

    // Sort items by day of month
    items.sort((a, b) => a.dayOfMonth - b.dayOfMonth);

    const totalIncome = items.filter(i => i.type === 'ingreso').reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = items.filter(i => i.type === 'gasto').reduce((sum, i) => sum + i.amount, 0);
    const projectedBalance = totalIncome - totalExpenses;

    const paidIncome = items.filter(i => i.type === 'ingreso' && i.paid).reduce((sum, i) => sum + i.amount, 0);
    const paidExpenses = items.filter(i => i.type === 'gasto' && i.paid).reduce((sum, i) => sum + i.amount, 0);
    const currentActualBalance = paidIncome - paidExpenses;

    // Expenses by category
    const categoryBreakdown = {};
    items.filter(i => i.type === 'gasto').forEach(i => {
      categoryBreakdown[i.category] = (categoryBreakdown[i.category] || 0) + i.amount;
    });

    const categoryList = Object.keys(categoryBreakdown).map(cat => ({
      name: cat,
      amount: categoryBreakdown[cat],
      percentage: totalExpenses > 0 ? Math.round((categoryBreakdown[cat] / totalExpenses) * 100) : 0
    })).sort((a, b) => b.amount - a.amount);

    return {
      month: monthKey,
      items,
      totalIncome,
      totalExpenses,
      projectedBalance,
      paidIncome,
      paidExpenses,
      currentActualBalance,
      categoryList,
      pendingExpensesCount: items.filter(i => i.type === 'gasto' && !i.paid).length
    };
  }

  // --- DOMOTICS (ROOMS, DEVICES, SCENES & EWELINK/HA) ---
  getDomotics() {
    return this.data.domotics;
  }

  updateDevice(id, updates) {
    const device = this.data.domotics.devices.find(d => d.id === id);
    if (device) {
      Object.assign(device, updates);
      this.save();
    }
    return device;
  }

  toggleDeviceState(id) {
    const device = this.data.domotics.devices.find(d => d.id === id);
    if (device) {
      device.state = !device.state;
      this.save();
    }
    return device;
  }

  activateScene(sceneId) {
    const scene = this.data.domotics.scenes.find(s => s.id === sceneId);
    if (!scene) return null;

    // Toggle scenes
    this.data.domotics.scenes.forEach(s => { s.active = (s.id === sceneId); });

    // Apply specific scene automation
    if (sceneId === 'sc-1') { // Cine
      this.data.domotics.devices.forEach(d => {
        if (d.roomId === 'salon' && d.type === 'light') { d.state = true; d.brightness = 20; }
        if (d.type === 'blind') { d.state = true; d.position = 0; }
      });
    } else if (sceneId === 'sc-2') { // Buenos Dias
      this.data.domotics.devices.forEach(d => {
        if (d.type === 'blind') { d.state = true; d.position = 100; }
        if (d.id === 'dev-5') { d.state = true; } // Cafetera
        if (d.roomId === 'cocina') { d.state = true; }
      });
    } else if (sceneId === 'sc-3') { // Salir de casa
      this.data.domotics.devices.forEach(d => {
        if (d.type !== 'climate') { d.state = false; }
      });
    } else if (sceneId === 'sc-4') { // Modo Noche
      this.data.domotics.devices.forEach(d => {
        if (d.roomId !== 'dormitorio') { d.state = false; }
        if (d.id === 'dev-6') { d.state = true; d.brightness = 15; }
        if (d.type === 'blind') { d.position = 0; }
      });
    }

    this.save();
    return { success: true, scene, devices: this.data.domotics.devices };
  }

  updateConnectorConfig(type, config) {
    if (!this.data.domotics.connectors[type]) {
      this.data.domotics.connectors[type] = {};
    }
    Object.assign(this.data.domotics.connectors[type], config, {
      configured: true,
      lastSync: new Date().toISOString()
    });
    this.save();
    return this.data.domotics.connectors[type];
  }

  syncDomoticDevices(connectorType = 'ewelink') {
    // Simulates or initiates real device discovery from eWeLink / Home Assistant
    const connector = this.data.domotics.connectors[connectorType];
    if (connector) {
      connector.lastSync = new Date().toISOString();
      connector.status = 'connected';
    }

    // Add / Refresh synced devices with simulated telemetry
    const now = new Date().toISOString();
    this.data.domotics.devices.forEach(d => {
      if (d.connector === connectorType) {
        d.lastSync = now;
      }
    });

    this.save();
    return {
      success: true,
      connectorType,
      syncedDevicesCount: this.data.domotics.devices.length,
      devices: this.data.domotics.devices,
      timestamp: now
    };
  }

  // --- DOCUMENTS & WARRANTIES ---
  getDocuments() {
    const today = new Date();
    return (this.data.documents || []).map(doc => {
      let status = 'ok';
      let daysRemaining = null;

      if (doc.warrantyExpiryDate) {
        const expiry = new Date(doc.warrantyExpiryDate);
        daysRemaining = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 0) {
          status = 'expired';
        } else if (daysRemaining <= 30) {
          status = 'critical';
        } else if (daysRemaining <= 90) {
          status = 'warning';
        } else {
          status = 'ok';
        }
      }

      return {
        ...doc,
        status,
        daysRemaining
      };
    });
  }

  addDocument(doc) {
    const newDoc = {
      id: `doc-${Date.now()}`,
      title: doc.title,
      category: doc.category || 'Garantías',
      issuer: doc.issuer || '',
      modelOrPolicy: doc.modelOrPolicy || '',
      purchaseDate: doc.purchaseDate || new Date().toISOString().slice(0, 10),
      warrantyExpiryDate: doc.warrantyExpiryDate || null,
      notes: doc.notes || '',
      fileUrl: doc.fileUrl || null,
      fileName: doc.fileName || null,
      fileType: doc.fileType || 'application/pdf',
      fileSize: doc.fileSize || '0 KB',
      tags: Array.isArray(doc.tags) ? doc.tags : (doc.tags ? doc.tags.split(',').map(t => t.trim()) : []),
      createdAt: new Date().toISOString()
    };

    if (!this.data.documents) this.data.documents = [];
    this.data.documents.unshift(newDoc);
    this.save();
    return newDoc;
  }

  updateDocument(id, updates) {
    const doc = this.data.documents.find(d => d.id === id);
    if (doc) {
      if (typeof updates.tags === 'string') {
        updates.tags = updates.tags.split(',').map(t => t.trim());
      }
      Object.assign(doc, updates);
      this.save();
    }
    return doc;
  }

  deleteDocument(id) {
    this.data.documents = this.data.documents.filter(d => d.id !== id);
    this.save();
    return { success: true, id };
  }
}

export const db = new Database();
