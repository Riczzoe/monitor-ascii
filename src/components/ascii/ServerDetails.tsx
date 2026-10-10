import { useContext } from "react";
import { formatCompactBytes } from "@/lib/format";
import type { ServerView } from "@/lib/model";
import { Settings } from "@/lib/context";
import { ServerPingPanel } from "./ServerPingPanel";
export function ServerDetails({server}:{server:ServerView}) {
  const {config} = useContext(Settings);
  const n = server.node, m = server.available ? n.metrics : null;
  const swapTotal = m?.swap_total ?? n.swap_total;
  const usage = (v: number | undefined) => v === undefined ? "N/A" : formatCompactBytes(v);
  const capacity = (used:number|undefined,total:number|undefined) => `${usage(used)}/${usage(total)}`;
  return <div className="flex gap-4 sm:text-xs text-[10px] flex-wrap whitespace-normal break-words w-[min(100%,calc(100vw-32px))]">
    <div className="space-y-1 min-w-0 max-w-full"><h3 className="font-bold">System Info</h3><p>Platform: {n.os || "N/A"}</p><p>Kernel: {n.kernel || "N/A"}</p><p>Arch: {n.arch || "N/A"}</p></div>
    <div className="space-y-1 min-w-0 max-w-full"><h3 className="font-bold">Hardware Info</h3><p>CPU: {n.cpu_name || "N/A"} ({n.cpu_cores} cores)</p><p className="flex items-baseline gap-2 whitespace-nowrap"><span data-memory-usage>Memory: {capacity(m?.mem_used,m?.mem_total ?? n.mem_total)}</span>{swapTotal > 0 && <span data-swap-usage>Swap: {capacity(m?.swap_used,swapTotal)}</span>}</p><p>Disk: {capacity(m?.disk_used,m?.disk_total ?? n.disk_total)}</p></div>
    <div className="space-y-1 min-w-0 max-w-full"><h3 className="font-bold">Agent Info</h3><p>TCP/UDP: {m ? `${m.tcp}/${m.udp}` : "N/A"}</p><p>Processes: {m?.procs ?? "N/A"}</p><p>Version: {n.agent_version || "N/A"}</p></div>
    {config.show_ping && <ServerPingPanel node={n} />}
  </div>;
}
