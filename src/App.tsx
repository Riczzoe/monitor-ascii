import { useEffect, useMemo, useState } from "react";
import { api, groupsOf, useNodes } from "./lib/api";
import { loadConfig, resolveConfig } from "./lib/config";
import { Settings } from "./lib/context";
import { formatNode, summarize } from "./lib/model";
import { HeaderStats } from "./components/ascii/HeaderStats";
import { ServerFlag } from "./components/ascii/ServerFlag";
import { regionCode, regionName, regionsOf } from "./lib/regions";
import { ServerTable } from "./components/ascii/ServerTable";
import { AsciiFooter } from "./components/ascii/AsciiFooter";
import "./index.css";

type Me = {site_name:string; authed:boolean; public_page:boolean; history_days?:number};
export default function App() {
  const {nodes,error,closed} = useNodes();
  const [me,setMe] = useState<Me | null>(null);
  const [config,setConfig] = useState(() => resolveConfig({}));
  const [meError,setMeError] = useState("");
  const [group,setGroup] = useState<string | null>(null);
  const [country,setCountry] = useState<string | null>(null);
  const [expanded,setExpanded] = useState<string[]>([]);
  const [expandAll,setExpandAll] = useState(false);
  useEffect(() => {
    let active = true;
    api<Me>("/me").then(value => { if (active) {setMe(value); document.title = value.site_name || "Monitor ASCII";} })
      .catch((e:Error) => { if (active) setMeError(e.message); });
    loadConfig().then(value => {if (active) setConfig(value);});
    return () => {active=false;};
  },[]);
  const groups = useMemo(() => groupsOf(nodes ?? []), [nodes]);
  const chosenGroup = config.show_groups && (group === "" || groups.includes(group ?? "")) ? group : null;
  const groupNodes = useMemo(() => (nodes ?? []).filter(n => chosenGroup === null || (n.group ?? "") === chosenGroup), [nodes,chosenGroup]);
  const countries = useMemo(() => regionsOf(groupNodes), [groupNodes]);
  const chosenCountry = config.show_groups && countries.includes(country ?? "") ? country : null;
  const filtered = useMemo(() => groupNodes.filter(n => chosenCountry === null || regionCode(n.country) === chosenCountry), [groupNodes,chosenCountry]);
  const chooseGroup = (value:string|null) => {setGroup(value);setCountry(null);};
  const stats = summarize(filtered);
  const privatePage = closed || (!!me && !me.public_page && !me.authed);
  return <Settings.Provider value={{config,historyDays:me?.history_days ?? 7}}>
    <main className="min-h-screen p-1 sm:p-2 text-xs bg-[var(--ascii-background)] text-[var(--ascii-primary)]">
      <header className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h1 className="text-sm font-semibold shrink-0">&gt; Monitor</h1>
        {!privatePage && nodes !== null && config.show_stats && <HeaderStats {...stats} />}
      </header>
      {config.notice && <p className="border border-[var(--ascii-border)] p-2 mb-3 whitespace-pre-wrap break-words">{config.notice}</p>}
      {privatePage ? <section role="alert" className="p-4 border border-[var(--ascii-border)]"><p>需要登录后查看</p><a className="underline inline-block mt-2" href="/admin">Sign in / 登录</a></section> : <>
        {(error || meError) && <div role="alert" className="mb-3 text-[var(--ascii-destructive)]">{error || meError} <button className="terminal-control" onClick={() => location.reload()}>Retry</button></div>}
        {nodes === null ? <p role="status">&gt; loading node snapshot...</p> : <>
          <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
            <div className="flex flex-wrap gap-1" aria-label="Node groups">
              {config.show_groups && groups.length > 0 && <>
                <button className="terminal-control" aria-pressed={chosenGroup === null} onClick={() => chooseGroup(null)}>All</button>
                {groups.map(g => <button key={g} className="terminal-control" aria-pressed={chosenGroup === g} onClick={() => chooseGroup(g)}>{g}</button>)}
                {nodes.some(n => !n.group) && <button className="terminal-control" aria-pressed={chosenGroup === ""} onClick={() => chooseGroup("")}>Ungrouped</button>}
              </>}
            </div>
          </div>
          <ServerTable servers={filtered.map(formatNode)} expandedServers={expandAll ? filtered.map(n => String(n.id)) : expanded}
            filters={config.show_groups && <div role="group" aria-label="Country filters" className="flex min-w-0 flex-1 flex-wrap items-center gap-[3px]">
              <button className="terminal-control country-filter" aria-label="All countries" aria-pressed={chosenCountry === null} onClick={() => setCountry(null)}>All</button>
              {countries.map(code => <button key={code} data-country={code} className="terminal-control country-filter" title={regionName(code)} aria-label={`Filter by ${regionName(code)}`} aria-pressed={chosenCountry === code} onClick={() => setCountry(code)}><ServerFlag country_code={code} /></button>)}
            </div>}
            onToggleServer={id => {setExpanded(prev => { const base = expandAll ? filtered.map(n => String(n.id)) : prev; return base.includes(id) ? base.filter(v => v !== id) : [...base,id]; }); setExpandAll(false);}}
            expandAll={expandAll} onToggleExpandAll={() => {if (expandAll) setExpanded([]); setExpandAll(v => !v);}} />
          {filtered.length === 0 && <p className="p-4 text-[var(--ascii-muted)]">{nodes.length === 0 ? "No public nodes yet." : "No matching nodes."}</p>}
          <AsciiFooter upSpeed={stats.upSpeed} downSpeed={stats.downSpeed} />
        </>}
      </>}
    </main>
  </Settings.Provider>;
}
