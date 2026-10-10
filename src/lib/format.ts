const units=["B","K","M","G","T","P","E"];
export function formatCompactBytes(bytes:number):string {
  if (!Number.isFinite(bytes) || bytes<0) return "N/A";
  let index=bytes>0 ? Math.min(units.length-1,Math.max(0,Math.floor(Math.log2(bytes)/10))) : 0;
  let value=bytes/1024**index;
  if (Math.round(value)>=1024 && index<units.length-1) {index++;value/=1024;}
  return `${Math.round(value)}${units[index]}`;
}

