import { useEffect, useRef, useState } from "react";
import { Video, Clock, Maximize2, MapPin, Navigation, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StreamData } from "@/components/StreamCardLive";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface InteractiveStreamMapProps {
  streams: StreamData[];
  durations: Record<string, number>;
  onStreamClick: (stream: StreamData) => void;
  focusLocation?: { lat: number; lng: number } | null;
}

export function InteractiveStreamMap({ streams, durations, onStreamClick, focusLocation }: InteractiveStreamMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [selectedStream, setSelectedStream] = useState<StreamData | null>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const validStreams = streams.filter(s => s.latitude !== 0 || s.longitude !== 0);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    // Create map
    const map = L.map(mapRef.current, {
      center: [39.8283, -98.5795],
      zoom: 4,
      zoomControl: true,
      scrollWheelZoom: true,
      dragging: true,
    });

    // Add dark tiles (CartoDB Dark)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(map);

    leafletMapRef.current = map;

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!leafletMapRef.current) return;

    const map = leafletMapRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Create red pin icon with glow
    const redIcon = L.divIcon({
      className: "",
      html: `
        <div style="
          width: 40px; 
          height: 40px; 
          background: linear-gradient(135deg, hsl(350, 100%, 60%), hsl(350, 100%, 45%)); 
          border: 3px solid white; 
          border-radius: 50%; 
          box-shadow: 0 0 20px -3px hsla(350, 100%, 55%, 0.7), 0 4px 12px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s;
        " onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2" fill="white"/>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    // Add markers
    validStreams.forEach((stream) => {
      const marker = L.marker([stream.latitude, stream.longitude], { 
        icon: redIcon,
      }).addTo(map);
      
      marker.on("click", () => {
        setSelectedStream(stream);
      });
      
      markersRef.current.push(marker);
    });

    // Fit bounds if we have streams
    if (validStreams.length === 1) {
      map.setView([validStreams[0].latitude, validStreams[0].longitude], 14);
    } else if (validStreams.length > 1) {
      const bounds = L.latLngBounds(validStreams.map((s) => [s.latitude, s.longitude] as [number, number]));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    }
  }, [validStreams]);

  // Handle focus location from alerts
  useEffect(() => {
    if (!leafletMapRef.current || !focusLocation) return;
    
    const map = leafletMapRef.current;
    map.flyTo([focusLocation.lat, focusLocation.lng], 16, {
      duration: 1.5,
    });
  }, [focusLocation]);

  if (streams.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-[hsl(220,15%,12%)] bg-[hsl(240,15%,5%)]">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(240,15%,8%)] border border-[hsl(220,15%,15%)]">
            <MapPin className="h-7 w-7 text-[hsl(220,15%,30%)]" />
          </div>
          <h3 className="text-lg font-bold text-white">No Streams to Display</h3>
          <p className="mt-1.5 text-sm text-[hsl(220,15%,45%)] leading-relaxed">
            Active streams with location data will appear on this map
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border border-[hsl(220,15%,12%)] bg-[hsl(240,15%,6%)] overflow-hidden">
      {/* Map Container - sits at the bottom */}
      <div ref={mapRef} className="h-[600px] w-full" style={{ position: 'relative', zIndex: 1 }} />
      
      {/* Overlay Container - sits above map */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
        {/* Selected Stream Panel */}
        {selectedStream && (
          <div className="absolute bottom-4 left-4 max-w-xs animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-auto">
            <div className="bg-[hsl(240,15%,8%)] border border-[hsl(220,15%,18%)] rounded-lg shadow-[0_10px_40px_-10px_hsl(240,15%,0%)] p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[hsl(350,100%,55%)] text-white text-[10px] px-1.5 py-0.5 gap-1 border-0 shadow-[0_0_12px_-3px_hsl(350,100%,55%)]">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                    </span>
                    LIVE
                  </Badge>
                  <span className="text-xs font-mono text-[hsl(220,15%,50%)]">
                    {selectedStream.id.substring(0, 8)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-[hsl(220,15%,40%)] hover:text-white hover:bg-[hsl(220,15%,15%)] -mr-1 -mt-1"
                  onClick={() => setSelectedStream(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-[hsl(220,15%,55%)]">
                  <Clock className="h-3 w-3 text-[hsl(190,100%,50%)]" />
                  <span className="font-mono">{formatDuration(durations[selectedStream.id] || 0)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[hsl(220,15%,55%)]">
                  <Navigation className="h-3 w-3 text-[hsl(350,100%,60%)]" />
                  <span className="font-mono">
                    {selectedStream.latitude.toFixed(4)}, {selectedStream.longitude.toFixed(4)}
                  </span>
                </div>
                {selectedStream.notes && (
                  <p className="text-xs text-[hsl(220,15%,70%)] leading-relaxed">
                    {selectedStream.notes}
                  </p>
                )}
              </div>
              
              <Button
                size="sm"
                className="w-full h-10 bg-gradient-to-r from-[hsl(350,100%,50%)] to-[hsl(350,100%,45%)] hover:from-[hsl(350,100%,55%)] hover:to-[hsl(350,100%,50%)] text-white gap-2 font-medium shadow-[0_0_20px_-5px_hsl(350,100%,55%)] transition-all duration-300"
                onClick={() => onStreamClick(selectedStream)}
              >
                <Maximize2 className="h-4 w-4" />
                Open Full Stream
              </Button>
            </div>
          </div>
        )}
        
        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-[hsl(240,15%,8%)] border border-[hsl(220,15%,18%)] rounded-lg px-3 py-2 pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-gradient-to-br from-[hsl(350,100%,60%)] to-[hsl(350,100%,45%)] border-2 border-white shadow-[0_0_10px_-2px_hsl(350,100%,55%)]" />
              <span className="text-xs text-[hsl(220,15%,70%)]">Live Stream</span>
            </div>
            <span className="text-xs font-bold text-[hsl(350,100%,60%)]">
              ({validStreams.length})
            </span>
          </div>
        </div>
        
        {/* Instructions */}
        <div className="absolute top-4 left-4 bg-[hsl(240,15%,8%)] border border-[hsl(220,15%,18%)] rounded-lg px-3 py-2 pointer-events-auto">
          <div className="flex items-center gap-2 text-xs text-[hsl(220,15%,55%)]">
            <Video className="h-3 w-3 text-[hsl(350,100%,60%)]" />
            <span>Click pins • Drag to pan • Scroll to zoom</span>
          </div>
        </div>
        
        {/* Streams without location */}
        {streams.length > validStreams.length && (
          <div className="absolute top-4 right-4 bg-[hsl(35,100%,50%)]/15 border border-[hsl(35,100%,50%)]/30 rounded-lg px-3 py-2 pointer-events-auto">
            <span className="text-xs text-[hsl(35,100%,60%)]">
              {streams.length - validStreams.length} acquiring location...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
