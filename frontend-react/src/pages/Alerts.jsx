import { useEffect, useState } from "react";
import AlertTable from "../components/AlertTable";
import AlertDetailModal from "../components/AlertDetailModal";
import { LoadingState, ErrorState, Panel } from "../components/ui";
import { getAlerts, confirmResponse } from "../services/api";

export default function Alerts() {
  const [alerts, setAlerts] = useState(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = () => {
    getAlerts({ limit: 1000 })
      .then((data) => {
        setAlerts(data);
        setError(false);
      })
      .catch(() => setError(true));
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  const handleConfirm = async (id) => {
    await confirmResponse(id);
    load();
    setSelected((prev) => (prev ? { ...prev, confirmed: true, response_status: "confirmed_simulated" } : prev));
  };

  if (error) return <ErrorState message="Could not load alerts from the backend." />;
  if (!alerts) return <LoadingState label="Loading alerts..." />;

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-slate-100">Alerts</h1>
      <Panel>
        <AlertTable alerts={alerts} onSelect={setSelected} />
      </Panel>
      <AlertDetailModal alert={selected} onClose={() => setSelected(null)} onConfirm={handleConfirm} />
    </div>
  );
}
