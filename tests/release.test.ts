import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { publishThemeRelease } from "../scripts/release.mjs";

const draft = { id: 42, tag_name: "v1.0", draft: true, assets: [], upload_url: "https://uploads.github.com/repos/example/monitor-ascii/releases/42/assets{?name,label}" };
const published = { ...draft, draft: false, prerelease: false, html_url: "https://github.com/example/monitor-ascii/releases/tag/v1.0" };
const artifacts = [{ name: "theme.tar.gz", data: Buffer.from("archive") }, { name: "theme.tar.gz.sha256", data: Buffer.from("checksum") }];
function fixture(replies: any[]) {
  const calls: any[] = [];
  const fetchImpl = async (url: string, options: any) => {
    calls.push({ url, ...options });
    const reply = replies.shift();
    assert(reply, "unexpected API call");
    return new Response(reply.status === 204 ? null : JSON.stringify(reply.body ?? {}), { status: reply.status ?? 200 });
  };
  return { calls, run: () => publishThemeRelease({ repository: "example/monitor-ascii", tag: "v1.0", token: "test-token", sha: "a".repeat(40), artifacts, fetchImpl }) };
}
const uploaded = (name: string) => ({ body: { name, state: "uploaded" } });

test("release becomes latest and public only after both binary assets upload", async () => {
  const { calls, run } = fixture([{ body: {} }, { status: 404 }, { status: 201, body: draft }, uploaded("theme.tar.gz"), uploaded("theme.tar.gz.sha256"), { body: published }]);
  assert.deepEqual(await run(), published);
  assert.deepEqual(calls.map(call => call.method ?? "GET"), ["GET", "GET", "POST", "POST", "POST", "PATCH"]);
  assert.equal(calls[0].url, "https://api.github.com/repos/example/monitor-ascii/git/ref/tags/v1.0");
  assert.deepEqual(JSON.parse(calls[2].body), { tag_name: "v1.0", target_commitish: "a".repeat(40), name: "Monitor ASCII v1.0", draft: true, prerelease: false, make_latest: "false", generate_release_notes: true });
  artifacts.forEach((file, index) => {
    const call = calls[index + 3];
    assert.equal(new URL(call.url).searchParams.get("name"), file.name);
    assert.equal(call.headers["Content-Type"], "application/octet-stream");
    assert.equal(call.headers["Content-Length"], String(file.data.byteLength));
    assert.deepEqual(call.body, file.data);
  });
  assert.deepEqual(JSON.parse(calls[5].body), { draft: false, prerelease: false, make_latest: "true" });
  assert.equal(calls[5].url, "https://api.github.com/repos/example/monitor-ascii/releases/42");
  assert(calls.every(call => call.headers.Authorization === "Bearer test-token"));
});

test("published releases are refused without changing release or assets", async () => {
  const { calls, run } = fixture([{ body: {} }, { body: published }]);
  await assert.rejects(run(), /already published/);
  assert.deepEqual(calls.map(call => call.method ?? "GET"), ["GET", "GET"]);
});

test("retry replaces matching draft assets and preserves unrelated assets", async () => {
  const retryDraft = { ...draft, assets: [{ id: 7, name: "theme.tar.gz" }, { id: 8, name: "notes.txt" }] };
  const { calls, run } = fixture([{ body: {} }, { body: retryDraft }, { status: 204 }, uploaded("theme.tar.gz"), uploaded("theme.tar.gz.sha256"), { body: published }]);
  assert.deepEqual(await run(), published);
  assert.deepEqual(calls.map(call => call.method ?? "GET"), ["GET", "GET", "DELETE", "POST", "POST", "PATCH"]);
  assert.equal(calls[2].url, "https://api.github.com/repos/example/monitor-ascii/releases/assets/7");
});

test("failed checksum upload leaves the release as a draft", async () => {
  const { calls, run } = fixture([{ body: {} }, { status: 404 }, { body: draft }, uploaded("theme.tar.gz"), { status: 500 }]);
  await assert.rejects(run(), /HTTP 500/);
  assert.equal(calls.length, 5);
  assert(!calls.some(call => call.method === "PATCH"));
});

test("permission errors are not treated as a missing release", async () => {
  const { calls, run } = fixture([{ body: {} }, { status: 403 }]);
  await assert.rejects(run(), /HTTP 403/);
  assert.equal(calls.length, 2);
  assert(!calls.some(call => call.method));
});

test("unexpected upload hosts cannot receive release files or credentials", async () => {
  const { calls, run } = fixture([{ body: {} }, { body: { ...draft, upload_url: "https://example.com/upload{?name,label}" } }]);
  await assert.rejects(run(), /Unexpected release upload host/);
  assert.equal(calls.length, 2);
  assert(calls.every(call => new URL(call.url).hostname === "api.github.com"));
});

test("an incomplete asset response cannot publish the release", async () => {
  const { calls, run } = fixture([{ body: {} }, { body: draft }, { body: { name: "theme.tar.gz", state: "starter" } }]);
  await assert.rejects(run(), /Asset upload is incomplete/);
  assert.equal(calls.length, 3);
  assert(!calls.some(call => call.method === "PATCH"));
});
