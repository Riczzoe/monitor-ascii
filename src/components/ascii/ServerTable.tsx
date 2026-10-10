import { Fragment, type ReactNode } from "react";
import { ExpandArrow } from "./Arrows";
import { cn } from "@/utils";
import { resourceBand, type ServerView } from "@/lib/model";
import { ServerFlag } from "./ServerFlag";
import { ServerDetails } from "./ServerDetails";
import { AsciiProgress } from "./AsciiProgress";
import { NetworkPair } from "./NetworkPair";

interface ServerTableProps {
  servers: ServerView[];
  expandedServers: string[];
  onToggleServer: (id: string) => void;
  expandAll: boolean;
  onToggleExpandAll: () => void;
  filters?: ReactNode;
}
export function ServerTable({servers,expandedServers,onToggleServer,expandAll,onToggleExpandAll,filters}:ServerTableProps) {
  return <div className="server-table-wrap border border-[var(--ascii-border)] rounded">
    <div className="p-2 border-b border-[var(--ascii-border)] flex items-center justify-between gap-2">
      {filters}
      <button onClick={onToggleExpandAll} className="ml-auto flex shrink-0 items-center gap-1">
        <ExpandArrow expanded={expandAll} />
        {expandAll ? "Collapse All" : "Expand All"}
      </button>
    </div>
    <table aria-label="Server metrics" className="server-table w-full text-left text-[10px] sm:text-xs whitespace-nowrap table-fixed">
      <thead><tr className="bg-[var(--ascii-card)]">
        <th className="server-column p-1 sm:p-2">Server</th>
        <th className="p-1 sm:p-2 text-center">CPU</th>
        <th className="p-1 sm:p-2 text-center">Memory</th>
        <th className="p-1 sm:p-2 text-center">Storage</th>
        <th className="network-cell py-1 sm:p-2 text-center">Network(↑|↓)</th>
        <th className="traffic-column p-1 sm:p-2 text-center">Traffic(↑|↓)</th>
        <th className="expiry-column p-1 sm:p-2">Expiry</th>
        <th className="uptime-column p-1 sm:p-2">Uptime</th>
      </tr></thead>
      <tbody>{servers.map(server => {
        const isExpanded = expandedServers.includes(server.uuid);
        return <Fragment key={server.uuid}>
          <tr onClick={() => onToggleServer(server.uuid)} className={cn("server-row border-t border-[var(--ascii-border)] cursor-pointer hover:bg-[var(--ascii-card)]",isExpanded && "bg-[var(--ascii-card)]")}>
            <td className="server-name p-1 sm:p-2"><div className="flex items-center gap-1">
              <ServerFlag country_code={server.country_code} />
              <button className={cn("truncate text-left",server.online ? "text-[var(--ascii-server)]" : "text-[var(--ascii-destructive)]")} title={server.name} aria-expanded={isExpanded} aria-label={`Toggle details for ${server.name}`}
                onClick={e => {e.stopPropagation();onToggleServer(server.uuid);}}>{server.name}</button>
            </div></td>
            {[{name:"CPU",value:server.cpu},{name:"Memory",value:server.mem},{name:"Storage",value:server.stg}].map(metric =>
              <td key={metric.name} className="resource-cell p-1 sm:p-2" aria-label={`${metric.name} usage`}>
                <div className="resource-content">
                  <AsciiProgress value={server.available ? metric.value : 0} className="w-14" />
                  <span className="resource-value" data-band={server.available ? resourceBand(metric.value) : undefined}>{server.available ? `${Math.round(metric.value)}%` : "N/A"}</span>
                </div>
              </td>)}
            <td className="network-cell p-1 sm:p-2 text-center" aria-label="Upload/download speed">
              <NetworkPair up={server.up} down={server.down} column available={server.available} uploadLabel="Node upload speed" downloadLabel="Node download speed" />
            </td>
            <td className="traffic-column p-1 sm:p-2" aria-label="Period traffic usage">
              <NetworkPair up={server.node.month_tx} down={server.node.month_rx} column uploadLabel="Period upload traffic" downloadLabel="Period download traffic" />
            </td>
            <td className="expiry-column time-cell p-1 sm:p-2" data-urgency={server.daysLeft === null ? undefined : server.daysLeft < 3 ? "urgent" : server.daysLeft < 7 ? "soon" : undefined}>{formatExpiry(server)}</td>
            <td className="uptime-column time-cell p-1 sm:p-2">{server.available ? formatUptime(server.uptime) : "N/A"}</td>
          </tr>
          {isExpanded && <tr className="server-detail-row border-t border-[var(--ascii-border)]"><td colSpan={8} className="p-2"><ServerDetails server={server} /></td></tr>}
        </Fragment>;
      })}</tbody>
    </table>
  </div>;
}
function formatUptime(seconds:number):string {
  if (seconds >= 86400) return `${Math.floor(seconds/86400)}d`;
  if (seconds >= 3600) return `${Math.floor(seconds/3600)}h`;
  return `${Math.floor(seconds/60)}m`;
}
function formatExpiry(server:ServerView):string {
  if (server.daysLeft === null) return "N/A";
  if (server.daysLeft < 0) return "Expired";
  if (server.daysLeft > 36500) return "Long term";
  return `${server.daysLeft}d`;
}
