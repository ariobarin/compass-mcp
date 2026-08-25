# Compass MCP

Read-only MCP access to the current reviewed Compass profile and selected skills for regular ChatGPT chat mode.

Website: `https://compass.ariobarin.com/`

MCP endpoint: `https://compass.ariobarin.com/mcp`

## Freshness model

The server does not bundle Compass content. For each MCP request it resolves `ariobarin/compass` `main` to one Git commit, then loads `codex/AGENTS.md`, `manifests/portable-files.json`, and every selected skill from that exact revision.

Normal requests cache the branch head for at most 15 seconds. Immutable revision catalogs are reused inside a Worker isolate. `GET /healthz?fresh=1` bypasses the branch-head cache and returns `source_revision`, so CI can compare production with a known Compass commit.

A single request never mixes files from different Compass revisions.

The homepage is rendered by the same Worker from the same revision-pinned catalog. It shows the live source revision, branch, and selected skill list without maintaining a second copy of Compass content.

## Tools

- `get_profile` returns `codex/AGENTS.md` from the request revision.
- `list_skills` returns the manifest-selected skill catalog and revision.
- `get_skill` returns one selected `SKILL.md` from the request revision.
- `search` and `fetch` expose the same revision-pinned documents through standard read-only knowledge shapes.

## Local checks

Use Node.js 22 or later.

```bash
npm install
npm run build
npm test
npm run smoke:worker
```

Run the local HTTP server with `npm run dev`. It listens on `127.0.0.1:3000` unless `HOST` or `PORT` is set.

## Production verification

```bash
npm run smoke:remote
npm run verify:remote
```

`verify:remote` fails when the production Worker reports a Compass revision different from current `main`. Set `EXPECTED_COMPASS_REVISION` to compare against a specific commit, such as a GitHub Actions `GITHUB_SHA`.

## Deploy

Authenticate Wrangler with the Cloudflare account that owns `ariobarin.com`, then run:

```bash
npm run deploy
npm run smoke:remote
npm run verify:remote
```

Deployments change server code only. Compass content changes do not require a Worker deployment.
