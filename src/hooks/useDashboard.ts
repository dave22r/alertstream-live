import { useEffect, useState, useRef, useCallback } from "react";
import { signalingConfig } from "@/lib/signalingConfig";

export interface StreamInfo {
  id: string;
  started_at: string;
  latitude: number;
  longitude: number;
  notes: string;
  is_active: boolean;
}

interface UseDashboardReturn {
  streams: StreamInfo[];
  isConnected: boolean;
  error: string | null;
}

export function useDashboard(): UseDashboardReturn {
  const [streams, setStreams] = useState<StreamInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(signalingConfig.dashboardWs);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[Dashboard] Connected to signaling server");
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "stream_list") {
          setStreams(message.streams || []);
        }
      } catch (err) {
        console.error("[Dashboard] Failed to parse message:", err);
      }
    };

    ws.onerror = () => {
      setError("Connection error");
    };

    ws.onclose = () => {
      console.log("[Dashboard] Disconnected, reconnecting...");
      setIsConnected(false);
      // Reconnect after 2 seconds
      reconnectTimeoutRef.current = setTimeout(connect, 2000);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    streams,
    isConnected,
    error,
  };
}
