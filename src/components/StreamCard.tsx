import { Clock, MapPin, Radio, Maximize2 } from "lucide-react";
import { LiveIndicator } from "@/components/LiveIndicator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StreamData {
  id: string;
  isActive: boolean;
  startedAt: Date;
  latitude: number;
  longitude: number;
  notes: string;
}

interface StreamCardProps {
  stream: StreamData;
  duration: number;
  onClick: () => void;
}

export function StreamCard({ stream, duration, onClick }: StreamCardProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card
      className="overflow-hidden border-0 bg-foreground/5 cursor-pointer transition-all hover:bg-foreground/10 hover:scale-[1.02] group"
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Video placeholder */}
        <div className="relative aspect-video bg-foreground/10">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emergency/20 animate-emergency-pulse">
              <Radio className="h-6 w-6 text-emergency" />
            </div>
          </div>

          {/* Overlay elements */}
          <div className="absolute left-2 top-2">
            <LiveIndicator size="sm" />
          </div>

          <div className="absolute right-2 top-2">
            <Badge variant="secondary" className="bg-foreground/80 text-background gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {formatDuration(duration)}
            </Badge>
          </div>

          {/* Expand icon on hover */}
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>

        {/* Metadata */}
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs text-primary-foreground/60">{stream.id}</p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-primary-foreground/60">
            <MapPin className="h-3 w-3" />
            <span className="truncate">
              {stream.latitude.toFixed(4)}, {stream.longitude.toFixed(4)}
            </span>
          </div>

          {stream.notes && (
            <p className="text-xs text-primary-foreground/80 line-clamp-2">
              {stream.notes}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
