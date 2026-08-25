import type { CompassCatalogReader, CompassDocument, SkillSummary } from "./types.js";

const REPOSITORY_URL = "https://github.com/ariobarin/compass";

function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed) as string;
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function frontmatterValue(text: string, key: string): string | undefined {
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  if (!frontmatter) return undefined;
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  return match ? unquote(match[1]) : undefined;
}

export class CompassCatalog implements CompassCatalogReader {
  readonly revision: string;
  private readonly profile: CompassDocument;
  private readonly skills: SkillSummary[];
  private readonly documents: Map<string, CompassDocument>;

  constructor(revision: string, profileText: string, skillTexts: Record<string, string>) {
    this.revision = revision;
    this.profile = {
      id: "profile",
      title: "Compass user profile",
      text: profileText,
      url: `${REPOSITORY_URL}/blob/${revision}/codex/AGENTS.md`,
      metadata: { kind: "profile", source: "codex/AGENTS.md", revision }
    };

    this.documents = new Map<string, CompassDocument>();
    this.skills = Object.entries(skillTexts)
      .map(([directoryName, text]) => {
        const name = frontmatterValue(text, "name") ?? directoryName;
        const description = frontmatterValue(text, "description") ?? "";
        const url = `${REPOSITORY_URL}/blob/${revision}/codex/skills/${encodeURIComponent(directoryName)}/SKILL.md`;
        this.documents.set(name, {
          id: `skill:${name}`,
          title: name,
          text,
          url,
          metadata: { kind: "skill", name, description, revision }
        });
        return { name, description, url };
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  getProfile(): CompassDocument {
    return this.profile;
  }

  listSkills(): SkillSummary[] {
    return this.skills;
  }

  getSkill(name: string): CompassDocument {
    const document = this.documents.get(name);
    if (!document) throw new Error(`Unknown Compass skill: ${name}`);
    return document;
  }

  fetch(id: string): CompassDocument {
    if (id === "profile") return this.getProfile();
    if (id.startsWith("skill:")) return this.getSkill(id.slice("skill:".length));
    throw new Error(`Unknown Compass document: ${id}`);
  }

  search(query: string): CompassDocument[] {
    const normalized = query.trim().toLowerCase();
    const documents = [this.profile, ...this.skills.map(skill => this.getSkill(skill.name))];
    if (!normalized) return documents;
    const terms = normalized.split(/\s+/).filter(Boolean);
    return documents
      .map(document => {
        const haystack = `${document.title}\n${document.metadata.description ?? ""}\n${document.text}`.toLowerCase();
        const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
        return { document, score };
      })
      .filter(result => result.score > 0)
      .sort((left, right) => right.score - left.score || left.document.title.localeCompare(right.document.title))
      .map(result => result.document);
  }
}
