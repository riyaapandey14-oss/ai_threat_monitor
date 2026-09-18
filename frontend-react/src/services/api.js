import axios from "axios";

// Vite dev-server proxies /api -> http://127.0.0.1:8000/api (see vite.config.js),
// so a relative base URL works both in dev and if later served behind the
// same origin as the backend.
const api = axios.create({ baseURL: "/api", timeout: 15000 });

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
