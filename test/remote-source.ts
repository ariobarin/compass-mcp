import assert from "node:assert/strict";

const endpoint = new URL(process.env.COMPASS_MCP_URL ?? "https://compass.ariobarin.com/mcp");
const expectedFromEnvironment = process.env.EXPECTED_COMPASS_REVISION;

async function currentCompassRevision(): Promise<string> {
  if (expectedFromEnvironment) return expectedFromEnvironment;
  const response = await fetch("https://api.github.com/repos/ariobarin/compass/commits/main", {
    headers: { accept: "application/vnd.github+json", "user-agent": "compass-mcp-source-check" }
  });
  assert.equal(response.status, 200);
  const body = await response.json() as { sha: string };
  return body.sha;
}

const expected = await currentCompassRevision();
const healthUrl = new URL("/healthz?fresh=1", endpoint);
const healthResponse = await fetch(healthUrl);
assert.equal(healthResponse.status, 200);
const health = await healthResponse.json() as { source_revision: string };

assert.equal(
  health.source_revision,
  expected,
  `production Compass MCP is stale: ${health.source_revision} != ${expected}`
);

console.log(`compass source current: ${health.source_revision}`);
