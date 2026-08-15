import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the VimOps application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /VimOps — Learn Vim by Saving Servers/i);
  assert.match(html, /VIMOPS/);
  assert.match(html, /The container won’t start/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("ships two cumulative six-mission campaigns", async () => {
  const source = await readFile(new URL("app/missions.ts", root), "utf8");
  assert.equal((source.match(/id: "[^"]+", difficulty: "Beginner"/g) ?? []).length, 6);
  assert.equal((source.match(/id: "[^"]+", difficulty: "Intermediate"/g) ?? []).length, 6);
  assert.match(source, /docker-compose\.yml/);
  assert.match(source, /:%s\/a\/b\/g/);
  assert.match(source, /beginner-boss/);
  assert.match(source, /intermediate-boss/);
});
