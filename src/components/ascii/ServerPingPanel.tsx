import { useContext, useEffect, useState } from "react";
import type { Node } from "@/lib/api";
import { pingHistory } from "@/lib/ping";
import { Settings } from "@/lib/context";
import { latencyBand, lossBand, probeStats, type History, type PingPoint } from "@/lib/history";

const ranges=[{label:"1h",hours:1},{label:"6h",hours:6},{label:"1d",hours:24},{label:"7d",hours:168},{label:"30d",hours:720}];

function LatencyBars({name,points,hours,end}:{name:string;points:PingPoint[];hours:number;end:number}) {
  const start=end-hours*3600;
  const samples=points.filter(p => p.ts>=start && p.ts<=end).slice(-120);
  const max=Math.max(200,...samples.map(p => p.latency ?? 0));
  const width=3;
  return <svg role="img" aria-label={`${name} latency bars`} viewBox="0 0 480 64" className="w-full h-8" preserveAspectRatio="none">
    <line x1="0" x2="480" y1="62" y2="62" stroke="var(--ascii-border)" />
    {samples.map((point,i) => {
      const height=point.latency === null ? 56 : Math.max(3,point.latency/max*56);
      const x=Math.min(480-width,Math.max(0,(point.ts-start)/(end-start)*480-width/2));
      return <rect key={`${point.ts}-${i}`} x={x} y={62-height} width={width} height={height} fill={`var(--latency-${latencyBand(point.latency)})`}>
        <title>{point.latency === null ? "Timeout" : `${Math.round(point.latency)} ms`}</title>
      </rect>;
    })}
  </svg>;
}
export function ServerPingPanel({node}:{node:Node}) {
  const {historyDays}=useContext(Settings);
  const [selectedHours,setSelectedHours]=useState(6);
  const retentionHours=(Number.isFinite(historyDays) ? Math.max(1,Math.floor(historyDays)) : 30)*24;
  const hours=Math.min(selectedHours,retentionHours);
  const [snapshot,setSnapshot]=useState<{data:History;end:number;hours:number}|null>(null);
  const [error,setError]=useState("");
  useEffect(() => {
    let epoch=0,disposed=false,busy=false;
    const load=async () => {
      if (document.hidden || busy || disposed) return;
      busy=true;const started=epoch;
      try {
        const result=await pingHistory(`/nodes/${node.id}/metrics?hours=${hours}&points=120&series=ping`,() => !disposed && started===epoch);
        if (!result) return;
        if (!disposed && started===epoch) {
          if (!Array.isArray(result.ping)||!result.probes||typeof result.probes!=="object") throw new Error("延迟数据格式不正确");
          const ping=result.ping.filter(p => p && Number.isSafeInteger(p.task_id) && Number.isFinite(p.ts))
            .map(p => ({...p,latency:typeof p.latency==="number" && Number.isFinite(p.latency) && p.latency>=0 ? p.latency : null}));
          setSnapshot({data:{...result,ping},end:Math.floor(Date.now()/1000),hours});setError("");
        }
      } catch(e) {if (!disposed && started===epoch) setError(e instanceof Error ? e.message : "Latency unavailable");}
      finally {if (started===epoch) busy=false;}
    };
    setSnapshot(null);setError("");void load();
    const timer=setInterval(load,60_000);
    const visibility=() => {epoch++;busy=false;if (!document.hidden) void load();};
    document.addEventListener("visibilitychange",visibility);
    return () => {disposed=true;epoch++;clearInterval(timer);document.removeEventListener("visibilitychange",visibility);};
  },[node.id,hours]);
  const current=snapshot?.hours===hours ? snapshot : null;
  const probes=current ? probeStats(current.data).slice(0,3) : [];
  return <section className="w-full" aria-label={`Latency for ${node.name}`}>
    <div className="latency-toolbar">
      <h3 className="font-bold">Latency Check</h3>
      <div role="group" aria-label="Latency time range" className="latency-ranges">
        {ranges.map(range => <button key={range.hours} className="latency-range" aria-pressed={selectedHours===range.hours} onClick={() => setSelectedHours(range.hours)}>{range.label}</button>)}
      </div>
    </div>
    {selectedHours>retentionHours && <p className="mb-2 text-[var(--ascii-muted)]">Available history: {retentionHours/24}d</p>}
    {error && <p role="alert" className="text-[var(--ascii-destructive)]">{error}</p>}
    {!current && !error && <p role="status" className="text-[var(--ascii-muted)]">Fetching ping tasks...</p>}
    {current && <div className="latency-grid">
      {probes.map(p => <div key={p.id} className="min-w-0">
        <p className="m-0 mb-1 break-words">{p.name}: <span className="latency-value" data-band={p.points.length ? latencyBand(p.latest) : undefined}>
          {p.points.length ? (p.latest===null ? "Timeout" : `${Math.round(p.latest)} ms`) : "No samples"}</span>
          {p.loss !== null && p.points.length>0 && <span className="loss-label"> (<span className="loss-value" data-band={lossBand(p.loss)}>{p.loss.toFixed(1)}%</span> loss)</span>}
        </p>
        <LatencyBars name={p.name} points={p.points} hours={hours} end={current.end} />
      </div>)}
      {!probes.length && <p className="text-[var(--ascii-muted)]">No ping tasks configured.</p>}
    </div>}
  </section>;
}
