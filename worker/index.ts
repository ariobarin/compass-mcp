import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createCompassMcpServer } from "../src/server.js";
import { GitHubCompassSource, compassBranch, compassRepository } from "../src/source.js";

const source = new GitHubCompassSource();

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers }
  });
}

export async function handleCompassRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/healthz" && request.method === "GET") {
    try {
      const fresh = url.searchParams.get("fresh") === "1";
      const revision = await source.resolveRevision(fresh);
      return jsonResponse({
        ok: true,
        service: "compass-mcp",
        source_revision: revision,
        source_branch: compassBranch,
        source_repository: compassRepository
      });
    } catch (error) {
      console.error("Compass source health check failed", error);
      return jsonResponse({ ok: false, service: "compass-mcp", error: "Compass source unavailable" }, 503);
    }
  }

  if (url.pathname !== "/mcp") {
    return jsonResponse({ error: "Not found" }, 404);
  }

  if (request.method !== "POST") {
    return jsonResponse({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed" },
      id: null
    }, 405, { allow: "POST" });
  }

  try {
    const catalog = await source.loadCurrentCatalog();
    const server = createCompassMcpServer(catalog);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    await server.connect(transport);
    return await transport.handleRequest(request);
  } catch (error) {
    console.error("Compass MCP request failed", error);
    return jsonResponse({
      jsonrpc: "2.0",
      error: { code: -32603, message: "Internal server error" },
      id: null
    }, 500);
  }
}

export default {
  fetch: handleCompassRequest
};
