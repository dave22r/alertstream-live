import { useEffect, useRef } from "react";
import { Clock, MapPin, Expand, Video, AlertTriangle } from "lucide-react";
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
}

export function StreamCardLive({ stream, duration, onClick }: StreamCardLiveProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const { remoteStream, isReceiving, connect, disconnect } = useViewer({
    streamId: stream.id,
  });

  useEffect(() => {
    connect();
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream.id]);

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

  return (
    <div
      className="group relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 cursor-pointer transition-all duration-200 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10"
      onClick={onClick}
    >
      {/* Video Preview */}
      <div className="relative aspect-video bg-black">
        {isReceiving && remoteStream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
            <div className="text-center">
              <Video className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
              <p className="text-xs text-zinc-500">Connecting...</p>
            </div>
          </div>
        )}

        {/* Live badge */}
        <div className="absolute left-2 top-2">
          <Badge className="bg-red-600 text-white text-[10px] font-semibold px-1.5 py-0.5 gap-1 border-0">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            LIVE
          </Badge>
        </div>

        {/* Duration */}
        <div className="absolute right-2 top-2">
          <Badge className="bg-black/70 text-white text-[10px] font-mono px-1.5 py-0.5 border-0 backdrop-blur-sm">
            <Clock className="h-2.5 w-2.5 mr-1" />
            {formatDuration(duration)}
          </Badge>
        </div>

        {/* Expand overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center gap-1.5 text-white text-sm font-medium">
            <Expand className="h-4 w-4" />
            <span>View Full Screen</span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        {/* Stream ID */}
        <div className="flex items-center justify-between">
          <code className="text-[11px] text-zinc-400 font-mono">
            {stream.id.substring(0, 8)}...
          </code>
          {stream.notes && (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          )}
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{formatCoords(stream.latitude, stream.longitude)}</span>
        </div>

        {/* Notes */}
        {stream.notes && (
          <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
            {stream.notes}
          </p>
        )}
      </div>
    </div>
  );
}
