import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initialSeedData } from './seedData.js';
import { pgService } from './postgres.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'domotica_db.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

class Database {
  constructor() {
    this.data = null;
    this._pgSyncInterval = null;
    this.load();
    this.initPgAsync();
  }

  createBackup(reason = 'auto') {
    try {
      if (!fs.existsSync(DB_FILE)) return null;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(BACKUPS_DIR, `backup-${timestamp}-${reason}.json`);
      fs.copyFileSync(DB_FILE, backupFile);

      // Keep only latest 25 backups
      const files = fs.readdirSync(BACKUPS_DIR)
        .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
        .sort()
        .reverse();

      if (files.length > 25) {
        files.slice(25).forEach(oldFile => {
          try { fs.unlinkSync(path.join(BACKUPS_DIR, oldFile)); } catch (_) {}
        });
      }
      return { success: true, file: backupFile, timestamp };
    } catch (err) {
      console.error('Error creating backup:', err);
      return null;
    }
  }

  recoverFromLatestBackup() {
    try {
      if (!fs.existsSync(BACKUPS_DIR)) return false;
      const backupFiles = fs.readdirSync(BACKUPS_DIR)
        .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
        .sort()
        .reverse();

      for (const bFile of backupFiles) {
        try {
          const content = fs.readFileSync(path.join(BACKUPS_DIR, bFile), 'utf-8');
          const parsed = JSON.parse(content);
          this.data = parsed;
          this.save();
          console.log(`[Database] Recuperada con éxito desde copia de seguridad: ${bFile}`);
          return true;
        } catch (_) {}
      }
    } catch (err) {
      console.error('Error recuperando respaldo:', err);
    }
    return false;
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        // Create an automatic safety backup before reading
        this.createBackup('startup');

        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
        
        // Ensure finance subcollections exist
        if (!this.data.finance) this.data.finance = {};
        if (!Array.isArray(this.data.finance.transactions)) this.data.finance.transactions = initialSeedData.finance.transactions || [];
        if (!Array.isArray(this.data.finance.loans)) this.data.finance.loans = initialSeedData.finance.loans || [];
        if (!Array.isArray(this.data.finance.goals)) this.data.finance.goals = initialSeedData.finance.goals || [];
        if (!Array.isArray(this.data.finance.overrides)) this.data.finance.overrides = [];
        if (!this.data.finance.payments) this.data.finance.payments = {};
        if (!Array.isArray(this.data.finance.categories) || this.data.finance.categories.length === 0) {
          this.data.finance.categories = initialSeedData.finance.categories || [];
        }
        // Sanitize any corrupt transaction dayOfMonth (must be integer 1-31)
        (this.data.finance.transactions || []).forEach(tx => {
          if (tx.dayOfMonth !== undefined && tx.dayOfMonth !== null) {
            let d = Number(tx.dayOfMonth);
            if (isNaN(d) || d < 1 || d > 31 || !Number.isInteger(d)) {
              tx.dayOfMonth = Math.min(31, Math.max(1, Math.floor(d) || 1));
            }
          }
        });

        // Ensure mortgage / loan transactions are properly registered and linked to their loan in finance.loans
        (this.data.finance.loans || []).forEach(l => {
          if (l.type === 'hipoteca' || l.id === 'loan-1') {
            const unlinkedTx = (this.data.finance.transactions || []).find(t => 
              (!t.loanId || t.loanId === 'null') && 
              t.type === 'gasto' && 
              (t.title?.toLowerCase().includes('hipoteca') || t.title?.toLowerCase().includes('préstamo') || t.title?.toLowerCase().includes('prestamo'))
            );
            if (unlinkedTx) {
              unlinkedTx.loanId = l.id;
              if (unlinkedTx.amount) l.monthlyPayment = Number(unlinkedTx.amount);
              if (unlinkedTx.dayOfMonth) l.dayOfMonth = Number(unlinkedTx.dayOfMonth);
            }
          }
        });
      } else {
        console.log('[Database] Inicializando base de datos permanente en:', DB_FILE);
        this.data = JSON.parse(JSON.stringify(initialSeedData));
        this.save();
      }
    } catch (err) {
      console.error('[Database Error] Error cargando base de datos:', err);
      const recovered = this.recoverFromLatestBackup();
      if (!recovered) {
        try {
          const corruptBackup = path.join(DATA_DIR, `domotica_db.corrupt-${Date.now()}.json`);
          if (fs.existsSync(DB_FILE)) fs.copyFileSync(DB_FILE, corruptBackup);
        } catch (_) {}
        this.data = JSON.parse(JSON.stringify(initialSeedData));
        this.save();
      }
    }
  }

  async initPgAsync() {
    try {
      const ready = await pgService.initSchema();
      if (!ready) {
        console.log('[Database] Modo Neon PostgreSQL inactivo o no disponible. Usando almacenamiento local.');
        return;
      }

      // 1. Cargar estado completo desde Neon si ya existe
      const pgState = await pgService.loadFullState();
      if (pgState && typeof pgState === 'object') {
        console.log('[Database] Estado financiero y del hogar cargado exitosamente desde Neon PostgreSQL.');
        this.data = pgState;
        
        // Garantizar subcolecciones
        if (!this.data.finance) this.data.finance = {};
        if (!Array.isArray(this.data.finance.transactions)) this.data.finance.transactions = initialSeedData.finance.transactions || [];
        if (!Array.isArray(this.data.finance.loans)) this.data.finance.loans = initialSeedData.finance.loans || [];
        if (!Array.isArray(this.data.finance.goals)) this.data.finance.goals = initialSeedData.finance.goals || [];
        if (!Array.isArray(this.data.finance.overrides)) this.data.finance.overrides = [];
        if (!this.data.finance.payments) this.data.finance.payments = {};
        if (!Array.isArray(this.data.finance.categories) || this.data.finance.categories.length === 0) {
          this.data.finance.categories = initialSeedData.finance.categories || [];
        }

        this.saveLocalOnly();
      } else {
        console.log('[Database] Inicializando primer volcado de datos en Neon PostgreSQL...');
        await pgService.saveFullState(this.data);
        await pgService.syncRelationalData(this.data.finance);
      }

      // 2. Sincronizar gastos puntuales de la tabla dedicada gastos_puntuales
      await this.syncPunctualExpensesFromPg();

      // 3. Temporizador de sondeo cada 30s para automatismos externos que escriban directamente en Postgres
      if (!this._pgSyncInterval) {
        this._pgSyncInterval = setInterval(() => {
          this.syncPunctualExpensesFromPg().catch(err => {
            console.error('[Database BG Sync Error]', err.message);
          });
        }, 30000);
      }
    } catch (err) {
      console.error('[Database initPgAsync Error]', err);
    }
  }

  async syncPunctualExpensesFromPg() {
    if (!pgService.isConnected) return;
    try {
      const rows = await pgService.getPunctualExpenses(500);
      if (!Array.isArray(rows) || rows.length === 0) return;

      if (!this.data.finance) this.data.finance = {};
      if (!Array.isArray(this.data.finance.transactions)) this.data.finance.transactions = [];
      if (!this.data.finance.payments) this.data.finance.payments = {};

      let changed = false;
      for (const row of rows) {
        const existing = this.data.finance.transactions.find(t => t.id === row.id);
        const dateStr = typeof row.fecha === 'string' ? row.fecha.slice(0, 10) : new Date(row.fecha).toISOString().slice(0, 10);
        const parts = dateStr.split('-');
        const day = parseInt(parts[2], 10) || 1;
        const monthNum = parseInt(parts[1], 10) || 1;
        const monthKey = `${parts[0]}-${parts[1]}`;

        if (!existing) {
          const newTx = {
            id: row.id,
            title: row.titulo,
            amount: parseFloat(row.importe) || 0,
            type: 'gasto',
            category: row.categoria || 'Gastos Puntuales',
            frequency: 'puntual',
            dayOfMonth: day,
            monthOfYear: monthNum,
            active: true,
            startDate: dateStr,
            endDate: dateStr,
            isIndefinite: false,
            notes: row.notas || (row.origen === 'atajos_apple' ? '[Atajo Apple]' : ''),
            source: row.origen || 'atajos_apple',
            paymentMethod: row.metodo_pago || 'Tarjeta',
            createdAt: row.creado_en || new Date().toISOString()
          };
          this.data.finance.transactions.push(newTx);
          changed = true;
        }

        // Asegurar que figura como pagado en payments
        if (!this.data.finance.payments[monthKey]) {
          this.data.finance.payments[monthKey] = {};
        }
        if (!this.data.finance.payments[monthKey][row.id]) {
          this.data.finance.payments[monthKey][row.id] = {
            paid: true,
            date: dateStr
          };
          changed = true;
        }
      }

      if (changed) {
        this.saveLocalOnly();
        pgService.saveFullState(this.data).catch(() => {});
      }
    } catch (err) {
      console.error('[Database syncPunctualExpensesFromPg Error]', err.message);
    }
  }

  async addPunctualExpenseShortcut(payload = {}) {
    const {
      titulo,
      title,
      concepto,
      importe,
      amount,
      precio,
      categoria,
      category,
      fecha,
      date,
      metodo_pago,
      metodoPago,
      paymentMethod,
      notas,
      notes,
      origen,
      source,
      pagado,
      paid
    } = payload;

    const cleanTitle = (titulo || title || concepto || 'Gasto puntual').trim();
    
    // Parseo numérico seguro (maneja comas decimales, símbolos €)
    let rawAmount = importe !== undefined ? importe : (amount !== undefined ? amount : precio);
    if (typeof rawAmount === 'string') {
      rawAmount = rawAmount.replace(/\s+/g, '').replace('€', '').replace(',', '.');
    }
    const cleanAmount = parseFloat(rawAmount);
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      throw new Error('El importe debe ser un número válido mayor que 0.');
    }

    // Fecha en formato YYYY-MM-DD
    let cleanDate = fecha || date;
    if (!cleanDate || typeof cleanDate !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(cleanDate)) {
      cleanDate = new Date().toISOString().slice(0, 10);
    } else {
      cleanDate = cleanDate.slice(0, 10);
    }

    const cleanCategory = (categoria || category || 'Gastos Puntuales').trim();
    const cleanMethod = (metodo_pago || metodoPago || paymentMethod || 'Apple Pay').trim();
    const cleanNotes = (notas || notes || '').trim();
    const cleanOrigin = (origen || source || 'atajos_apple').trim();
    const isPaid = pagado !== undefined ? Boolean(pagado) : (paid !== undefined ? Boolean(paid) : true);

    const id = `gasto-apple-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const parts = cleanDate.split('-');
    const day = parseInt(parts[2], 10) || 1;
    const monthNum = parseInt(parts[1], 10) || 1;
    const monthKey = `${parts[0]}-${parts[1]}`;

    // 1. Guardar en PostgreSQL en la tabla dedicada gastos_puntuales
    if (pgService.isConnected) {
      try {
        await pgService.insertPunctualExpense({
          id,
          titulo: cleanTitle,
          importe: cleanAmount,
          categoria: cleanCategory,
          fecha: cleanDate,
          metodo_pago: cleanMethod,
          notas: cleanNotes,
          origen: cleanOrigin
        });
      } catch (err) {
        console.error('[addPunctualExpenseShortcut PG Error]', err);
      }
    }

    // 2. Añadir a transacciones activas de finanzas
    if (!this.data.finance) this.data.finance = {};
    if (!Array.isArray(this.data.finance.transactions)) this.data.finance.transactions = [];
    if (!this.data.finance.payments) this.data.finance.payments = {};

    const newTx = {
      id,
      title: cleanTitle,
      amount: cleanAmount,
      type: 'gasto',
      category: cleanCategory,
      frequency: 'puntual',
      dayOfMonth: day,
      monthOfYear: monthNum,
      active: true,
      startDate: cleanDate,
      endDate: cleanDate,
      isIndefinite: false,
      notes: cleanNotes ? `[Atajo Apple] ${cleanNotes}` : '[Atajo Apple]',
      source: cleanOrigin,
      paymentMethod: cleanMethod,
      createdAt: new Date().toISOString()
    };

    this.data.finance.transactions.push(newTx);

    // 3. Registrar como pagado para el mes correspondiente
    if (isPaid) {
      if (!this.data.finance.payments[monthKey]) {
        this.data.finance.payments[monthKey] = {};
      }
      this.data.finance.payments[monthKey][id] = {
        paid: true,
        date: cleanDate
      };
    }

    this.save();

    return {
      success: true,
      id,
      titulo: cleanTitle,
      importe: cleanAmount,
      categoria: cleanCategory,
      fecha: cleanDate,
      metodo_pago: cleanMethod,
      pagado: isPaid,
      message: `Gasto de ${cleanAmount.toFixed(2)}€ ('${cleanTitle}') registrado correctamente en Neon PostgreSQL.`,
      speechFeedback: `Gasto de ${cleanAmount.toFixed(2)} euros por ${cleanTitle} añadido a Domótica.`
    };
  }

  async getPunctualExpensesFromPg(limit = 100) {
    if (pgService.isConnected) {
      return await pgService.getPunctualExpenses(limit);
    }
    // Fallback local
    return (this.data?.finance?.transactions || [])
      .filter(t => t.frequency === 'puntual' || t.source === 'atajos_apple')
      .map(t => ({
        id: t.id,
        titulo: t.title,
        importe: t.amount,
        categoria: t.category,
        fecha: t.startDate,
        metodo_pago: t.paymentMethod || 'Tarjeta',
        notas: t.notes,
        origen: t.source || 'manual',
        creado_en: t.createdAt
      }));
  }

  async deletePunctualExpense(id) {
    if (pgService.isConnected) {
      await pgService.deletePunctualExpense(id);
    }
    return this.deleteFinanceTransaction(id);
  }

  async getDatabaseStatus() {
    let stats = null;
    if (fs.existsSync(DB_FILE)) {
      stats = fs.statSync(DB_FILE);
    }
    const backupFiles = fs.existsSync(BACKUPS_DIR) 
      ? fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.json'))
      : [];

    const pgStatus = await pgService.getStatus();

    return {
      status: pgStatus.connected ? 'healthy' : 'local_only',
      storageType: pgStatus.connected 
        ? 'Neon Serverless PostgreSQL (Nube) + Réplica Local' 
        : 'Base de Datos Local en Disco (JSON DB Permanente)',
      dbFile: DB_FILE,
      sizeBytes: stats ? stats.size : 0,
      lastModified: stats ? stats.mtime.toISOString() : null,
      backupsCount: backupFiles.length,
      isMultiDevice: true,
      description: pgStatus.connected
        ? 'Conectado activamente a Neon PostgreSQL (AWS Frankfurt). Todas las finanzas, pagos mensuales y gastos puntuales de Atajos de Apple se sincronizan en la nube.'
        : 'Operando con réplica local. Conexión a Neon PostgreSQL en espera o reintentando.',
      postgres: pgStatus,
      appleShortcuts: {
        endpoint: '/api/finance/shortcuts/gasto',
        method: 'POST',
        totalGastosPuntuales: pgStatus.counts ? pgStatus.counts.gastosPuntuales : 0
      },
      counts: {
        transactions: (this.data?.finance?.transactions || []).length,
        categories: (this.data?.finance?.categories || []).length,
        loans: (this.data?.finance?.loans || []).length,
        goals: (this.data?.finance?.goals || []).length,
        gastosPuntuales: pgStatus.counts ? pgStatus.counts.gastosPuntuales : 0,
        pantryItems: (this.data?.pantry || []).length,
        shoppingItems: (this.data?.shoppingList || []).length,
        documents: (this.data?.documents || []).length
      }
    };
  }

  saveLocalOnly() {
    try {
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Error saving local database:', err);
    }
  }

  save() {
    this.saveLocalOnly();
    if (pgService.isConnected) {
      pgService.saveFullState(this.data).catch(err => {
        console.error('[PostgreSQL save state error]', err.message);
      });
      pgService.syncRelationalData(this.data?.finance).catch(err => {
        console.error('[PostgreSQL sync relational error]', err.message);
      });
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

  // --- FINANCE ENGINE WITH RECURRENCE, CALENDAR, LONG-TERM & LOANS ---
  // --- FINANCE CATEGORIES & GROUPINGS ---
  getFinanceCategories() {
    return this.data.finance.categories || [];
  }

  addFinanceCategory(category) {
    if (!this.data.finance.categories) this.data.finance.categories = [];
    const name = (category.name || '').trim();
    if (!name) throw new Error('El nombre de la categoría es obligatorio');

    // Check if category already exists
    const existing = this.data.finance.categories.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;

    const newCat = {
      id: `cat-${Date.now()}`,
      name,
      group: (category.group || '').trim() || 'Personalizados',
      color: category.color || '#f59e0b',
      icon: category.icon || 'Tag',
      isDefault: false
    };
    this.data.finance.categories.push(newCat);
    this.save();
    return newCat;
  }

  deleteFinanceCategory(id) {
    if (this.data.finance.categories) {
      this.data.finance.categories = this.data.finance.categories.filter(c => c.id !== id);
      this.save();
    }
    return { success: true, id };
  }

  getFinanceTransactions() {
    return this.data.finance.transactions || [];
  }

  addFinanceTransaction(tx) {
    let day = Number(tx.dayOfMonth);
    const startDate = tx.startDate || new Date().toISOString().slice(0, 7);

    // If dayOfMonth was not explicitly set but startDate is YYYY-MM-DD, extract day
    if ((!day || isNaN(day)) && startDate && startDate.length >= 10) {
      const parts = startDate.split('-');
      if (parts[2]) day = parseInt(parts[2], 10);
    }
    if (!day || isNaN(day)) day = 1;
    day = Math.min(31, Math.max(1, Math.floor(day)));

    let monthOfYear = tx.monthOfYear ? Number(tx.monthOfYear) : null;
    if (!monthOfYear && startDate) {
      const parts = startDate.split('-');
      if (parts[1]) {
        const m = parseInt(parts[1], 10);
        if (!isNaN(m) && m >= 1 && m <= 12) monthOfYear = m;
      }
    }

    const newTx = {
      id: `fin-${Date.now()}`,
      title: tx.title,
      amount: Number(tx.amount) || 0,
      type: tx.type || 'gasto', // 'ingreso' | 'gasto'
      category: tx.category || 'General',
      frequency: tx.frequency || 'mensual', // 'mensual' | 'trimestral' | 'semestral' | 'anual' | 'puntual'
      dayOfMonth: day,
      monthOfYear: monthOfYear,
      active: tx.active !== false,
      startDate: startDate,
      endDate: tx.endDate || null,
      isIndefinite: tx.isIndefinite !== false,
      yearlyIncreasePct: tx.yearlyIncreasePct ? Number(tx.yearlyIncreasePct) : 0,
      loanId: tx.loanId || null,
      activeMonths: Array.isArray(tx.activeMonths) ? tx.activeMonths.map(Number).filter(n => n >= 1 && n <= 12) : null,
      rateSteps: Array.isArray(tx.rateSteps) ? tx.rateSteps : [],
      notes: tx.notes || '',
      createdAt: new Date().toISOString()
    };
    if (!this.data.finance.transactions) this.data.finance.transactions = [];
    this.data.finance.transactions.push(newTx);

    // If initialPaid is true, immediately mark as paid for this month (e.g. for everyday groceries)
    if (tx.initialPaid) {
      const monthKey = startDate.slice(0, 7);
      if (!this.data.finance.payments) this.data.finance.payments = {};
      if (!this.data.finance.payments[monthKey]) this.data.finance.payments[monthKey] = {};
      this.data.finance.payments[monthKey][newTx.id] = {
        paid: true,
        date: startDate.length >= 10 ? startDate : new Date().toISOString().slice(0, 10)
      };
    }

    this.save();
    return newTx;
  }

  toggleTransactionActive(id) {
    const tx = (this.data.finance.transactions || []).find(t => t.id === id);
    if (!tx) return null;
    tx.active = !tx.active;
    this.save();
    return tx;
  }

  updateFinanceTransaction(id, updates, mode = 'future') {
    const parseSafe = (val, fallback = 0) => {
      if (val === undefined || val === null || val === '') return fallback;
      if (typeof val === 'number') return isNaN(val) ? fallback : val;
      let str = String(val).trim();
      if (str.includes('.') && str.includes(',')) {
        if (str.lastIndexOf('.') < str.lastIndexOf(',')) {
          str = str.replace(/\./g, '').replace(',', '.');
        } else {
          str = str.replace(/,/g, '');
        }
      } else if (str.includes(',')) {
        str = str.replace(',', '.');
      }
      const num = parseFloat(str);
      return isNaN(num) ? fallback : num;
    };

    const tx = (this.data.finance.transactions || []).find(t => t.id === id);
    if (tx) {
      if (updates.amount !== undefined) {
        updates.amount = parseSafe(updates.amount, tx.amount);
      }
      if (updates.dayOfMonth !== undefined) {
        let d = parseInt(updates.dayOfMonth, 10);
        if (!isNaN(d)) {
          updates.dayOfMonth = Math.min(31, Math.max(1, d));
          if (tx.startDate) {
            const parts = tx.startDate.split('-');
            tx.startDate = `${parts[0]}-${parts[1] || '01'}-${String(updates.dayOfMonth).padStart(2, '0')}`;
          }
        }
      }
      if (updates.monthOfYear !== undefined) updates.monthOfYear = updates.monthOfYear ? Number(updates.monthOfYear) : null;
      if (updates.yearlyIncreasePct !== undefined) updates.yearlyIncreasePct = Number(updates.yearlyIncreasePct);
      if (updates.active !== undefined) tx.active = Boolean(updates.active);
      if (updates.activeMonths !== undefined) {
        tx.activeMonths = Array.isArray(updates.activeMonths) ? updates.activeMonths.map(Number).filter(n => n >= 1 && n <= 12) : null;
      }
      if (updates.rateSteps !== undefined) {
        tx.rateSteps = Array.isArray(updates.rateSteps) ? updates.rateSteps : [];
      }
      if (updates.extraPays !== undefined) {
        tx.extraPays = Array.isArray(updates.extraPays) ? updates.extraPays : [];
      }
      if (updates.startDate !== undefined) tx.startDate = updates.startDate;
      if (updates.endDate !== undefined) tx.endDate = updates.endDate || null;
      if (updates.isIndefinite !== undefined) tx.isIndefinite = Boolean(updates.isIndefinite);
      if (updates.title !== undefined) tx.title = updates.title;
      if (updates.type !== undefined) tx.type = updates.type;
      if (updates.category !== undefined) tx.category = updates.category;
      if (updates.frequency !== undefined) tx.frequency = updates.frequency;
      if (updates.notes !== undefined) tx.notes = updates.notes;
      if (updates.loanId !== undefined) tx.loanId = updates.loanId || null;

      Object.assign(tx, updates);
      this.save();
      return { type: 'rule_updated', transaction: tx };
    }

    // Check if updating an override
    const override = (this.data.finance.overrides || []).find(o => o.id === id || o.transactionId === id);
    if (override) {
      if (updates.amount !== undefined) {
        override.amount = parseSafe(updates.amount, override.amount);
      }
      if (updates.title !== undefined) override.title = updates.title;
      if (updates.category !== undefined) override.category = updates.category;
      if (updates.dayOfMonth !== undefined) {
        let d = parseInt(updates.dayOfMonth, 10);
        if (!isNaN(d)) override.dayOfMonth = Math.min(31, Math.max(1, d));
      }
      if (updates.notes !== undefined) override.notes = updates.notes;
      this.save();
      return { type: 'override_updated', transaction: override };
    }

    return null;
  }

  moveTransactionDay(id, targetDay, monthKey) {
    const safeDay = Math.min(31, Math.max(1, parseInt(targetDay, 10) || 1));
    const tx = (this.data.finance.transactions || []).find(t => t.id === id);
    if (tx) {
      tx.dayOfMonth = safeDay;
      if (tx.startDate) {
        const parts = tx.startDate.split('-');
        tx.startDate = `${parts[0]}-${parts[1] || '01'}-${String(safeDay).padStart(2, '0')}`;
      }
      if (monthKey) {
        this.createMonthOverride(id, monthKey, { dayOfMonth: safeDay });
      }
      this.save();
      return { success: true, id, targetDay: safeDay };
    }

    const override = (this.data.finance.overrides || []).find(o => o.id === id);
    if (override) {
      override.dayOfMonth = safeDay;
      this.save();
      return { success: true, id, targetDay: safeDay };
    }

    return { success: false, error: 'Transacción no encontrada' };
  }

  createMonthOverride(txId, month, updates) {
    if (!this.data.finance.overrides) this.data.finance.overrides = [];
    
    const parseSafe = (val, fallback = 0) => {
      if (val === undefined || val === null || val === '') return fallback;
      if (typeof val === 'number') return isNaN(val) ? fallback : val;
      let str = String(val).trim();
      if (str.includes('.') && str.includes(',')) {
        if (str.lastIndexOf('.') < str.lastIndexOf(',')) {
          str = str.replace(/\./g, '').replace(',', '.');
        } else {
          str = str.replace(/,/g, '');
        }
      } else if (str.includes(',')) {
        str = str.replace(',', '.');
      }
      const num = parseFloat(str);
      return isNaN(num) ? fallback : num;
    };

    const overrideById = (this.data.finance.overrides || []).find(o => o.id === txId);
    const realTxId = overrideById ? overrideById.transactionId : txId;

    const existingIndex = this.data.finance.overrides.findIndex(o => (o.transactionId === realTxId || o.id === txId) && o.month === month);
    const existingOverride = existingIndex >= 0 ? this.data.finance.overrides[existingIndex] : overrideById;
    const tx = (this.data.finance.transactions || []).find(t => t.id === realTxId);

    const defaultAmt = existingOverride?.amount !== undefined ? existingOverride.amount : (tx ? tx.amount : 0);
    const overrideObj = {
      id: existingOverride ? existingOverride.id : `ovr-${Date.now()}`,
      transactionId: realTxId,
      month: month,
      title: updates.title !== undefined ? updates.title : (existingOverride?.title || (tx ? tx.title : 'Modificación Puntual')),
      amount: updates.amount !== undefined ? parseSafe(updates.amount, defaultAmt) : defaultAmt,
      dayOfMonth: updates.dayOfMonth !== undefined ? Number(updates.dayOfMonth) : (existingOverride?.dayOfMonth !== undefined ? existingOverride.dayOfMonth : (tx ? tx.dayOfMonth : 1)),
      category: updates.category !== undefined ? updates.category : (existingOverride?.category || (tx ? tx.category : 'General')),
      excluded: updates.excluded !== undefined ? Boolean(updates.excluded) : (existingOverride?.excluded || false),
      notes: updates.notes !== undefined ? updates.notes : (existingOverride?.notes || 'Modificado solo para este mes'),
      createdAt: existingOverride?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      this.data.finance.overrides[existingIndex] = overrideObj;
    } else {
      this.data.finance.overrides.push(overrideObj);
    }

    this.save();
    return overrideObj;
  }

  excludeTransactionFromMonth(txId, month) {
    return this.createMonthOverride(txId, month, { excluded: true, amount: 0, notes: 'Excluido solo para este mes' });
  }

  deleteMonthOverride(overrideId) {
    if (this.data.finance.overrides) {
      this.data.finance.overrides = this.data.finance.overrides.filter(o => o.id !== overrideId && o.transactionId !== overrideId);
      this.save();
    }
    return { success: true };
  }

  deleteFinanceTransaction(id) {
    // Determine if id is an override id or transaction id
    const override = (this.data.finance.overrides || []).find(o => o.id === id);
    const targetTxId = override ? override.transactionId : id;

    // Delete associated loan if applicable
    const tx = (this.data.finance.transactions || []).find(t => t.id === targetTxId || t.id === id);
    if (tx && tx.loanId) {
      this.data.finance.loans = (this.data.finance.loans || []).filter(l => l.id !== tx.loanId);
    }

    // Delete master transaction
    this.data.finance.transactions = (this.data.finance.transactions || []).filter(t => t.id !== targetTxId && t.id !== id);

    // Delete all overrides for this transaction (or this specific override)
    if (this.data.finance.overrides) {
      this.data.finance.overrides = this.data.finance.overrides.filter(o => o.transactionId !== targetTxId && o.id !== id);
    }

    // Clean up payments for this transaction
    if (this.data.finance.payments) {
      Object.keys(this.data.finance.payments).forEach(monthKey => {
        if (this.data.finance.payments[monthKey]) {
          delete this.data.finance.payments[monthKey][targetTxId];
          delete this.data.finance.payments[monthKey][id];
        }
      });
    }

    // Clean up punctual expenses in PostgreSQL if present
    if (pgService.isConnected) {
      pgService.deletePunctualExpense(targetTxId).catch(() => {});
    }

    this.save();
    return { success: true, id: targetTxId };
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
    const currentYear = parseInt(yearStr, 10);
    const currentMonthNumber = parseInt(monthStr, 10); // 1 - 12
    
    // Calendar metadata
    const daysInMonth = new Date(currentYear, currentMonthNumber, 0).getDate();
    // In JavaScript: 0 = Sunday, 1 = Monday... We convert to Monday = 0 ... Sunday = 6 for standard European calendars
    const rawFirstDay = new Date(currentYear, currentMonthNumber - 1, 1).getDay();
    const firstDayOfWeek = (rawFirstDay + 6) % 7; // 0 = Lunes, 6 = Domingo

    const transactions = this.data.finance.transactions || [];
    const overrides = (this.data.finance.overrides || []).filter(o => o.month === monthKey);
    const monthPayments = (this.data.finance.payments && this.data.finance.payments[monthKey]) || {};

    const items = [];

    transactions.forEach(tx => {
      if (!tx.active) return;

      // Filter by start and end date if defined
      const txStartMonth = tx.startDate ? tx.startDate.slice(0, 7) : null;
      const txEndMonth = tx.endDate ? tx.endDate.slice(0, 7) : null;
      if (txStartMonth && monthKey < txStartMonth) return;
      if (txEndMonth && monthKey > txEndMonth) return;

      // Custom active months restriction (e.g. paying car insurance 10 of 12 months)
      if (Array.isArray(tx.activeMonths) && tx.activeMonths.length > 0 && !tx.activeMonths.includes(currentMonthNumber)) {
        return;
      }

      // 1. Determinar si existe un tramo/periodo activo (rateStep) para este mes concreto
      let effectiveAmount = Number(tx.amount) || 0;
      let effectiveFrequency = tx.frequency || 'mensual';
      let effectiveDay = tx.dayOfMonth;
      let effectiveMonthOfYear = tx.monthOfYear;
      let activeRateStep = null;

      if (Array.isArray(tx.rateSteps) && tx.rateSteps.length > 0) {
        const matchingStep = tx.rateSteps.find(step => {
          const stepStart = step.startDate ? step.startDate.slice(0, 7) : null;
          const stepEnd = step.endDate ? step.endDate.slice(0, 7) : null;
          if (stepStart && monthKey < stepStart) return false;
          if (stepEnd && monthKey > stepEnd) return false;
          return true;
        });

        if (matchingStep) {
          if (matchingStep.amount !== undefined && matchingStep.amount !== null && matchingStep.amount !== '') {
            effectiveAmount = Number(matchingStep.amount) || 0;
          }
          if (matchingStep.frequency) {
            effectiveFrequency = matchingStep.frequency;
          }
          if (matchingStep.monthOfYear !== undefined && matchingStep.monthOfYear !== null) {
            effectiveMonthOfYear = Number(matchingStep.monthOfYear);
          }
          if (matchingStep.dayOfMonth !== undefined && matchingStep.dayOfMonth !== null) {
            effectiveDay = Number(matchingStep.dayOfMonth);
          }
          activeRateStep = matchingStep;
        }
      }

      // 2. Comprobar aplicabilidad de la frecuencia efectiva para este mes
      let applies = false;
      if (effectiveFrequency === 'mensual') {
        applies = true;
      } else if (effectiveFrequency === 'trimestral') {
        let baseMonth = effectiveMonthOfYear ? Number(effectiveMonthOfYear) : null;
        if (!baseMonth && tx.startDate) {
          const parts = tx.startDate.split('-');
          if (parts[1]) baseMonth = parseInt(parts[1], 10);
        }
        if (!baseMonth || isNaN(baseMonth)) baseMonth = 1;
        applies = ((currentMonthNumber - baseMonth) % 3 + 3) % 3 === 0;
      } else if (effectiveFrequency === 'semestral') {
        let baseMonth = effectiveMonthOfYear ? Number(effectiveMonthOfYear) : null;
        if (!baseMonth && tx.startDate) {
          const parts = tx.startDate.split('-');
          if (parts[1]) baseMonth = parseInt(parts[1], 10);
        }
        if (!baseMonth || isNaN(baseMonth)) baseMonth = 6;
        applies = ((currentMonthNumber - baseMonth) % 6 + 6) % 6 === 0;
      } else if (effectiveFrequency === 'anual') {
        let annualMonth = effectiveMonthOfYear ? Number(effectiveMonthOfYear) : null;
        if (!annualMonth && tx.startDate) {
          const parts = tx.startDate.split('-');
          if (parts[1]) annualMonth = parseInt(parts[1], 10);
        }
        if (!annualMonth || isNaN(annualMonth)) annualMonth = 1;
        applies = (currentMonthNumber === annualMonth);
      } else if (effectiveFrequency === 'puntual') {
        applies = tx.startDate === monthKey || (tx.startDate && tx.startDate.startsWith(monthKey));
      } else if (effectiveFrequency.startsWith('cada_') || activeRateStep?.intervalMonths) {
        const interval = activeRateStep?.intervalMonths || parseInt(effectiveFrequency.replace(/\D/g, ''), 10) || 1;
        let baseMonth = effectiveMonthOfYear || 1;
        applies = ((currentMonthNumber - baseMonth) % interval + interval) % interval === 0;
      }

      if (applies) {
        const override = overrides.find(o => o.transactionId === tx.id);
        if (override && override.excluded) {
          // Concepto excluido para este mes
          return;
        }
        const paymentInfo = monthPayments[tx.id] || { paid: false, date: null };

        let itemDay = Number(effectiveDay) || 1;
        if (override && override.dayOfMonth !== undefined && override.dayOfMonth !== null) {
          itemDay = Number(override.dayOfMonth);
        } else if (effectiveDay) {
          itemDay = Number(effectiveDay);
        } else if (effectiveFrequency === 'puntual' && tx.startDate && tx.startDate.length >= 10) {
          const parts = tx.startDate.split('-');
          if (parts[2]) {
            const parsedDay = parseInt(parts[2], 10);
            if (!isNaN(parsedDay)) itemDay = parsedDay;
          }
        }
        const safeDay = Math.min(Math.max(Math.floor(itemDay) || 1, 1), daysInMonth);

        const categories = this.data.finance.categories || [];
        const catName = override ? override.category : tx.category;
        const catObj = categories.find(c => c.name.toLowerCase() === (catName || '').toLowerCase());
        const isRecurring = tx.frequency !== 'puntual';

        items.push({
          id: tx.id,
          title: override ? override.title : tx.title,
          originalAmount: effectiveAmount,
          amount: override ? override.amount : effectiveAmount,
          type: tx.type,
          category: catName || 'General',
          categoryGroup: catObj?.group || 'Varios',
          categoryColor: catObj?.color || '#f59e0b',
          categoryIcon: catObj?.icon || 'Tag',
          frequency: effectiveFrequency,
          isRecurring,
          date: tx.startDate || null,
          dayOfMonth: safeDay,
          isOverridden: Boolean(override),
          overrideId: override ? override.id : null,
          overrideNotes: override ? override.notes : null,
          paid: Boolean(paymentInfo.paid),
          paidDate: paymentInfo.date,
          loanId: tx.loanId || null,
          startDate: tx.startDate || null,
          endDate: tx.endDate || null,
          active: tx.active !== false,
          activeMonths: tx.activeMonths || null,
          rateSteps: tx.rateSteps || [],
          activeRateStep,
          notes: tx.notes || ''
        });
      }

      // Generar pagas extras programadas manualmente para esta nómina en este mes
      if (tx.type === 'ingreso' && Array.isArray(tx.extraPays) && tx.extraPays.length > 0) {
        tx.extraPays.forEach((extra, idx) => {
          if (Number(extra.month) === currentMonthNumber) {
            const extraId = `${tx.id}_extra_${extra.id || idx}`;
            const extraOverride = overrides.find(o => o.transactionId === extraId);
            if (extraOverride && extraOverride.excluded) return;

            const extraPaymentInfo = monthPayments[extraId] || { paid: false, date: null };
            let extraDay = extraOverride?.dayOfMonth !== undefined ? Number(extraOverride.dayOfMonth) : (Number(extra.dayOfMonth) || 25);
            const safeExtraDay = Math.min(Math.max(Math.floor(extraDay) || 25, 1), daysInMonth);
            const baseExtraAmt = (extra.amount !== undefined && extra.amount !== null && extra.amount !== '')
              ? Number(extra.amount)
              : effectiveAmount;
            const finalExtraAmt = extraOverride?.amount !== undefined ? Number(extraOverride.amount) : baseExtraAmt;

            items.push({
              id: extraId,
              parentTxId: tx.id,
              extraPayId: extra.id || `extra-${idx}`,
              isExtraPay: true,
              title: extraOverride?.title || extra.title || `Paga Extra ${tx.title}`,
              originalAmount: baseExtraAmt,
              amount: finalExtraAmt,
              type: 'ingreso',
              category: tx.category || 'Nóminas',
              categoryGroup: 'Ingresos',
              categoryColor: '#30d158',
              categoryIcon: 'Sparkles',
              frequency: 'anual',
              isRecurring: false,
              date: `${yearStr}-${monthStr}-${String(safeExtraDay).padStart(2, '0')}`,
              dayOfMonth: safeExtraDay,
              isOverridden: Boolean(extraOverride),
              overrideId: extraOverride ? extraOverride.id : null,
              paid: Boolean(extraPaymentInfo.paid),
              paidDate: extraPaymentInfo.date,
              loanId: null,
              notes: extra.notes || `Paga extra asociada a ${tx.title}`,
              active: true
            });
          }
        });
      }
    });

    // Sort items by day of month
    items.sort((a, b) => a.dayOfMonth - b.dayOfMonth);

    const round2 = (num) => Math.round((Number(num) || 0) * 100) / 100;

    const totalIncome = round2(items.filter(i => i.type === 'ingreso').reduce((sum, i) => sum + (Number(i.amount) || 0), 0));
    const totalExpenses = round2(items.filter(i => i.type === 'gasto').reduce((sum, i) => sum + (Number(i.amount) || 0), 0));
    const projectedBalance = round2(totalIncome - totalExpenses);

    const paidIncome = round2(items.filter(i => i.type === 'ingreso' && i.paid).reduce((sum, i) => sum + (Number(i.amount) || 0), 0));
    const paidExpenses = round2(items.filter(i => i.type === 'gasto' && i.paid).reduce((sum, i) => sum + (Number(i.amount) || 0), 0));
    const currentActualBalance = round2(paidIncome - paidExpenses);

    // Expenses by category & group
    const categories = this.data.finance.categories || [];
    const categoryBreakdown = {};
    const groupBreakdown = {};

    items.filter(i => i.type === 'gasto').forEach(i => {
      categoryBreakdown[i.category] = (categoryBreakdown[i.category] || 0) + (Number(i.amount) || 0);

      const grp = i.categoryGroup || 'Varios';
      if (!groupBreakdown[grp]) {
        groupBreakdown[grp] = { group: grp, amount: 0, count: 0 };
      }
      groupBreakdown[grp].amount += (Number(i.amount) || 0);
      groupBreakdown[grp].count += 1;
    });

    const categoryList = Object.keys(categoryBreakdown).map(cat => {
      const catObj = categories.find(c => c.name.toLowerCase() === cat.toLowerCase());
      const catAmt = round2(categoryBreakdown[cat]);
      return {
        name: cat,
        group: catObj?.group || 'Varios',
        color: catObj?.color || '#f59e0b',
        icon: catObj?.icon || 'Tag',
        amount: catAmt,
        percentage: totalExpenses > 0 ? Math.round((catAmt / totalExpenses) * 100) : 0
      };
    }).sort((a, b) => b.amount - a.amount);

    const groupList = Object.values(groupBreakdown).map(g => {
      const grpAmt = round2(g.amount);
      return {
        ...g,
        amount: grpAmt,
        percentage: totalExpenses > 0 ? Math.round((grpAmt / totalExpenses) * 100) : 0
      };
    }).sort((a, b) => b.amount - a.amount);

    // Date calculations & Upcoming bills forecast
    const today = new Date();
    const isCurrentCalendarMonth = (today.getFullYear() === currentYear && (today.getMonth() + 1) === currentMonthNumber);
    const todayDay = isCurrentCalendarMonth ? today.getDate() : 1;

    const pendingExpenses = items.filter(i => i.type === 'gasto' && !i.paid);
    const pendingExpensesTotal = round2(pendingExpenses.reduce((sum, i) => sum + (Number(i.amount) || 0), 0));

    // Upcoming in next 7 days
    const upcoming7Days = pendingExpenses.filter(i => {
      if (isCurrentCalendarMonth) {
        return i.dayOfMonth >= todayDay && i.dayOfMonth <= (todayDay + 7);
      }
      return true;
    });
    const upcoming7DaysTotal = round2(upcoming7Days.reduce((sum, i) => sum + (Number(i.amount) || 0), 0));

    const recurringExpensesCount = items.filter(i => i.type === 'gasto' && i.isRecurring).length;
    const everydayExpensesCount = items.filter(i => i.type === 'gasto' && !i.isRecurring).length;
    const recurringExpensesTotal = round2(items.filter(i => i.type === 'gasto' && i.isRecurring).reduce((sum, i) => sum + (Number(i.amount) || 0), 0));
    const everydayExpensesTotal = round2(items.filter(i => i.type === 'gasto' && !i.isRecurring).reduce((sum, i) => sum + (Number(i.amount) || 0), 0));

    // Build Daily Calendar Map (1 to daysInMonth)
    const dailyBreakdown = {};
    for (let day = 1; day <= daysInMonth; day++) {
      dailyBreakdown[day] = {
        day,
        items: [],
        dayIncome: 0,
        dayExpenses: 0,
        hasPending: false,
        isHeavyBillDay: false
      };
    }

    items.forEach(item => {
      const dayData = dailyBreakdown[item.dayOfMonth];
      if (dayData) {
        dayData.items.push(item);
        if (item.type === 'ingreso') {
          dayData.dayIncome = round2(dayData.dayIncome + (Number(item.amount) || 0));
        } else {
          dayData.dayExpenses = round2(dayData.dayExpenses + (Number(item.amount) || 0));
          if (!item.paid) dayData.hasPending = true;
        }
      }
    });

    // Mark heavy bill days (> 25% of total expenses on a single day)
    Object.values(dailyBreakdown).forEach(d => {
      if (totalExpenses > 0 && d.dayExpenses >= (totalExpenses * 0.25)) {
        d.isHeavyBillDay = true;
      }
    });

    return {
      month: monthKey,
      year: currentYear,
      monthNumber: currentMonthNumber,
      daysInMonth,
      firstDayOfWeek, // 0 = Lunes, 6 = Domingo
      todayDay,
      isCurrentCalendarMonth,
      items,
      dailyBreakdown,
      totalIncome,
      totalExpenses,
      projectedBalance,
      paidIncome,
      paidExpenses,
      currentActualBalance,
      categoryList,
      groupList,
      pendingExpensesCount: pendingExpenses.length,
      pendingExpensesTotal,
      upcoming7Days,
      upcoming7DaysTotal,
      recurringExpensesCount,
      everydayExpensesCount,
      recurringExpensesTotal,
      everydayExpensesTotal,
      allCategories: categories
    };
  }

  // --- LONG-TERM PROJECTIONS ENGINE (1 TO 30 YEARS) ---
  calculateLongTermProjection({
    yearsCount = 10,
    startYear = new Date().getFullYear(),
    inflationRate = 2.5,
    salaryGrowthRate = 2.0,
    initialNetWorth = 15000,
    monthlyExtraSavings = 0
  } = {}) {
    const years = Math.min(Math.max(parseInt(yearsCount, 10) || 10, 1), 30);
    const inflation = parseFloat(inflationRate) / 100;
    const salaryGrowth = parseFloat(salaryGrowthRate) / 100;
    const extraSavings = parseFloat(monthlyExtraSavings) || 0;

    const transactions = (this.data.finance.transactions || []).filter(t => t.active);
    const loans = this.data.finance.loans || [];
    const goals = this.data.finance.goals || [];

    const yearlyData = [];
    let runningNetWorth = parseFloat(initialNetWorth) || 0;
    const milestones = [];

    // Track active loans ending years
    loans.forEach(loan => {
      if (loan.endDate) {
        const endY = parseInt(loan.endDate.slice(0, 4), 10);
        if (endY >= startYear && endY <= startYear + years) {
          milestones.push({
            year: endY,
            type: 'loan_finished',
            title: `Fin de ${loan.name}`,
            description: `Se libera la cuota mensual de ${loan.monthlyPayment}€/mes (+${Math.round(loan.monthlyPayment * 12)}€ anuales).`,
            amount: loan.monthlyPayment
          });
        }
      }
    });

    // Track goals reaching target
    goals.forEach(goal => {
      if (goal.deadline) {
        const goalY = parseInt(goal.deadline.slice(0, 4), 10);
        if (goalY >= startYear && goalY <= startYear + years) {
          milestones.push({
            year: goalY,
            type: 'goal_target',
            title: `Meta Objetivo: ${goal.title}`,
            description: `Fecha objetivo fijada para alcanzar ${goal.targetAmount}€.`,
            amount: goal.targetAmount
          });
        }
      }
    });

    for (let i = 0; i < years; i++) {
      const year = startYear + i;
      let annualIncome = 0;
      let annualFixedExpenses = 0;
      let annualDiscretionaryExpenses = 0;
      let annualDebtPayments = 0;

      // Compound growth factors
      const incomeGrowthFactor = Math.pow(1 + salaryGrowth, i);
      const inflationFactor = Math.pow(1 + inflation, i);

      // Iterate over 12 months for this year
      for (let m = 1; m <= 12; m++) {
        const monthKey = `${year}-${String(m).padStart(2, '0')}`;

        transactions.forEach(tx => {
          const txStartMonth = tx.startDate ? tx.startDate.slice(0, 7) : null;
          const txEndMonth = tx.endDate ? tx.endDate.slice(0, 7) : null;
          if (txStartMonth && monthKey < txStartMonth) return;
          if (txEndMonth && monthKey > txEndMonth) return;
          if (Array.isArray(tx.activeMonths) && tx.activeMonths.length > 0 && !tx.activeMonths.includes(m)) return;

          let applies = false;
          if (tx.frequency === 'mensual') applies = true;
          else if (tx.frequency === 'trimestral') applies = (m % 3 === 0);
          else if (tx.frequency === 'semestral') applies = (m === 6 || m === 12);
          else if (tx.frequency === 'anual') applies = (tx.monthOfYear ? tx.monthOfYear === m : m === 1);
          else if (tx.frequency === 'puntual') applies = (tx.startDate === monthKey || (tx.startDate && tx.startDate.startsWith(monthKey)));

          if (!applies) return;

          let baseAmount = tx.amount;
          if (Array.isArray(tx.rateSteps) && tx.rateSteps.length > 0) {
            const matchingStep = tx.rateSteps.find(step => {
              const stepStart = step.startDate ? step.startDate.slice(0, 7) : null;
              const stepEnd = step.endDate ? step.endDate.slice(0, 7) : null;
              if (stepStart && monthKey < stepStart) return false;
              if (stepEnd && monthKey > stepEnd) return false;
              return true;
            });
            if (matchingStep && matchingStep.amount !== undefined && matchingStep.amount !== null) {
              baseAmount = Number(matchingStep.amount) || 0;
            }
          }

          if (tx.type === 'ingreso') {
            // Apply salary growth if category is Sueldo/Freelance or transaction has yearlyIncreasePct
            const growth = tx.yearlyIncreasePct ? Math.pow(1 + (tx.yearlyIncreasePct / 100), i) : incomeGrowthFactor;
            annualIncome += baseAmount * growth;
          } else {
            if (tx.loanId) {
              // Fixed debt payments don't inflate if fixed rate
              annualDebtPayments += baseAmount;
            } else if (tx.category === 'Vivienda' || tx.category === 'Suministros' || tx.category === 'Seguros' || tx.category === 'Impuestos') {
              const growth = tx.yearlyIncreasePct ? Math.pow(1 + (tx.yearlyIncreasePct / 100), i) : inflationFactor;
              annualFixedExpenses += baseAmount * growth;
            } else {
              const growth = tx.yearlyIncreasePct ? Math.pow(1 + (tx.yearlyIncreasePct / 100), i) : inflationFactor;
              annualDiscretionaryExpenses += baseAmount * growth;
            }
          }
        });

        // Add monthly extra savings if configured
        annualIncome += extraSavings;
      }

      const totalExpenses = annualFixedExpenses + annualDiscretionaryExpenses + annualDebtPayments;
      const netSavings = annualIncome - totalExpenses;
      runningNetWorth += netSavings;

      // Calculate compound investment value assuming 4% real return on accumulated wealth
      const investmentGrowth = runningNetWorth > 0 ? runningNetWorth * 0.035 : 0;
      const wealthWithInvestment = runningNetWorth + investmentGrowth;

      yearlyData.push({
        year,
        yearLabel: `${year}`,
        income: Math.round(annualIncome),
        expenses: Math.round(totalExpenses),
        fixedExpenses: Math.round(annualFixedExpenses),
        discretionaryExpenses: Math.round(annualDiscretionaryExpenses),
        debtPayments: Math.round(annualDebtPayments),
        netSavings: Math.round(netSavings),
        savingsRate: annualIncome > 0 ? Math.round((netSavings / annualIncome) * 100) : 0,
        netWorth: Math.round(runningNetWorth),
        wealthWithInvestment: Math.round(wealthWithInvestment)
      });
    }

    return {
      projectionYears: years,
      startYear,
      endYear: startYear + years - 1,
      inflationRatePercent: inflation * 100,
      salaryGrowthPercent: salaryGrowth * 100,
      initialNetWorth,
      finalProjectedNetWorth: yearlyData[yearlyData.length - 1]?.netWorth || 0,
      finalProjectedWithInvestment: yearlyData[yearlyData.length - 1]?.wealthWithInvestment || 0,
      yearlyData,
      milestones
    };
  }

  // --- LOANS & MORTGAGES ---
  getLoans() {
    return (this.data.finance.loans || []).map(loan => {
      const isFamily = Boolean(loan.isFamilyLoan || loan.type === 'familiar');
      const repayments = Array.isArray(loan.repayments) ? loan.repayments : [];
      const totalAmortized = repayments.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      
      let currentBal = loan.currentBalance !== undefined 
        ? Number(loan.currentBalance) 
        : Math.max(0, (Number(loan.initialAmount) || 0) - totalAmortized);
      
      const remainingMonths = loan.endDate ? this.calculateMonthsBetween(new Date().toISOString().slice(0, 7), loan.endDate) : 0;
      const paidMonths = ((loan.termYears || 0) * 12) - Math.max(remainingMonths, 0);
      const totalPaidSoFar = (Number(loan.initialAmount) || 0) - currentBal;
      const progress = loan.initialAmount > 0 
        ? Math.min(100, Math.max(0, Math.round((totalPaidSoFar / loan.initialAmount) * 100))) 
        : 0;

      return {
        ...loan,
        isFamilyLoan: isFamily,
        repayments,
        totalAmortized,
        currentBalance: currentBal,
        remainingMonths: Math.max(0, remainingMonths),
        paidMonths: Math.max(0, paidMonths),
        progressPercent: progress,
        totalPaidSoFar
      };
    });
  }

  calculateMonthsBetween(startKey, endKey) {
    const [y1, m1] = startKey.split('-').map(Number);
    const [y2, m2] = endKey.split('-').map(Number);
    return (y2 - y1) * 12 + (m2 - m1);
  }

  addLoan(loan) {
    const isFamily = Boolean(loan.isFamilyLoan || loan.type === 'familiar');
    const newLoan = {
      id: `loan-${Date.now()}`,
      name: loan.name || (isFamily ? 'Préstamo Padres / Familia' : 'Nuevo Préstamo'),
      type: loan.type || (isFamily ? 'familiar' : 'personal'),
      isFamilyLoan: isFamily,
      bank: loan.bank || (isFamily ? 'Padres / Familia' : ''),
      initialAmount: Number(loan.initialAmount) || 0,
      currentBalance: Number(loan.currentBalance !== undefined ? loan.currentBalance : loan.initialAmount) || 0,
      interestRate: isFamily ? 0 : (Number(loan.interestRate) || 0),
      interestType: loan.interestType || 'fijo',
      monthlyPayment: isFamily ? 0 : (Number(loan.monthlyPayment) || 0),
      startDate: loan.startDate || new Date().toISOString().slice(0, 7),
      endDate: isFamily ? null : (loan.endDate || null),
      termYears: isFamily ? null : (Number(loan.termYears) || 5),
      propertyValue: loan.propertyValue ? Number(loan.propertyValue) : null,
      notes: loan.notes || '',
      repayments: Array.isArray(loan.repayments) ? loan.repayments : [],
      status: loan.status || 'activo'
    };

    if (!this.data.finance.loans) this.data.finance.loans = [];
    this.data.finance.loans.push(newLoan);

    // Auto-create a recurring transaction if requested and has monthlyPayment
    if (loan.autoCreateTransaction !== false && newLoan.monthlyPayment > 0 && !isFamily) {
      this.addFinanceTransaction({
        title: `Cuota ${newLoan.name}`,
        amount: newLoan.monthlyPayment,
        type: 'gasto',
        category: newLoan.type === 'hipoteca' ? 'Vivienda' : (newLoan.type === 'coche' ? 'Vehículo' : 'General'),
        frequency: 'mensual',
        dayOfMonth: loan.dayOfMonth || 1,
        startDate: newLoan.startDate,
        endDate: newLoan.endDate,
        loanId: newLoan.id,
        isIndefinite: false
      });
    }

    this.save();
    return newLoan;
  }

  addLoanRepayment(loanId, { amount, date, notes, registerExpense = false }) {
    const loan = (this.data.finance.loans || []).find(l => l.id === loanId);
    if (!loan) throw new Error('Préstamo no encontrado');
    const cleanAmount = parseFloat(amount);
    if (isNaN(cleanAmount) || cleanAmount <= 0) throw new Error('El importe debe ser mayor a 0');
    const cleanDate = date || new Date().toISOString().slice(0, 10);

    if (!Array.isArray(loan.repayments)) loan.repayments = [];
    const rep = {
      id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      amount: cleanAmount,
      date: cleanDate,
      notes: notes || 'Devolución / Pago extraordinario',
      createdAt: new Date().toISOString()
    };
    loan.repayments.push(rep);

    // Descontar del capital pendiente
    const prevBalance = loan.currentBalance !== undefined ? Number(loan.currentBalance) : Number(loan.initialAmount);
    loan.currentBalance = Math.max(0, prevBalance - cleanAmount);
    loan.totalAmortized = (Number(loan.totalAmortized) || 0) + cleanAmount;

    // Si el usuario seleccionó computar como gasto del mes para descontarlo del dinero de la cuenta:
    if (registerExpense) {
      this.addPunctualExpenseShortcut({
        titulo: `Pago / Devolución ${loan.name}`,
        importe: cleanAmount,
        categoria: loan.type === 'hipoteca' ? 'Vivienda' : 'Préstamos',
        fecha: cleanDate,
        metodo_pago: 'Transferencia',
        notas: notes ? `[Amortización] ${notes}` : '[Amortización de préstamo]',
        origen: 'prestamo_devolucion',
        pagado: true
      });
    }

    this.save();
    return { success: true, loan, repayment: rep };
  }

  deleteLoanRepayment(loanId, repaymentId) {
    const loan = (this.data.finance.loans || []).find(l => l.id === loanId);
    if (!loan) throw new Error('Préstamo no encontrado');
    if (!Array.isArray(loan.repayments)) return { success: true };

    const rep = loan.repayments.find(r => r.id === repaymentId);
    if (rep) {
      loan.currentBalance = (Number(loan.currentBalance) || 0) + Number(rep.amount);
      loan.totalAmortized = Math.max(0, (Number(loan.totalAmortized) || 0) - Number(rep.amount));
      loan.repayments = loan.repayments.filter(r => r.id !== repaymentId);
      this.save();
    }
    return { success: true, loan };
  }

  updateLoan(id, updates) {
    const loan = (this.data.finance.loans || []).find(l => l.id === id);
    if (loan) {
      if (updates.name !== undefined) loan.name = updates.name;
      if (updates.type !== undefined) loan.type = updates.type;
      if (updates.bank !== undefined) loan.bank = updates.bank;
      if (updates.initialAmount !== undefined) loan.initialAmount = Number(updates.initialAmount);
      if (updates.currentBalance !== undefined) loan.currentBalance = Number(updates.currentBalance);
      if (updates.interestRate !== undefined) loan.interestRate = Number(updates.interestRate);
      if (updates.interestType !== undefined) loan.interestType = updates.interestType;
      if (updates.monthlyPayment !== undefined) loan.monthlyPayment = Number(updates.monthlyPayment);
      if (updates.termYears !== undefined) loan.termYears = Number(updates.termYears);
      if (updates.propertyValue !== undefined) loan.propertyValue = Number(updates.propertyValue);
      if (updates.dayOfMonth !== undefined) loan.dayOfMonth = Number(updates.dayOfMonth) || 1;
      if (updates.startDate !== undefined) loan.startDate = updates.startDate;
      if (updates.endDate !== undefined) loan.endDate = updates.endDate || null;
      if (updates.notes !== undefined) loan.notes = updates.notes;
      if (updates.isFamilyLoan !== undefined) loan.isFamilyLoan = Boolean(updates.isFamilyLoan);

      Object.assign(loan, updates);

      const isFamily = Boolean(loan.isFamilyLoan || loan.type === 'familiar');

      // Sincronizar o vincular la transacción en el calendario
      let linkedTx = (this.data.finance.transactions || []).find(t => t.loanId === id);
      if (!linkedTx) {
        linkedTx = (this.data.finance.transactions || []).find(t => 
          (!t.loanId || t.loanId === 'null') && 
          t.type === 'gasto' && 
          (t.title?.toLowerCase().includes('hipoteca') || t.title?.toLowerCase().includes('préstamo') || t.title?.toLowerCase().includes('prestamo'))
        );
        if (linkedTx) {
          linkedTx.loanId = id;
        }
      }

      if (linkedTx) {
        if (updates.name) {
          linkedTx.title = updates.name.toLowerCase().startsWith('cuota') ? updates.name : `Cuota ${updates.name}`;
        }
        if (updates.monthlyPayment !== undefined) linkedTx.amount = Number(updates.monthlyPayment);
        if (updates.dayOfMonth !== undefined) linkedTx.dayOfMonth = Number(updates.dayOfMonth) || 1;
        if (updates.startDate !== undefined) linkedTx.startDate = updates.startDate;
        if (updates.endDate !== undefined) linkedTx.endDate = updates.endDate || null;
        linkedTx.category = (loan.type === 'hipoteca' ? 'Vivienda' : (loan.type === 'coche' ? 'Vehículo' : 'Préstamos'));
        if (isFamily && (Number(loan.monthlyPayment) === 0 || !loan.monthlyPayment)) {
          linkedTx.active = false;
        } else {
          linkedTx.active = true;
        }
      } else if (!isFamily && Number(loan.monthlyPayment) > 0) {
        this.addFinanceTransaction({
          title: `Cuota ${loan.name}`,
          amount: Number(loan.monthlyPayment),
          type: 'gasto',
          category: loan.type === 'hipoteca' ? 'Vivienda' : (loan.type === 'coche' ? 'Vehículo' : 'Préstamos'),
          frequency: 'mensual',
          dayOfMonth: Number(loan.dayOfMonth) || 1,
          startDate: loan.startDate || new Date().toISOString().slice(0, 7),
          endDate: loan.endDate || null,
          loanId: loan.id,
          isIndefinite: !loan.endDate
        });
      }

      this.save();
    }
    return loan;
  }

  deleteLoan(id) {
    this.data.finance.loans = (this.data.finance.loans || []).filter(l => l.id !== id);
    // Also remove recurring transactions generated for this loan
    this.data.finance.transactions = (this.data.finance.transactions || []).filter(t => t.loanId !== id);
    this.save();
    return { success: true, id };
  }

  simulateLoanAmortization(id, extraAmount, mode = 'reduce_term') {
    const loan = (this.data.finance.loans || []).find(l => l.id === id);
    if (!loan) throw new Error('Préstamo no encontrado');

    const principal = Number(loan.currentBalance);
    const annualRate = Number(loan.interestRate) / 100;
    const monthlyRate = annualRate / 12;
    const currentPayment = Number(loan.monthlyPayment);
    const extra = Number(extraAmount);

    if (extra <= 0 || extra >= principal) {
      throw new Error('El importe extraordinario debe ser mayor que 0 y menor que el capital pendiente');
    }

    const newPrincipal = principal - extra;

    if (mode === 'reduce_term') {
      // Calculate remaining months with current payment on newPrincipal
      let monthsRemaining = 0;
      let balance = newPrincipal;
      let totalInterestNew = 0;

      while (balance > 0 && monthsRemaining < 600) {
        const interest = balance * monthlyRate;
        const principalPaid = currentPayment - interest;
        if (principalPaid <= 0) break;
        totalInterestNew += interest;
        balance -= principalPaid;
        monthsRemaining++;
      }

      // Calculate baseline remaining months without extra
      let baseMonths = 0;
      let baseBalance = principal;
      let totalInterestBase = 0;
      while (baseBalance > 0 && baseMonths < 600) {
        const interest = baseBalance * monthlyRate;
        const principalPaid = currentPayment - interest;
        if (principalPaid <= 0) break;
        totalInterestBase += interest;
        baseBalance -= principalPaid;
        baseMonths++;
      }

      const monthsSaved = Math.max(0, baseMonths - monthsRemaining);
      const interestSaved = Math.max(0, totalInterestBase - totalInterestNew);

      return {
        mode: 'reduce_term',
        extraAmount: extra,
        originalBalance: principal,
        newBalance: newPrincipal,
        currentMonthlyPayment: currentPayment,
        newMonthlyPayment: currentPayment,
        originalRemainingMonths: baseMonths,
        newRemainingMonths: monthsRemaining,
        monthsSaved,
        yearsSaved: (monthsSaved / 12).toFixed(1),
        interestSaved: Math.round(interestSaved)
      };
    } else {
      // mode === 'reduce_payment' (reduces monthly payment keeping remaining term)
      const remainingMonths = loan.endDate ? this.calculateMonthsBetween(new Date().toISOString().slice(0, 7), loan.endDate) : (loan.termYears * 12);
      const n = Math.max(remainingMonths, 1);

      const newMonthlyPayment = monthlyRate > 0
        ? (newPrincipal * (monthlyRate * Math.pow(1 + monthlyRate, n))) / (Math.pow(1 + monthlyRate, n) - 1)
        : newPrincipal / n;

      const monthlySavings = Math.max(0, currentPayment - newMonthlyPayment);
      const totalSavingsOverTerm = monthlySavings * n;

      return {
        mode: 'reduce_payment',
        extraAmount: extra,
        originalBalance: principal,
        newBalance: newPrincipal,
        originalMonthlyPayment: currentPayment,
        newMonthlyPayment: Math.round(newMonthlyPayment * 100) / 100,
        monthlySavings: Math.round(monthlySavings * 100) / 100,
        totalSavingsOverTerm: Math.round(totalSavingsOverTerm),
        remainingMonths: n
      };
    }
  }

  // --- SAVINGS GOALS ---
  getGoals() {
    return (this.data.finance.goals || []).map(goal => {
      const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
      const progress = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
      
      let monthsToDeadline = 12;
      if (goal.deadline) {
        monthsToDeadline = Math.max(1, this.calculateMonthsBetween(new Date().toISOString().slice(0, 7), goal.deadline));
      }
      const suggestedMonthlySavings = Math.round((remainingAmount / monthsToDeadline) * 100) / 100;

      return {
        ...goal,
        remainingAmount,
        progressPercent: progress,
        monthsToDeadline,
        suggestedMonthlySavings
      };
    });
  }

  addGoal(goal) {
    const newGoal = {
      id: `goal-${Date.now()}`,
      title: goal.title || 'Nueva Meta',
      category: goal.category || 'Ahorro',
      targetAmount: Number(goal.targetAmount) || 1000,
      currentAmount: Number(goal.currentAmount) || 0,
      deadline: goal.deadline || null,
      monthlyContribution: Number(goal.monthlyContribution) || 0,
      color: goal.color || 'emerald',
      icon: goal.icon || 'TrendingUp',
      notes: goal.notes || ''
    };
    if (!this.data.finance.goals) this.data.finance.goals = [];
    this.data.finance.goals.push(newGoal);
    this.save();
    return newGoal;
  }

  updateGoal(id, updates) {
    const goal = (this.data.finance.goals || []).find(g => g.id === id);
    if (goal) {
      if (updates.targetAmount !== undefined) updates.targetAmount = Number(updates.targetAmount);
      if (updates.currentAmount !== undefined) updates.currentAmount = Number(updates.currentAmount);
      if (updates.monthlyContribution !== undefined) updates.monthlyContribution = Number(updates.monthlyContribution);
      Object.assign(goal, updates);
      this.save();
    }
    return goal;
  }

  deleteGoal(id) {
    this.data.finance.goals = (this.data.finance.goals || []).filter(g => g.id !== id);
    this.save();
    return { success: true, id };
  }

  contributeGoal(id, amount) {
    const goal = (this.data.finance.goals || []).find(g => g.id === id);
    if (!goal) throw new Error('Meta no encontrada');

    goal.currentAmount = Math.max(0, (Number(goal.currentAmount) || 0) + Number(amount));
    this.save();
    return goal;
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
