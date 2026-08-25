import assert from "node:assert/strict";
import { handleCompassRequest } from "../worker/index.js";

let requestId = 0;

async function rpc(method: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
  requestId += 1;
  const response = await handleCompassRequest(new Request("https://compass.ariobarin.com/mcp", {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json"
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: requestId, method, params })
  }));
  assert.equal(response.status, 200);
  return await response.json() as Record<string, unknown>;
}

const healthResponse = await handleCompassRequest(new Request("https://compass.ariobarin.com/healthz?fresh=1"));
assert.equal(healthResponse.status, 200);
const health = await healthResponse.json() as { source_revision: string };
assert.match(health.source_revision, /^[a-f0-9]{40}$/);

const homeResponse = await handleCompassRequest(new Request("https://compass.ariobarin.com/"));
assert.equal(homeResponse.status, 200);
assert.match(homeResponse.headers.get("content-type") ?? "", /^text\/html/);
const home = await homeResponse.text();
assert.match(home, /<title>Compass<\/title>/);
assert.match(home, new RegExp(`data-source-revision="${health.source_revision}"`));
assert.match(home, new RegExp(`>${health.source_revision.slice(0, 8)}<`));
assert.match(home, />handoff</);
assert.doesNotMatch(home, /action-items-to-prs/);
assert.doesNotMatch(home, /MCP online/);
assert.doesNotMatch(home, /ariobarin \/ compass/);
assert.doesNotMatch(home, />Status</);
assert.doesNotMatch(home, />Online</);
assert.doesNotMatch(home, />Compass MCP</);
assert.match(home, /https:\/\/compass\.ariobarin\.com\/mcp/);

const faviconResponse = await handleCompassRequest(new Request("https://compass.ariobarin.com/favicon.svg"));
assert.equal(faviconResponse.status, 200);
assert.match(faviconResponse.headers.get("content-type") ?? "", /^image\/svg\+xml/);

const initialized = await rpc("initialize", {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "compass-worker-smoke", version: "0.3.0" }
});
assert.match(JSON.stringify(initialized), new RegExp(health.source_revision));

const tools = await rpc("tools/list", {});
assert.deepEqual(
  ((tools.result as { tools: Array<{ name: string }> }).tools).map(tool => tool.name).sort(),
  ["fetch", "get_profile", "get_skill", "list_skills", "search"]
);

const profile = await rpc("tools/call", { name: "get_profile", arguments: {} });
const profileJson = JSON.stringify(profile);
assert.match(profileJson, new RegExp(`/blob/${health.source_revision}/codex/AGENTS\\.md`));
assert.doesNotMatch(profileJson, /\/blob\/main\/codex\/AGENTS\.md/);

const skills = await rpc("tools/call", { name: "list_skills", arguments: {} });
const skillsJson = JSON.stringify(skills);
assert.match(skillsJson, /handoff/);
assert.doesNotMatch(skillsJson, /action-items-to-prs/);

console.log(`compass worker smoke: ok (${health.source_revision})`);
