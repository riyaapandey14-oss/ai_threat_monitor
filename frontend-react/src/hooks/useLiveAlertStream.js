import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Connects to the backend's live alert WebSocket on demand (start/stop),
 * proxied through Vite dev server at /ws/alerts -> backend ws://.../ws/alerts.
 */
export function useLiveAlertStream(onEvent) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  const start = useCallback(() => {
    if (wsRef.current) return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/ws/alerts`);
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (msg) => {
      try {
        onEvent(JSON.parse(msg.data));
      } catch (e) {
        // ignore malformed frames
      }
    };
    wsRef.current = ws;
  }, [onEvent]);

  const stop = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { connected, start, stop };
}
