import test from "node:test";
import assert from "node:assert/strict";
import { api, ApiError } from "../src/lib/api.ts";
test("hub plain-text errors are shown; proxy HTML is withheld", async () => {
  const original=globalThis.fetch;
  try {
    globalThis.fetch=async()=>new Response("需要登录后查看",{status:401,headers:{"content-type":"text/plain"}});
    await assert.rejects(api("/nodes"),(e:unknown)=>e instanceof ApiError && e.status===401 && e.message==="需要登录后查看");
    globalThis.fetch=async()=>new Response("<html>secret proxy detail</html>",{status:502,headers:{"content-type":"text/html"}});
    await assert.rejects(api("/nodes"),(e:unknown)=>e instanceof ApiError && e.message.includes("502") && !e.message.includes("secret"));
    globalThis.fetch=async()=>new Response("<html>proxy challenge</html>",{status:200,headers:{"content-type":"text/html"}});
    await assert.rejects(api("/nodes"),(e:unknown)=>e instanceof ApiError && e.message.includes("不是状态数据"));
  } finally {globalThis.fetch=original;}
});
