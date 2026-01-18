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

export interface ThreatAlert {
  stream_id: string;
  latitude: number;
  longitude: number;
  threat_type: string;
  timestamp: string;
}

interface UseDashboardOptions {
  onAlert?: (alert: ThreatAlert) => void;
}

interface UseDashboardReturn {
  streams: StreamInfo[];
  pastStreams: PastStreamInfo[];
  isConnected: boolean;
  error: string | null;
  deletePastStream: (streamId: string) => Promise<void>;
}

export function useDashboard(options?: UseDashboardOptions): UseDashboardReturn {
  const { onAlert } = options || {};
  const [streams, setStreams] = useState<StreamInfo[]>([]);
  const [pastStreams, setPastStreams] = useState<PastStreamInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onAlertRef = useRef(onAlert);
  
  // Keep ref updated
  useEffect(() => {
    onAlertRef.current = onAlert;
  }, [onAlert]);

  const connect = useCallback(() => {
    // Don't create new connection if already open or connecting
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
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
            // Handle threat alert from AI Sentry
            if (onAlertRef.current) {
              onAlertRef.current({
                stream_id: message.stream_id,
                latitude: message.latitude,
                longitude: message.longitude,
                threat_type: message.threat_type,
                timestamp: message.timestamp,
              });
            }
          }
        } catch (err) {
          console.error("[Dashboard] Failed to parse message:", err, "Data:", event.data);
        }
      };

      ws.onerror = (event) => {
        console.error("[Dashboard] WebSocket error:", event);
        setError("Connection error");
      };

      ws.onclose = () => {
        console.log("[Dashboard] Disconnected, reconnecting in 2s...");
        setIsConnected(false);
        // Reconnect after 2 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 2000);
      };
    } catch (err) {
      console.error("[Dashboard] Failed to create WebSocket:", err);
      setError("Failed to connect to server");
      // Retry connection
      reconnectTimeoutRef.current = setTimeout(connect, 2000);
    }
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

  return {
    streams,
    pastStreams,
    isConnected,
    error,
    deletePastStream,
  };
}
