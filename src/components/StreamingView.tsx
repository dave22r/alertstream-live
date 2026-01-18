import { useEffect, useRef, useState } from "react";
import { MapPin, Clock, Square, AlertCircle, Wifi, WifiOff, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveIndicator } from "@/components/LiveIndicator";
import { useBroadcaster } from "@/hooks/useBroadcaster";
import { Badge } from "@/components/ui/badge";

interface StreamingViewProps {
  stream: MediaStream | null;
  streamId: string;
  location: GeolocationCoordinates | null;
  notes: string;
  onStop: () => void;
  error?: string;
}

export function StreamingView({
  stream,
  streamId,
  location,
  notes,
  onStop,
  error,
}: StreamingViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);

  const {
    isBroadcasting,
    isRecording,
    error: broadcastError,
    startBroadcast,
    stopBroadcast,
    updateLocation,
  } = useBroadcaster({
    streamId,
    mediaStream: stream,
    latitude: location?.latitude || 0,
    longitude: location?.longitude || 0,
    notes,
  });

  // Start broadcasting when component mounts
  useEffect(() => {
    if (stream && streamId) {
      startBroadcast();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, streamId]);

  // Update location when it changes
  useEffect(() => {
    if (location && isBroadcasting) {
      updateLocation(location.latitude, location.longitude);
    }
  }, [location, isBroadcasting, updateLocation]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStop = () => {
    stopBroadcast();
    onStop();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // ========== AI SENTRY: Frame Analysis ==========
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isBroadcasting || !videoRef.current || !stream) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    let isCancelled = false;

    const analyzeFrame = async () => {
      if (isCancelled || !videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob || isCancelled) return;

        const formData = new FormData();
        formData.append("stream_id", streamId);
        formData.append("latitude", String(location?.latitude || 0));
        formData.append("longitude", String(location?.longitude || 0));
        formData.append("file", blob, "frame.jpg");

        try {
          const { signalingConfig } = await import("@/lib/signalingConfig");
          await fetch(signalingConfig.analyzeFrameUrl, {
            method: "POST",
            body: formData,
          });
          console.log("[AI Sentry] Frame sent for analysis");
        } catch (err) {
          console.error("[AI Sentry] Failed to send frame:", err);
        }

        if (!isCancelled) {
          // One-time capture only - no repeat
          console.log("[AI Sentry] Frame analysis complete (one-time)");
        }
      }, "image/jpeg", 0.7);
    };

    // Start after 15 seconds
    timeoutId = setTimeout(analyzeFrame, 15000);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [isBroadcasting, stream, streamId, location]);
  // ========== END AI SENTRY ==========

  return (
    <div className="relative flex h-screen w-full flex-col bg-black">
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />
      {/* Video feed - full screen */}
      <div className="relative flex-1">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
        />

        {/* Overlay gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80 pointer-events-none" />

        {/* Top bar */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <LiveIndicator size="lg" />
            {isBroadcasting ? (
              <Badge className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 gap-1">
                <Wifi className="h-3 w-3" />
                Broadcasting
              </Badge>
            ) : (
              <Badge className="bg-amber-600/20 text-amber-400 border border-amber-500/30 gap-1">
                <WifiOff className="h-3 w-3" />
                Connecting...
              </Badge>
            )}
            {isRecording && (
              <Badge className="bg-red-600/20 text-red-400 border border-red-500/30 gap-1">
                <Circle className="h-2.5 w-2.5 fill-red-500" />
                Recording
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 rounded-full bg-black/80 px-4 py-2 backdrop-blur-sm border border-white/10">
            <Clock className="h-4 w-4 text-white" />
            <span className="font-mono text-sm font-bold text-white">
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Error banner */}
        {(error || broadcastError) && (
          <div className="absolute left-4 right-4 top-16 animate-fade-in">
            <div className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-3 text-white">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">{error || broadcastError}</span>
            </div>
          </div>
        )}

        {/* Bottom info bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-8">
          <div className="space-y-4">
            {/* Location */}
            {location && (
              <div className="flex items-center gap-2 text-white">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </span>
              </div>
            )}

            {/* Notes */}
            {notes && (
              <div className="rounded-lg bg-white/10 p-3 backdrop-blur-sm border border-white/10">
                <p className="text-sm text-white">{notes}</p>
              </div>
            )}

            {/* Stop button */}
            <Button
              size="lg"
              onClick={handleStop}
              className="w-full h-14 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold gap-2 border border-zinc-600"
            >
              <Square className="h-5 w-5 fill-current" />
              End Stream
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
