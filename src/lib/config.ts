import manifest from "../../theme.json";
import { api } from "./api";
type Field = {type:string; key?:string; default?:unknown; options?:{value:string}[]; min?:number; max?:number};
export type Config = { notice: string; show_stats: boolean; show_groups: boolean; show_ping: boolean };
export function resolveConfig(saved: Record<string, unknown>): Config {
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) saved = {};
  const fits = (f: Field, v: unknown) => {
    switch (f.type) {
      case "boolean": return typeof v === "boolean";
      case "number": return typeof v === "number" && Number.isFinite(v) && v >= (f.min ?? -Infinity) && v <= (f.max ?? Infinity);
      case "select": return !!f.options?.some(o => o.value === v);
      default: return typeof v === "string";
    }
  };
  return Object.fromEntries((manifest.config as Field[]).filter(f => f.type !== "title" && f.key).map(f => [f.key, fits(f, saved[f.key!]) ? saved[f.key!] : f.default])) as Config;
}
export async function loadConfig(): Promise<Config> {
  try { return resolveConfig(await api<Record<string, unknown>>(`/themes/${manifest.short}/config`)); }
  catch { return resolveConfig({}); }
}
