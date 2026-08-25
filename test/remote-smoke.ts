import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint = new URL(process.env.COMPASS_MCP_URL ?? "https://compass.ariobarin.com/mcp");
const healthUrl = new URL("/healthz?fresh=1", endpoint);
const healthResponse = await fetch(healthUrl);
assert.equal(healthResponse.status, 200);
const health = await healthResponse.json() as { source_revision: string };
assert.match(health.source_revision, /^[a-f0-9]{40}$/);

const client = new Client({ name: "compass-remote-smoke", version: "0.3.0" });
const transport = new StreamableHTTPClientTransport(endpoint);

try {
  await client.connect(transport);
  const tools = await client.listTools();
  assert.deepEqual(
    tools.tools.map(tool => tool.name).sort(),
    ["fetch", "get_profile", "get_skill", "list_skills", "search"]
  );

  const profile = await client.callTool({ name: "get_profile", arguments: {} });
  assert.equal(profile.isError, undefined);
  const profileJson = JSON.stringify(profile);
  assert.match(profileJson, new RegExp(`/blob/${health.source_revision}/codex/AGENTS\\.md`));
  assert.doesNotMatch(profileJson, /\/blob\/main\/codex\/AGENTS\.md/);

  const skills = await client.callTool({ name: "list_skills", arguments: {} });
  const skillsJson = JSON.stringify(skills);
  assert.match(skillsJson, /handoff/);
  assert.doesNotMatch(skillsJson, /action-items-to-prs/);

  console.log(`compass remote smoke: ok (${health.source_revision})`);
} finally {
  await client.close();
}
