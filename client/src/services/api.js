const BASE_URL = '/api';

async function handleResponse(response) {
  if (!response.ok) {
    let errorMsg = 'Error en la petición';
    try {
      const errData = await response.json();
      errorMsg = errData.error || errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }
  const json = await response.json();
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
  async syncShoppingList() {
    const res = await fetch(`${BASE_URL}/shopping/sync`, {
      method: 'POST'
    });
    const json = await res.json();
    return json;
  },

  // FINANCE
  async getMonthFinance(monthKey) {
    const res = await fetch(`${BASE_URL}/finance/month/${monthKey}`);
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
    const json = await res.json();
    return json;
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
  }
};
