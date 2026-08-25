import type { CompassCatalog } from "./catalog.js";
import { compassBranch, compassRepository } from "./source.js";

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
      --accent: #176b4d;
      --accent-soft: #dff3e9;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0d0d0d;
        --panel: #151515;
        --text: #f2f2ef;
        --muted: #a2a29d;
        --line: #30302d;
        --soft: #20201e;
        --accent: #72d4ab;
        --accent-soft: #173a2d;
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
      width: min(920px, calc(100% - 40px));
      margin: 0 auto;
      padding: 28px 0 64px;
    }

    nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-height: 40px;
    }

    .brand {
      text-decoration: none;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--muted);
      font-size: 14px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 0 4px var(--accent-soft);
    }

    .hero {
      padding: 112px 0 72px;
      max-width: 760px;
    }

    .eyebrow {
      margin: 0 0 18px;
      color: var(--muted);
      font: 600 13px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    h1 {
      margin: 0;
      font-size: clamp(42px, 8vw, 78px);
      line-height: 0.98;
      letter-spacing: -0.055em;
      font-weight: 680;
    }

    .lede {
      max-width: 660px;
      margin: 28px 0 0;
      color: var(--muted);
      font-size: clamp(18px, 2.5vw, 22px);
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 32px;
    }

    .button {
      display: inline-flex;
      align-items: center;
      min-height: 42px;
      padding: 0 15px;
      border: 1px solid var(--line);
      border-radius: 9px;
      background: var(--panel);
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
    }

    .button:hover { border-color: var(--muted); }

    .facts {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--panel);
      overflow: hidden;
    }

    .fact {
      padding: 18px;
      min-width: 0;
    }

    .fact + .fact { border-left: 1px solid var(--line); }

    .fact-label {
      display: block;
      margin-bottom: 7px;
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.07em;
    }

    .fact-value {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 650;
      white-space: nowrap;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.92em;
    }

    section.content {
      margin-top: 72px;
    }

    .section-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--line);
    }

    h2 {
      margin: 0;
      font-size: 24px;
      letter-spacing: -0.025em;
    }

    .section-note {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
    }

    .skills {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .skills li { border-bottom: 1px solid var(--line); }

    .skills a {
      display: grid;
      grid-template-columns: minmax(160px, 220px) 1fr;
      gap: 28px;
      padding: 18px 4px;
      text-decoration: none;
    }

    .skills a:hover .skill-name { text-decoration: underline; }

    .skill-name {
      font: 600 14px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    .skill-description {
      color: var(--muted);
      font-size: 14px;
    }

    .endpoint {
      margin-top: 72px;
      padding: 24px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--panel);
    }

    .endpoint p {
      margin: 9px 0 0;
      color: var(--muted);
    }

    .endpoint-code {
      display: block;
      margin-top: 18px;
      padding: 13px 14px;
      overflow-x: auto;
      border-radius: 8px;
      background: var(--soft);
      white-space: nowrap;
    }

    footer {
      display: flex;
      flex-wrap: wrap;
      gap: 18px;
      margin-top: 48px;
      padding-top: 20px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 13px;
    }

    @media (max-width: 700px) {
      main { width: min(100% - 28px, 920px); }
      .hero { padding: 78px 0 52px; }
      .facts { grid-template-columns: 1fr 1fr; }
      .fact:nth-child(3) { border-left: 0; border-top: 1px solid var(--line); }
      .fact:nth-child(4) { border-top: 1px solid var(--line); }
      .skills a { grid-template-columns: 1fr; gap: 6px; }
      .section-head { align-items: flex-start; flex-direction: column; gap: 6px; }
    }
  </style>
</head>
<body data-source-revision="${escapeHtml(revision)}">
  <main>
    <nav>
      <a class="brand" href="/">Compass</a>
      <span class="status"><span class="status-dot" aria-hidden="true"></span>MCP online</span>
    </nav>

    <header class="hero">
      <p class="eyebrow">ariobarin / compass</p>
      <h1>Engineering preferences and workflows for agents.</h1>
      <p class="lede">Compass is reviewed source for portable agent behavior. This page and the ChatGPT MCP read the same exact Compass revision.</p>
      <div class="actions">
        <a class="button" href="${escapeHtml(compassRepository)}">View Compass</a>
        <a class="button" href="${SERVICE_REPOSITORY}">View MCP source</a>
      </div>
    </header>

    <section class="facts" aria-label="Service status">
      <div class="fact">
        <span class="fact-label">Status</span>
        <span class="fact-value">Online</span>
      </div>
      <div class="fact">
        <span class="fact-label">Revision</span>
        <a class="fact-value" href="${escapeHtml(revisionUrl)}"><code>${escapeHtml(shortRevision(revision))}</code></a>
      </div>
      <div class="fact">
        <span class="fact-label">Skills</span>
        <span class="fact-value">${skills.length}</span>
      </div>
      <div class="fact">
        <span class="fact-label">Branch</span>
        <span class="fact-value"><code>${escapeHtml(compassBranch)}</code></span>
      </div>
    </section>

    <section class="content">
      <div class="section-head">
        <h2>Current skills</h2>
        <p class="section-note">Selected by the Compass manifest at this revision.</p>
      </div>
      <ul class="skills">${skillRows}
      </ul>
    </section>

    <section class="endpoint">
      <h2>MCP endpoint</h2>
      <p>Read-only. Every request resolves one Compass revision and reads all content from that revision.</p>
      <code class="endpoint-code">${MCP_ENDPOINT}</code>
    </section>

    <footer>
      <a href="/healthz">Health JSON</a>
      <a href="${escapeHtml(revisionUrl)}">Source ${escapeHtml(shortRevision(revision))}</a>
      <span>Compass MCP</span>
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
