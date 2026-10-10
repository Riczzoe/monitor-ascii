import { cn } from "@/utils";
import { resourceBand } from "@/lib/model";

interface AsciiProgressProps {
  value?: number;
  segments?: number;
  className?: string;
}

export function AsciiProgress({
  value = 0,
  segments = 20,
  className,
}: AsciiProgressProps) {
  const color={good:"bg-[var(--resource-good)]",warn:"bg-[var(--resource-warn)]",bad:"bg-[var(--resource-bad)]"}[resourceBand(value)];
  const segmentArray = Array.from({ length: segments }, (_, i) => {
    const segmentValue = (i + 1) * (100 / segments);
    return value >= segmentValue;
  });

  return (
    <div className={cn("resource-progress flex gap-px", className)} style={{width:"100%",maxWidth:56,minWidth:0}} aria-hidden="true">
      {segmentArray.map((isActive, i) => (
        <div
          key={i}
          className={cn(
            "h-2 w-0.5 transition-colors duration-200",
            isActive ? color : "bg-[var(--ascii-primary-muted)]"
          )}
        />
      ))}
    </div>
  );
}
