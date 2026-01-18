import { useEffect, useRef, useState } from "react";
import { Clock, MapPin, Expand, Video, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useViewer } from "@/hooks/useViewer";

export interface StreamData {
  id: string;
  isActive: boolean;
  startedAt: Date;
  latitude: number;
  longitude: number;
  notes: string;
}

interface StreamCardLiveProps {
  stream: StreamData;
  duration: number;
  onClick: () => void;
  highlighted?: boolean;
}

export function StreamCardLive({ stream, duration, onClick, highlighted }: StreamCardLiveProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  const { remoteStream, isReceiving, isConnected, error, connect, disconnect } = useViewer({
    streamId: stream.id,
  });

  useEffect(() => {
    connect();
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream.id]);

  // Track connection attempts for UI feedback
  useEffect(() => {
    if (!isReceiving && isConnected) {
      const timer = setInterval(() => {
        setConnectionAttempts(prev => prev + 1);
      }, 3000);
      return () => clearInterval(timer);
    } else if (isReceiving) {
      setConnectionAttempts(0);
    }
  }, [isReceiving, isConnected]);

  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatCoords = (lat: number, lng: number) => {
    if (lat === 0 && lng === 0) return "Acquiring...";
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  // Determine connection status message
  const getConnectionStatus = () => {
    if (error) return { text: "Connection failed", isError: true };
    if (!isConnected) return { text: "Connecting to server...", isError: false };
    if (connectionAttempts > 2) return { text: "Establishing P2P...", isError: false };
    return { text: "Connecting...", isError: false };
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-lg border bg-[hsl(240,15%,6%)] cursor-pointer transition-all duration-300 hover:border-[hsl(350,100%,55%)]/50 hover:shadow-[0_0_40px_-10px_hsl(350,100%,55%)] ${
        highlighted
          ? 'border-[hsl(350,100%,55%)] shadow-[0_0_60px_-10px_hsl(350,100%,55%)] ring-2 ring-[hsl(350,100%,55%)] animate-pulse'
          : 'border-[hsl(220,15%,12%)]'
      }`}
      onClick={onClick}
    >
      {/* Video Preview - Fixed aspect ratio */}
      <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
        <div className="absolute inset-0">
          {isReceiving && remoteStream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-[hsl(240,15%,4%)]">
              {(() => {
                const status = getConnectionStatus();
                return (
                  <div className="text-center px-4">
                    {status.isError ? (
                      <AlertTriangle className="mx-auto h-8 w-8 text-amber-500 mb-2" />
                    ) : (
                      <Loader2 className="mx-auto h-8 w-8 text-[hsl(220,15%,35%)] mb-2 animate-spin" />
                    )}
                    <p className={`text-xs ${status.isError ? 'text-amber-500' : 'text-[hsl(220,15%,40%)]'}`}>
                      {status.text}
                    </p>
                    {connectionAttempts > 3 && !status.isError && (
                      <p className="text-[10px] text-[hsl(220,15%,30%)] mt-1">
                        Network may be slow
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Live badge */}
          <div className="absolute left-2 top-2">
            <Badge className="bg-[hsl(350,100%,55%)] text-white text-[10px] font-bold px-1.5 py-0.5 gap-1 border-0 shadow-[0_0_15px_-3px_hsl(350,100%,55%)]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              LIVE
            </Badge>
          </div>

          {/* Expand overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center bg-[hsl(240,15%,3%)]/70 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="flex items-center gap-2 text-white text-sm font-medium bg-[hsl(350,100%,55%)] px-4 py-2 rounded-lg shadow-[0_0_20px_-5px_hsl(350,100%,55%)]">
              <Expand className="h-4 w-4" />
              <span>Preview</span>
            </div>
          </div>
        </div>
      </div>

      {/* Minimal Info - Only GPS and Notes */}
      <div className="p-2.5 space-y-1.5 border-t border-[hsl(220,15%,10%)]">
        {/* GPS Coordinates */}
        <div className="flex items-center gap-1.5 text-xs text-[hsl(220,15%,55%)]">
          <MapPin className="h-3 w-3 flex-shrink-0 text-[hsl(350,100%,60%)]" />
          <span className="font-mono truncate">{formatCoords(stream.latitude, stream.longitude)}</span>
        </div>

        {/* Notes (only if present) */}
        {stream.notes && (
          <p className="text-xs text-[hsl(220,15%,45%)] line-clamp-1 leading-relaxed">
            {stream.notes}
          </p>
        )}
      </div>
    </div>
  );
}
