import { NetworkPair } from "./NetworkPair";

interface AsciiFooterProps {
  upSpeed: number;
  downSpeed: number;
}

export function AsciiFooter({upSpeed,downSpeed}:AsciiFooterProps) {
  return <footer aria-label="Monitor footer" className="ascii-footer mt-2 sm:mt-4 text-[10px] sm:text-xs text-[var(--ascii-muted)] flex items-center justify-between gap-2 whitespace-nowrap">
    <div className="flex items-center gap-1" aria-label="Network speed">
      <span>Network Speed(↑|↓):</span>
      <NetworkPair up={upSpeed} down={downSpeed} uploadLabel="Total upload speed" downloadLabel="Total download speed" />
    </div>
    <a href="/admin" className="underline hover:text-[var(--ascii-primary)]">Dashboard</a>
  </footer>;
}
