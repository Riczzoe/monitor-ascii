import { NetworkPair } from "./NetworkPair";

interface HeaderStatsProps {
  totalServers:number;
  onlineServers:number;
  upTotal:number;
  downTotal:number;
}
export function HeaderStats({totalServers,onlineServers,upTotal,downTotal}:HeaderStatsProps) {
  return <div className="ml-auto flex items-center gap-2 whitespace-nowrap text-[10px] sm:text-xs" aria-label="Monitor summary">
    <span aria-label="Online servers">Online: {onlineServers}/{totalServers}</span>
    <div className="flex items-center gap-1" aria-label="Total traffic">
      <span>Traffic(↑|↓):</span>
      <NetworkPair up={upTotal} down={downTotal} uploadLabel="Total upload traffic" downloadLabel="Total download traffic" />
    </div>
  </div>;
}
