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
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(240,15%,3%)]/80 via-transparent to-[hsl(240,15%,3%)]/90 pointer-events-none" />

        {/* Top bar */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <LiveIndicator size="lg" />
            {isBroadcasting ? (
              <Badge className="bg-[hsl(160,100%,45%)]/20 text-[hsl(160,100%,50%)] border border-[hsl(160,100%,45%)]/40 gap-1.5 backdrop-blur-sm">
                <Wifi className="h-3 w-3" />
                Broadcasting
              </Badge>
            ) : (
              <Badge className="bg-[hsl(35,100%,50%)]/20 text-[hsl(35,100%,55%)] border border-[hsl(35,100%,50%)]/40 gap-1.5 backdrop-blur-sm">
                <WifiOff className="h-3 w-3" />
                Connecting...
              </Badge>
            )}
            {isRecording && (
              <Badge className="bg-[hsl(350,100%,55%)]/20 text-[hsl(350,100%,60%)] border border-[hsl(350,100%,55%)]/40 gap-1.5 backdrop-blur-sm">
                <Circle className="h-2.5 w-2.5 fill-[hsl(350,100%,55%)]" />
                Recording
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[hsl(240,15%,8%)]/90 px-4 py-2 backdrop-blur-md border border-[hsl(220,15%,20%)]/50">
            <Clock className="h-4 w-4 text-[hsl(220,15%,60%)]" />
            <span className="font-mono text-sm font-bold text-white">
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Error banner */}
        {(error || broadcastError) && (
          <div className="absolute left-4 right-4 top-16 animate-fade-in">
            <div className="flex items-center gap-2 rounded-lg bg-[hsl(35,100%,50%)] px-4 py-3 text-black">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">{error || broadcastError}</span>
            </div>
          </div>
        )}

        {/* Bottom info bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-8 animate-fade-in stagger-1">
          <div className="space-y-4">
            {/* Location */}
            {location && (
              <div className="flex items-center gap-2 text-white">
                <MapPin className="h-4 w-4 text-[hsl(350,100%,60%)]" />
                <span className="text-sm font-medium font-mono">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </span>
              </div>
            )}

            {/* Notes */}
            {notes && (
              <div className="rounded-lg bg-[hsl(240,15%,10%)]/80 p-3 backdrop-blur-md border border-[hsl(220,15%,20%)]/50">
                <p className="text-sm text-white">{notes}</p>
              </div>
            )}

            {/* Stop button */}
            <Button
              size="lg"
              onClick={handleStop}
              className="w-full h-14 bg-[hsl(240,15%,12%)] hover:bg-[hsl(240,15%,18%)] text-white font-bold gap-2 border border-[hsl(220,15%,25%)] hover:border-[hsl(350,100%,55%)] transition-all duration-300"
            >
              <Square className="h-5 w-5 fill-current text-[hsl(350,100%,60%)]" />
              End Stream
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
