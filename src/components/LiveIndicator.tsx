import { cn } from "@/lib/utils";

interface LiveIndicatorProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LiveIndicator({ className, size = "md" }: LiveIndicatorProps) {
  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="relative flex">
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full bg-emergency opacity-75",
            sizeClasses[size]
          )}
        />
        <span
          className={cn(
            "relative inline-flex rounded-full bg-emergency",
            sizeClasses[size]
          )}
        />
      </span>
      <span className="text-sm font-bold uppercase tracking-wider text-emergency animate-live-pulse">
        Live
      </span>
    </div>
  );
}
