import { useEffect, useRef, useState, useCallback } from "react";
import {
  X, Clock, MapPin, FileText, Radio, Wifi, WifiOff,
  Play, Pause, SkipBack, SkipForward, Circle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { StreamData } from "@/components/StreamCardLive";
import { useViewer } from "@/hooks/useViewer";

interface ExpandedStreamViewProps {
  stream: StreamData;
  duration: number;
  onClose: () => void;
}

export function ExpandedStreamView({ stream, duration, onClose }: ExpandedStreamViewProps) {
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const playbackVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "failed">("connecting");
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [bufferSeconds, setBufferSeconds] = useState(0);

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

  // Start recording the incoming stream for DVR
  useEffect(() => {
    if (!remoteStream) return;

    try {
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";

      const recorder = new MediaRecorder(remoteStream, { mimeType });
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
          setBufferSeconds(recordedChunksRef.current.length);
        }
      };

      recorder.start(1000); // Capture every second
      mediaRecorderRef.current = recorder;

      return () => {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      };
    } catch (err) {
      console.error("[DVR] Failed to start recording:", err);
    }
  }, [remoteStream]);

  useEffect(() => {
    if (stream.id) {
      connect();
    }
    return () => {
      disconnect();
      // Cleanup playback URL
      if (playbackUrl) {
        URL.revokeObjectURL(playbackUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream.id]);

  useEffect(() => {
    if (liveVideoRef.current && remoteStream && isLiveMode) {
      liveVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isLiveMode]);

  // Handle playback video time updates with high-frequency polling for smooth progress bar
  useEffect(() => {
    const video = playbackVideoRef.current;
    if (!video || !playbackUrl) return;

    let animationFrameId: number;
    let isUpdating = true;

    const updateTime = () => {
      if (!isUpdating || !video) return;

      setPlaybackTime(video.currentTime);

      // Update duration if it becomes available (WebM metadata can be delayed)
      if (video.duration && !isNaN(video.duration) && video.duration !== Infinity) {
        setPlaybackDuration(video.duration);
      }

      animationFrameId = requestAnimationFrame(updateTime);
    };

    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration) && video.duration !== Infinity) {
        setPlaybackDuration(video.duration);
      }
    };

    const handleEnded = () => goLive();

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);

    // Start high-frequency updates
    animationFrameId = requestAnimationFrame(updateTime);

    return () => {
      isUpdating = false;
      cancelAnimationFrame(animationFrameId);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackUrl]);

  const createPlaybackBlob = useCallback(() => {
    if (recordedChunksRef.current.length === 0) return null;
    const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
    // Store the estimated duration based on chunk count (each chunk is ~1 second)
    const estimatedDuration = recordedChunksRef.current.length;
    return { url: URL.createObjectURL(blob), estimatedDuration };
  }, []);

  const goLive = useCallback(() => {
    setIsLiveMode(true);
    setIsPaused(false);
    setPlaybackTime(0);
    setPlaybackDuration(0);
    if (playbackUrl) {
      URL.revokeObjectURL(playbackUrl);
      setPlaybackUrl(null);
    }
    if (liveVideoRef.current && remoteStream) {
      liveVideoRef.current.srcObject = remoteStream;
      liveVideoRef.current.play();
    }
  }, [playbackUrl, remoteStream]);

  const pauseStream = useCallback(() => {
    if (isLiveMode) {
      // Switch to playback mode
      const result = createPlaybackBlob();
      if (result) {
        setPlaybackUrl(result.url);
        setPlaybackDuration(result.estimatedDuration); // Use estimated duration immediately
        setIsLiveMode(false);
        setIsPaused(true);
        // Seek to end of recording
        setTimeout(() => {
          if (playbackVideoRef.current) {
            playbackVideoRef.current.currentTime = playbackVideoRef.current.duration || 0;
            playbackVideoRef.current.pause();
          }
        }, 100);
      }
    } else if (playbackVideoRef.current) {
      playbackVideoRef.current.pause();
      setIsPaused(true);
    }
  }, [isLiveMode, createPlaybackBlob]);

  const playStream = useCallback(() => {
    if (isLiveMode) {
      // If in live mode, just ensure video is playing
      liveVideoRef.current?.play();
    } else if (playbackVideoRef.current) {
      playbackVideoRef.current.play();
      setIsPaused(false);
    }
  }, [isLiveMode]);

  const skipBack = useCallback((seconds: number) => {
    if (isLiveMode) {
      // Need to switch to playback mode first
      const result = createPlaybackBlob();
      if (result) {
        setPlaybackUrl(result.url);
        setPlaybackDuration(result.estimatedDuration);
        setIsLiveMode(false);
        setIsPaused(false);
        setTimeout(() => {
          if (playbackVideoRef.current) {
            // Use estimated duration if video duration is not available
            const duration = playbackVideoRef.current.duration && !isNaN(playbackVideoRef.current.duration) && playbackVideoRef.current.duration !== Infinity
              ? playbackVideoRef.current.duration
              : result.estimatedDuration;
            playbackVideoRef.current.currentTime = Math.max(0, duration - seconds);
            playbackVideoRef.current.play();
          }
        }, 100);
      }
    } else if (playbackVideoRef.current) {
      playbackVideoRef.current.currentTime = Math.max(0, playbackVideoRef.current.currentTime - seconds);
    }
  }, [isLiveMode, createPlaybackBlob]);

  const skipForward = useCallback((seconds: number) => {
    if (!isLiveMode && playbackVideoRef.current) {
      const newTime = playbackVideoRef.current.currentTime + seconds;
      // Use playbackDuration state which may have our estimated duration
      const effectiveDuration = playbackVideoRef.current.duration && !isNaN(playbackVideoRef.current.duration) && playbackVideoRef.current.duration !== Infinity
        ? playbackVideoRef.current.duration
        : playbackDuration;
      if (newTime >= effectiveDuration) {
        goLive();
      } else {
        playbackVideoRef.current.currentTime = newTime;
      }
    }
  }, [isLiveMode, goLive, playbackDuration]);

  const handleSeek = useCallback((value: number[]) => {
    if (!isLiveMode && playbackVideoRef.current) {
      playbackVideoRef.current.currentTime = value[0];
      setPlaybackTime(value[0]); // Immediate feedback
    }
  }, [isLiveMode]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
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

  const hasValidLocation = stream.latitude !== 0 || stream.longitude !== 0;

  return (
    <div className="fixed inset-0 z-50 bg-[hsl(240,15%,3%)]">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[hsl(220,15%,12%)] px-6 py-4 bg-[hsl(240,15%,5%)]">
          <div className="flex items-center gap-3">
            <Badge className="bg-[hsl(350,100%,50%)] text-white text-xs font-bold px-2 py-1 gap-1.5 border-0 shadow-[0_0_15px_-3px_hsl(350,100%,55%)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              LIVE
            </Badge>
            <h2 className="text-xl font-bold text-white tracking-tight font-mono">Stream: {stream.id.substring(0, 12)}...</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-[hsl(220,15%,50%)] hover:text-white hover:bg-[hsl(240,15%,12%)]"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 overflow-auto bg-[hsl(240,15%,3%)]">
          <div className="grid gap-6 lg:grid-cols-3 h-full">
            {/* Video feed - takes up 2 columns */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden border-[hsl(220,15%,12%)] bg-[hsl(240,15%,6%)] h-full flex flex-col">
                <CardHeader className="border-b border-[hsl(220,15%,12%)] pb-3 bg-[hsl(240,15%,6%)] flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Radio className="h-5 w-5 text-[hsl(350,100%,55%)]" />
                      <CardTitle className="text-lg font-bold text-white tracking-tight">
                        {isLiveMode ? "Live Feed" : "Playback"}
                      </CardTitle>
                      {!isLiveMode && (
                        <Badge className="bg-[hsl(190,100%,50%)]/20 text-[hsl(190,100%,60%)] border border-[hsl(190,100%,50%)]/30 text-xs font-mono">
                          DVR
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col">
                  {/* Fixed 16:9 aspect ratio container for consistent video display */}
                  <div className="relative w-full bg-black" style={{ paddingTop: "56.25%" }}>
                    <div className="absolute inset-0">
                    {/* Live Video */}
                    {isLiveMode && remoteStream && (
                      <video
                        ref={liveVideoRef}
                        autoPlay
                        playsInline
                        muted={false}
                        className="h-full w-full object-cover"
                      />
                    )}

                    {/* Playback Video */}
                    {!isLiveMode && playbackUrl && (
                      <video
                        ref={playbackVideoRef}
                        src={playbackUrl}
                        autoPlay
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    )}

                    {/* Connecting state */}
                    {!remoteStream && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(350,100%,55%)]/10 border border-[hsl(350,100%,55%)]/30 shadow-[0_0_30px_-5px_hsl(350,100%,55%)]">
                            <Radio className="h-8 w-8 text-[hsl(350,100%,55%)] animate-pulse" />
                          </div>
                          <p className="text-sm text-[hsl(220,15%,65%)]">
                            {error ? "Failed to connect" : "Connecting to live stream..."}
                          </p>
                          <p className="mt-1 text-xs text-[hsl(220,15%,45%)] font-mono">
                            Stream ID: {stream.id.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Top badges */}
                    <div className="absolute left-4 top-4 flex gap-2 pointer-events-none">
                      {isLiveMode ? (
                        <Badge className="bg-[hsl(350,100%,50%)] text-white gap-1.5 px-3 py-1 border-0 shadow-[0_0_15px_-3px_hsl(350,100%,55%)]">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                          </span>
                          LIVE
                        </Badge>
                      ) : (
                        <Badge className="bg-[hsl(190,100%,50%)] text-black font-bold gap-1.5 px-3 py-1 border-0 shadow-[0_0_15px_-3px_hsl(190,100%,50%)]">
                          <Play className="h-3 w-3" />
                          PLAYBACK
                        </Badge>
                      )}
                      {isReceiving ? (
                        <Badge className="bg-[hsl(160,100%,45%)]/20 text-[hsl(160,100%,55%)] border border-[hsl(160,100%,45%)]/30 gap-1 font-mono">
                          <Wifi className="h-3 w-3" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge className="bg-[hsl(35,100%,55%)]/20 text-[hsl(35,100%,60%)] border border-[hsl(35,100%,55%)]/30 gap-1 font-mono">
                          <WifiOff className="h-3 w-3" />
                          {error ? "Error" : "Connecting..."}
                        </Badge>
                      )}
                    </div>
                    </div>
                  </div>

                  {/* DVR Controls */}
                  <div className="border-t border-[hsl(220,15%,12%)] bg-[hsl(240,15%,6%)] p-4 flex-shrink-0">
                    {/* Progress bar for playback mode - always show when not live */}
                    {!isLiveMode && (
                      <div className="mb-4">
                        <div className="relative">
                          <Slider
                            value={[playbackTime]}
                            max={playbackDuration || 1}
                            step={0.1}
                            onValueChange={handleSeek}
                            className="w-full [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2 [&_[role=slider]]:border-[hsl(190,100%,50%)] [&_[role=slider]]:bg-[hsl(190,100%,50%)]"
                          />
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-[hsl(220,15%,50%)] font-mono">
                          <span className="bg-[hsl(240,15%,10%)] px-2 py-0.5 rounded border border-[hsl(220,15%,18%)]">{formatDuration(playbackTime)}</span>
                          <span className="bg-[hsl(240,15%,10%)] px-2 py-0.5 rounded border border-[hsl(220,15%,18%)]">{formatDuration(playbackDuration)}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => skipBack(10)}
                        disabled={!remoteStream || bufferSeconds < 2}
                        className="border-[hsl(220,15%,18%)] bg-[hsl(240,15%,10%)] hover:bg-[hsl(240,15%,15%)] text-[hsl(220,15%,70%)] hover:text-white"
                      >
                        <SkipBack className="h-4 w-4 mr-1" />
                        10s
                      </Button>

                      {(isLiveMode || !isPaused) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={pauseStream}
                          disabled={!remoteStream}
                          className="border-[hsl(220,15%,18%)] bg-[hsl(240,15%,10%)] hover:bg-[hsl(240,15%,15%)] text-[hsl(220,15%,70%)] hover:text-white w-20"
                        >
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={playStream}
                          className="border-[hsl(220,15%,18%)] bg-[hsl(240,15%,10%)] hover:bg-[hsl(240,15%,15%)] text-[hsl(220,15%,70%)] hover:text-white w-20"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Play
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => skipForward(10)}
                        disabled={isLiveMode}
                        className="border-[hsl(220,15%,18%)] bg-[hsl(240,15%,10%)] hover:bg-[hsl(240,15%,15%)] text-[hsl(220,15%,70%)] hover:text-white"
                      >
                        10s
                        <SkipForward className="h-4 w-4 ml-1" />
                      </Button>

                      <Button
                        variant={isLiveMode ? "default" : "outline"}
                        size="sm"
                        onClick={goLive}
                        disabled={isLiveMode}
                        className={isLiveMode
                          ? "bg-[hsl(350,100%,50%)] hover:bg-[hsl(350,100%,55%)] text-white shadow-[0_0_15px_-3px_hsl(350,100%,55%)]"
                          : "border-[hsl(350,100%,55%)]/50 text-[hsl(350,100%,60%)] hover:bg-[hsl(350,100%,55%)]/20"
                        }
                      >
                        <Circle className="h-3 w-3 fill-current mr-1" />
                        Go Live
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Metadata panel */}
            <div className="space-y-4">
              <Card className="border-[hsl(220,15%,12%)] bg-[hsl(240,15%,6%)]">
                <CardHeader className="pb-3 bg-[hsl(240,15%,6%)]">
                  <CardTitle className="flex items-center gap-2 text-base text-white font-bold tracking-tight">
                    <Radio className="h-4 w-4 text-[hsl(350,100%,55%)]" />
                    Stream Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 bg-[hsl(240,15%,6%)]">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-[hsl(220,15%,45%)]">
                      Stream ID
                    </p>
                    <p className="font-mono text-sm text-[hsl(220,15%,70%)] break-all">{stream.id}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-[hsl(220,15%,45%)]">
                      Started At
                    </p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[hsl(220,15%,50%)]" />
                      <p className="text-sm text-[hsl(220,15%,70%)] font-mono">{formatTimestamp(stream.startedAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[hsl(220,15%,12%)] bg-[hsl(240,15%,6%)]">
                <CardHeader className="pb-3 bg-[hsl(240,15%,6%)]">
                  <CardTitle className="flex items-center gap-2 text-base text-white font-bold tracking-tight">
                    <MapPin className="h-4 w-4 text-[hsl(190,100%,50%)]" />
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

                  {hasValidLocation ? (
                    <a
                      href={`https://www.google.com/maps?q=${stream.latitude},${stream.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <div className="aspect-video rounded-lg overflow-hidden border border-[hsl(220,15%,18%)] relative group">
                        <img
                          src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s-l+f00(${stream.longitude},${stream.latitude})/${stream.longitude},${stream.latitude},15,0/400x300@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw`}
                          alt="Location map"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to OpenStreetMap tiles if Mapbox fails
                            const target = e.target as HTMLImageElement;
                            const zoom = 15;
                            const scale = Math.pow(2, zoom);
                            const x = Math.floor((stream.longitude + 180) / 360 * scale);
                            const y = Math.floor((1 - Math.log(Math.tan(stream.latitude * Math.PI / 180) + 1 / Math.cos(stream.latitude * Math.PI / 180)) / Math.PI) / 2 * scale);
                            target.src = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
                          }}
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
                        <p className="mt-2 text-xs text-[hsl(220,15%,45%)]">Acquiring location...</p>
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
