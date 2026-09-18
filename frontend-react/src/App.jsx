import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Dashboard from "./pages/Dashboard";
import LiveMonitoring from "./pages/LiveMonitoring";
import Alerts from "./pages/Alerts";
import Entities from "./pages/Entities";
import ThreatAnalytics from "./pages/ThreatAnalytics";
import ExplainableAI from "./pages/ExplainableAI";
import ResponseCenter from "./pages/ResponseCenter";
import ModelPerformance from "./pages/ModelPerformance";
import ResearchInnovation from "./pages/ResearchInnovation";
import About from "./pages/About";

export default function App() {
  const [streaming, setStreaming] = useState(false);

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-[#0b1120] text-slate-100">
        <Sidebar />
        <div className="flex-1 min-w-0">
          <TopBar streaming={streaming} />
          <main className="p-6 max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route
                path="/live"
                element={<LiveMonitoringWrapper setStreaming={setStreaming} />}
              />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/entities" element={<Entities />} />
              <Route path="/analytics" element={<ThreatAnalytics />} />
              <Route path="/explainability" element={<ExplainableAI />} />
              <Route path="/response" element={<ResponseCenter />} />
              <Route path="/performance" element={<ModelPerformance />} />
              <Route path="/research" element={<ResearchInnovation />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

// Small wrapper so the top bar's "Streaming" indicator reflects the Live
// Monitoring page's connection state without lifting all state to App.
function LiveMonitoringWrapper({ setStreaming }) {
  return <LiveMonitoring onStreamingChange={setStreaming} />;
}
