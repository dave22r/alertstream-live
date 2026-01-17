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
    setShowConfirmModal(true);
  };

  const handleConfirmStream = useCallback(
    async (userNotes: string) => {
      setIsStarting(true);
      setNotes(userNotes);

      // Start location tracking
      watchLocation();

      // Start media stream
      const success = await startStream();

      if (success) {
        setShowConfirmModal(false);
      }

      setIsStarting(false);
    },
    [startStream, watchLocation]
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

  // Start screen - dark zinc theme
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white">SafeStream</span>
        </div>
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
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8 text-center">
          {/* Icon */}
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-600/10 border border-red-500/20">
            <Radio className="h-12 w-12 text-red-500" />
          </div>

          {/* Title */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Emergency Stream
            </h1>
            <p className="text-base text-zinc-400 leading-relaxed">
              Instantly share live video and location with verified emergency
              responders. No login required.
            </p>
          </div>

          {/* Start button */}
          <div className="pt-4">
            <Button
              size="lg"
              onClick={handleStartClick}
              className="w-full h-14 text-base font-semibold bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              <Radio className="h-5 w-5" />
              Start Emergency Stream
            </Button>
          </div>

          {/* Info text */}
          <div className="space-y-2 pt-4">
            <p className="text-xs text-zinc-500">
              Only use in genuine emergencies. Your stream will be visible to
              verified law enforcement only.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 p-4">
        <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
          <Phone className="h-4 w-4" />
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
