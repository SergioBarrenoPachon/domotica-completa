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
        
        // Ensure finance subcollections exist
        if (!this.data.finance) this.data.finance = {};
        if (!Array.isArray(this.data.finance.transactions)) this.data.finance.transactions = initialSeedData.finance.transactions || [];
        if (!Array.isArray(this.data.finance.loans)) this.data.finance.loans = initialSeedData.finance.loans || [];
        if (!Array.isArray(this.data.finance.goals)) this.data.finance.goals = initialSeedData.finance.goals || [];
        if (!Array.isArray(this.data.finance.overrides)) this.data.finance.overrides = [];
        if (!this.data.finance.payments) this.data.finance.payments = {};
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

  // --- FINANCE ENGINE WITH RECURRENCE, CALENDAR, LONG-TERM & LOANS ---
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
      startDate: tx.startDate || new Date().toISOString().slice(0, 7),
      endDate: tx.endDate || null,
      isIndefinite: tx.isIndefinite !== false,
      yearlyIncreasePct: tx.yearlyIncreasePct ? Number(tx.yearlyIncreasePct) : 0,
      loanId: tx.loanId || null
    };
    if (!this.data.finance.transactions) this.data.finance.transactions = [];
    this.data.finance.transactions.push(newTx);
    this.save();
    return newTx;
  }

  updateFinanceTransaction(id, updates, mode = 'future') {
    if (mode === 'future') {
      const tx = this.data.finance.transactions.find(t => t.id === id);
      if (tx) {
        if (updates.amount !== undefined) updates.amount = Number(updates.amount);
        if (updates.dayOfMonth !== undefined) updates.dayOfMonth = Number(updates.dayOfMonth);
        if (updates.monthOfYear !== undefined) updates.monthOfYear = updates.monthOfYear ? Number(updates.monthOfYear) : null;
        if (updates.yearlyIncreasePct !== undefined) updates.yearlyIncreasePct = Number(updates.yearlyIncreasePct);
        Object.assign(tx, updates);
        this.save();
        return { type: 'rule_updated', transaction: tx };
      }
    }
    return null;
  }

  createMonthOverride(txId, month, updates) {
    if (!this.data.finance.overrides) this.data.finance.overrides = [];
    
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
      if (tx.startDate && monthKey < tx.startDate) return;
      if (tx.endDate && monthKey > tx.endDate) return;

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
        const safeDay = Math.min(Math.max(Number(tx.dayOfMonth) || 1, 1), daysInMonth);

        items.push({
          id: tx.id,
          title: override ? override.title : tx.title,
          originalAmount: tx.amount,
          amount: override ? override.amount : tx.amount,
          type: tx.type,
          category: override ? override.category : tx.category,
          frequency: tx.frequency,
          dayOfMonth: safeDay,
          isOverridden: Boolean(override),
          overrideId: override ? override.id : null,
          overrideNotes: override ? override.notes : null,
          paid: Boolean(paymentInfo.paid),
          paidDate: paymentInfo.date,
          loanId: tx.loanId || null,
          endDate: tx.endDate || null
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
          dayData.dayIncome += item.amount;
        } else {
          dayData.dayExpenses += item.amount;
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
      items,
      dailyBreakdown,
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
          if (tx.startDate && monthKey < tx.startDate) return;
          if (tx.endDate && monthKey > tx.endDate) return;

          let applies = false;
          if (tx.frequency === 'mensual') applies = true;
          else if (tx.frequency === 'trimestral') applies = (m % 3 === 0);
          else if (tx.frequency === 'semestral') applies = (m === 6 || m === 12);
          else if (tx.frequency === 'anual') applies = (tx.monthOfYear ? tx.monthOfYear === m : m === 1);
          else if (tx.frequency === 'puntual') applies = (tx.startDate === monthKey);

          if (!applies) return;

          if (tx.type === 'ingreso') {
            // Apply salary growth if category is Sueldo/Freelance or transaction has yearlyIncreasePct
            const growth = tx.yearlyIncreasePct ? Math.pow(1 + (tx.yearlyIncreasePct / 100), i) : incomeGrowthFactor;
            annualIncome += tx.amount * growth;
          } else {
            if (tx.loanId) {
              // Fixed debt payments don't inflate if fixed rate
              annualDebtPayments += tx.amount;
            } else if (tx.category === 'Vivienda' || tx.category === 'Suministros' || tx.category === 'Seguros' || tx.category === 'Impuestos') {
              const growth = tx.yearlyIncreasePct ? Math.pow(1 + (tx.yearlyIncreasePct / 100), i) : inflationFactor;
              annualFixedExpenses += tx.amount * growth;
            } else {
              const growth = tx.yearlyIncreasePct ? Math.pow(1 + (tx.yearlyIncreasePct / 100), i) : inflationFactor;
              annualDiscretionaryExpenses += tx.amount * growth;
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
      const remainingMonths = loan.endDate ? this.calculateMonthsBetween(new Date().toISOString().slice(0, 7), loan.endDate) : 0;
      const paidMonths = (loan.termYears * 12) - Math.max(remainingMonths, 0);
      const progress = loan.initialAmount > 0 ? Math.min(100, Math.max(0, Math.round(((loan.initialAmount - loan.currentBalance) / loan.initialAmount) * 100))) : 0;

      return {
        ...loan,
        remainingMonths: Math.max(0, remainingMonths),
        paidMonths: Math.max(0, paidMonths),
        progressPercent: progress,
        totalPaidSoFar: loan.initialAmount - loan.currentBalance
      };
    });
  }

  calculateMonthsBetween(startKey, endKey) {
    const [y1, m1] = startKey.split('-').map(Number);
    const [y2, m2] = endKey.split('-').map(Number);
    return (y2 - y1) * 12 + (m2 - m1);
  }

  addLoan(loan) {
    const newLoan = {
      id: `loan-${Date.now()}`,
      name: loan.name || 'Nuevo Préstamo',
      type: loan.type || 'personal', // 'hipoteca' | 'coche' | 'personal' | 'reforma'
      bank: loan.bank || '',
      initialAmount: Number(loan.initialAmount) || 0,
      currentBalance: Number(loan.currentBalance) || Number(loan.initialAmount) || 0,
      interestRate: Number(loan.interestRate) || 0,
      interestType: loan.interestType || 'fijo',
      monthlyPayment: Number(loan.monthlyPayment) || 0,
      startDate: loan.startDate || new Date().toISOString().slice(0, 7),
      endDate: loan.endDate || null,
      termYears: Number(loan.termYears) || 5,
      propertyValue: loan.propertyValue ? Number(loan.propertyValue) : null,
      notes: loan.notes || ''
    };

    if (!this.data.finance.loans) this.data.finance.loans = [];
    this.data.finance.loans.push(newLoan);

    // Auto-create a recurring transaction if requested
    if (loan.autoCreateTransaction !== false && newLoan.monthlyPayment > 0) {
      this.addFinanceTransaction({
        title: `Cuota ${newLoan.name}`,
        amount: newLoan.monthlyPayment,
        type: 'gasto',
        category: newLoan.type === 'hipoteca' ? 'Vivienda' : 'Vehículo',
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

  updateLoan(id, updates) {
    const loan = (this.data.finance.loans || []).find(l => l.id === id);
    if (loan) {
      if (updates.initialAmount !== undefined) updates.initialAmount = Number(updates.initialAmount);
      if (updates.currentBalance !== undefined) updates.currentBalance = Number(updates.currentBalance);
      if (updates.interestRate !== undefined) updates.interestRate = Number(updates.interestRate);
      if (updates.monthlyPayment !== undefined) updates.monthlyPayment = Number(updates.monthlyPayment);
      if (updates.termYears !== undefined) updates.termYears = Number(updates.termYears);
      if (updates.propertyValue !== undefined) updates.propertyValue = Number(updates.propertyValue);
      Object.assign(loan, updates);

      // Also update linked transaction if any
      const linkedTx = (this.data.finance.transactions || []).find(t => t.loanId === id);
      if (linkedTx && updates.monthlyPayment) {
        linkedTx.amount = updates.monthlyPayment;
        if (updates.endDate) linkedTx.endDate = updates.endDate;
      }

      this.save();
    }
    return loan;
  }

  deleteLoan(id) {
    this.data.finance.loans = (this.data.finance.loans || []).filter(l => l.id !== id);
    // Unlink transaction or keep it
    (this.data.finance.transactions || []).forEach(t => {
      if (t.loanId === id) t.loanId = null;
    });
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
