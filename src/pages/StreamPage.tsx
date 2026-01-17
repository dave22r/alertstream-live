import { useState, useCallback } from "react";
import { Radio, Shield, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StreamerConfirmModal } from "@/components/StreamerConfirmModal";
import { StreamingView } from "@/components/StreamingView";
import { useMediaStream } from "@/hooks/useMediaStream";
import { useGeolocation } from "@/hooks/useGeolocation";

export default function StreamPage() {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [notes, setNotes] = useState("");
  const [isStarting, setIsStarting] = useState(false);

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
  }, [stopStream, stopWatching]);

  // Streaming view
  if (isStreaming && stream) {
    return (
      <StreamingView
        stream={stream}
        location={location}
        notes={notes}
        onStop={handleStopStream}
        error={mediaError || undefined}
      />
    );
  }

  // Start screen
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">SafeStream</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8 text-center animate-fade-in">
          {/* Icon */}
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emergency/10">
            <Radio className="h-12 w-12 text-emergency" />
          </div>

          {/* Title */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight">
              Emergency Stream
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              Instantly share live video and location with verified emergency
              responders. No login required.
            </p>
          </div>

          {/* Start button */}
          <div className="pt-4">
            <Button
              variant="emergency"
              size="xl"
              onClick={handleStartClick}
              className="w-full animate-emergency-pulse"
            >
              <Radio className="h-5 w-5" />
              Start Emergency Stream
            </Button>
          </div>

          {/* Info text */}
          <div className="space-y-2 pt-4">
            <p className="text-xs text-muted-foreground">
              Only use in genuine emergencies. Your stream will be visible to
              verified law enforcement only.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border p-4">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
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
