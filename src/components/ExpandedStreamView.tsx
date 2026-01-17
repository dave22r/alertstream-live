import { useEffect, useRef, useState } from "react";
import { X, Clock, MapPin, FileText, Radio, Wifi, WifiOff } from "lucide-react";
import { LiveIndicator } from "@/components/LiveIndicator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StreamData } from "@/components/StreamCardLive";
import { useViewer } from "@/hooks/useViewer";

interface ExpandedStreamViewProps {
  stream: StreamData;
  duration: number;
  onClose: () => void;
}

export function ExpandedStreamView({ stream, duration, onClose }: ExpandedStreamViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "failed">("connecting");
  
  const {
    isReceiving,
    remoteStream,
    error,
    connect,
    disconnect,
  } = useViewer({
    streamId: stream.id,
    onStreamReady: () => setConnectionStatus("connected"),
    onStreamEnded: () => setConnectionStatus("failed"),
  });

  useEffect(() => {
    if (stream.id) {
      connect();
    }
    return () => {
      disconnect();
    };
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

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background animate-fade-in">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <LiveIndicator />
            <h2 className="text-xl font-bold text-card-foreground">Stream: {stream.id}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 overflow-auto bg-background">
          <div className="grid gap-6 lg:grid-cols-3 h-full">
            {/* Video feed - takes up 2 columns */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden border-border h-full">
                <CardHeader className="border-b border-border pb-3 bg-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <LiveIndicator />
                      <CardTitle className="text-lg font-semibold text-card-foreground">
                        Active Stream
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-sm font-bold text-foreground">
                        {formatDuration(duration)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 h-[calc(100%-60px)]">
                  <div className="relative h-full min-h-[400px] bg-muted bg-black">
                    {/* Real Video Feed via WebRTC */}
                    {remoteStream ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      /* Placeholder / Loading State */
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emergency/20 animate-emergency-pulse">
                            <Radio className="h-8 w-8 text-emergency" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {error ? "Failed to connect" : "Connecting to live stream..."}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Stream ID: {stream.id.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="absolute left-4 top-4 flex gap-2">
                      <Badge className="bg-emergency text-emergency-foreground gap-1.5 px-3 py-1">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emergency-foreground opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emergency-foreground" />
                        </span>
                        LIVE
                      </Badge>
                      {isReceiving ? (
                        <Badge className="bg-success/20 text-success border border-success/30 gap-1">
                          <Wifi className="h-3 w-3" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge className="bg-warning/20 text-warning border border-warning/30 gap-1">
                          <WifiOff className="h-3 w-3" />
                          {error ? "Error" : "Connecting..."}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Metadata panel */}
            <div className="space-y-4">
              <Card className="border-border">
                <CardHeader className="pb-3 bg-card">
                  <CardTitle className="flex items-center gap-2 text-base text-card-foreground">
                    <Radio className="h-4 w-4" />
                    Stream Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 bg-card">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Stream ID
                    </p>
                    <p className="font-mono text-sm text-card-foreground">{stream.id}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Started At
                    </p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-card-foreground">{formatTimestamp(stream.startedAt)}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Duration
                    </p>
                    <p className="font-mono text-lg font-bold text-emergency">
                      {formatDuration(duration)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="pb-3 bg-card">
                  <CardTitle className="flex items-center gap-2 text-base text-card-foreground">
                    <MapPin className="h-4 w-4" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 bg-card">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="font-mono text-sm text-foreground">
                      {stream.latitude.toFixed(6)}, {stream.longitude.toFixed(6)}
                    </p>
                  </div>
                  <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-xs text-muted-foreground">Map view</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {stream.notes && (
                <Card className="border-border">
                  <CardHeader className="pb-3 bg-card">
                    <CardTitle className="flex items-center gap-2 text-base text-card-foreground">
                      <FileText className="h-4 w-4" />
                      Caller Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="bg-card">
                    <div className="rounded-lg bg-warning/10 border border-warning/30 p-3">
                      <p className="text-sm leading-relaxed text-card-foreground">{stream.notes}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
