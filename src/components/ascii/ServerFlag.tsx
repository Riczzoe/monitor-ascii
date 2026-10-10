import { useState } from "react";
export function ServerFlag({country_code}:{country_code:string}) {
  const code = (country_code || "").toUpperCase();
  const [failed,setFailed] = useState(false);
  if (!/^[A-Z]{2}$/.test(code) || failed) return <span className="text-[var(--ascii-muted)]">[{code || "--"}]</span>;
  return <img key={code} src={`/assets/flags/${code}.svg`} width="16" height="12" alt={code} title={code} loading="lazy" onError={() => setFailed(true)} className="shrink-0" />;
}
