import assert from "node:assert/strict";
import test from "node:test";
import { GitHubCompassSource } from "../src/source.js";

const revision = "a".repeat(40);
const profile = "# User preferences\n\n- current\n";
const manifest = JSON.stringify({ agents: { skills: ["alpha", "beta"] } });
const skillTexts: Record<string, string> = {
  alpha: "---\nname: alpha\ndescription: Alpha workflow.\n---\n\n# Alpha\n",
  beta: "---\nname: beta\ndescription: Beta workflow.\n---\n\n# Beta\n"
};

function fixtureFetcher(calls: string[]) {
  return async (input: string | URL | Request): Promise<Response> => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith("/commits/main")) {
      return Response.json({ sha: revision });
    }
    if (url.endsWith(`/${revision}/codex/AGENTS.md`)) {
      return new Response(profile);
    }
    if (url.endsWith(`/${revision}/manifests/portable-files.json`)) {
      return new Response(manifest);
    }
    for (const [name, text] of Object.entries(skillTexts)) {
      if (url.endsWith(`/${revision}/codex/skills/${name}/SKILL.md`)) {
        return new Response(text);
      }
    }
    return new Response("not found", { status: 404 });
  };
}

test("loads one exact Compass revision", async () => {
  const calls: string[] = [];
  const source = new GitHubCompassSource(fixtureFetcher(calls), 60_000);
  const catalog = await source.loadCurrentCatalog(true);

  assert.equal(catalog.revision, revision);
  assert.equal(catalog.getProfile().metadata.revision, revision);
  assert.match(catalog.getProfile().url, new RegExp(`/blob/${revision}/codex/AGENTS\\.md$`));
  assert.deepEqual(catalog.listSkills().map(skill => skill.name), ["alpha", "beta"]);
  assert.equal(catalog.getSkill("alpha").metadata.revision, revision);

  const rawCalls = calls.filter(url => url.includes("raw.githubusercontent.com"));
  assert.ok(rawCalls.length >= 4);
  assert.ok(rawCalls.every(url => url.includes(`/${revision}/`)));
  assert.ok(rawCalls.every(url => !url.includes("/main/")));
});

test("fresh revision checks bypass the short head cache", async () => {
  const calls: string[] = [];
  const source = new GitHubCompassSource(fixtureFetcher(calls), 60_000);

  await source.resolveRevision();
  await source.resolveRevision();
  await source.resolveRevision(true);

  assert.equal(calls.filter(url => url.endsWith("/commits/main")).length, 2);
});
