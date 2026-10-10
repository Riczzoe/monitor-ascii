export type MetricPoint = {ts:number; cpu:number; cpu_max?:number; mem_used:number; disk_used:number; net_rx:number; net_tx:number; net_rx_max?:number; net_tx_max?:number; minutes?:number};
export type PingPoint = {task_id:number; ts:number; latency:number|null; loss?:number};
export type History = {metrics:MetricPoint[]; ping:PingPoint[]; probes:Record<string,string>; loss?:Record<string,number>; step?:number};
export function displayProbeName(name:string):string {
  const aliases:Record<string,string>={"江西移动":"Jiangxi Mobile","湖南移动":"Hunan Mobile"};
  return Object.hasOwn(aliases,name.trim()) ? aliases[name.trim()] : name;
}
export function probeStats(data:History) {
  const ids = [...new Set(data.ping.map(p => p.task_id)), ...Object.keys(data.probes).map(Number).filter(id => !data.ping.some(p => p.task_id === id))];
  return ids.map(id => {
    const points = data.ping.filter(p => p.task_id === id).sort((a,b) => a.ts - b.ts);
    return {id,name:displayProbeName(data.probes[id] ?? `Probe ${id}`),points,latest:points.at(-1)?.latency ?? null,
      loss: data.loss ? data.loss[id] ?? 0 : null};
  });
}
// Green below 100 ms, yellow below 200 ms, red otherwise or timeout.
export function latencyBand(value:number|null):"good"|"warn"|"bad" {
  if (value === null || !Number.isFinite(value) || value < 0 || value >= 200) return "bad";
  return value >= 100 ? "warn" : "good";
}

export function lossBand(value:number):"good"|"light"|"warn"|"bad" {
  if (!Number.isFinite(value) || value<0 || value>10) return "bad";
  return value<2 ? "good" : value<5 ? "light" : "warn";
}
