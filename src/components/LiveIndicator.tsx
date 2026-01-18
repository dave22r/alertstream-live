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
            "absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(350,100%,55%)] opacity-75",
            sizeClasses[size]
          )}
        />
        <span
          className={cn(
            "relative inline-flex rounded-full bg-[hsl(350,100%,55%)]",
            sizeClasses[size]
          )}
        />
      </span>
      <span className="text-sm font-bold uppercase tracking-wider text-[hsl(350,100%,55%)] animate-emergency-pulse drop-shadow-[0_0_8px_hsl(350,100%,55%)]">
        Live
      </span>
    </div>
  );
}
