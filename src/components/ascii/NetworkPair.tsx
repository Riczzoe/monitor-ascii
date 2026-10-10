import { formatCompactBytes } from "@/lib/format";

export function NetworkPair({up,down,available=true,column=false,uploadLabel,downloadLabel}:{
  up:number;down:number;available?:boolean;column?:boolean;uploadLabel:string;downloadLabel:string;
}) {
  return <span className="network-pair" data-aligned={column ? true : undefined}>
    <span className="network-direction" aria-label={uploadLabel}>{available ? formatCompactBytes(up) : "N/A"}</span>
    <span className="network-separator" aria-hidden="true">|</span>
    <span className="network-direction" aria-label={downloadLabel}>{available ? formatCompactBytes(down) : "N/A"}</span>
  </span>;
}
