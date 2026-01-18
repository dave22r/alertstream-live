import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
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
import { useDashboard, type StreamInfo, type PastStreamInfo } from "@/hooks/useDashboard";
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

  // Location filter state
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [filterLat, setFilterLat] = useState("");
  const [filterLng, setFilterLng] = useState("");
  const [filterRadius, setFilterRadius] = useState(10); // km

  // Connect to signaling server
  const { streams: serverStreams, pastStreams, isConnected, deletePastStream } = useDashboard();

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

  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[hsl(220,15%,12%)] bg-[hsl(240,15%,4%)]/95 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3 lg:px-6">
          {/* Left */}
          <div className="flex items-center gap-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 items-center justify-center">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[hsl(350,100%,55%)] to-[hsl(350,100%,40%)]" />
                <div className="absolute inset-0 rounded-lg bg-[hsl(350,100%,55%)] blur-md opacity-40" />
                <Shield className="relative h-4 w-4 text-white" />
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
            />
          ) : allStreams.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {allStreams.map((stream, index) => (
                <div key={stream.id} className={`animate-fade-in stagger-${Math.min(index + 1, 8)}`}>
                  <StreamCardLive
                    stream={stream}
                    duration={durations[stream.id] || 0}
                    onClick={() => setSelectedStream(stream)}
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
  );
}
