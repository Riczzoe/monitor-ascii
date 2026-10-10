import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export async function publishThemeRelease({ repository, tag, token, sha, artifacts, fetchImpl = fetch }) {
  assert.match(repository ?? "", /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "Missing GitHub repository");
  assert.match(tag ?? "", /^v\d+\.\d+(?:\.\d+)?$/, "Expected a stable vX.Y or vX.Y.Z tag");
  assert(token, "Missing GITHUB_TOKEN");
  assert.deepEqual(artifacts.map(file => file.name), ["theme.tar.gz", "theme.tar.gz.sha256"]);
  assert(artifacts.every(file => file.data.byteLength > 0), "Release assets must not be empty");
  const base = `https://api.github.com/repos/${repository}`;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2026-03-10",
    "User-Agent": "monitor-ascii-release",
  };
  async function request(url, options = {}, allowMissing = false) {
    const response = await fetchImpl(url, {
      ...options, headers: { ...headers, ...options.headers }, signal: AbortSignal.timeout(60000),
    });
    if (allowMissing && response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub API HTTP ${response.status}: ${options.method ?? "GET"} ${new URL(url).pathname}`);
    return response.status === 204 ? null : response.json();
  }
  const json = (method, body) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  await request(`${base}/git/ref/tags/${encodeURIComponent(tag)}`);
  let release = await request(`${base}/releases/tags/${encodeURIComponent(tag)}`, {}, true);
  if (release) {
    assert.equal(release.tag_name, tag);
    assert(release.draft, `Release ${tag} is already published; use a new version`);
  } else {
    release = await request(`${base}/releases`, json("POST", {
      tag_name: tag, target_commitish: sha, name: `Monitor ASCII ${tag}`,
      draft: true, prerelease: false, make_latest: "false", generate_release_notes: true,
    }));
  }
  assert(Number.isInteger(release.id) && release.id > 0, "Invalid release ID");
  assert.equal(release.tag_name, tag);
  assert(release.draft, "Only draft releases can receive build assets");
  const upload = new URL(release.upload_url.split("{")[0]);
  assert.equal(upload.origin, "https://uploads.github.com", "Unexpected release upload host");
  for (const asset of release.assets ?? []) {
    if (artifacts.some(file => file.name === asset.name)) {
      assert(Number.isInteger(asset.id) && asset.id > 0, "Invalid asset ID");
      await request(`${base}/releases/assets/${asset.id}`, { method: "DELETE" });
    }
  }
  for (const file of artifacts) {
    upload.searchParams.set("name", file.name);
    const asset = await request(upload.href, {
      method: "POST", headers: { "Content-Type": "application/octet-stream", "Content-Length": String(file.data.byteLength) },
      body: file.data,
    });
    assert.equal(asset.name, file.name, "GitHub returned the wrong asset");
    assert.equal(asset.state, "uploaded", "Asset upload is incomplete");
  }
  const published = await request(`${base}/releases/${release.id}`, json("PATCH", {
    draft: false, prerelease: false, make_latest: "true",
  }));
  assert.equal(published.tag_name, tag);
  assert.equal(published.draft, false);
  assert.equal(published.prerelease, false);
  return published;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const artifacts = await Promise.all(["theme.tar.gz", "theme.tar.gz.sha256"].map(async name => ({ name, data: await readFile(name) })));
    const release = await publishThemeRelease({
      repository: process.env.GITHUB_REPOSITORY, tag: process.env.GITHUB_REF_NAME,
      token: process.env.GITHUB_TOKEN, sha: process.env.GITHUB_SHA, artifacts,
    });
    console.log(`Published ${release.html_url}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
