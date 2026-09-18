import axios from "axios";

const api = axios.create({
  baseURL: "https://backend-h5ht222gj-riyaapandey14-4107s-projects.vercel.app/api",
  timeout: 15000,
});

export const getHealth = () => api.get("/health").then((r) => r.data);
export const getAlerts = (params = {}) => api.get("/alerts", { params }).then((r) => r.data);
export const getAlert = (id) => api.get(`/alerts/${id}`).then((r) => r.data);
export const getExplainability = (id) => api.get(`/explainability/${id}`).then((r) => r.data);
export const getThreatSummary = () => api.get("/threat-summary").then((r) => r.data);
export const getEntities = () => api.get("/entities").then((r) => r.data);
export const getEntity = (id) => api.get(`/entities/${id}`).then((r) => r.data);
export const getMetrics = () => api.get("/metrics").then((r) => r.data);
export const runDetection = (n_events = 300) =>
  api.post("/run-detection", { n_events }).then((r) => r.data);
export const confirmResponse = (id) =>
  api.post(`/response/${id}/confirm`).then((r) => r.data);

export default api;
