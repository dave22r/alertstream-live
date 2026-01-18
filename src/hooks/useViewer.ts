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
  const iceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear ICE/connection timeouts
  const clearConnectionTimeouts = useCallback(() => {
    if (iceTimeoutRef.current) {
      clearTimeout(iceTimeoutRef.current);
      iceTimeoutRef.current = null;
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, []);

  const handleSignalingMessage = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (message: any) => {
      switch (message.type) {
        case "offer":
          console.log("[Viewer] Received offer from broadcaster");
          
          // Close existing peer connection if any
          if (pcRef.current) {
            try {
              pcRef.current.close();
            } catch (e) {
              console.error("[Viewer] Error closing existing PC:", e);
            }
            pcRef.current = null;
          }
          
          const pc = new RTCPeerConnection(rtcConfig);
          pcRef.current = pc;

          // Handle incoming tracks
          pc.ontrack = (event) => {
            console.log("[Viewer] Received track:", event.track.kind, "readyState:", event.track.readyState);
            const stream = event.streams[0];
            if (stream) {
              console.log("[Viewer] Stream received with", stream.getTracks().length, "tracks");
              setRemoteStream(stream);
              setIsReceiving(true);
              clearConnectionTimeouts();
              onStreamReady?.(stream);
            }
          };

          // Handle ICE candidates
          pc.onicecandidate = (event) => {
            if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
              console.log("[Viewer] Sending ICE candidate:", event.candidate.type || "unknown");
              wsRef.current.send(
                JSON.stringify({
                  type: "ice_candidate",
                  candidate: event.candidate,
                })
              );
            }
          };

          // Monitor ICE gathering state
          pc.onicegatheringstatechange = () => {
            console.log("[Viewer] ICE gathering state:", pc.iceGatheringState);
          };

          // Monitor ICE connection state (critical for detecting failures)
          pc.oniceconnectionstatechange = () => {
            console.log("[Viewer] ICE connection state:", pc.iceConnectionState);
            
            if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
              console.log("[Viewer] ICE connection established successfully");
              clearConnectionTimeouts();
              setError(null);
            } else if (pc.iceConnectionState === "failed") {
              console.error("[Viewer] ICE connection FAILED - likely NAT/firewall issue");
              setError("Connection failed - network may be blocking video");
              setIsReceiving(false);
              // Trigger reconnection
              if (!isCleanupRef.current && reconnectAttemptsRef.current < 3) {
                reconnectAttemptsRef.current++;
                console.log("[Viewer] Attempting ICE restart...");
                // Close and reconnect via WebSocket
                wsRef.current?.close();
              }
            } else if (pc.iceConnectionState === "disconnected") {
              console.warn("[Viewer] ICE connection disconnected, waiting for recovery...");
              // Give it 5 seconds to recover before marking as failed
              iceTimeoutRef.current = setTimeout(() => {
                if (pcRef.current?.iceConnectionState === "disconnected") {
                  console.error("[Viewer] ICE connection did not recover");
                  setIsReceiving(false);
                }
              }, 5000);
            }
          };

          pc.onconnectionstatechange = () => {
            console.log("[Viewer] Connection state:", pc.connectionState);
            if (pc.connectionState === "connected") {
              setError(null);
            } else if (pc.connectionState === "failed") {
              console.error("[Viewer] Peer connection FAILED");
              setIsReceiving(false);
              setError("Stream connection failed");
            }
          };

          try {
            await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            wsRef.current?.send(
              JSON.stringify({
                type: "answer",
                sdp: pc.localDescription,
              })
            );
            console.log("[Viewer] Answer sent, waiting for ICE connection...");
            
            // Set a connection timeout - if no stream in 15s, something is wrong
            connectionTimeoutRef.current = setTimeout(() => {
              if (!isCleanupRef.current && !remoteStream) {
                console.error("[Viewer] Connection timeout - no stream received in 15s");
                setError("Connection timeout - trying again...");
                // Trigger reconnection
                if (reconnectAttemptsRef.current < 3) {
                  wsRef.current?.close();
                }
              }
            }, 15000);
            
          } catch (err) {
            console.error("[Viewer] Failed to handle offer:", err);
            setError("Failed to establish connection");
          }
          break;

        case "ice_candidate":
          if (pcRef.current && message.candidate) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(message.candidate));
              console.log("[Viewer] Added remote ICE candidate");
            } catch (err) {
              // Ignore errors for candidates that arrive after connection is established
              if (pcRef.current.iceConnectionState !== "connected" && 
                  pcRef.current.iceConnectionState !== "completed") {
                console.error("[Viewer] Failed to add ICE candidate:", err);
              }
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
    
    // Clear ICE/connection timeouts
    clearConnectionTimeouts();

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
