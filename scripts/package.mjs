import { cpSync, mkdirSync, readFileSync, rmSync, statSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
const manifest=JSON.parse(readFileSync("theme.json","utf8"));
for (const key of ["name","short","description","version","author","url"]) {
  if (typeof manifest[key] !== "string" || (["name","short"].includes(key) && !manifest[key])) throw new Error(`Missing ${key}`);
}
if (!/^[A-Za-z0-9_-]+$/.test(manifest.short)) throw new Error("Invalid theme short");
const stage=resolve(".package"), root=join(stage,manifest.short);
rmSync(stage,{recursive:true,force:true}); mkdirSync(root,{recursive:true});
cpSync("theme.json",join(root,"theme.json")); cpSync("dist",join(root,"dist"),{recursive:true});
cpSync("preview.png",join(root,"preview.png"));
cpSync("LICENSE",join(root,"LICENSE")); cpSync("LICENSE-monitor-reference",join(root,"LICENSE-monitor-reference"));
cpSync("LICENSE-IBM-Plex-Mono",join(root,"LICENSE-IBM-Plex-Mono"));
let total=0,count=0;
function inspect(path) {for(const f of readdirSync(path,{withFileTypes:true})) {count++; const target=join(path,f.name); if(f.isDirectory()) inspect(target); else if(f.isFile()) {const size=statSync(target).size; if(size>8*1024*1024) throw new Error(`File too large: ${target}`); total+=size;} else throw new Error(`Non-regular entry: ${target}`);}}
inspect(root); if(total>64*1024*1024 || count>2000) throw new Error("Theme exceeds Monitor limits");
execFileSync("tar",["-czf","theme.tar.gz","-C",root,"theme.json","preview.png","dist","LICENSE","LICENSE-monitor-reference","LICENSE-IBM-Plex-Mono"]);
execFileSync("gzip",["-t","theme.tar.gz"]);
if(statSync("theme.tar.gz").size>32*1024*1024) throw new Error("Archive too large");
rmSync(stage,{recursive:true,force:true});
console.log(`theme.tar.gz: ${count} entries, ${total} unpacked bytes`);
