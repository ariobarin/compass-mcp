import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import type { CompassDocument, CompassCatalogReader } from "./types.js";

export function buildServerInstructions(catalog: CompassCatalogReader): string {
  const profile = catalog.getProfile().text.trim();
  const skills = catalog.listSkills()
    .map(skill => `- ${skill.name}: ${skill.description}`)
    .join("\n");

  return [
    "The user's working preferences, applied as defaults beneath system, developer, and user instructions:",
    "",
    profile,
    "",
    "When a skill below fits the task, load it with get_skill and follow it:",
    skills,
    "",
    `Compass revision ${catalog.revision}.`
  ].join("\n");
}

function jsonResult(structuredContent: Record<string, unknown>) {
  return {
    structuredContent,
    content: [{ type: "text" as const, text: JSON.stringify(structuredContent) }]
  };
}

function documentResult(document: CompassDocument) {
  return jsonResult(document);
}

export function createCompassMcpServer(catalog: CompassCatalogReader): McpServer {
  const server = new McpServer(
    { name: "compass", version: "0.3.0" },
    { instructions: buildServerInstructions(catalog) }
  );

  server.registerTool(
    "get_profile",
    {
      title: "Get Compass profile",
      description: "Inspect the current revision-pinned Compass profile already included in initialization instructions.",
      inputSchema: {},
      annotations: { readOnlyHint: true }
    },
    async () => documentResult(catalog.getProfile())
  );

  server.registerTool(
    "list_skills",
    {
      title: "List Compass skills",
      description: "Inspect the current revision-pinned Compass skill catalog already included in initialization instructions.",
      inputSchema: {},
      annotations: { readOnlyHint: true }
    },
    async () => jsonResult({ revision: catalog.revision, skills: catalog.listSkills() })
  );

  server.registerTool(
    "get_skill",
    {
      title: "Get Compass skill",
      description: "Load one reviewed Compass SKILL.md from the request revision after selecting that workflow.",
      inputSchema: { name: z.string().regex(/^[a-z0-9][a-z0-9-]*$/) },
      annotations: { readOnlyHint: true }
    },
    async ({ name }) => {
      try {
        return documentResult(catalog.getSkill(name));
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: error instanceof Error ? error.message : "Unknown Compass skill" }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "search",
    {
      title: "Search Compass",
      description: "Search the revision-pinned Compass profile and reviewed skill documents.",
      inputSchema: { query: z.string() },
      annotations: { readOnlyHint: true }
    },
    async ({ query }) => jsonResult({
      revision: catalog.revision,
      results: catalog.search(query).map(document => ({ id: document.id, title: document.title, url: document.url }))
    })
  );

  server.registerTool(
    "fetch",
    {
      title: "Fetch Compass document",
      description: "Fetch a revision-pinned Compass profile or skill document returned by search.",
      inputSchema: { id: z.string() },
      annotations: { readOnlyHint: true }
    },
    async ({ id }) => {
      try {
        return documentResult(catalog.fetch(id));
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: error instanceof Error ? error.message : "Unknown Compass document" }],
          isError: true
        };
      }
    }
  );

  return server;
}
