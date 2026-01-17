import { useCallback, useRef, useState, useEffect } from "react";
import { signalingConfig, rtcConfig } from "@/lib/signalingConfig";

interface UseBroadcasterOptions {
  streamId: string;
  mediaStream: MediaStream | null;
  latitude: number;
  longitude: number;
  notes: string;
}

interface UseBroadcasterReturn {
  isConnected: boolean;
  isBroadcasting: boolean;
  error: string | null;
  startBroadcast: () => void;
  stopBroadcast: () => void;
  updateLocation: (lat: number, lng: number) => void;
}

export function useBroadcaster({
  streamId,
  mediaStream,
  latitude,
  longitude,
  notes,
}: UseBroadcasterOptions): UseBroadcasterReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const createPeerConnection = useCallback(
    (viewerId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection(rtcConfig);

      // Add media tracks to the connection
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => {
          pc.addTrack(track, mediaStream);
        });
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "ice_candidate",
              candidate: event.candidate,
              viewer_id: viewerId,
            })
          );
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`[Broadcaster] Connection state for ${viewerId}:`, pc.connectionState);
      };

      peerConnectionsRef.current.set(viewerId, pc);
      return pc;
    },
    [mediaStream]
  );

  const handleSignalingMessage = useCallback(
    async (message: Record<string, unknown>) => {
      switch (message.type) {
        case "stream_started":
          console.log("[Broadcaster] Stream registered:", message.stream_id);
          setIsBroadcasting(true);
          break;

        case "viewer_joined": {
          console.log("[Broadcaster] Viewer joined:", message.viewer_id);
          const viewerId = String(message.viewer_id);
          const pc = createPeerConnection(viewerId);

          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            wsRef.current?.send(
              JSON.stringify({
                type: "offer",
                sdp: pc.localDescription,
                viewer_id: viewerId,
              })
            );
          } catch (err) {
            console.error("[Broadcaster] Failed to create offer:", err);
          }
          break;
        }

        case "answer": {
          console.log("[Broadcaster] Received answer from viewer:", message.viewer_id);
          const answerViewerId = String(message.viewer_id);
          const answerPc = peerConnectionsRef.current.get(answerViewerId);
          if (answerPc && message.sdp) {
            try {
              await answerPc.setRemoteDescription(new RTCSessionDescription(message.sdp as RTCSessionDescriptionInit));
            } catch (err) {
              console.error("[Broadcaster] Failed to set remote description:", err);
            }
          }
          break;
        }

        case "ice_candidate": {
          const icePc = peerConnectionsRef.current.get(String(message.viewer_id));
          if (icePc && message.candidate) {
            try {
              await icePc.addIceCandidate(new RTCIceCandidate(message.candidate as RTCIceCandidateInit));
            } catch (err) {
              console.error("[Broadcaster] Failed to add ICE candidate:", err);
            }
          }
          break;
        }
      }
    },
    [createPeerConnection]
  );

  const startBroadcast = useCallback(() => {
    if (!mediaStream) {
      setError("No media stream available");
      return;
    }

    if (!streamId) {
      // No stream ID provided, skip connecting
      return;
    }

    const ws = new WebSocket(signalingConfig.broadcastWs(streamId));
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[Broadcaster] Connected to signaling server");
      setIsConnected(true);
      setError(null);

      // Register the stream
      ws.send(
        JSON.stringify({
          type: "start_stream",
          latitude,
          longitude,
          notes,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleSignalingMessage(message);
      } catch (err) {
        console.error("[Broadcaster] Failed to parse message:", err);
      }
    };

    ws.onerror = (event) => {
      console.error("[Broadcaster] WebSocket error:", event);
      setError("Connection error");
    };

    ws.onclose = () => {
      console.log("[Broadcaster] Disconnected from signaling server");
      setIsConnected(false);
      setIsBroadcasting(false);
    };
  }, [streamId, mediaStream, latitude, longitude, notes, handleSignalingMessage]);

  const stopBroadcast = useCallback(() => {
    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "stop_stream" }));
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsBroadcasting(false);
    setIsConnected(false);
  }, []);

  const updateLocation = useCallback((lat: number, lng: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "update_location",
          latitude: lat,
          longitude: lng,
        })
      );
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBroadcast();
    };
  }, [stopBroadcast]);

  return {
    isConnected,
    isBroadcasting,
    error,
    startBroadcast,
    stopBroadcast,
    updateLocation,
  };
}
