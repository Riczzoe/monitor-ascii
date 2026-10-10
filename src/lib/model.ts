import type { Node } from "./api.ts";

export function resourceBand(value:number):"good"|"warn"|"bad" {
  return value<50 ? "good" : value<=80 ? "warn" : "bad";
}

export function daysUntil(node: Node): number | null {
  if (node.expires_in !== undefined) return node.expires_in;
  if (!node.expires_at) return null;
  const date = new Date(`${node.expires_at}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Number.isFinite(date.getTime()) ? Math.round((date.getTime() - today.getTime()) / 86400000) : null;
}
export function lastSeenAgo(node: Node): number | null {
  if (node.last_seen_ago !== undefined) return node.last_seen_ago;
  return node.last_seen > 0 ? Math.max(0, Math.floor(Date.now() / 1000 - node.last_seen)) : null;
}
export function formatPrice(price: number, currency: string, cycle: string): string {
  if (!Number.isFinite(price) || price <= 0) return "";
  let amount: string;
  try { amount = new Intl.NumberFormat("zh-CN", { style: "currency", currency, maximumFractionDigits: 2 }).format(price); }
  catch { amount = `${currency} ${price.toFixed(2)}`; }
  const named: Record<string, string> = {monthly:"mo",quarterly:"3mo",semiannual:"6mo",yearly:"yr",biennial:"2yr",triennial:"3yr",once:"once"};
  const period = named[cycle] ?? (/^\d+m$/.test(cycle) ? `${parseInt(cycle)}mo` : cycle);
  return `${amount}${period ? `/${period}` : ""}`;
}
export function monthUsage(node: Node): number {
  if (typeof node.month_used === "number" && Number.isFinite(node.month_used) && node.month_used >= 0) return node.month_used;
  switch (node.traffic_mode) {
    case "up": return node.month_tx;
    case "down": return node.month_rx;
    case "max": return Math.max(node.month_rx,node.month_tx);
    default: return node.month_rx + node.month_tx;
  }
}
export function formatNode(node: Node) {
  const m = node.online ? node.metrics : null;
  const ratio = (used: number, total: number) => total > 0 ? Math.min(100, Math.max(0, used / total * 100)) : 0;
  return {
    uuid: String(node.id), node, name: node.name, country_code: node.country, online: node.online,
    available: !!m, cpu: m?.cpu ?? 0, mem: m ? ratio(m.mem_used, m.mem_total) : 0,
    stg: m ? ratio(m.disk_used, m.disk_total) : 0, up: m?.net_tx ?? 0, down: m?.net_rx ?? 0,
    trafficUsed: monthUsage(node), trafficLimit: node.traffic_limit,
    uptime: m?.uptime ?? 0,
    expired_at: node.expires_at, daysLeft: daysUntil(node),
  };
}
export type ServerView = ReturnType<typeof formatNode>;
export function summarize(nodes: Node[]) {
  return nodes.reduce((s, n) => {
    s.totalServers++; if (n.online) s.onlineServers++; else s.offlineServers++;
    s.upTotal += n.total_tx; s.downTotal += n.total_rx;
    if (n.online && n.metrics) { s.upSpeed += n.metrics.net_tx; s.downSpeed += n.metrics.net_rx; }
    return s;
  }, {totalServers:0,onlineServers:0,offlineServers:0,upTotal:0,downTotal:0,upSpeed:0,downSpeed:0});
}
