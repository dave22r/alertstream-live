import { useState } from "react";
import { AlertTriangle, MapPin, Mic, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface StreamerConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (notes: string) => void;
  isLoading?: boolean;
}

export function StreamerConfirmModal({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: StreamerConfirmModalProps) {
  const [notes, setNotes] = useState("");

  const handleConfirm = () => {
    onConfirm(notes);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[hsl(240,15%,6%)] border-[hsl(220,15%,15%)] shadow-2xl">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(350,100%,55%)]/10 border border-[hsl(350,100%,55%)]/30 shadow-[0_0_20px_-5px_hsl(350,100%,55%)]">
            <AlertTriangle className="h-7 w-7 text-[hsl(350,100%,55%)] animate-pulse" />
          </div>
          <DialogTitle className="text-center text-xl font-bold text-white tracking-tight">
            Start Emergency Stream
          </DialogTitle>
          <DialogDescription className="text-center text-base text-[hsl(220,15%,55%)]">
            Your camera, microphone, and location will be shared with emergency
            responders. Use only in genuine emergencies.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Permissions info */}
          <div className="flex flex-wrap justify-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-[hsl(240,15%,10%)] border border-[hsl(220,15%,18%)] px-3 py-1.5 text-xs font-mono font-medium text-[hsl(220,15%,70%)]">
              <Video className="h-3.5 w-3.5 text-[hsl(190,100%,50%)]" />
              Camera
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-[hsl(240,15%,10%)] border border-[hsl(220,15%,18%)] px-3 py-1.5 text-xs font-mono font-medium text-[hsl(220,15%,70%)]">
              <Mic className="h-3.5 w-3.5 text-[hsl(190,100%,50%)]" />
              Microphone
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-[hsl(240,15%,10%)] border border-[hsl(220,15%,18%)] px-3 py-1.5 text-xs font-mono font-medium text-[hsl(220,15%,70%)]">
              <MapPin className="h-3.5 w-3.5 text-[hsl(190,100%,50%)]" />
              Location
            </div>
          </div>

          {/* Optional notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium text-[hsl(220,15%,65%)]">
              Additional context (optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="e.g., Room 304, north stairwell..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] resize-none bg-[hsl(240,15%,8%)] border-[hsl(220,15%,18%)] text-white placeholder:text-[hsl(220,15%,40%)] focus:border-[hsl(190,100%,50%)]/50 focus:ring-1 focus:ring-[hsl(190,100%,50%)]/30"
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            size="lg"
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[hsl(350,100%,50%)] to-[hsl(350,100%,60%)] hover:from-[hsl(350,100%,55%)] hover:to-[hsl(350,100%,65%)] text-white font-bold shadow-[0_0_25px_-5px_hsl(350,100%,55%)] hover:shadow-[0_0_35px_-5px_hsl(350,100%,55%)] transition-all duration-300"
          >
            {isLoading ? "Starting..." : "Start Streaming"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full text-[hsl(220,15%,50%)] hover:text-white hover:bg-[hsl(240,15%,12%)]"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
