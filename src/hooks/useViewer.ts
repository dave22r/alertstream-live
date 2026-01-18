import { useCallback, useRef, useState, useEffect } from "react";
import { signalingConfig, rtcConfig } from "@/lib/signalingConfig";

interface UseViewerOptions {
  streamId: string;
  onStreamReady?: (stream: MediaStream) => void;
  onStreamEnded?: () => void;
}

interface UseViewerReturn {
  isConnected: boolean;
  isReceiving: boolean;
  remoteStream: MediaStream | null;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
}

export function useViewer({
  streamId,
  onStreamReady,
  onStreamEnded,
}: UseViewerOptions): UseViewerReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCleanupRef = useRef(false);

  const handleSignalingMessage = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (message: any) => {
      switch (message.type) {
        case "offer":
          console.log("[Viewer] Received offer");
          if (!pcRef.current) {
            const pc = new RTCPeerConnection(rtcConfig);
            pcRef.current = pc;

            // Handle incoming tracks
            pc.ontrack = (event) => {
              console.log("[Viewer] Received track:", event.track.kind);
              const stream = event.streams[0];
              if (stream) {
                setRemoteStream(stream);
                setIsReceiving(true);
                onStreamReady?.(stream);
              }
            };

            // Handle ICE candidates
            pc.onicecandidate = (event) => {
              if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(
                  JSON.stringify({
                    type: "ice_candidate",
                    candidate: event.candidate,
                  })
                );
              }
            };

            pc.onconnectionstatechange = () => {
              console.log("[Viewer] Connection state:", pc.connectionState);
              if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
                setIsReceiving(false);
              }
            };
          }

          try {
            await pcRef.current!.setRemoteDescription(new RTCSessionDescription(message.sdp));
            const answer = await pcRef.current!.createAnswer();
            await pcRef.current!.setLocalDescription(answer);

            wsRef.current?.send(
              JSON.stringify({
                type: "answer",
                sdp: pcRef.current!.localDescription,
              })
            );
          } catch (err) {
            console.error("[Viewer] Failed to handle offer:", err);
            setError("Failed to establish connection");
          }
          break;

        case "ice_candidate":
          if (pcRef.current && message.candidate) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(message.candidate));
            } catch (err) {
              console.error("[Viewer] Failed to add ICE candidate:", err);
            }
          }
          break;

        case "stream_ended":
          console.log("[Viewer] Stream ended");
          setIsReceiving(false);
          setRemoteStream(null);
          onStreamEnded?.();
          break;

        case "error":
          console.error("[Viewer] Error:", message.message);
          setError(message.message);
          break;
      }
    },
    [onStreamReady, onStreamEnded]
  );

  const connect = useCallback(() => {
    if (!streamId) {
      setError("No stream ID provided");
      return;
    }

    // Close existing connections if any
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      console.log("[Viewer] Closing existing connection before connecting");
      try {
        wsRef.current.close();
      } catch (err) {
        console.error("[Viewer] Error closing existing WebSocket:", err);
      }
    }

    try {
      const ws = new WebSocket(signalingConfig.viewWs(streamId));
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[Viewer] Connected to signaling server");
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleSignalingMessage(message);
        } catch (err) {
          console.error("[Viewer] Failed to parse message:", err, "Data:", event.data);
        }
      };

      ws.onerror = (event) => {
        console.error("[Viewer] WebSocket error:", event);
        setError("Connection error");
      };

      ws.onclose = () => {
        console.log("[Viewer] Disconnected from signaling server");
        setIsConnected(false);
        setIsReceiving(false);
        
        // Attempt reconnection if not intentional cleanup
        if (!isCleanupRef.current && reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          console.log(`[Viewer] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/5)`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= 5) {
          setError("Connection failed after multiple attempts");
          onStreamEnded?.();
        }
      };
    } catch (err) {
      console.error("[Viewer] Failed to create WebSocket:", err);
      setError("Failed to connect to server");
      setIsConnected(false);
    }
  }, [streamId, handleSignalingMessage, onStreamEnded]);

  const disconnect = useCallback(() => {
    isCleanupRef.current = true;
    
    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = 0;

    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (err) {
        console.error("[Viewer] Error closing peer connection:", err);
      }
      pcRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (err) {
        console.error("[Viewer] Error closing WebSocket:", err);
      }
      wsRef.current = null;
    }

    setRemoteStream(null);
    setIsReceiving(false);
    setIsConnected(false);
    setError(null);
    
    // Reset cleanup flag after a short delay
    setTimeout(() => {
      isCleanupRef.current = false;
    }, 100);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isReceiving,
    remoteStream,
    error,
    connect,
    disconnect,
  };
}
