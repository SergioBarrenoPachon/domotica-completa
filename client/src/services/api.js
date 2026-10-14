const BASE_URL = '/api';

/**
 * Envoltorio de fetch que convierte los fallos de red (servidor dormido, sin Wi-Fi...)
 * en un error con mensaje legible en castellano en lugar del críptico "Failed to fetch".
 * Se declara con el mismo nombre para que todas las llamadas del módulo lo usen.
 */
const fetch = async (...args) => {
  try {
    return await window.fetch(...args);
  } catch (err) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    throw new Error(
      offline
        ? 'Sin conexión a Internet. Revisa tu red e inténtalo de nuevo.'
        : 'No se pudo contactar con el servidor. Inténtalo de nuevo en unos segundos.'
    );
  }
};

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (_) {
    // Respuestas HTML (p. ej. 502 de Render mientras arranca el servicio)
    return { error: `Respuesta inesperada del servidor (${response.status})` };
  }
}

async function readJson(response) {
  const json = await parseJsonSafe(response);
  if (!response.ok || json.success === false) {
    throw new Error(json.error || `Error en la petición (${response.status})`);
  }
  return json;
}

async function handleResponse(response) {
  const json = await readJson(response);
  return json.data;
}

export const api = {
  // DASHBOARD
  async getDashboard() {
    const res = await fetch(`${BASE_URL}/dashboard`);
    return handleResponse(res);
  },

  // MEALS & RECIPES
  async getMeals() {
    const res = await fetch(`${BASE_URL}/meals`);
    return handleResponse(res);
  },
  async updateMealPlan(days) {
    const res = await fetch(`${BASE_URL}/meals/plan`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days })
    });
    return handleResponse(res);
  },
  async updateDayMeal(dayId, data) {
    const res = await fetch(`${BASE_URL}/meals/day/${dayId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  async suggestMenu() {
    const res = await fetch(`${BASE_URL}/meals/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return handleResponse(res);
  },

  // PANTRY
  async getPantry() {
    const res = await fetch(`${BASE_URL}/pantry`);
    return handleResponse(res);
  },
  async addPantryItem(item) {
    const res = await fetch(`${BASE_URL}/pantry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    return handleResponse(res);
  },
  async updatePantryItem(id, updates) {
    const res = await fetch(`${BASE_URL}/pantry/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return handleResponse(res);
  },
  async adjustPantryQty(id, delta) {
    const res = await fetch(`${BASE_URL}/pantry/${id}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta })
    });
    return handleResponse(res);
  },
  async deletePantryItem(id) {
    const res = await fetch(`${BASE_URL}/pantry/${id}`, {
      method: 'DELETE'
    });
    return handleResponse(res);
  },

  // SHOPPING LIST
  async getShoppingList() {
    const res = await fetch(`${BASE_URL}/shopping`);
    return handleResponse(res);
  },
  async addShoppingItem(item) {
    const res = await fetch(`${BASE_URL}/shopping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    return handleResponse(res);
  },
  async updateShoppingItem(id, updates) {
    const res = await fetch(`${BASE_URL}/shopping/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return handleResponse(res);
  },
  async deleteShoppingItem(id) {
    const res = await fetch(`${BASE_URL}/shopping/${id}`, {
      method: 'DELETE'
    });
    return handleResponse(res);
  },
  async clearCompletedShopping() {
    const res = await fetch(`${BASE_URL}/shopping/clear-completed`, {
      method: 'POST'
    });
    return handleResponse(res);
  },
  async toggleShoppingItem(id, checked) {
    return this.updateShoppingItem(id, { checked: Boolean(checked) });
  },
  async syncShoppingList() {
    const res = await fetch(`${BASE_URL}/shopping/sync`, {
      method: 'POST'
    });
    return readJson(res);
  },
  async syncShoppingFromPantry() {
    return this.syncShoppingList();
  },

  // FINANCE
  async getMonthFinance(monthKey) {
    const res = await fetch(`${BASE_URL}/finance/month/${monthKey}`);
    return handleResponse(res);
  },
  async getYearFinance(year) {
    const res = await fetch(`${BASE_URL}/finance/year/${year}`);
    return handleResponse(res);
  },
  async getFinanceCategories() {
    const res = await fetch(`${BASE_URL}/finance/categories`);
    return handleResponse(res);
  },
  async addFinanceCategory(data) {
    const res = await fetch(`${BASE_URL}/finance/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  async deleteFinanceCategory(id) {
    const res = await fetch(`${BASE_URL}/finance/categories/${id}`, {
      method: 'DELETE'
    });
    return handleResponse(res);
  },
  async getFinanceTransactions() {
    const res = await fetch(`${BASE_URL}/finance/transactions`);
    return handleResponse(res);
  },
  async addFinanceTransaction(tx) {
    const res = await fetch(`${BASE_URL}/finance/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx)
    });
    return handleResponse(res);
  },
  async updateTransactionRule(id, updates) {
    const res = await fetch(`${BASE_URL}/finance/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return handleResponse(res);
  },
  async updateFinanceTransaction(id, updates) {
    const res = await fetch(`${BASE_URL}/finance/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return handleResponse(res);
  },
  async toggleTransactionActive(id) {
    const res = await fetch(`${BASE_URL}/finance/transactions/${id}/toggle`, {
      method: 'PATCH'
    });
    return handleResponse(res);
  },
  async moveTransactionDay(id, targetDay, month) {
    const res = await fetch(`${BASE_URL}/finance/transactions/${id}/move`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetDay, month })
    });
    return handleResponse(res);
  },
  async createMonthOverride(txId, month, updates) {
    const res = await fetch(`${BASE_URL}/finance/override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: txId, month, ...updates })
    });
    return handleResponse(res);
  },
  async deleteMonthOverride(overrideId) {
    const res = await fetch(`${BASE_URL}/finance/override/${overrideId}`, {
      method: 'DELETE'
    });
    return handleResponse(res);
  },
  async togglePaymentStatus(month, transactionId, paid) {
    const res = await fetch(`${BASE_URL}/finance/payment-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, transactionId, paid })
    });
    return handleResponse(res);
  },
  async deleteFinanceTransaction(id) {
    const res = await fetch(`${BASE_URL}/finance/transactions/${id}`, {
      method: 'DELETE'
    });
    return handleResponse(res);
  },
  async excludeTransactionFromMonth(id, month) {
    const res = await fetch(`${BASE_URL}/finance/transactions/${id}/exclude-month`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month })
    });
    return handleResponse(res);
  },
  async getLongTermProjection(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE_URL}/finance/long-term?${query}`);
    return handleResponse(res);
  },

  // LOANS & MORTGAGES
  async getLoans() {
    const res = await fetch(`${BASE_URL}/finance/loans`);
    return handleResponse(res);
  },
  async addLoan(loan) {
    const res = await fetch(`${BASE_URL}/finance/loans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loan)
    });
    return handleResponse(res);
  },
  async updateLoan(id, updates) {
    const res = await fetch(`${BASE_URL}/finance/loans/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return handleResponse(res);
  },
  async deleteLoan(id) {
    const res = await fetch(`${BASE_URL}/finance/loans/${id}`, {
      method: 'DELETE'
    });
    return handleResponse(res);
  },
  async simulateLoanAmortization(id, extraAmount, mode) {
    const res = await fetch(`${BASE_URL}/finance/loans/${id}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extraAmount, mode })
    });
    return handleResponse(res);
  },
  async addLoanRepayment(id, repaymentData) {
    const res = await fetch(`${BASE_URL}/finance/loans/${id}/repay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(repaymentData)
    });
    return handleResponse(res);
  },
  async deleteLoanRepayment(id, repaymentId) {
    const res = await fetch(`${BASE_URL}/finance/loans/${id}/repayment/${repaymentId}`, {
      method: 'DELETE'
    });
    return handleResponse(res);
  },

  // SAVINGS GOALS
  async getGoals() {
    const res = await fetch(`${BASE_URL}/finance/goals`);
    return handleResponse(res);
  },
  async addGoal(goal) {
    const res = await fetch(`${BASE_URL}/finance/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goal)
    });
    return handleResponse(res);
  },
  async updateGoal(id, updates) {
    const res = await fetch(`${BASE_URL}/finance/goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return handleResponse(res);
  },
  async deleteGoal(id) {
    const res = await fetch(`${BASE_URL}/finance/goals/${id}`, {
      method: 'DELETE'
    });
    return handleResponse(res);
  },
  async contributeGoal(id, amount) {
    const res = await fetch(`${BASE_URL}/finance/goals/${id}/contribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    return handleResponse(res);
  },

  // DOMOTICS
  async getDomotics() {
    const res = await fetch(`${BASE_URL}/domotics`);
    return handleResponse(res);
  },
  async toggleDevice(id) {
    const res = await fetch(`${BASE_URL}/domotics/device/${id}/toggle`, {
      method: 'POST'
    });
    return handleResponse(res);
  },
  async updateDevice(id, updates) {
    const res = await fetch(`${BASE_URL}/domotics/device/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return handleResponse(res);
  },
  async activateScene(id) {
    const res = await fetch(`${BASE_URL}/domotics/scene/${id}/activate`, {
      method: 'POST'
    });
    return handleResponse(res);
  },
  async updateConnector(type, config) {
    const res = await fetch(`${BASE_URL}/domotics/connectors/${type}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return handleResponse(res);
  },
  async syncDevices(connectorType = 'ewelink') {
    const res = await fetch(`${BASE_URL}/domotics/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectorType })
    });
    return readJson(res);
  },

  // DOCUMENTS & WARRANTIES
  async getDocuments() {
    const res = await fetch(`${BASE_URL}/documents`);
    return handleResponse(res);
  },
  async uploadDocument(formData) {
    const res = await fetch(`${BASE_URL}/documents`, {
      method: 'POST',
      body: formData // Multer handles multipart
    });
    return handleResponse(res);
  },
  async updateDocument(id, updates) {
    const res = await fetch(`${BASE_URL}/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return handleResponse(res);
  },
  async deleteDocument(id) {
    const res = await fetch(`${BASE_URL}/documents/${id}`, {
      method: 'DELETE'
    });
    return handleResponse(res);
  },

  // DATABASE & PERSISTENCE
  async getDatabaseStatus() {
    const res = await fetch(`${BASE_URL}/database/status`);
    return handleResponse(res);
  },
  async createDatabaseBackup() {
    const res = await fetch(`${BASE_URL}/database/backup`, {
      method: 'POST'
    });
    return handleResponse(res);
  },
  getDatabaseExportUrl() {
    return `${BASE_URL}/database/export`;
  },

  // APPLE SHORTCUTS & GASTOS PUNTUALES
  async addPunctualExpense(payload) {
    const res = await fetch(`${BASE_URL}/finance/shortcuts/gasto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  async getPunctualExpenses(limit = 50) {
    const res = await fetch(`${BASE_URL}/finance/shortcuts/gastos?limit=${limit}`);
    return handleResponse(res);
  },
  async deletePunctualExpense(id) {
    const res = await fetch(`${BASE_URL}/finance/shortcuts/gasto/${id}`, {
      method: 'DELETE'
    });
    return handleResponse(res);
  },
  async updatePunctualExpense(id, payload) {
    const res = await fetch(`${BASE_URL}/finance/shortcuts/gasto/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  getShortcutsWebhookUrl() {
    return `${window.location.origin}/api/finance/shortcuts/gasto`;
  }
};
