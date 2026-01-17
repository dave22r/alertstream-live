import { Clock, MapPin, Radio, Maximize2 } from "lucide-react";
import { LiveIndicator } from "@/components/LiveIndicator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
      className="overflow-hidden border border-border/20 bg-card cursor-pointer transition-all hover:bg-card/90 hover:scale-[1.02] hover:border-emergency/30 group"
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Video placeholder */}
        <div className="relative aspect-video bg-muted">
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
            <Badge className="bg-foreground text-background gap-1 text-xs font-mono">
              <Clock className="h-3 w-3" />
              {formatDuration(duration)}
            </Badge>
          </div>

          {/* Expand icon on hover */}
          <div className="absolute inset-0 flex items-center justify-center bg-primary/60 opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>

        {/* Metadata */}
        <div className="p-3 space-y-2 bg-card">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs font-medium text-card-foreground">{stream.id}</p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">
              {stream.latitude.toFixed(4)}, {stream.longitude.toFixed(4)}
            </span>
          </div>

          {stream.notes && (
            <p className="text-xs text-card-foreground/80 line-clamp-2">
              {stream.notes}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
