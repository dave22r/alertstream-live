import { useState, useEffect } from "react";
import { Shield, Radio, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StreamCard, type StreamData } from "@/components/StreamCard";
import { ExpandedStreamView } from "@/components/ExpandedStreamView";

// Mock streams for demo - simulates multiple active streams
const mockStreams: StreamData[] = [
  {
    id: "stream-001",
    isActive: true,
    startedAt: new Date(Date.now() - 45000),
    latitude: 49.2827,
    longitude: -123.1207,
    notes: "Incident near library entrance, hearing loud noises from east wing",
  },
  {
    id: "stream-002",
    isActive: true,
    startedAt: new Date(Date.now() - 120000),
    latitude: 49.2611,
    longitude: -123.2531,
    notes: "Suspicious activity in parking lot B",
  },
  {
    id: "stream-003",
    isActive: true,
    startedAt: new Date(Date.now() - 30000),
    latitude: 49.2768,
    longitude: -123.1120,
    notes: "",
  },
  {
    id: "stream-004",
    isActive: true,
    startedAt: new Date(Date.now() - 200000),
    latitude: 49.2849,
    longitude: -123.1194,
    notes: "Medical emergency in cafeteria, person unresponsive",
  },
];

export default function PoliceDashboard() {
  const [streams, setStreams] = useState<StreamData[]>([]);
  const [selectedStream, setSelectedStream] = useState<StreamData | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [durations, setDurations] = useState<Record<string, number>>({});

  // Simulate streams appearing over time
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    mockStreams.forEach((stream, index) => {
      const timer = setTimeout(() => {
        setStreams(prev => [...prev, stream]);
        setDurations(prev => ({
          ...prev,
          [stream.id]: Math.floor((Date.now() - stream.startedAt.getTime()) / 1000)
        }));
      }, index * 1500);
      timers.push(timer);
    });

    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  // Duration counter for all streams
  useEffect(() => {
    if (streams.length === 0) return;

    const interval = setInterval(() => {
      setDurations(prev => {
        const updated = { ...prev };
        streams.forEach(stream => {
          updated[stream.id] = (updated[stream.id] || 0) + 1;
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [streams]);

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

          <div className="flex items-center gap-4">
            {/* Active streams count */}
            <Badge variant="outline" className="border-emergency/50 bg-emergency/10 text-emergency gap-1.5">
              <Radio className="h-3 w-3" />
              {streams.length} Active Stream{streams.length !== 1 ? "s" : ""}
            </Badge>

            {/* Connection status */}
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
        {streams.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {streams.map(stream => (
              <StreamCard
                key={stream.id}
                stream={stream}
                duration={durations[stream.id] || 0}
                onClick={() => setSelectedStream(stream)}
              />
            ))}
          </div>
        ) : (
          /* No active streams state */
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

      {/* Expanded stream modal */}
      {selectedStream && (
        <ExpandedStreamView
          stream={selectedStream}
          duration={durations[selectedStream.id] || 0}
          onClose={() => setSelectedStream(null)}
        />
      )}
    </div>
  );
}
