import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const client = axios.create({ baseURL: API });

export const api = {
  getSuppliers: () => client.get("/suppliers").then((r) => r.data),
  createSupplier: (data) => client.post("/suppliers", data).then((r) => r.data),
  updateSupplier: (id, data) => client.put(`/suppliers/${id}`, data).then((r) => r.data),
  deleteSupplier: (id) => client.delete(`/suppliers/${id}`).then((r) => r.data),

  getTransactions: () => client.get("/transactions").then((r) => r.data),
  getTrash: () => client.get("/transactions/trash").then((r) => r.data),
  createTransaction: (data) => client.post("/transactions", data).then((r) => r.data),
  updateTransaction: (id, data) => client.put(`/transactions/${id}`, data).then((r) => r.data),
  deleteTransaction: (id) => client.delete(`/transactions/${id}`).then((r) => r.data),
  restoreTransaction: (id) => client.post(`/transactions/${id}/restore`).then((r) => r.data),
  permanentDeleteTransaction: (id) => client.delete(`/transactions/${id}/permanent`).then((r) => r.data),

  getSettings: () => client.get("/settings").then((r) => r.data),
  updateSettings: (data) => client.put("/settings", data).then((r) => r.data),

  getSenderAccounts: () => client.get("/sender-accounts").then((r) => r.data),
  createSenderAccount: (data) => client.post("/sender-accounts", data).then((r) => r.data),
  deleteSenderAccount: (id) => client.delete(`/sender-accounts/${id}`).then((r) => r.data),

  getRecommendations: () => client.get("/recommendations").then((r) => r.data),
};

export default client;
