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
  isRecording: boolean;
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
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCleanupRef = useRef(false);
  
  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamStartTimeRef = useRef<Date | null>(null);
  const latitudeRef = useRef(latitude);
  const longitudeRef = useRef(longitude);
  const notesRef = useRef(notes);

  // Keep refs updated
  useEffect(() => {
    latitudeRef.current = latitude;
    longitudeRef.current = longitude;
    notesRef.current = notes;
  }, [latitude, longitude, notes]);

  const uploadRecording = useCallback(async () => {
    if (recordedChunksRef.current.length === 0 || !streamStartTimeRef.current) {
      console.log("[Broadcaster] No recording to upload");
      return;
    }

    const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
    const endTime = new Date();
    const durationSeconds = (endTime.getTime() - streamStartTimeRef.current.getTime()) / 1000;

    const formData = new FormData();
    formData.append("stream_id", streamId);
    formData.append("started_at", streamStartTimeRef.current.toISOString());
    formData.append("ended_at", endTime.toISOString());
    formData.append("latitude", String(latitudeRef.current));
    formData.append("longitude", String(longitudeRef.current));
    formData.append("notes", notesRef.current);
    formData.append("duration_seconds", String(durationSeconds));
    formData.append("video", blob, `${streamId}.webm`);

    try {
      const response = await fetch(signalingConfig.uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        console.log("[Broadcaster] Recording uploaded successfully");
      } else {
        console.error("[Broadcaster] Failed to upload recording:", await response.text());
      }
    } catch (err) {
      console.error("[Broadcaster] Error uploading recording:", err);
    }

    // Clear recorded chunks
    recordedChunksRef.current = [];
    streamStartTimeRef.current = null;
  }, [streamId]);

  const startRecording = useCallback(() => {
    if (!mediaStream) return;

    try {
      const options = { mimeType: "video/webm;codecs=vp8,opus" };
      const recorder = new MediaRecorder(mediaStream, options);
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        console.log("[Broadcaster] Recording stopped, uploading...");
        setIsRecording(false);
        uploadRecording();
      };

      recorder.onerror = (event) => {
        console.error("[Broadcaster] MediaRecorder error:", event);
        setIsRecording(false);
      };

      recordedChunksRef.current = [];
      streamStartTimeRef.current = new Date();
      recorder.start(1000); // Record in 1-second chunks
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      console.log("[Broadcaster] Recording started");
    } catch (err) {
      console.error("[Broadcaster] Failed to start recording:", err);
    }
  }, [mediaStream, uploadRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, []);

  const createPeerConnection = useCallback(
    (viewerId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection(rtcConfig);

      // Add media tracks to the connection
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => {
          console.log(`[Broadcaster] Adding track to PC for ${viewerId}:`, track.kind, track.readyState);
          pc.addTrack(track, mediaStream);
        });
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          console.log(`[Broadcaster] Sending ICE candidate to ${viewerId}:`, event.candidate.type || "unknown");
          wsRef.current.send(
            JSON.stringify({
              type: "ice_candidate",
              candidate: event.candidate,
              viewer_id: viewerId,
            })
          );
        }
      };

      // Monitor ICE gathering state
      pc.onicegatheringstatechange = () => {
        console.log(`[Broadcaster] ICE gathering state for ${viewerId}:`, pc.iceGatheringState);
      };

      // Monitor ICE connection state (critical for debugging)
      pc.oniceconnectionstatechange = () => {
        console.log(`[Broadcaster] ICE connection state for ${viewerId}:`, pc.iceConnectionState);
        if (pc.iceConnectionState === "failed") {
          console.error(`[Broadcaster] ICE connection FAILED for ${viewerId} - closing and removing`);
          pc.close();
          peerConnectionsRef.current.delete(viewerId);
        } else if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          console.log(`[Broadcaster] ICE connected successfully for ${viewerId}`);
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`[Broadcaster] Connection state for ${viewerId}:`, pc.connectionState);
        if (pc.connectionState === "failed") {
          console.error(`[Broadcaster] Peer connection FAILED for ${viewerId}`);
          pc.close();
          peerConnectionsRef.current.delete(viewerId);
        }
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
      setError("No stream ID provided");
      return;
    }

    // Close existing connection if any
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      console.log("[Broadcaster] Closing existing connection before starting new one");
      try {
        wsRef.current.close();
      } catch (err) {
        console.error("[Broadcaster] Error closing existing WebSocket:", err);
      }
    }

    try {
      const ws = new WebSocket(signalingConfig.broadcastWs(streamId));
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[Broadcaster] Connected to signaling server");
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Start recording
        startRecording();

        // Register the stream
        try {
          ws.send(
            JSON.stringify({
              type: "start_stream",
              latitude,
              longitude,
              notes,
            })
          );
        } catch (err) {
          console.error("[Broadcaster] Error sending start_stream:", err);
          setError("Failed to register stream");
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleSignalingMessage(message);
        } catch (err) {
          console.error("[Broadcaster] Failed to parse message:", err, "Data:", event.data);
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
        
        // Attempt reconnection if not intentional cleanup
        if (!isCleanupRef.current && reconnectAttemptsRef.current < 5 && mediaStream) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          console.log(`[Broadcaster] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/5)`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            startBroadcast();
          }, delay);
        }
      };
    } catch (err) {
      console.error("[Broadcaster] Failed to create WebSocket:", err);
      setError("Failed to connect to server");
      setIsConnected(false);
    }
  }, [streamId, mediaStream, latitude, longitude, notes, handleSignalingMessage, startRecording]);

  const stopBroadcast = useCallback(() => {
    isCleanupRef.current = true;
    
    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    
    // Stop recording first (this will trigger upload)
    stopRecording();

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch (err) {
        console.error("[Broadcaster] Error closing peer connection:", err);
      }
    });
    peerConnectionsRef.current.clear();

    // Close WebSocket
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "stop_stream" }));
        }
        wsRef.current.close();
      } catch (err) {
        console.error("[Broadcaster] Error closing WebSocket:", err);
      }
      wsRef.current = null;
    }

    setIsBroadcasting(false);
    setIsConnected(false);
    setError(null);
    
    // Reset cleanup flag after a short delay
    setTimeout(() => {
      isCleanupRef.current = false;
    }, 100);
  }, [stopRecording]);

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
    isRecording,
    error,
    startBroadcast,
    stopBroadcast,
    updateLocation,
  };
}
