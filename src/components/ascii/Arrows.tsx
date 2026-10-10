import { ChevronDown, ChevronUp } from "lucide-react";

// Komari ASCII uses Lucide chevrons for details.
export function ExpandArrow({expanded}:{expanded:boolean}) {
  const Arrow=expanded ? ChevronUp : ChevronDown;
  return <Arrow aria-hidden="true" className="w-3 h-3 shrink-0" />;
}
