import { X, Clock, MapPin, FileText, Radio } from "lucide-react";
import { LiveIndicator } from "@/components/LiveIndicator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StreamData } from "@/components/StreamCard";

interface ExpandedStreamViewProps {
  stream: StreamData;
  duration: number;
  onClose: () => void;
}

export function ExpandedStreamView({ stream, duration, onClose }: ExpandedStreamViewProps) {
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
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-fade-in">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-primary-foreground/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <LiveIndicator />
            <h2 className="text-xl font-bold">Stream: {stream.id}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="grid gap-6 lg:grid-cols-3 h-full">
            {/* Video feed - takes up 2 columns */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden border-0 bg-foreground/5 h-full">
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
                <CardContent className="p-0 h-[calc(100%-60px)]">
                  <div className="relative h-full min-h-[400px] bg-foreground/10">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emergency/20 animate-emergency-pulse">
                          <Radio className="h-8 w-8 text-emergency" />
                        </div>
                        <p className="text-sm text-primary-foreground/60">
                          Receiving live stream...
                        </p>
                        <p className="mt-1 text-xs text-primary-foreground/40">
                          Stream ID: {stream.id}
                        </p>
                      </div>
                    </div>

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
              <Card className="border-0 bg-foreground/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Radio className="h-4 w-4" />
                    Stream Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-primary-foreground/50">
                      Stream ID
                    </p>
                    <p className="font-mono text-sm">{stream.id}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-primary-foreground/50">
                      Started At
                    </p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary-foreground/60" />
                      <p className="text-sm">{formatTimestamp(stream.startedAt)}</p>
                    </div>
                  </div>

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
                      {stream.latitude.toFixed(6)}, {stream.longitude.toFixed(6)}
                    </p>
                  </div>
                  <div className="aspect-square rounded-lg bg-foreground/10 flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="mx-auto h-8 w-8 text-primary-foreground/30" />
                      <p className="mt-2 text-xs text-primary-foreground/40">Map view</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {stream.notes && (
                <Card className="border-0 bg-foreground/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4" />
                      Caller Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg bg-warning/10 border border-warning/20 p-3">
                      <p className="text-sm leading-relaxed">{stream.notes}</p>
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
