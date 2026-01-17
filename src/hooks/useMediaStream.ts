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

      // Request camera and microphone access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" }, // Prefer rear camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsStreaming(true);
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to access camera/microphone";
      
      if (message.includes("NotAllowedError") || message.includes("Permission denied")) {
        setError("Camera or microphone access was denied. Please allow access and try again.");
      } else if (message.includes("NotFoundError")) {
        setError("No camera or microphone found on this device.");
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
