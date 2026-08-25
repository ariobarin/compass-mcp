import { CompassCatalog } from "./catalog.js";

const REPOSITORY = "ariobarin/compass";
const BRANCH = "main";
const HEAD_URL = `https://api.github.com/repos/${REPOSITORY}/commits/${BRANCH}`;
const RAW_ROOT = `https://raw.githubusercontent.com/${REPOSITORY}`;
const DEFAULT_HEAD_CACHE_TTL_MS = 15_000;

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type PortableManifest = {
  agents?: {
    skills?: unknown;
  };
};

type RevisionCache = {
  revision: string;
  expiresAt: number;
};

function selectedSkills(manifestText: string): string[] {
  const parsed = JSON.parse(manifestText) as PortableManifest;
  const skills = parsed.agents?.skills;
  if (!Array.isArray(skills) || skills.some(skill => typeof skill !== "string")) {
    throw new Error("Compass manifest has no valid agents.skills list");
  }
  return skills as string[];
}

function rawUrl(revision: string, path: string): string {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${RAW_ROOT}/${revision}/${encodedPath}`;
}

async function responseText(response: Response, label: string): Promise<string> {
  if (!response.ok) {
    throw new Error(`${label} failed with HTTP ${response.status}`);
  }
  return response.text();
}

export class GitHubCompassSource {
  private readonly fetcher: Fetcher;
  private readonly headCacheTtlMs: number;
  private headCache: RevisionCache | undefined;
  private readonly catalogCache = new Map<string, Promise<CompassCatalog>>();

  constructor(fetcher: Fetcher = fetch, headCacheTtlMs = DEFAULT_HEAD_CACHE_TTL_MS) {
    this.fetcher = fetcher;
    this.headCacheTtlMs = headCacheTtlMs;
  }

  async resolveRevision(fresh = false): Promise<string> {
    const now = Date.now();
    if (!fresh && this.headCache && this.headCache.expiresAt > now) {
      return this.headCache.revision;
    }

    const response = await this.fetcher(HEAD_URL, {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "compass-mcp"
      }
    });
    if (!response.ok) {
      throw new Error(`Resolve Compass main failed with HTTP ${response.status}`);
    }
    const body = await response.json() as { sha?: unknown };
    if (typeof body.sha !== "string" || !/^[a-f0-9]{40}$/i.test(body.sha)) {
      throw new Error("GitHub returned an invalid Compass revision");
    }

    this.headCache = {
      revision: body.sha,
      expiresAt: now + this.headCacheTtlMs
    };
    return body.sha;
  }

  async loadCurrentCatalog(freshRevision = false): Promise<CompassCatalog> {
    const revision = await this.resolveRevision(freshRevision);
    return this.loadCatalogAtRevision(revision);
  }

  loadCatalogAtRevision(revision: string): Promise<CompassCatalog> {
    const cached = this.catalogCache.get(revision);
    if (cached) return cached;

    const pending = this.fetchCatalog(revision);
    this.catalogCache.set(revision, pending);
    void pending.catch(() => this.catalogCache.delete(revision));
    return pending;
  }

  private async fetchCatalog(revision: string): Promise<CompassCatalog> {
    const [profileText, manifestText] = await Promise.all([
      this.fetchText(revision, "codex/AGENTS.md"),
      this.fetchText(revision, "manifests/portable-files.json")
    ]);
    const skillNames = selectedSkills(manifestText);
    const skillEntries = await Promise.all(skillNames.map(async name => {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
        throw new Error(`Invalid Compass skill name in manifest: ${name}`);
      }
      const text = await this.fetchText(revision, `codex/skills/${name}/SKILL.md`);
      return [name, text] as const;
    }));

    return new CompassCatalog(revision, profileText, Object.fromEntries(skillEntries));
  }

  private async fetchText(revision: string, path: string): Promise<string> {
    const response = await this.fetcher(rawUrl(revision, path), {
      headers: { "user-agent": "compass-mcp" }
    });
    return responseText(response, `Fetch ${path} at ${revision}`);
  }
}

export const compassRepository = `https://github.com/${REPOSITORY}`;
export const compassBranch = BRANCH;
