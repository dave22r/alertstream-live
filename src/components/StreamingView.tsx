import { useEffect, useRef, useState } from "react";
import { MapPin, Clock, Square, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveIndicator } from "@/components/LiveIndicator";

interface StreamingViewProps {
  stream: MediaStream | null;
  location: GeolocationCoordinates | null;
  notes: string;
  onStop: () => void;
  error?: string;
}

export function StreamingView({
  stream,
  location,
  notes,
  onStop,
  error,
}: StreamingViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);

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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative flex h-screen w-full flex-col bg-black">
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
          <LiveIndicator size="lg" />
          <div className="flex items-center gap-2 rounded-full bg-black/80 px-4 py-2 backdrop-blur-sm border border-white/10">
            <Clock className="h-4 w-4 text-white" />
            <span className="font-mono text-sm font-bold text-white">
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="absolute left-4 right-4 top-16 animate-fade-in">
            <div className="flex items-center gap-2 rounded-lg bg-warning px-4 py-3 text-warning-foreground">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">{error}</span>
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
              variant="stop"
              size="xl"
              onClick={onStop}
              className="w-full"
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
