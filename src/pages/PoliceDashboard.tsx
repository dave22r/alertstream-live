import { useState, useEffect } from "react";
import {
  Shield,
  MapPin,
  Clock,
  FileText,
  Radio,
  AlertCircle,
  User,
  Wifi,
  WifiOff,
} from "lucide-react";
import { LiveIndicator } from "@/components/LiveIndicator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Mock stream data for demo purposes
interface StreamData {
  id: string;
  isActive: boolean;
  startedAt: Date;
  latitude: number;
  longitude: number;
  notes: string;
}

// Simulated active stream for demo
const mockActiveStream: StreamData = {
  id: "stream-001",
  isActive: true,
  startedAt: new Date(),
  latitude: 49.2827,
  longitude: -123.1207,
  notes: "Incident near the library entrance, hearing loud noises from the east wing",
};

export default function PoliceDashboard() {
  const [activeStream, setActiveStream] = useState<StreamData | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [duration, setDuration] = useState(0);

  // Simulate receiving a stream after a few seconds (for demo)
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveStream(mockActiveStream);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Duration counter
  useEffect(() => {
    if (!activeStream) return;

    const interval = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeStream]);

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
    <div className="min-h-screen bg-primary text-primary-foreground">
      {/* Header */}
      <header className="border-b border-primary-foreground/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/10">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">SafeStream Command</h1>
              <p className="text-sm text-primary-foreground/60">
                Emergency Response Dashboard
              </p>
            </div>
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge variant="outline" className="border-success/50 bg-success/10 text-success gap-1.5">
                <Wifi className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="border-destructive/50 bg-destructive/10 text-destructive gap-1.5">
                <WifiOff className="h-3 w-3" />
                Disconnected
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="p-6">
        {activeStream ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Video feed - takes up 2 columns */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden border-0 bg-foreground/5">
                <CardHeader className="border-b border-primary-foreground/10 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <LiveIndicator />
                      <CardTitle className="text-lg font-semibold">
                        Active Stream
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-foreground/10 px-3 py-1.5">
                      <Clock className="h-4 w-4" />
                      <span className="font-mono text-sm font-bold">
                        {formatDuration(duration)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Video placeholder - in real app, this would be the WebRTC video element */}
                  <div className="relative aspect-video bg-foreground/10">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emergency/20 animate-emergency-pulse">
                          <Radio className="h-8 w-8 text-emergency" />
                        </div>
                        <p className="text-sm text-primary-foreground/60">
                          Receiving live stream...
                        </p>
                        <p className="mt-1 text-xs text-primary-foreground/40">
                          Stream ID: {activeStream.id}
                        </p>
                      </div>
                    </div>

                    {/* Overlay elements */}
                    <div className="absolute left-4 top-4">
                      <Badge className="bg-emergency text-emergency-foreground gap-1.5 px-3 py-1">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emergency-foreground opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emergency-foreground" />
                        </span>
                        LIVE
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Metadata panel */}
            <div className="space-y-4">
              {/* Stream info card */}
              <Card className="border-0 bg-foreground/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Radio className="h-4 w-4" />
                    Stream Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stream ID */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-primary-foreground/50">
                      Stream ID
                    </p>
                    <p className="font-mono text-sm">{activeStream.id}</p>
                  </div>

                  {/* Started at */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-primary-foreground/50">
                      Started At
                    </p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary-foreground/60" />
                      <p className="text-sm">
                        {formatTimestamp(activeStream.startedAt)}
                      </p>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-primary-foreground/50">
                      Duration
                    </p>
                    <p className="font-mono text-lg font-bold text-emergency">
                      {formatDuration(duration)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Location card */}
              <Card className="border-0 bg-foreground/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg bg-foreground/5 p-3">
                    <p className="font-mono text-sm">
                      {activeStream.latitude.toFixed(6)},{" "}
                      {activeStream.longitude.toFixed(6)}
                    </p>
                  </div>
                  {/* Map placeholder */}
                  <div className="aspect-square rounded-lg bg-foreground/10 flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="mx-auto h-8 w-8 text-primary-foreground/30" />
                      <p className="mt-2 text-xs text-primary-foreground/40">
                        Map view
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes card */}
              {activeStream.notes && (
                <Card className="border-0 bg-foreground/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4" />
                      Caller Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg bg-warning/10 border border-warning/20 p-3">
                      <p className="text-sm leading-relaxed">
                        {activeStream.notes}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          /* No active stream state */
          <div className="flex min-h-[60vh] flex-col items-center justify-center">
            <div className="text-center animate-fade-in">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-foreground/5">
                <Radio className="h-10 w-10 text-primary-foreground/30" />
              </div>
              <h2 className="text-2xl font-bold">No Active Streams</h2>
              <p className="mt-2 text-primary-foreground/60">
                Waiting for incoming emergency streams...
              </p>
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-primary-foreground/40">
                <div className="h-2 w-2 animate-pulse rounded-full bg-success" />
                <span>System ready and monitoring</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
