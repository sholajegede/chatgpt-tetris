import { getKindeUserProfile, validateKindeToken } from "./kinde";
import { getLastAuthToken } from "@/app/lib/mcpRequestState";

const MCP_SERVER_URL =
  process.env.MCP_SERVER_URL ||
  process.env.MCP_AUDIENCE ||
  `https://${process.env.VERCEL_URL || "localhost"}`;

export function makeAuthenticateMeta(message = "Sign in required") {
  return [
    `Bearer resource_metadata="${MCP_SERVER_URL}/.well-known/oauth-protected-resource", error="insufficient_scope", error_description="${message}"`,
  ];
}

export async function extractTokenFromArgs(args: any, context?: any) {
  console.log(
    "extractTokenFromArgs: full context:",
    JSON.stringify(context, null, 2)
  );

  if (context?.requestInfo?.headers) {
    const authHeader =
      context.requestInfo.headers.authorization ||
      context.requestInfo.headers.Authorization;

    if (
      authHeader &&
      typeof authHeader === "string" &&
      authHeader.startsWith("Bearer ")
    ) {
      console.log("✅ Found token in context.requestInfo.headers!");
      return authHeader.substring(7);
    }
  }

  if (context?.request?.headers) {
    const authHeader =
      context.request.headers.get("Authorization") ||
      context.request.headers.get("authorization");
    if (
      authHeader &&
      typeof authHeader === "string" &&
      authHeader.startsWith("Bearer ")
    ) {
      return authHeader.substring(7);
    }
  }

  if (context?.headers) {
    const authHeader =
      context.headers.get?.("Authorization") ||
      context.headers.get?.("authorization") ||
      context.headers.Authorization ||
      context.headers.authorization;
    if (
      authHeader &&
      typeof authHeader === "string" &&
      authHeader.startsWith("Bearer ")
    ) {
      return authHeader.substring(7);
    }
  }

  const possibleIds = [
    context?.requestId,
    context?.requestInfo?.requestId,
    context?.requestInfo?.id,
    context?.id,
    context?.sessionId,
    context?.requestInfo?.sessionId,
  ].filter(Boolean);

  console.log("extractTokenFromArgs: checking IDs:", possibleIds);

  for (const id of possibleIds) {
    const token = (await import("./mcpRequestMap")).getTokenForRequestId(id);
    if (token) {
      console.log("extractTokenFromArgs: found token for id:", id);
      return token;
    }
  }

  const last = getLastAuthToken();
  if (last) return last;

  return null;
}

export async function requireAuthForTool(
  args: any,
  context?: any,
  requiredScopes: string[] = []
) {
  const token = await extractTokenFromArgs(args, context);

  if (!token) {
    return {
      isError: true,
      content: [{ type: "text", text: "Please sign in to continue." }],
      _meta: { "mcp/www_authenticate": makeAuthenticateMeta() },
    };
  }

  try {
    const payload = await validateKindeToken(token).catch(() => null);
    const profile = await getKindeUserProfile(token).catch(() => null);

    if (!payload) {
      return {
        isError: true,
        content: [
          { type: "text", text: "Invalid token. Please sign in again." },
        ],
        _meta: {
          "mcp/www_authenticate": makeAuthenticateMeta("Invalid token"),
        },
      };
    }

    return { ok: true, token, profile, payload };
  } catch (err: any) {
    return {
      isError: true,
      content: [
        { type: "text", text: "Authentication failed. Please sign in again." },
      ],
      _meta: {
        "mcp/www_authenticate": makeAuthenticateMeta("Authentication failed"),
      },
    };
  }
}