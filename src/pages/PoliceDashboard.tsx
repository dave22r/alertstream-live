import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Signal,
  SignalZero,
  MapPin,
  SlidersHorizontal,
  RotateCcw,
  Video,
  Clock,
  Play,
  Calendar,
  Trash2,
  LayoutGrid,
  Map,
  LogOut,
  AlertTriangle,
  X,
  Bell,
  ChevronRight,
  ChevronLeft,
  Eye,
  Navigation,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StreamCardLive, type StreamData } from "@/components/StreamCardLive";
import { ExpandedStreamView } from "@/components/ExpandedStreamView";
import { PastStreamViewer } from "@/components/PastStreamViewer";
import { StreamMapView } from "@/components/StreamMapView";
import { useDashboard, type StreamInfo, type PastStreamInfo, type ThreatAlert } from "@/hooks/useDashboard";
import { useAuth } from "@/contexts/AuthContext";

// Convert server stream info to StreamData format
function serverToStreamData(info: StreamInfo): StreamData {
  return {
    id: info.id,
    isActive: info.is_active,
    startedAt: new Date(info.started_at),
    latitude: info.latitude,
    longitude: info.longitude,
    notes: info.notes,
  };
}

// Haversine formula to calculate distance between two coordinates
function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function PoliceDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [selectedStream, setSelectedStream] = useState<StreamData | null>(null);
  const [selectedPastStream, setSelectedPastStream] = useState<PastStreamInfo | null>(null);
  const [streamToDelete, setStreamToDelete] = useState<PastStreamInfo | null>(null);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [alerts, setAlerts] = useState<ThreatAlert[]>([]);
  const [alertsSidebarOpen, setAlertsSidebarOpen] = useState(true);
  const [highlightedStreamId, setHighlightedStreamId] = useState<string | null>(null);
  const [mapFocusLocation, setMapFocusLocation] = useState<{ lat: number; lng: number } | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Location filter state
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [filterLat, setFilterLat] = useState("");
  const [filterLng, setFilterLng] = useState("");
  const [filterRadius, setFilterRadius] = useState(10); // km

  // Handle threat alerts from AI Sentry
  const handleThreatAlert = useCallback((alert: ThreatAlert) => {
    console.log("[AI Sentry] Threat detected:", alert);
    // Add to alerts array (newest first)
    setAlerts((prev) => [alert, ...prev]);
    // Open sidebar when new alert comes in
    setAlertsSidebarOpen(true);
    
    // Play alert sound
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = "square";
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      // Beep pattern: 3 short beeps
      setTimeout(() => { gainNode.gain.value = 0; }, 150);
      setTimeout(() => { gainNode.gain.value = 0.3; }, 250);
      setTimeout(() => { gainNode.gain.value = 0; }, 400);
      setTimeout(() => { gainNode.gain.value = 0.3; }, 500);
      setTimeout(() => { gainNode.gain.value = 0; }, 650);
      setTimeout(() => { oscillator.stop(); }, 700);
    } catch (e) {
      console.log("Could not play alert sound:", e);
    }
  }, []);

  // Dismiss a single alert
  const dismissAlert = useCallback((alertTimestamp: string) => {
    setAlerts((prev) => prev.filter((a) => a.timestamp !== alertTimestamp));
  }, []);

  // Clear all alerts
  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Connect to signaling server with alert handler
  const { streams: serverStreams, pastStreams, isConnected, deletePastStream } = useDashboard({
    onAlert: handleThreatAlert,
  });

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Convert and filter streams
  const allStreams = useMemo(() => {
    const streams = serverStreams.map(serverToStreamData);

    if (!filterEnabled || !filterLat || !filterLng) {
      return streams;
    }

    const lat = parseFloat(filterLat);
    const lng = parseFloat(filterLng);

    if (isNaN(lat) || isNaN(lng)) {
      return streams;
    }

    return streams.filter((stream) => {
      if (stream.latitude === 0 && stream.longitude === 0) return true; // Include streams still acquiring location
      const distance = getDistanceKm(lat, lng, stream.latitude, stream.longitude);
      return distance <= filterRadius;
    });
  }, [serverStreams, filterEnabled, filterLat, filterLng, filterRadius]);

  // Handle clicking an alert to focus on the stream
  const handleAlertClick = (alert: ThreatAlert) => {
    // Find matching stream
    const matchingStream = allStreams.find((s) => s.id === alert.stream_id);
    if (matchingStream) {
      // Highlight the stream card
      setHighlightedStreamId(alert.stream_id);
      // Clear any existing timeout
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      // Open expanded view
      setSelectedStream(matchingStream);
      // Remove highlight after 3 seconds
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedStreamId(null);
      }, 3000);
    } else {
      // Stream no longer active, check past streams
      const matchingPastStream = pastStreams.find((s) => s.id === alert.stream_id);
      if (matchingPastStream) {
        setSelectedPastStream(matchingPastStream);
      }
    }
  };

  // Handle viewing alert location on map
  const handleViewOnMap = (alert: ThreatAlert) => {
    // Switch to map view and focus on alert location
    setViewMode("map");
    setMapFocusLocation({ lat: alert.latitude, lng: alert.longitude });
    // Clear focus after a short delay so it can be re-triggered
    setTimeout(() => setMapFocusLocation(null), 2000);
  };

  // Duration counter
  useEffect(() => {
    const interval = setInterval(() => {
      setDurations((prev) => {
        const updated = { ...prev };
        allStreams.forEach((stream) => {
          updated[stream.id] = Math.floor(
            (Date.now() - stream.startedAt.getTime()) / 1000
          );
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [allStreams]);

  const resetFilter = () => {
    setFilterEnabled(false);
    setFilterLat("");
    setFilterLng("");
    setFilterRadius(10);
  };

  const useMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFilterLat(pos.coords.latitude.toFixed(6));
          setFilterLng(pos.coords.longitude.toFixed(6));
          setFilterEnabled(true);
        },
        () => {
          console.error("Failed to get location");
        }
      );
    }
  };

  const handleDeletePastStream = async () => {
    if (!streamToDelete) return;
    try {
      await deletePastStream(streamToDelete.id);
      setStreamToDelete(null);
      setSelectedPastStream(null);
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatAlertTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className="min-h-screen text-white flex">
      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 relative z-50 ${alertsSidebarOpen ? 'ml-80' : 'ml-0'}`}>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[hsl(220,15%,12%)] bg-[hsl(240,15%,4%)]/95 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3 lg:px-6">
          {/* Left */}
          <div className="flex items-center gap-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 items-center justify-center">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[hsl(350,100%,55%)] to-[hsl(350,100%,40%)]" />
                <div className="absolute inset-0 rounded-lg bg-[hsl(350,100%,55%)] blur-md opacity-40" />
                <Activity className="relative h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight">Command Center</h1>
                <p className="text-[10px] text-[hsl(220,15%,45%)] uppercase tracking-[0.15em]">
                  Emergency Response
                </p>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3 animate-fade-in stagger-1">
            {/* Location Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-8 gap-1.5 text-xs border-[hsl(220,15%,18%)] bg-[hsl(240,15%,8%)] hover:bg-[hsl(240,15%,12%)] transition-all duration-200 ${filterEnabled ? "border-[hsl(350,100%,50%)] text-[hsl(350,100%,50%)] shadow-[0_0_20px_-5px_hsl(350_100%_50%_/_0.4)]" : "text-[hsl(220,15%,55%)]"
                    }`}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {filterEnabled ? `${filterRadius}km radius` : "Location Filter"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 bg-[hsl(240,15%,8%)] border-[hsl(220,15%,15%)]" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-white">Filter by Location</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetFilter}
                      className="h-7 px-2 text-xs text-[hsl(220,15%,50%)] hover:text-white"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-[hsl(220,15%,45%)] uppercase tracking-wider">Latitude</Label>
                        <Input
                          placeholder="49.2827"
                          value={filterLat}
                          onChange={(e) => setFilterLat(e.target.value)}
                          className="h-8 text-xs bg-[hsl(240,15%,6%)] border-[hsl(220,15%,18%)] focus:border-[hsl(350,100%,50%)]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-[hsl(220,15%,45%)] uppercase tracking-wider">Longitude</Label>
                        <Input
                          placeholder="-123.1207"
                          value={filterLng}
                          onChange={(e) => setFilterLng(e.target.value)}
                          className="h-8 text-xs bg-[hsl(240,15%,6%)] border-[hsl(220,15%,18%)] focus:border-[hsl(350,100%,50%)]"
                        />
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={useMyLocation}
                      className="w-full h-8 text-xs border-[hsl(220,15%,18%)] bg-[hsl(240,15%,10%)] hover:bg-[hsl(240,15%,15%)] hover:border-[hsl(350,100%,50%)] transition-all duration-200"
                    >
                      <MapPin className="h-3 w-3 mr-1.5" />
                      Use My Location
                    </Button>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] text-[hsl(220,15%,45%)] uppercase tracking-wider">Radius</Label>
                        <span className="text-xs text-white font-mono">{filterRadius} km</span>
                      </div>
                      <Slider
                        value={[filterRadius]}
                        onValueChange={([v]) => setFilterRadius(v)}
                        min={1}
                        max={100}
                        step={1}
                        className="py-2"
                      />
                    </div>

                    <Button
                      size="sm"
                      onClick={() => setFilterEnabled(true)}
                      disabled={!filterLat || !filterLng}
                      className="w-full h-8 text-xs bg-[hsl(350,100%,45%)] hover:bg-[hsl(350,100%,50%)] text-white font-medium"
                    >
                      <SlidersHorizontal className="h-3 w-3 mr-1.5" />
                      Apply Filter
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Stream Count */}
            <Badge
              variant="outline"
              className={`h-8 px-2.5 gap-1.5 text-xs font-mono border-[hsl(220,15%,18%)] ${allStreams.length > 0 ? "text-[hsl(350,100%,60%)] border-[hsl(350,100%,50%)]/40 shadow-[0_0_15px_-5px_hsl(350,100%,55%)]" : "text-[hsl(220,15%,45%)]"
                }`}
            >
              <Video className="h-3 w-3" />
              {allStreams.length}
            </Badge>

            {/* Connection Status */}
            <div className="flex items-center gap-1.5">
              {isConnected ? (
                <>
                  <Signal className="h-3.5 w-3.5 text-[hsl(160,100%,45%)]" />
                  <span className="text-[10px] text-[hsl(160,100%,45%)] uppercase tracking-[0.1em]">Online</span>
                </>
              ) : (
                <>
                  <SignalZero className="h-3.5 w-3.5 text-[hsl(350,100%,55%)]" />
                  <span className="text-[10px] text-[hsl(350,100%,55%)] uppercase tracking-[0.1em]">Offline</span>
                </>
              )}
            </div>

            {/* Logout Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-8 px-3 text-[hsl(220,15%,50%)] hover:text-[hsl(350,100%,60%)] hover:bg-[hsl(350,100%,50%)]/10 gap-1.5 transition-all duration-200"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="text-xs">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="p-4 lg:p-6 space-y-8">
        {/* Live Streams Section */}
        <section className="animate-fade-in stagger-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(350,100%,50%)]/15 border border-[hsl(350,100%,50%)]/30">
                <Video className="h-4 w-4 text-[hsl(350,100%,60%)]" />
                {allStreams.length > 0 && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[hsl(350,100%,55%)] animate-emergency-pulse" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Live Streams</h2>
                <p className="text-xs text-[hsl(220,15%,45%)]">
                  {allStreams.length > 0
                    ? `${allStreams.length} active stream${allStreams.length !== 1 ? 's' : ''}`
                    : 'No active streams'}
                </p>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[hsl(240,15%,6%)] border border-[hsl(220,15%,15%)]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("grid")}
                className={`h-8 px-3 gap-1.5 text-xs transition-all duration-200 ${viewMode === "grid"
                    ? "bg-[hsl(240,15%,15%)] text-white"
                    : "text-[hsl(220,15%,50%)] hover:text-white"
                  }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Grid
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("map")}
                className={`h-8 px-3 gap-1.5 text-xs transition-all duration-200 ${viewMode === "map"
                    ? "bg-[hsl(240,15%,15%)] text-white"
                    : "text-[hsl(220,15%,50%)] hover:text-white"
                  }`}
              >
                <Map className="h-3.5 w-3.5" />
                Map
              </Button>
            </div>
          </div>

          {viewMode === "map" ? (
            <StreamMapView
              streams={allStreams}
              durations={durations}
              onStreamClick={(stream) => setSelectedStream(stream)}
              focusLocation={mapFocusLocation}
            />
          ) : allStreams.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {allStreams.map((stream, index) => (
                <div key={stream.id} className={`animate-fade-in stagger-${Math.min(index + 1, 8)}`}>
                  <StreamCardLive
                    stream={stream}
                    duration={durations[stream.id] || 0}
                    onClick={() => setSelectedStream(stream)}
                    highlighted={highlightedStreamId === stream.id}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[30vh] flex-col items-center justify-center rounded-xl border border-[hsl(220,15%,12%)] bg-[hsl(240,15%,5%)]">
              <div className="text-center max-w-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(240,15%,8%)] border border-[hsl(220,15%,15%)]">
                  <Video className="h-7 w-7 text-[hsl(220,15%,30%)]" />
                </div>
                <h3 className="text-lg font-bold text-white">No Active Streams</h3>
                <p className="mt-1.5 text-sm text-[hsl(220,15%,45%)] leading-relaxed">
                  {filterEnabled
                    ? "No streams found within the specified location radius."
                    : "Waiting for incoming emergency streams..."}
                </p>
                <div className="mt-5 flex items-center justify-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(160,100%,45%)] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(160,100%,45%)]" />
                  </span>
                  <span className="text-xs text-[hsl(220,15%,45%)]">System monitoring active</span>
                </div>
                {filterEnabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilter}
                    className="mt-4 text-xs border-[hsl(220,15%,18%)] bg-[hsl(240,15%,8%)] hover:bg-[hsl(240,15%,12%)]"
                  >
                    <RotateCcw className="h-3 w-3 mr-1.5" />
                    Clear Filter
                  </Button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Past Streams Section */}
        <section className="animate-fade-in stagger-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(190,100%,50%)]/10 border border-[hsl(190,100%,50%)]/25">
              <Clock className="h-4 w-4 text-[hsl(190,100%,50%)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Past Recordings</h2>
              <p className="text-xs text-[hsl(220,15%,45%)]">
                {pastStreams.length > 0
                  ? `${pastStreams.length} recorded stream${pastStreams.length !== 1 ? 's' : ''}`
                  : 'No recordings yet'}
              </p>
            </div>
          </div>

          {pastStreams.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {pastStreams.map((stream, index) => (
                <Card
                  key={stream.id}
                  className={`group cursor-pointer overflow-hidden border-[hsl(220,15%,12%)] bg-[hsl(240,15%,6%)] hover:border-[hsl(190,100%,50%)]/30 hover:shadow-[0_0_30px_-10px_hsl(190,100%,50%)] transition-all duration-300 animate-fade-in stagger-${Math.min(index + 1, 8)}`}
                  onClick={() => setSelectedPastStream(stream)}
                >
                  <CardContent className="p-0">
                    {/* Thumbnail placeholder */}
                    <div className="relative aspect-video bg-[hsl(240,15%,8%)] flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center justify-center bg-[hsl(240,15%,5%)]/80 group-hover:bg-[hsl(240,15%,5%)]/60 transition-colors">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(190,100%,50%)]/15 border border-[hsl(190,100%,50%)]/30 group-hover:bg-[hsl(190,100%,50%)]/25 transition-colors">
                          <Play className="h-5 w-5 text-[hsl(190,100%,50%)]" />
                        </div>
                      </div>
                      {/* Duration badge */}
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5">
                        <Clock className="h-3 w-3 text-[hsl(220,15%,50%)]" />
                        <span className="font-mono text-xs text-white">
                          {formatDuration(stream.duration_seconds)}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">
                            Stream {stream.id.substring(0, 8)}...
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 text-[hsl(220,15%,45%)]">
                            <Calendar className="h-3 w-3" />
                            <span className="text-xs">{formatTimestamp(stream.started_at)}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-[hsl(220,15%,40%)] hover:text-[hsl(350,100%,60%)] hover:bg-[hsl(350,100%,50%)]/10 shrink-0 transition-all duration-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStreamToDelete(stream);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {stream.latitude !== 0 && stream.longitude !== 0 && (
                        <div className="flex items-center gap-1.5 text-[hsl(220,15%,45%)]">
                          <MapPin className="h-3 w-3" />
                          <span className="text-xs font-mono">
                            {stream.latitude.toFixed(4)}, {stream.longitude.toFixed(4)}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[20vh] flex-col items-center justify-center rounded-xl border border-[hsl(220,15%,12%)] bg-[hsl(240,15%,5%)]">
              <div className="text-center max-w-sm">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(240,15%,8%)] border border-[hsl(220,15%,15%)]">
                  <Clock className="h-5 w-5 text-[hsl(220,15%,30%)]" />
                </div>
                <h3 className="text-base font-bold text-white">No Recordings</h3>
                <p className="mt-1 text-sm text-[hsl(220,15%,45%)]">
                  Completed streams will appear here
                </p>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Expanded View for Live Streams */}
      {selectedStream && (
        <ExpandedStreamView
          stream={selectedStream}
          duration={durations[selectedStream.id] || 0}
          onClose={() => setSelectedStream(null)}
        />
      )}

      {/* Past Stream Viewer */}
      {selectedPastStream && (
        <PastStreamViewer
          stream={selectedPastStream}
          onClose={() => setSelectedPastStream(null)}
          onDelete={() => setStreamToDelete(selectedPastStream)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!streamToDelete} onOpenChange={() => setStreamToDelete(null)}>
        <AlertDialogContent className="bg-[hsl(240,15%,6%)] border-[hsl(220,15%,15%)] shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-bold tracking-tight">Delete Recording?</AlertDialogTitle>
            <AlertDialogDescription className="text-[hsl(220,15%,55%)]">
              This will permanently delete the recording for stream{" "}
              <span className="font-mono text-[hsl(220,15%,75%)]">{streamToDelete?.id.substring(0, 12)}...</span>
              {" "}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[hsl(240,15%,10%)] border-[hsl(220,15%,18%)] text-[hsl(220,15%,70%)] hover:bg-[hsl(240,15%,15%)] hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePastStream}
              className="bg-[hsl(350,100%,50%)] hover:bg-[hsl(350,100%,55%)] text-white font-bold shadow-[0_0_20px_-5px_hsl(350,100%,55%)]"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>

      {/* Alerts Sidebar */}
      <aside
        className={`fixed top-[57px] left-0 h-[calc(100vh-57px)] bg-[hsl(240,15%,4%)] border-r border-[hsl(220,15%,12%)] transition-all duration-300 z-[90] ${
          alertsSidebarOpen ? 'w-80 translate-x-0' : 'w-80 -translate-x-full'
        }`}
      >
        {/* Sidebar Toggle Button - positioned at bottom to avoid overlapping header */}
        <button
          onClick={() => setAlertsSidebarOpen(!alertsSidebarOpen)}
          className={`absolute bottom-4 -right-10 h-10 w-10 flex items-center justify-center bg-[hsl(240,15%,6%)] border border-[hsl(220,15%,18%)] rounded-r-lg border-l-0 hover:bg-[hsl(240,15%,10%)] transition-colors shadow-lg cursor-pointer ${
            alerts.length > 0 ? 'text-[hsl(350,100%,60%)] border-[hsl(350,100%,50%)]/50' : 'text-[hsl(220,15%,50%)]'
          }`}
          aria-label={alertsSidebarOpen ? "Close alerts sidebar" : "Open alerts sidebar"}
        >
          {alertsSidebarOpen ? (
            <ChevronLeft className="h-5 w-5" />
          ) : (
            <div className="relative">
              <Bell className="h-5 w-5" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-[hsl(350,100%,50%)] text-[10px] font-bold text-white">
                  {alerts.length > 9 ? '9+' : alerts.length}
                </span>
              )}
            </div>
          )}
        </button>

        {/* Sidebar Header */}
        <div className="bg-[hsl(240,15%,4%)] border-b border-[hsl(220,15%,12%)] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`relative flex h-9 w-9 items-center justify-center rounded-lg border ${
                alerts.length > 0
                  ? 'bg-[hsl(350,100%,50%)]/15 border-[hsl(350,100%,50%)]/30'
                  : 'bg-[hsl(220,15%,10%)] border-[hsl(220,15%,18%)]'
              }`}>
                <Bell className={`h-4 w-4 ${alerts.length > 0 ? 'text-[hsl(350,100%,60%)]' : 'text-[hsl(220,15%,50%)]'}`} />
                {alerts.length > 0 && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[hsl(350,100%,55%)] animate-emergency-pulse" />
                )}
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">AI Sentry Alerts</h2>
                <p className="text-[10px] text-[hsl(220,15%,45%)]">
                  {alerts.length > 0 ? `${alerts.length} active alert${alerts.length !== 1 ? 's' : ''}` : 'No alerts'}
                </p>
              </div>
            </div>
            {alerts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllAlerts}
                className="h-7 px-2 text-[10px] text-[hsl(220,15%,50%)] hover:text-[hsl(350,100%,60%)] hover:bg-[hsl(350,100%,50%)]/10"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Alerts List */}
        <div className="overflow-y-auto p-3 space-y-2" style={{ maxHeight: 'calc(100vh - 57px - 80px)' }}>
          {alerts.length > 0 ? (
            alerts.map((alert, index) => (
              <div
                key={alert.timestamp + index}
                className="group relative bg-gradient-to-br from-[hsl(350,100%,50%)]/15 to-[hsl(350,100%,40%)]/5 border border-[hsl(350,100%,50%)]/40 rounded-xl p-3 cursor-pointer hover:from-[hsl(350,100%,50%)]/25 hover:to-[hsl(350,100%,40%)]/10 hover:border-[hsl(350,100%,50%)]/60 transition-all duration-200 animate-fade-in shadow-[0_0_20px_-8px_hsl(350,100%,50%)]"
                onClick={() => handleAlertClick(alert)}
              >
                {/* Alert Header */}
                <div className="flex items-start gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(350,100%,50%)]/20 border border-[hsl(350,100%,50%)]/30 flex-shrink-0">
                    <AlertTriangle className="h-4 w-4 text-[hsl(350,100%,60%)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[hsl(350,100%,65%)] uppercase tracking-wide">🚨 Threat</span>
                      <span className="text-[10px] text-[hsl(220,15%,55%)] font-mono bg-[hsl(240,15%,8%)] px-1.5 py-0.5 rounded">
                        {formatAlertTime(alert.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-white mt-1 font-medium">{alert.threat_type}</p>
                  </div>
                </div>

                {/* Alert Details */}
                <div className="mt-3 space-y-1.5 pl-10">
                  <p className="text-[11px] text-[hsl(220,15%,55%)] font-mono flex items-center gap-1.5">
                    <Video className="h-3 w-3 text-[hsl(350,100%,55%)]" />
                    Stream: {alert.stream_id.substring(0, 12)}...
                  </p>
                  <div className="flex items-center gap-1.5 text-[hsl(220,15%,50%)]">
                    <MapPin className="h-3 w-3 text-[hsl(350,100%,55%)]" />
                    <span className="text-[11px] font-mono">
                      {alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-[hsl(350,100%,50%)]/20">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[10px] text-[hsl(350,100%,60%)] hover:text-white hover:bg-[hsl(350,100%,50%)]/25 gap-1 font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAlertClick(alert);
                    }}
                  >
                    <Eye className="h-3 w-3" />
                    View Stream
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[10px] text-[hsl(190,100%,55%)] hover:text-white hover:bg-[hsl(190,100%,50%)]/20 gap-1 font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewOnMap(alert);
                    }}
                  >
                    <Navigation className="h-3 w-3" />
                    View on Map
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[10px] text-[hsl(220,15%,50%)] hover:text-[hsl(350,100%,60%)] hover:bg-[hsl(350,100%,50%)]/10 gap-1 ml-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissAlert(alert.timestamp);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(240,15%,8%)] border border-[hsl(220,15%,15%)] mb-3">
                <Bell className="h-5 w-5 text-[hsl(220,15%,30%)]" />
              </div>
              <p className="text-sm text-[hsl(220,15%,45%)] font-medium">No Active Alerts</p>
              <p className="text-xs text-[hsl(220,15%,35%)] mt-1">AI Sentry is monitoring</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
