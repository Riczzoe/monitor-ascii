import test from "node:test";
import assert from "node:assert/strict";
import { safeNodes, groupsOf, type Node } from "../src/lib/api.ts";
import { daysUntil, lastSeenAgo, formatPrice, formatNode, monthUsage, summarize, resourceBand } from "../src/lib/model.ts";
import { latencyBand, lossBand, probeStats, displayProbeName } from "../src/lib/history.ts";
const offline = {id:1,name:"Offline",group:"all",country:"US",online:false,total_rx:1024,total_tx:2048,month_rx:0,month_tx:0,metrics:null,expires_at:"1990-01-01",expires_in:12,last_seen:0,last_seen_ago:60} as Node;
test("hub clock values are authoritative, including explicit nulls", () => {
  assert.equal(daysUntil(offline),12); assert.equal(daysUntil({...offline,expires_in:null}),null);
  assert.equal(lastSeenAgo(offline),60); assert.equal(lastSeenAgo({...offline,last_seen_ago:null,last_seen:100}),null);
});
test("offline traffic counts, but stale live metrics do not", () => {
  const stats=summarize([offline]); assert.equal(stats.upTotal,2048);assert.equal(stats.downTotal,1024);assert.equal(stats.upSpeed,0);
  assert.equal(formatNode(offline).available,false);
  assert.equal(formatNode({...offline,online:true,metrics:null}).available,false);
});
test("malformed metrics isolate to one node, malformed fleet is an error", () => {
  const bad={...offline,online:true,metrics:{cpu:"invalid",load:null}} as unknown as Node;
  assert.equal(safeNodes([bad,offline])[0].metrics,null);assert.equal(safeNodes([bad,offline]).length,2);
  assert.throws(()=>safeNodes({} as Node[]),/格式/);
  const safe=safeNodes([{...offline,os:{bad:true},total_tx:"wrong"} as unknown as Node])[0];
  assert.equal(safe.os,"");assert.equal(safe.total_tx,0);
});
test("group order and literal names have no reserved-word collisions", () => {
  assert.deepEqual(groupsOf([{group:"all"},{group:"*"},{group:""},{group:"all"},{group:"Ungrouped"}]),["all","*","Ungrouped"]);
});
test("billing periods use Monitor's months, currency fallback is safe", () => {
  assert.match(formatPrice(1.5,"USD","60m"),/60mo$/);assert.match(formatPrice(120,"JPY","yearly"),/yr$/);
  assert.match(formatPrice(10,"bad!","once"),/bad! 10.00\/once/);
});
test("period traffic honors hub usage and legacy plan direction", () => {
  const node={...offline,month_rx:4096,month_tx:2048,traffic_limit:1024};
  assert.equal(monthUsage({...node,month_used:0}),0);
  assert.equal(monthUsage({...node,month_used:8192,traffic_mode:"down"}),8192);
  assert.equal(monthUsage({...node,traffic_mode:"up"}),2048);
  assert.equal(monthUsage({...node,traffic_mode:"down"}),4096);
  assert.equal(monthUsage({...node,traffic_mode:"max"}),4096);
  assert.equal(monthUsage({...node,traffic_mode:"sum"}),6144);
  const malformed=safeNodes([{...node,month_used:NaN,traffic_mode:"up"}])[0];
  assert.equal(monthUsage(malformed),2048);
});
test("loss comes from the whole window; timeout, empty, old hub stay distinct", () => {
  const data={metrics:[],ping:[{task_id:2,ts:1,latency:10,loss:0},{task_id:2,ts:2,latency:null,loss:100},{task_id:1,ts:2,latency:2}],probes:{1:"B",2:"A",3:"Empty"},loss:{2:100/13}};
  const stats=probeStats(data);assert.deepEqual(stats.map(s=>s.id),[2,1,3]);assert.equal(stats[0].loss,100/13);assert.equal(stats[0].latest,null);
  assert.equal(probeStats({...data,loss:undefined})[0].loss,null);assert.equal(stats[2].points.length,0);
});
test("latency bands include threshold boundaries and failures", () => {
  assert.equal(latencyBand(0),"good");assert.equal(latencyBand(99.9),"good");
  assert.equal(latencyBand(100),"warn");assert.equal(latencyBand(199.9),"warn");
  for (const value of [200,null,-1,NaN,Infinity]) assert.equal(latencyBand(value),"bad");
});
test("resource bars turn yellow at 50%, remain yellow at 80%, then red", () => {
  assert.equal(resourceBand(0),"good");assert.equal(resourceBand(49.9),"good");
  assert.equal(resourceBand(50),"warn");assert.equal(resourceBand(80),"warn");
  assert.equal(resourceBand(80.1),"bad");assert.equal(resourceBand(100),"bad");
});
test("probe names use the requested English aliases without changing IDs or samples", () => {
  assert.equal(displayProbeName("江西移动"),"Jiangxi Mobile");
  assert.equal(displayProbeName(" 湖南移动 "),"Hunan Mobile");
  assert.equal(displayProbeName("Cloudflare"),"Cloudflare");
  assert.equal(displayProbeName("其他检查"),"其他检查");
  const stats=probeStats({metrics:[],ping:[{task_id:7,ts:1,latency:50}],probes:{7:"江西移动"}});
  assert.equal(stats[0].id,7);assert.equal(stats[0].name,"Jiangxi Mobile");assert.equal(stats[0].latest,50);
});

test("loss colors use raw percentages at 2%, 5%, and 10% boundaries", () => {
  assert.equal(lossBand(0),"good");assert.equal(lossBand(1.99),"good");
  assert.equal(lossBand(2),"light");assert.equal(lossBand(4.99),"light");
  assert.equal(lossBand(5),"warn");assert.equal(lossBand(10),"warn");
  for(const value of [10.01,100,-1,NaN,Infinity]) assert.equal(lossBand(value),"bad");
});
