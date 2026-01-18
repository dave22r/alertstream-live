import { useState } from "react";
import { MapPin, Video, Clock, Navigation, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InteractiveStreamMap } from "@/components/InteractiveStreamMap";
import type { StreamData } from "@/components/StreamCardLive";

interface StreamMapViewProps {
  streams: StreamData[];
  durations: Record<string, number>;
  onStreamClick: (stream: StreamData) => void;
}

export function StreamMapView({ streams, durations, onStreamClick }: StreamMapViewProps) {
  const [selectedStream, setSelectedStream] = useState<StreamData | null>(null);
  const [hoveredStream, setHoveredStream] = useState<string | null>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (streams.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800">
            <MapPin className="h-7 w-7 text-zinc-600" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-300">No Streams to Display</h3>
          <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed">
            Active streams with location data will appear on this map
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900">
      <div className="grid lg:grid-cols-[1fr_320px]">
        {/* Interactive Map Section */}
        <InteractiveStreamMap
          streams={streams}
          durations={durations}
          onStreamClick={onStreamClick}
        />
        
        {/* Stream List Sidebar */}
        <div className="border-l border-zinc-800 bg-zinc-950">
          <div className="p-3 border-b border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-200">Active Streams</h3>
            <p className="text-xs text-zinc-500">Click to locate on map</p>
          </div>
          <ScrollArea className="h-[440px]">
            <div className="p-2 space-y-2">
              {streams.map((stream) => {
                const hasLocation = stream.latitude !== 0 || stream.longitude !== 0;
                const isSelected = selectedStream?.id === stream.id;
                
                return (
                  <Card
                    key={stream.id}
                    className={`cursor-pointer transition-all ${
                      isSelected 
                        ? "bg-zinc-800 border-red-500/50" 
                        : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50"
                    }`}
                    onClick={() => setSelectedStream(isSelected ? null : stream)}
                    onMouseEnter={() => setHoveredStream(stream.id)}
                    onMouseLeave={() => setHoveredStream(null)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${
                          isSelected 
                            ? "bg-red-600/30 border border-red-500/50" 
                            : "bg-zinc-800 border border-zinc-700"
                        }`}>
                          <Video className={`h-5 w-5 ${isSelected ? "text-red-400" : "text-zinc-400"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-red-600/20 text-red-400 text-[10px] px-1.5 py-0.5 border border-red-500/20">
                              LIVE
                            </Badge>
                            <span className="text-xs font-mono text-zinc-500 truncate">
                              {stream.id.substring(0, 8)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-500">
                            <Clock className="h-3 w-3" />
                            <span className="font-mono">{formatDuration(durations[stream.id] || 0)}</span>
                          </div>
                          {hasLocation ? (
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-600">
                              <MapPin className="h-3 w-3" />
                              <span className="font-mono truncate">
                                {stream.latitude.toFixed(2)}, {stream.longitude.toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-600">
                              <Navigation className="h-3 w-3 animate-pulse" />
                              <span>Acquiring location...</span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-600 hover:text-white shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStreamClick(stream);
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
