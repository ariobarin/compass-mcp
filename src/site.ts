import type { CompassCatalog } from "./catalog.js";
import { compassRepository } from "./source.js";

const SERVICE_REPOSITORY = "https://github.com/ariobarin/compass-mcp";
const MCP_ENDPOINT = "https://compass.ariobarin.com/mcp";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function shortRevision(revision: string): string {
  return revision.slice(0, 8);
}

export function renderHome(catalog: CompassCatalog): Response {
  const revision = catalog.revision;
  const skills = catalog.listSkills();
  const revisionUrl = `${compassRepository}/commit/${encodeURIComponent(revision)}`;
  const skillRows = skills.map(skill => `
        <li>
          <a href="${escapeHtml(skill.url)}">
            <span class="skill-name">${escapeHtml(skill.name)}</span>
            <span class="skill-description">${escapeHtml(skill.description)}</span>
          </a>
        </li>`).join("");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Compass is reviewed engineering preferences and workflows for agents.">
  <meta name="theme-color" content="#0d0d0d">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <title>Compass</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f7f7f4;
      --panel: #ffffff;
      --text: #141414;
      --muted: #676767;
      --line: #ddddda;
      --soft: #efefec;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0d0d0d;
        --panel: #151515;
        --text: #f2f2ef;
        --muted: #a2a29d;
        --line: #30302d;
        --soft: #20201e;
      }
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }

    a { color: inherit; }

    main {
      width: min(960px, calc(100% - 40px));
      margin: 0 auto;
      padding: 24px 0 56px;
    }

    nav {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 24px;
      min-height: 30px;
    }

    .brand {
      text-decoration: none;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .nav-links {
      display: flex;
      gap: 18px;
      color: var(--muted);
      font-size: 14px;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.92em;
    }

    section.content {
      margin-top: 48px;
    }

    .endpoint-row,
    .skills a {
      display: grid;
      grid-template-columns: minmax(140px, 185px) 1fr;
      gap: 22px;
      padding: 20px 2px;
    }

    .endpoint-row {
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
    }

    .endpoint-label {
      font: 600 14.5px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    .endpoint-value {
      overflow-x: auto;
      white-space: nowrap;
    }

    .skills {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .skills li { border-bottom: 1px solid var(--line); }

    .skills a {
      text-decoration: none;
    }

    .skills a:hover .skill-name { text-decoration: underline; }

    .skill-name {
      font: 600 14.5px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    .skill-description {
      color: var(--muted);
      font-size: 15px;
      line-height: 1.55;
    }

    footer {
      display: flex;
      flex-wrap: wrap;
      gap: 18px;
      margin-top: 40px;
      padding-top: 18px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 14px;
    }

    @media (max-width: 700px) {
      main { width: min(100% - 28px, 960px); }
      nav { align-items: flex-start; flex-direction: column; gap: 8px; }
      .nav-links { flex-wrap: wrap; gap: 12px; font-size: 13px; }
      .endpoint-row,
      .skills a { grid-template-columns: 1fr; gap: 6px; }
    }
  </style>
</head>
<body data-source-revision="${escapeHtml(revision)}">
  <main>
    <nav>
      <a class="brand" href="/">Compass</a>
      <div class="nav-links">
        <a href="${escapeHtml(compassRepository)}">Compass source</a>
        <a href="${SERVICE_REPOSITORY}">MCP source</a>
      </div>
    </nav>

    <section class="content" aria-label="Compass MCP and skills">
      <div class="endpoint-row">
        <span class="endpoint-label">MCP endpoint</span>
        <code class="endpoint-value">${MCP_ENDPOINT}</code>
      </div>
      <ul class="skills">${skillRows}
      </ul>
    </section>

    <footer>
      <a href="/healthz">Health JSON</a>
      <a href="${escapeHtml(revisionUrl)}">Source ${escapeHtml(shortRevision(revision))}</a>
    </footer>
  </main>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=15",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff"
    }
  });
}

export function renderFavicon(): Response {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#111"/><path d="M44 20.5A19 19 0 1 0 44 43.5" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/></svg>`;
  return new Response(svg, {
    status: 200,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=86400",
      "x-content-type-options": "nosniff"
    }
  });
}
