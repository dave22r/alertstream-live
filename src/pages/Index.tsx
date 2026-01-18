import { useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Shield, Radio, Zap, ChevronRight, Signal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StreamerConfirmModal } from "@/components/StreamerConfirmModal";
import { StreamingView } from "@/components/StreamingView";
import { useMediaStream } from "@/hooks/useMediaStream";
import { useGeolocation } from "@/hooks/useGeolocation";

export default function Index() {
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

  // If streaming, show full-screen streaming view
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

  return (
    <div className="min-h-screen text-white overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Large glow orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[hsl(350,100%,50%)] opacity-[0.04] blur-[120px]" />
        <div className="absolute bottom-[-30%] right-[-10%] w-[700px] h-[700px] rounded-full bg-[hsl(190,100%,50%)] opacity-[0.03] blur-[150px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-12 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[hsl(350,100%,55%)] to-[hsl(350,100%,40%)] opacity-90" />
            <div className="absolute inset-0 rounded-xl bg-[hsl(350,100%,55%)] blur-lg opacity-50" />
            <Shield className="relative h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">SafeStream</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm text-[hsl(220,15%,50%)]">
            <Signal className="h-3.5 w-3.5 text-[hsl(160,100%,45%)]" />
            <span>System Operational</span>
          </div>
          <Button 
            variant="ghost" 
            asChild 
            className="text-[hsl(220,15%,60%)] hover:text-white hover:bg-[hsl(220,15%,12%)] border border-transparent hover:border-[hsl(220,15%,20%)] transition-all duration-300"
          >
            <Link to="/police/login">
              Police Dashboard
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </nav>

      {/* Hero content */}
      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-20 pb-32 text-center lg:px-12 lg:pt-32">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-[hsl(220,15%,18%)] bg-[hsl(240,15%,6%)] px-5 py-2 text-sm animate-fade-in stagger-1">
          <Zap className="h-4 w-4 text-[hsl(35,100%,55%)]" />
          <span className="text-[hsl(220,15%,70%)]">Zero-friction emergency response</span>
        </div>

        {/* Title */}
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl animate-fade-in stagger-2">
          <span className="text-white">Real-time situational</span>
          <br />
          <span className="bg-gradient-to-r from-[hsl(350,100%,60%)] via-[hsl(350,100%,55%)] to-[hsl(20,100%,55%)] bg-clip-text text-transparent">
            awareness for responders
          </span>
        </h1>

        {/* Description */}
        <p className="mx-auto mt-8 max-w-2xl text-lg text-[hsl(220,15%,55%)] lg:text-xl leading-relaxed animate-fade-in stagger-3">
          Instantly share live video, audio, and location with verified law
          enforcement during emergencies. No login. No delays. Just one tap.
        </p>

        {/* CTA */}
        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in stagger-4">
          <Button 
            size="lg" 
            onClick={handleStartClick}
            className="relative h-14 px-8 bg-gradient-to-r from-[hsl(350,100%,50%)] to-[hsl(350,100%,45%)] hover:from-[hsl(350,100%,55%)] hover:to-[hsl(350,100%,50%)] text-white font-semibold text-base gap-3 border-0 shadow-[0_0_40px_-10px_hsl(350,100%,55%)] hover:shadow-[0_0_60px_-10px_hsl(350,100%,60%)] transition-all duration-300 group"
          >
            <div className="absolute inset-0 rounded-md bg-gradient-to-r from-[hsl(350,100%,60%)] to-[hsl(350,100%,50%)] opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
            <Radio className="relative h-5 w-5 animate-glow-pulse" />
            <span className="relative">Start Emergency Stream</span>
          </Button>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="fixed bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(350,100%,55%)] to-transparent opacity-30" />

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
