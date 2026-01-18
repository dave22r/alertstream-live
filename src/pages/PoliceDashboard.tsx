import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Signal,
  SignalZero,
  MapPin,
  SlidersHorizontal,
  RotateCcw,
  Video,
  Home,
  Clock,
  Play,
  Calendar,
  Trash2,
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
import { useDashboard, type StreamInfo, type PastStreamInfo } from "@/hooks/useDashboard";
import { useToast } from "@/hooks/use-toast";

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
  const [selectedStream, setSelectedStream] = useState<StreamData | null>(null);
  const [selectedPastStream, setSelectedPastStream] = useState<PastStreamInfo | null>(null);
  const [streamToDelete, setStreamToDelete] = useState<PastStreamInfo | null>(null);
  const [durations, setDurations] = useState<Record<string, number>>({});

  // Location filter state
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [filterLat, setFilterLat] = useState("");
  const [filterLng, setFilterLng] = useState("");
  const [filterRadius, setFilterRadius] = useState(10); // km

  // Connect to signaling server
  const {
    streams: serverStreams,
    pastStreams,
    isConnected,
    deletePastStream,
    lastAlert,
    clearAlert
  } = useDashboard();

  // Toast for AI Sentry alerts (persistent - must click to dismiss)
  const { toast } = useToast();

  useEffect(() => {
    if (lastAlert) {
      toast({
        variant: "destructive",
        title: `🚨 ${lastAlert.message}`,
        description: `Stream: ${lastAlert.stream_id.substring(0, 8)} | Location: ${lastAlert.latitude.toFixed(4)}, ${lastAlert.longitude.toFixed(4)}`,
        duration: Infinity, // Never auto-dismiss
      });
      clearAlert();
    }
  }, [lastAlert, toast, clearAlert]);

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80">
        <div className="flex items-center justify-between px-4 py-3 lg:px-6">
          {/* Left */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-600">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white">Command Center</h1>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  Emergency Response
                </p>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            {/* Location Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-8 gap-1.5 text-xs border-zinc-700 bg-zinc-900 hover:bg-zinc-800 ${filterEnabled ? "border-blue-500 text-blue-400" : "text-zinc-400"
                    }`}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {filterEnabled ? `${filterRadius}km radius` : "Location Filter"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 bg-zinc-900 border-zinc-700" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-zinc-100">Filter by Location</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetFilter}
                      className="h-7 px-2 text-xs text-zinc-400 hover:text-zinc-100"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-zinc-500 uppercase">Latitude</Label>
                        <Input
                          placeholder="49.2827"
                          value={filterLat}
                          onChange={(e) => setFilterLat(e.target.value)}
                          className="h-8 text-xs bg-zinc-800 border-zinc-700"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-zinc-500 uppercase">Longitude</Label>
                        <Input
                          placeholder="-123.1207"
                          value={filterLng}
                          onChange={(e) => setFilterLng(e.target.value)}
                          className="h-8 text-xs bg-zinc-800 border-zinc-700"
                        />
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={useMyLocation}
                      className="w-full h-8 text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                    >
                      <MapPin className="h-3 w-3 mr-1.5" />
                      Use My Location
                    </Button>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] text-zinc-500 uppercase">Radius</Label>
                        <span className="text-xs text-zinc-300 font-mono">{filterRadius} km</span>
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
                      className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700"
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
              className={`h-8 px-2.5 gap-1.5 text-xs font-mono border-zinc-700 ${allStreams.length > 0 ? "text-red-400 border-red-500/30" : "text-zinc-500"
                }`}
            >
              <Video className="h-3 w-3" />
              {allStreams.length}
            </Badge>

            {/* Connection Status */}
            <div className="flex items-center gap-1.5">
              {isConnected ? (
                <>
                  <Signal className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[10px] text-emerald-500 uppercase tracking-wide">Online</span>
                </>
              ) : (
                <>
                  <SignalZero className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-[10px] text-red-500 uppercase tracking-wide">Offline</span>
                </>
              )}
            </div>

            {/* Home Link */}
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
            >
              <Link to="/">
                <Home className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="p-4 lg:p-6 space-y-8">
        {/* Live Streams Section */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-600/20 border border-red-500/30">
              <Video className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Live Streams</h2>
              <p className="text-xs text-zinc-500">
                {allStreams.length > 0
                  ? `${allStreams.length} active stream${allStreams.length !== 1 ? 's' : ''}`
                  : 'No active streams'}
              </p>
            </div>
          </div>

          {allStreams.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {allStreams.map((stream) => (
                <StreamCardLive
                  key={stream.id}
                  stream={stream}
                  duration={durations[stream.id] || 0}
                  onClick={() => setSelectedStream(stream)}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[30vh] flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50">
              <div className="text-center max-w-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800">
                  <Video className="h-7 w-7 text-zinc-600" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-300">No Active Streams</h3>
                <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed">
                  {filterEnabled
                    ? "No streams found within the specified location radius."
                    : "Waiting for incoming emergency streams..."}
                </p>
                <div className="mt-5 flex items-center justify-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-xs text-zinc-500">System monitoring active</span>
                </div>
                {filterEnabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilter}
                    className="mt-4 text-xs border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
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
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600/20 border border-blue-500/30">
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Past Recordings</h2>
              <p className="text-xs text-zinc-500">
                {pastStreams.length > 0
                  ? `${pastStreams.length} recorded stream${pastStreams.length !== 1 ? 's' : ''}`
                  : 'No recordings yet'}
              </p>
            </div>
          </div>

          {pastStreams.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {pastStreams.map((stream) => (
                <Card
                  key={stream.id}
                  className="group cursor-pointer overflow-hidden border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-colors"
                  onClick={() => setSelectedPastStream(stream)}
                >
                  <CardContent className="p-0">
                    {/* Thumbnail placeholder */}
                    <div className="relative aspect-video bg-zinc-800 flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 group-hover:bg-zinc-900/60 transition-colors">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/20 border border-blue-500/30 group-hover:bg-blue-600/30 transition-colors">
                          <Play className="h-5 w-5 text-blue-400" />
                        </div>
                      </div>
                      {/* Duration badge */}
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5">
                        <Clock className="h-3 w-3 text-zinc-400" />
                        <span className="font-mono text-xs text-zinc-300">
                          {formatDuration(stream.duration_seconds)}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-200 truncate">
                            Stream {stream.id.substring(0, 8)}...
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 text-zinc-500">
                            <Calendar className="h-3 w-3" />
                            <span className="text-xs">{formatTimestamp(stream.started_at)}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-zinc-500 hover:text-red-400 hover:bg-red-900/30 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStreamToDelete(stream);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {stream.latitude !== 0 && stream.longitude !== 0 && (
                        <div className="flex items-center gap-1.5 text-zinc-500">
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
            <div className="flex min-h-[20vh] flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50">
              <div className="text-center max-w-sm">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800">
                  <Clock className="h-5 w-5 text-zinc-600" />
                </div>
                <h3 className="text-base font-semibold text-zinc-400">No Recordings</h3>
                <p className="mt-1 text-sm text-zinc-500">
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
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">Delete Recording?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will permanently delete the recording for stream{" "}
              <span className="font-mono text-zinc-300">{streamToDelete?.id.substring(0, 12)}...</span>
              {" "}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePastStream}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
