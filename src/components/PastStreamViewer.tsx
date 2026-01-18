import { X, Clock, MapPin, FileText, Play, Calendar, Download, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PastStreamInfo } from "@/hooks/useDashboard";
import { signalingConfig } from "@/lib/signalingConfig";

interface PastStreamViewerProps {
  stream: PastStreamInfo;
  onClose: () => void;
  onDelete: () => void;
}

export function PastStreamViewer({ stream, onClose, onDelete }: PastStreamViewerProps) {
  const videoUrl = `${signalingConfig.httpBase}${stream.video_url}`;

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
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `stream-${stream.id}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[hsl(240,15%,3%)]">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[hsl(220,15%,12%)] px-6 py-4 bg-[hsl(240,15%,5%)]">
          <div className="flex items-center gap-3">
            <Badge className="bg-[hsl(240,15%,15%)] text-[hsl(220,15%,70%)] text-xs font-bold px-2 py-1 gap-1.5 border border-[hsl(220,15%,25%)]">
              <Play className="h-3 w-3" />
              RECORDED
            </Badge>
            <h2 className="text-xl font-bold text-white tracking-tight font-mono">Stream: {stream.id.substring(0, 12)}...</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleDownload}
              className="text-[hsl(350,100%,55%)] hover:text-[hsl(350,100%,65%)] hover:bg-[hsl(350,100%,55%)]/10 gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onDelete}
              className="text-[hsl(350,100%,55%)] hover:text-[hsl(350,100%,65%)] hover:bg-[hsl(350,100%,55%)]/10 gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-[hsl(220,15%,50%)] hover:text-white hover:bg-[hsl(240,15%,12%)]"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 overflow-auto bg-[hsl(240,15%,3%)]">
          <div className="grid gap-6 lg:grid-cols-3 h-full">
            {/* Video player - takes up 2 columns */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden border-[hsl(220,15%,12%)] bg-[hsl(240,15%,6%)] h-full">
                <CardHeader className="border-b border-[hsl(220,15%,12%)] pb-3 bg-[hsl(240,15%,6%)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Play className="h-5 w-5 text-[hsl(350,100%,50%)]" />
                      <CardTitle className="text-lg font-bold text-white tracking-tight">
                        Recorded Stream
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-[hsl(240,15%,10%)] border border-[hsl(220,15%,18%)] px-3 py-1.5">
                      <Clock className="h-4 w-4 text-[hsl(220,15%,50%)]" />
                      <span className="font-mono text-sm font-bold text-white">
                        {formatDuration(stream.duration_seconds)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 h-[calc(100%-60px)]">
                  <div className="relative h-full min-h-[400px] bg-black">
                    <video
                      src={videoUrl}
                      controls
                      className="h-full w-full object-contain"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Metadata panel */}
            <div className="space-y-4">
              <Card className="border-[hsl(220,15%,12%)] bg-[hsl(240,15%,6%)]">
                <CardHeader className="pb-3 bg-[hsl(240,15%,6%)]">
                  <CardTitle className="flex items-center gap-2 text-base text-white font-bold tracking-tight">
                    <Calendar className="h-4 w-4 text-[hsl(350,100%,50%)]" />
                    Stream Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 bg-[hsl(240,15%,6%)]">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-[hsl(220,15%,45%)]">
                      Stream ID
                    </p>
                    <p className="font-mono text-sm text-[hsl(220,15%,70%)]">{stream.id}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-[hsl(220,15%,45%)]">
                      Started At
                    </p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[hsl(220,15%,50%)]" />
                      <p className="text-sm text-[hsl(220,15%,70%)] font-mono">{formatTimestamp(stream.started_at)}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-[hsl(220,15%,45%)]">
                      Ended At
                    </p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[hsl(220,15%,50%)]" />
                      <p className="text-sm text-[hsl(220,15%,70%)] font-mono">{formatTimestamp(stream.ended_at)}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-[hsl(220,15%,45%)]">
                      Duration
                    </p>
                    <p className="font-mono text-lg font-bold text-[hsl(350,100%,50%)]">
                      {formatDuration(stream.duration_seconds)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[hsl(220,15%,12%)] bg-[hsl(240,15%,6%)]">
                <CardHeader className="pb-3 bg-[hsl(240,15%,6%)]">
                  <CardTitle className="flex items-center gap-2 text-base text-white font-bold tracking-tight">
                    <MapPin className="h-4 w-4 text-[hsl(350,100%,50%)]" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 bg-[hsl(240,15%,6%)]">
                  {/* Always show coordinates in separate boxes */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-[hsl(240,15%,10%)] border border-[hsl(220,15%,18%)] p-2">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-[hsl(220,15%,45%)] mb-1">
                        Latitude
                      </p>
                      <p className="font-mono text-sm text-[hsl(220,15%,70%)]">
                        {stream.latitude.toFixed(6)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-[hsl(240,15%,10%)] border border-[hsl(220,15%,18%)] p-2">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-[hsl(220,15%,45%)] mb-1">
                        Longitude
                      </p>
                      <p className="font-mono text-sm text-[hsl(220,15%,70%)]">
                        {stream.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                  {(stream.latitude !== 0 || stream.longitude !== 0) ? (
                    <a 
                      href={`https://www.google.com/maps?q=${stream.latitude},${stream.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <div className="aspect-video rounded-lg overflow-hidden border border-[hsl(220,15%,18%)] relative group">
                        <img
                          src={`https://static-maps.yandex.ru/1.x/?ll=${stream.longitude},${stream.latitude}&z=15&l=map&size=400,300&pt=${stream.longitude},${stream.latitude},pm2rdl`}
                          alt="Location map"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            Open in Google Maps
                          </span>
                        </div>
                      </div>
                    </a>
                  ) : (
                    <div className="aspect-video rounded-lg bg-[hsl(240,15%,10%)] border border-[hsl(220,15%,18%)] flex items-center justify-center">
                      <div className="text-center">
                        <MapPin className="mx-auto h-8 w-8 text-[hsl(220,15%,30%)]" />
                        <p className="mt-2 text-xs text-[hsl(220,15%,45%)]">No location data</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {stream.notes && stream.notes.trim() !== "" && (
                <Card className="border-[hsl(220,15%,12%)] bg-[hsl(240,15%,6%)]">
                  <CardHeader className="pb-3 bg-[hsl(240,15%,6%)]">
                    <CardTitle className="flex items-center gap-2 text-base text-white font-bold tracking-tight">
                      <FileText className="h-4 w-4 text-[hsl(35,100%,55%)]" />
                      Additional Context
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="bg-[hsl(240,15%,6%)]">
                    <div className="rounded-lg bg-[hsl(35,100%,55%)]/10 border border-[hsl(35,100%,55%)]/30 p-3">
                      <p className="text-sm leading-relaxed text-[hsl(220,15%,70%)]">{stream.notes}</p>
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
