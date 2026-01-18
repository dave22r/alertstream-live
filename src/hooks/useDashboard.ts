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

export interface PastStreamInfo {
  id: string;
  started_at: string;
  ended_at: string;
  latitude: number;
  longitude: number;
  notes: string;
  duration_seconds: number;
  video_filename: string;
  video_url: string;
}

export interface AlertInfo {
  type: "alert";
  stream_id: string;
  latitude: number;
  longitude: number;
  message: string;
  timestamp: string;
}

interface UseDashboardReturn {
  streams: StreamInfo[];
  pastStreams: PastStreamInfo[];
  isConnected: boolean;
  error: string | null;
  deletePastStream: (streamId: string) => Promise<void>;
  lastAlert: AlertInfo | null;
  clearAlert: () => void;
}

export function useDashboard(): UseDashboardReturn {
  const [streams, setStreams] = useState<StreamInfo[]>([]);
  const [pastStreams, setPastStreams] = useState<PastStreamInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAlert, setLastAlert] = useState<AlertInfo | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          setPastStreams(message.past_streams || []);
        } else if (message.type === "alert") {
          console.log("[Dashboard] Received Alert:", message);
          setLastAlert(message as AlertInfo);
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

  const deletePastStream = useCallback(async (streamId: string) => {
    try {
      const response = await fetch(`${signalingConfig.pastStreamsUrl}/${streamId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete stream");
      }
    } catch (err) {
      console.error("[Dashboard] Failed to delete past stream:", err);
      throw err;
    }
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

  const clearAlert = useCallback(() => {
    setLastAlert(null);
  }, []);

  return {
    streams,
    pastStreams,
    isConnected,
    error,
    deletePastStream,
    lastAlert,
    clearAlert,
  };
}
