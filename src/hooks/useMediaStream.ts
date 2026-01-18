import { useState, useCallback, useRef } from "react";

interface UseMediaStreamReturn {
  stream: MediaStream | null;
  isStreaming: boolean;
  error: string | null;
  startStream: () => Promise<boolean>;
  stopStream: () => void;
}

export function useMediaStream(): UseMediaStreamReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startStream = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);

      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser doesn't support media access");
      }

      // Request camera and microphone access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" }, // Prefer rear camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Verify we got both video and audio
      const videoTracks = mediaStream.getVideoTracks();
      const audioTracks = mediaStream.getAudioTracks();
      
      if (videoTracks.length === 0) {
        mediaStream.getTracks().forEach(track => track.stop());
        throw new Error("No video track available");
      }

      console.log("[MediaStream] Started:", {
        video: videoTracks.length > 0 ? videoTracks[0].label : "none",
        audio: audioTracks.length > 0 ? audioTracks[0].label : "none"
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsStreaming(true);
      return true;
    } catch (err) {
      console.error("[MediaStream] Error:", err);
      const message = err instanceof Error ? err.message : "Failed to access camera/microphone";
      
      if (message.includes("NotAllowedError") || message.includes("Permission denied") || message.includes("denied")) {
        setError("Camera or microphone access was denied. Please allow access and try again.");
      } else if (message.includes("NotFoundError") || message.includes("not found")) {
        setError("No camera or microphone found on this device.");
      } else if (message.includes("NotReadableError") || message.includes("Could not start")) {
        setError("Camera is already in use by another application.");
      } else {
        setError(message);
      }
      
      setIsStreaming(false);
      return false;
    }
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    setStream(null);
    setIsStreaming(false);
    setError(null);
  }, []);

  return {
    stream,
    isStreaming,
    error,
    startStream,
    stopStream,
  };
}
