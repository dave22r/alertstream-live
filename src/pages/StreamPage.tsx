import { useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Radio, Shield, Phone, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StreamerConfirmModal } from "@/components/StreamerConfirmModal";
import { StreamingView } from "@/components/StreamingView";
import { useMediaStream } from "@/hooks/useMediaStream";
import { useGeolocation } from "@/hooks/useGeolocation";

export default function StreamPage() {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [notes, setNotes] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const streamIdRef = useRef<string>(crypto.randomUUID());

  const { stream, isStreaming, error: mediaError, startStream, stopStream } = useMediaStream();
  const { location, watchLocation, stopWatching } = useGeolocation();

  const handleStartClick = () => {
    // Start location tracking early so we have coordinates when stream starts
    watchLocation();
    setShowConfirmModal(true);
  };

  const handleConfirmStream = useCallback(
    async (userNotes: string) => {
      setIsStarting(true);
      setNotes(userNotes);

      // Start media stream
      const success = await startStream();

      if (success) {
        setShowConfirmModal(false);
      }

      setIsStarting(false);
    },
    [startStream]
  );

  const handleStopStream = useCallback(() => {
    stopStream();
    stopWatching();
    setNotes("");
    // Generate new stream ID for next stream
    streamIdRef.current = crypto.randomUUID();
  }, [stopStream, stopWatching]);

  // Streaming view
  if (isStreaming && stream) {
    return (
      <StreamingView
        stream={stream}
        streamId={streamIdRef.current}
        location={location}
        notes={notes}
        onStop={handleStopStream}
        error={mediaError || undefined}
      />
    );
  }

  // Start screen - tactical dark theme
  return (
    <div className="flex min-h-screen flex-col">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-30%] left-[50%] translate-x-[-50%] w-[800px] h-[800px] rounded-full bg-[hsl(350,100%,50%)] opacity-[0.03] blur-[150px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-[hsl(220,15%,12%)] px-4 py-3 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[hsl(350,100%,55%)] to-[hsl(350,100%,40%)]" />
            <div className="absolute inset-0 rounded-xl bg-[hsl(350,100%,55%)] blur-md opacity-40" />
            <Shield className="relative h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">SafeStream</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-8 w-8 p-0 text-[hsl(220,15%,45%)] hover:text-white hover:bg-[hsl(220,15%,15%)]"
        >
          <Link to="/">
            <Home className="h-4 w-4" />
          </Link>
        </Button>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8 text-center">
          {/* Icon */}
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[hsl(350,100%,50%)/0.1] border border-[hsl(350,100%,50%)/0.2] animate-fade-in stagger-1">
            <div className="relative">
              <Radio className="h-14 w-14 text-[hsl(350,100%,60%)] animate-glow-pulse" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-3 animate-fade-in stagger-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              Emergency Stream
            </h1>
            <p className="text-base text-[hsl(220,15%,55%)] leading-relaxed">
              Instantly share live video and location with verified emergency
              responders. No login required.
            </p>
          </div>

          {/* Start button */}
          <div className="pt-4 animate-fade-in stagger-3">
            <Button
              size="lg"
              onClick={handleStartClick}
              className="relative w-full h-14 text-base font-bold bg-gradient-to-r from-[hsl(350,100%,50%)] to-[hsl(350,100%,45%)] hover:from-[hsl(350,100%,55%)] hover:to-[hsl(350,100%,50%)] text-white gap-3 border-0 shadow-[0_0_50px_-10px_hsl(350,100%,55%)] hover:shadow-[0_0_70px_-10px_hsl(350,100%,60%)] transition-all duration-300 group"
            >
              <div className="absolute inset-0 rounded-md bg-gradient-to-r from-[hsl(350,100%,60%)] to-[hsl(350,100%,50%)] opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
              <Radio className="relative h-5 w-5" />
              <span className="relative">Start Emergency Stream</span>
            </Button>
          </div>

          {/* Info text */}
          <div className="space-y-2 pt-4 animate-fade-in stagger-4">
            <p className="text-xs text-[hsl(220,15%,40%)]">
              Only use in genuine emergencies. Your stream will be visible to
              verified law enforcement only.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[hsl(220,15%,12%)] p-4 animate-fade-in stagger-5">
        <div className="flex items-center justify-center gap-2 text-sm text-[hsl(220,15%,40%)]">
          <Phone className="h-4 w-4 text-[hsl(350,100%,55%)]" />
          <span>For immediate danger, always call 911 first</span>
        </div>
      </footer>

      {/* Confirmation modal */}
      <StreamerConfirmModal
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        onConfirm={handleConfirmStream}
        isLoading={isStarting}
      />
    </div>
  );
}
