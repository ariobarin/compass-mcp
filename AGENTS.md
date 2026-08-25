# Repository guidance

Compass MCP is the read-only ChatGPT bridge for the public `ariobarin/compass` repository.

Keep Compass content in Compass. This repository owns transport, revision pinning, freshness checks, and deployment only.

For every MCP request, resolve one Compass revision and load every profile, manifest, and skill document from that exact revision. Never bundle a mutable Compass snapshot into a deployment and never mix `main` reads with revision-pinned reads.

Before committing, run `npm audit --audit-level=moderate`, `npm run build`, `npm test`, and `npm run smoke:worker`. After deployment, run `npm run smoke:remote` and `npm run verify:remote`.

Keep the server read-only. Do not add repository mutation, shell execution, credentials, user-specific state, or model calls.
