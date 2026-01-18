import { useState } from "react";
import { MapPin, Video, Clock, Maximize2, Navigation, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { StreamData } from "@/components/StreamCardLive";

interface StreamMapViewProps {
  streams: StreamData[];
  durations: Record<string, number>;
  onStreamClick: (stream: StreamData) => void;
}

// Calculate map center
function calculateCenter(streams: StreamData[]) {
  const validStreams = streams.filter(s => s.latitude !== 0 || s.longitude !== 0);
  
  if (validStreams.length === 0) {
    return { lat: 39.8283, lng: -98.5795, zoom: 4 }; // US center
  }
  
  if (validStreams.length === 1) {
    return { lat: validStreams[0].latitude, lng: validStreams[0].longitude, zoom: 14 };
  }
  
  const lats = validStreams.map(s => s.latitude);
  const lngs = validStreams.map(s => s.longitude);
  
  const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  
  const latSpan = Math.max(...lats) - Math.min(...lats);
  const lngSpan = Math.max(...lngs) - Math.min(...lngs);
  const maxSpan = Math.max(latSpan, lngSpan);
  
  let zoom = 12;
  if (maxSpan > 10) zoom = 5;
  else if (maxSpan > 5) zoom = 7;
  else if (maxSpan > 1) zoom = 9;
  else if (maxSpan > 0.5) zoom = 10;
  else if (maxSpan > 0.1) zoom = 12;
  else zoom = 14;
  
  return { lat, lng, zoom };
}

export function StreamMapView({ streams, durations, onStreamClick }: StreamMapViewProps) {
  const [selectedStream, setSelectedStream] = useState<StreamData | null>(null);
  const [hoveredStream, setHoveredStream] = useState<string | null>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const validStreams = streams.filter(s => s.latitude !== 0 || s.longitude !== 0);
  const { lat: centerLat, lng: centerLng, zoom } = calculateCenter(streams);

  // Build static map URL with markers
  const buildMapUrl = (width: number, height: number) => {
    const baseUrl = "https://static-maps.yandex.ru/1.x/";
    const params = new URLSearchParams({
      ll: `${centerLng},${centerLat}`,
      z: String(zoom),
      l: "map",
      size: `${width},${height}`,
    });
    
    if (validStreams.length > 0) {
      // Use red markers for all streams, white for selected
      const pts = validStreams.map(s => {
        const color = (selectedStream?.id === s.id || hoveredStream === s.id) ? "wt" : "rd";
        return `${s.longitude},${s.latitude},pm2${color}l`;
      }).join("~");
      params.set("pt", pts);
    }
    
    return `${baseUrl}?${params.toString()}`;
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
        {/* Map Section */}
        <div className="relative min-h-[500px] bg-zinc-800">
          {/* Map image */}
          <img
            src={buildMapUrl(650, 450)}
            alt="Stream locations map"
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.85) contrast(1.1) saturate(0.9)" }}
          />
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/50 via-transparent to-zinc-900/30 pointer-events-none" />
          
          {/* Selected stream details overlay */}
          {selectedStream && (
            <div className="absolute bottom-4 left-4 right-4 lg:right-auto lg:max-w-sm">
              <Card className="bg-zinc-900/95 backdrop-blur border-zinc-700 shadow-2xl">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-600/20 border border-red-500/30 shrink-0">
                      <Video className="h-6 w-6 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 gap-1 border-0">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                          </span>
                          LIVE
                        </Badge>
                        <span className="text-xs font-mono text-zinc-400">
                          {selectedStream.id.substring(0, 8)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-400 mb-3">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(durations[selectedStream.id] || 0)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Navigation className="h-3 w-3" />
                          {selectedStream.latitude.toFixed(4)}, {selectedStream.longitude.toFixed(4)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="w-full h-9 bg-red-600 hover:bg-red-700 text-white gap-2"
                        onClick={() => onStreamClick(selectedStream)}
                      >
                        <Maximize2 className="h-4 w-4" />
                        Open Stream
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Legend */}
          <div className="absolute top-4 left-4 bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 rounded-lg px-3 py-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-xs text-zinc-400">Live Stream</span>
              </div>
              <span className="text-xs text-zinc-600">|</span>
              <span className="text-xs font-medium text-zinc-300">
                {validStreams.length} active
              </span>
            </div>
          </div>
          
          {/* Streams without location */}
          {streams.length > validStreams.length && (
            <div className="absolute top-4 right-4 bg-amber-900/90 backdrop-blur-sm border border-amber-700/50 rounded-lg px-3 py-2">
              <span className="text-xs text-amber-300">
                {streams.length - validStreams.length} acquiring location...
              </span>
            </div>
          )}
        </div>
        
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
