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
      <DialogContent className="sm:max-w-md animate-scale-in">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emergency/10">
            <AlertTriangle className="h-7 w-7 text-emergency" />
          </div>
          <DialogTitle className="text-center text-xl">
            Start Emergency Stream
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Your camera, microphone, and location will be shared with emergency
            responders. Use only in genuine emergencies.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Permissions info */}
          <div className="flex flex-wrap justify-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Video className="h-3.5 w-3.5" />
              Camera
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Mic className="h-3.5 w-3.5" />
              Microphone
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              Location
            </div>
          </div>

          {/* Optional notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Additional context (optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="e.g., Room 304, north stairwell..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            variant="emergency"
            size="lg"
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full animate-emergency-pulse"
          >
            {isLoading ? "Starting..." : "Start Streaming"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
