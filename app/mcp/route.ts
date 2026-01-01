import { baseURL } from "@/baseUrl";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

function getConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL environment variable is not set");
  }
  return new ConvexHttpClient(convexUrl);
}

async function callConvexQuery(
  functionReference: any,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = getConvexClient();
  return await client.query(functionReference, args);
}

async function callConvexMutation(
  functionReference: any,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = getConvexClient();
  return await client.mutation(functionReference, args);
}

async function getOrCreateUser(firstName: string, lastName: string) {
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@tetris.local`;

  const existing = await callConvexQuery(api.users.getByEmail, { email }).catch(() => null);
  if (existing) return existing;

  const userId = await callConvexMutation(api.users.createOrUpdate, {
    email,
    firstName,
    lastName,
  });
  return { _id: userId };
}

const getAppsSdkCompatibleHtml = async (baseUrl: string, path: string) => {
  const result = await fetch(`${baseUrl}${path}`);
  return await result.text();
};

type ContentWidget = {
  id: string;
  title: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  html: string;
  description: string;
  widgetDomain: string;
};

function widgetMeta(widget: ContentWidget) {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true,
  } as const;
}

const handler = createMcpHandler(async (server) => {
  const s: any = server as any;

  function requireScopes(_requiredScopes: string[]) {
    return null;
  }

  const homeWidget: ContentWidget = {
    id: "tetris_home_widget",
    title: "Tetris",
    templateUri: "ui://widget/tetris-home.html",
    invoking: "Loading Tetris...",
    invoked: "Tetris ready",
    html: "",
    description: "Tetris homepage with navigation",
    widgetDomain: baseURL,
  };

  const playWidget: ContentWidget = {
    id: "tetris_play_widget",
    title: "Play Tetris in ChatGPT",
    templateUri: "ui://widget/tetris-play.html",
    invoking: "Opening game...",
    invoked: "Game ready",
    html: "",
    description: "Play Tetris in the widget",
    widgetDomain: baseURL,
  };

  const replaysWidget: ContentWidget = {
    id: "tetris_replays_widget",
    title: "Replays",
    templateUri: "ui://widget/tetris-replays.html",
    invoking: "Loading replays...",
    invoked: "Replays loaded",
    html: "",
    description: "List and view Tetris replays",
    widgetDomain: baseURL,
  };

  const leaderboardWidget: ContentWidget = {
    id: "tetris_leaderboard_widget",
    title: "Leaderboard",
    templateUri: "ui://widget/tetris-leaderboard.html",
    invoking: "Loading leaderboard...",
    invoked: "Leaderboard ready",
    html: "",
    description: "Top player leaderboard",
    widgetDomain: baseURL,
  };

  // Prefetch widget HTML to reduce first-open latency (avoids cold-starts)
  (async () => {
    try {
      homeWidget.html = await getAppsSdkCompatibleHtml(baseURL, "/tetris");
      playWidget.html = await getAppsSdkCompatibleHtml(baseURL, "/tetris/play");
      replaysWidget.html = await getAppsSdkCompatibleHtml(baseURL, "/tetris/replays");
      leaderboardWidget.html = await getAppsSdkCompatibleHtml(baseURL, "/tetris/leaderboard");
      console.log("Prefetched widget HTML for Tetris widgets");
    } catch (err) {
      console.warn("Widget prefetch failed:", err);
    }
  })();

  server.registerResource(
    "tetris-home",
    homeWidget.templateUri,
    {
      title: homeWidget.title,
      description: homeWidget.description,
      mimeType: "text/html+skybridge",
      _meta: {
        "openai/widgetDescription": homeWidget.description,
        "openai/widgetPrefersBorder": true,
        "openai/widgetCSP": "script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline'; img-src 'self' https:; font-src 'self' https:",
      },
    },
    async (uri) => {
      let html = homeWidget.html;
      if (!html) {
        html = await getAppsSdkCompatibleHtml(baseURL, "/tetris");
        homeWidget.html = html;
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/html+skybridge",
            text: `<html>${html}</html>`,
            _meta: {
              "openai/widgetDescription": homeWidget.description,
              "openai/widgetPrefersBorder": true,
              "openai/widgetDomain": homeWidget.widgetDomain,
            },
          },
        ],
      };
    }
  );

  server.registerResource(
    "tetris-play-widget",
    playWidget.templateUri,
    {
      title: playWidget.title,
      description: playWidget.description,
      mimeType: "text/html+skybridge",
      _meta: {
        "openai/widgetDescription": playWidget.description,
        "openai/widgetPrefersBorder": true,
        "openai/widgetCSP": "script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline'; img-src 'self' https:; font-src 'self' https:",
      },
    },
    async (uri) => {
      let html = playWidget.html;
      if (!html) {
        html = await getAppsSdkCompatibleHtml(baseURL, "/tetris/play");
        playWidget.html = html;
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/html+skybridge",
            text: `<html>${html}</html>`,
            _meta: {
              "openai/widgetDescription": playWidget.description,
              "openai/widgetPrefersBorder": true,
              "openai/widgetDomain": playWidget.widgetDomain,
            },
          },
        ],
      };
    }
  );

  server.registerResource(
    "tetris-replays-widget",
    replaysWidget.templateUri,
    {
      title: replaysWidget.title,
      description: replaysWidget.description,
      mimeType: "text/html+skybridge",
      _meta: {
        "openai/widgetDescription": replaysWidget.description,
        "openai/widgetPrefersBorder": true,
        "openai/widgetCSP": "script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline'; img-src 'self' https:; font-src 'self' https:",
      },
    },
    async (uri) => {
      let html = replaysWidget.html;
      if (!html) {
        html = await getAppsSdkCompatibleHtml(baseURL, "/tetris/replays");
        replaysWidget.html = html;
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/html+skybridge",
            text: `<html>${html}</html>`,
            _meta: {
              "openai/widgetDescription": replaysWidget.description,
              "openai/widgetPrefersBorder": true,
              "openai/widgetDomain": replaysWidget.widgetDomain,
            },
          },
        ],
      };
    }
  );

  server.registerResource(
    "tetris-leaderboard-widget",
    leaderboardWidget.templateUri,
    {
      title: leaderboardWidget.title,
      description: leaderboardWidget.description,
      mimeType: "text/html+skybridge",
      _meta: {
        "openai/widgetDescription": leaderboardWidget.description,
        "openai/widgetPrefersBorder": true,
        "openai/widgetCSP": "script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline'; img-src 'self' https:; font-src 'self' https:",
      },
    },
    async (uri) => {
      let html = leaderboardWidget.html;
      if (!html) {
        html = await getAppsSdkCompatibleHtml(baseURL, "/tetris/leaderboard");
        leaderboardWidget.html = html;
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/html+skybridge",
            text: `<html>${html}</html>`,
            _meta: {
              "openai/widgetDescription": leaderboardWidget.description,
              "openai/widgetPrefersBorder": true,
              "openai/widgetDomain": leaderboardWidget.widgetDomain,
            },
          },
        ],
      };
    }
  );

  s.registerTool(
    "show_tetris",
    {
      title: "Show Tetris",
      description: "Open the Tetris home widget.",
      inputSchema: {},
      _meta: widgetMeta(homeWidget),
    },
    async () => ({
      content: [
        { type: "text", text: "Tetris is ready!" },
      ],
      structuredContent: { message: "Tetris loaded", timestamp: new Date().toISOString() },
      _meta: widgetMeta(homeWidget),
    })
  );

  s.registerTool(
    "start_game",
    {

      title: "Start Game",
      description: "Start a new Tetris game (creates a game record and opens the play widget).",
      inputSchema: {
        public: z.boolean().optional().describe("Whether the game is public for spectating"),
        seed: z.number().optional().describe("Optional seed for deterministic play"),
      },
      _meta: widgetMeta(playWidget),
    },
    async (args: any) => {
      try {
        const game = await callConvexMutation(api.games.createGame, {
          public: args.public ?? false,
          seed: args.seed ?? undefined,
        });

        return {
          content: [{ type: "text", text: "Game started" }],
          structuredContent: { gameId: (game as any)._id, message: "Game started" },
          _meta: widgetMeta(playWidget),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error starting game: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  s.registerTool(
    "list_games",
    {
      title: "List Recent Public Games",
      description: "Display recent public finished games",
      inputSchema: { limit: z.number().optional() },
      _meta: widgetMeta(playWidget),
    },
    async (args: any) => {
      try {
        const list = await callConvexQuery(api.games.listPublicFinishedGames, { limit: args.limit ?? 10 });
        return {
          content: [{ type: "text", text: `Found ${Array.isArray(list) ? list.length : 0} public finished games` }],
          structuredContent: { games: list },
          _meta: widgetMeta(playWidget),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error loading public games: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  s.registerTool(
    "get_game",
    {

      title: "Get Game",
      description: "Get details of a specific game by its ID.",
      inputSchema: {
        gameId: z.string().describe("The ID of the game to retrieve"),
      },
    },
    async (args: any) => {
      try {
        const game = await callConvexQuery(api.games.getGame, {
          gameId: args.gameId as any,
        });

        if (!game) {
          return {
            content: [{ type: "text", text: `Game with ID ${args.gameId} not found` }],
            isError: true,
          };
        }

        return {
          content: [{ type: "text", text: `Game: ${String((game as any)._id)}` }],
          structuredContent: game as Record<string, unknown>,
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error getting game: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  s.registerTool(
    "patch_game",
    {
      title: "Patch Game",
      description: "Patch a game's state (board, current piece, score...).",
      inputSchema: {
        gameId: z.string().describe("The ID of the game to update"),
        status: z.string().optional(),
        score: z.number().optional(),
        level: z.number().optional(),
        linesCleared: z.number().optional(),
        board: z.array(z.number()).optional(),
      },
    },
    async (args: any) => {
      try {
        const patchData: Record<string, unknown> = { gameId: args.gameId };
        if (args.status !== undefined) patchData.status = args.status;
        if (args.score !== undefined) patchData.score = args.score;
        if (args.level !== undefined) patchData.level = args.level;
        if (args.linesCleared !== undefined) patchData.linesCleared = args.linesCleared;
        if (args.board !== undefined) patchData.board = args.board;

        await callConvexMutation(api.games.patchGame, patchData);

        const updatedGame = await callConvexQuery(api.games.getGame, { gameId: args.gameId as any });
        return {
          content: [{ type: "text", text: `Game updated successfully` }],
          structuredContent: { gameId: args.gameId, game: updatedGame, message: "Game updated successfully" },
        };
      } catch (error) {
        return { content: [{ type: "text", text: `Error updating game: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  s.registerTool(
    "delete_game",
    {
      title: "Delete Game",
      description: "Delete a game by its ID.",
      inputSchema: { gameId: z.string().describe("The ID of the game to delete") },
    },
    async (args: any) => {
      try {
        const game = await callConvexQuery(api.games.getGame, { gameId: args.gameId as any });
        await callConvexMutation(api.games.deleteGame, { gameId: args.gameId as any });
        return {
          content: [{ type: "text", text: `Game deleted successfully` }],
          structuredContent: { gameId: args.gameId, deletedGame: game, message: "Game deleted successfully" },
        };
      } catch (error) {
        return { content: [{ type: "text", text: `Error deleting game: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  s.registerTool(
    "finish_game",
    {
      securitySchemes: [{ type: "oauth2", scopes: ["games:write", "profile"] }],
      title: "Finish Game",
      description: "Finish a game and optionally submit replay actions to store playback.",
      inputSchema: {
        gameId: z.string().describe("The ID of the game to finish"),
        score: z.number().describe("Final score"),
        level: z.number().describe("Final level"),
        linesCleared: z.number().describe("Total lines cleared"),
        replayActions: z.array(z.object({ t: z.number(), a: z.string(), p: z.any().optional() })).optional(),
        durationMs: z.number().optional(),
      },
    },
    async (args: any) => {
      try {
        const finished = await callConvexMutation(api.games.finishGame, {
          gameId: args.gameId,
          score: args.score,
          level: args.level,
          linesCleared: args.linesCleared,
          replayActions: args.replayActions,
          durationMs: args.durationMs,
        });
        return { content: [{ type: "text", text: "Game finished and recorded." }], structuredContent: { game: finished } };
      } catch (error) {
        return { content: [{ type: "text", text: `Error finishing game: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  s.registerTool(
    "list_replays",
    {
      title: "List Replays",
      description: "List recent replays or replays for a specific game.",
      inputSchema: { gameId: z.string().optional() },
      _meta: widgetMeta(replaysWidget),
    },
    async (args: any) => {
      try {
        if (args.gameId) {
          const list = (await callConvexQuery(api.replays.listByGame, { gameId: args.gameId })) as any[];
          return { content: [{ type: "text", text: `Found ${list.length} replays for the game` }], structuredContent: { replays: list }, _meta: widgetMeta(replaysWidget) };
        }
        const recent = (await callConvexQuery(api.replays.getRecentReplays, {})) as any[];
        return { content: [{ type: "text", text: `Found ${recent.length} recent replays` }], structuredContent: { replays: recent }, _meta: widgetMeta(replaysWidget) };
      } catch (error) {
        return { content: [{ type: "text", text: `Error listing replays: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  s.registerTool(
    "get_replay",
    {
      title: "Get Replay",
      description: "Get a replay by ID for playback.",
      inputSchema: { replayId: z.string().describe("The replay ID") },
      _meta: widgetMeta(replaysWidget),
    },
    async (args: any) => {
      try {
        const r = await callConvexQuery(api.replays.getReplay, { replayId: args.replayId });
        if (!r) return { content: [{ type: "text", text: "Replay not found" }], isError: true };
        return { content: [{ type: "text", text: "Replay loaded" }], structuredContent: { replay: r }, _meta: widgetMeta(replaysWidget) };
      } catch (error) {
        return { content: [{ type: "text", text: `Error loading replay: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  s.registerTool(
    "list_leaderboard",
    {
      title: "List Leaderboard",
      description: "List top leaderboard entries.",
      inputSchema: { limit: z.number().optional() },
      _meta: widgetMeta(leaderboardWidget),
    },
    async (args: any) => {
      try {
        const top = (await callConvexQuery(api.leaderboards.listTop, { limit: args.limit })) as any[];
        return { content: [{ type: "text", text: `Found ${top.length} leaderboard entries` }], structuredContent: { entries: top }, _meta: widgetMeta(leaderboardWidget) };
      } catch (error) {
        return { content: [{ type: "text", text: `Error loading leaderboard: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );
});

export async function GET(req: Request) {
  return handler(req);
}

export async function POST(req: Request) {
  return handler(req);
}