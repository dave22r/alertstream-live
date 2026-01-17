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
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-600/10 border border-red-500/20">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>
          <DialogTitle className="text-center text-xl text-white">
            Start Emergency Stream
          </DialogTitle>
          <DialogDescription className="text-center text-base text-zinc-400">
            Your camera, microphone, and location will be shared with emergency
            responders. Use only in genuine emergencies.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Permissions info */}
          <div className="flex flex-wrap justify-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300">
              <Video className="h-3.5 w-3.5" />
              Camera
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300">
              <Mic className="h-3.5 w-3.5" />
              Microphone
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300">
              <MapPin className="h-3.5 w-3.5" />
              Location
            </div>
          </div>

          {/* Optional notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium text-zinc-300">
              Additional context (optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="e.g., Room 304, north stairwell..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] resize-none bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            size="lg"
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
          >
            {isLoading ? "Starting..." : "Start Streaming"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
