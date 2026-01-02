import { baseURL } from "@/baseUrl";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getKindeUserProfile, validateKindeToken } from "@/app/lib/kinde";
import { requireAuthForTool, extractTokenFromArgs } from "@/app/lib/mcpAuth";

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

async function getOrCreateUser(
  firstName: string,
  lastName: string
): Promise<{ _id: string } | null> {
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@tetris.local`;

  const existing = await callConvexQuery(api.users.getByEmail, { email }).catch(
    () => null
  );
  if (existing) {
    const existingId = (existing as any)?._id ?? existing;
    return { _id: String(existingId) };
  }

  const userId = await callConvexMutation(api.users.createOrUpdate, {
    email,
    firstName,
    lastName,
  });
  if (!userId) return null;
  return { _id: String(userId) };
}

async function getOrCreateUserFromProfile(
  profile: Record<string, any>
): Promise<{ _id: string } | null> {
  const email =
    profile.email || profile.email_address || profile?.profile?.email;
  const firstName =
    profile.given_name ||
    profile.firstName ||
    (profile.name ? profile.name.split(" ")[0] : undefined) ||
    "Player";
  const lastName =
    profile.family_name ||
    profile.lastName ||
    (profile.name ? profile.name.split(" ").slice(1).join(" ") : undefined) ||
    "Tetris";

  if (!email) {
    return await getOrCreateUser(firstName, lastName);
  }

  const existing = await callConvexQuery(api.users.getByEmail, { email }).catch(
    () => null
  );
  if (existing) {
    const existingId = (existing as any)?._id ?? existing;
    return { _id: String(existingId) };
  }

  const userId = await callConvexMutation(api.users.createOrUpdate, {
    email,
    firstName,
    lastName,
  });
  if (!userId) return null;
  return { _id: String(userId) };
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

  (async () => {
    try {
      homeWidget.html = await getAppsSdkCompatibleHtml(baseURL, "/tetris");
      playWidget.html = await getAppsSdkCompatibleHtml(baseURL, "/tetris/play");
      replaysWidget.html = await getAppsSdkCompatibleHtml(
        baseURL,
        "/tetris/replays"
      );
      leaderboardWidget.html = await getAppsSdkCompatibleHtml(
        baseURL,
        "/tetris/leaderboard"
      );
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
        "openai/widgetCSP":
          "script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline'; img-src 'self' https:; font-src 'self' https:",
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
        "openai/widgetCSP":
          "script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline'; img-src 'self' https:; font-src 'self' https:",
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
        "openai/widgetCSP":
          "script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline'; img-src 'self' https:; font-src 'self' https:",
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
        "openai/widgetCSP":
          "script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline'; img-src 'self' https:; font-src 'self' https:",
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
      content: [{ type: "text", text: "Tetris is ready!" }],
      structuredContent: {
        message: "Tetris loaded",
        timestamp: new Date().toISOString(),
      },
      _meta: widgetMeta(homeWidget),
    })
  );

  s.registerTool(
    "start_game",
    {
      securitySchemes: [
        { type: "noauth" },
        { type: "oauth2", scopes: ["profile"] },
      ],
      title: "Start Game",
      description:
        "Start a new Tetris game (creates a game record and opens the play widget). User will be associated if authenticated.",
      inputSchema: {
        public: z
          .boolean()
          .optional()
          .describe("Whether the game is public for spectating"),
        seed: z
          .number()
          .optional()
          .describe("Optional seed for deterministic play"),
      },
      _meta: widgetMeta(playWidget),
    },
    async (args: any, context: any) => {
      try {
        let userId: string | undefined = undefined;
        let userEmail: string | null = null;
        let userName: string | null = null;

        const token = await extractTokenFromArgs(args, context);
        try {
          console.log(
            "start_game: token from args/context:",
            !!token,
            " lastAuthToken:",
            (await import("@/app/lib/mcpRequestState")).getLastAuthToken()
              ? "PRESENT"
              : "NULL"
          );
        } catch (e) {
          console.warn(
            "start_game: debug import failed",
            (e as any)?.message ?? String(e)
          );
        }

        if (token) {
          try {
            console.log("start_game: token present, validating...");

            const payload = (await validateKindeToken(token).catch(
              () => null
            )) as Record<string, any> | null;
            let profile = await getKindeUserProfile(token).catch(() => null);

            if (!profile && payload) {
              profile = {
                email: payload.email || payload.email_address,
                given_name: payload.given_name,
                family_name: payload.family_name,
                sub: payload.sub,
                name: payload.name,
              } as any;
              console.log(
                "start_game: using profile derived from token payload",
                { hasEmail: !!profile?.email }
              );
            }

            if (payload?.sub) {
              try {
                const linkedUserId = await callConvexMutation(
                  api.users.upsertLinkedAccount,
                  {
                    provider: "kinde",
                    subject: String(payload.sub),
                    profile: profile ?? payload,
                  }
                ).catch(() => null);

                if (linkedUserId) {
                  userId = String(linkedUserId);
                  console.log(
                    "start_game: associated user via linked account",
                    { userId }
                  );

                  const user = (await callConvexQuery(api.users.getById, {
                    userId,
                  }).catch(() => null)) as any;
                  if (user) {
                    userEmail = user.email ?? null;
                    userName = user.firstName
                      ? `${user.firstName} ${user.lastName || ""}`.trim()
                      : null;
                  }
                } else {
                  const user = await getOrCreateUserFromProfile(
                    profile ?? {}
                  ).catch(() => null);
                  if (user) {
                    userId = user._id;
                    console.log(
                      "start_game: associated user via profile fallback",
                      { userId }
                    );

                    const userDetails = (await callConvexQuery(
                      api.users.getById,
                      { userId }
                    ).catch(() => null)) as any;
                    if (userDetails) {
                      userEmail = userDetails.email ?? null;
                      userName = userDetails.firstName
                        ? `${userDetails.firstName} ${
                            userDetails.lastName || ""
                          }`.trim()
                        : null;
                    }
                  }
                }
              } catch (e) {
                console.warn(
                  "start_game: linked account upsert failed, falling back to profile",
                  (e as any)?.message ?? String(e)
                );
                const user = await getOrCreateUserFromProfile(
                  profile ?? {}
                ).catch(() => null);
                if (user) {
                  userId = user._id;
                  console.log(
                    "start_game: associated user via profile fallback",
                    { userId }
                  );

                  const userDetails = (await callConvexQuery(
                    api.users.getById,
                    { userId }
                  ).catch(() => null)) as any;
                  if (userDetails) {
                    userEmail = userDetails.email ?? null;
                    userName = userDetails.firstName
                      ? `${userDetails.firstName} ${
                          userDetails.lastName || ""
                        }`.trim()
                      : null;
                  }
                }
              }
            } else if (profile) {
              const user = await getOrCreateUserFromProfile(profile).catch(
                () => null
              );
              if (user) {
                userId = user._id;
                console.log("start_game: associated user", { userId });

                const userDetails = (await callConvexQuery(api.users.getById, {
                  userId,
                }).catch(() => null)) as any;
                if (userDetails) {
                  userEmail = userDetails.email ?? null;
                  userName = userDetails.firstName
                    ? `${userDetails.firstName} ${
                        userDetails.lastName || ""
                      }`.trim()
                    : null;
                }
              }
            }
          } catch (err) {
            console.warn(
              "start_game: token validation failed, proceeding anonymously",
              (err as any)?.message ?? String(err)
            );
          }
        } else {
          console.log("start_game: no token provided, anonymous game");
        }

        const res = await callConvexMutation(api.games.createGame, {
          public: args.public ?? false,
          seed: args.seed ?? undefined,
          userId,
        });

        const gameId = res as Id<"games">;
        const responseText = userId
          ? `Game started for ${userName || userEmail || "user"}!`
          : "Game started (anonymous)!";

        console.log("start_game returning:", { gameId, userId });

        return {
          content: [{ type: "text", text: responseText }],
          structuredContent: {
            gameId: gameId,
            userId: userId ?? null,
            userEmail,
            userName,
            message: responseText,
          },
          _meta: widgetMeta(playWidget),
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error starting game: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  s.registerTool(
    "list_all_games",
    {
      securitySchemes: [
        { type: "noauth" },
        { type: "oauth2", scopes: ["profile"] },
      ],
      title: "List All Games",
      description:
        "List all games (authenticated users see their own games, anonymous users see recent public games)",
      inputSchema: {
        limit: z.number().optional(),
        status: z
          .string()
          .optional()
          .describe("Filter by status: active, finished, abandoned, paused"),
      },
    },
    async (args: any, context: any) => {
      try {
        let userId: string | undefined = undefined;

        // Try to get authenticated user
        const token = await extractTokenFromArgs(args, context);
        if (token) {
          try {
            const payload = (await validateKindeToken(token).catch(
              () => null
            )) as Record<string, any> | null;
            let profile = await getKindeUserProfile(token).catch(() => null);

            if (!profile && payload) {
              profile = {
                email: payload.email || payload.email_address,
                given_name: payload.given_name,
                family_name: payload.family_name,
                sub: payload.sub,
                name: payload.name,
              } as any;
            }

            if (payload?.sub) {
              const linkedUserId = await callConvexMutation(
                api.users.upsertLinkedAccount,
                {
                  provider: "kinde",
                  subject: String(payload.sub),
                  profile: profile ?? payload,
                }
              ).catch(() => null);

              if (linkedUserId) {
                userId = String(linkedUserId);
              } else if (profile) {
                const user = await getOrCreateUserFromProfile(profile).catch(
                  () => null
                );
                if (user) userId = user._id;
              }
            } else if (profile) {
              const user = await getOrCreateUserFromProfile(profile).catch(
                () => null
              );
              if (user) userId = user._id;
            }
          } catch (err) {
            console.warn("list_all_games: token validation failed", err);
          }
        }

        let games: any[] = [];

        if (userId) {
          // Authenticated: show user's games
          games = (await callConvexQuery(api.games.listByUser, {
            userId: userId as any,
            status: args.status,
          })) as any[];
        } else {
          // Anonymous: show recent public finished games
          games = (await callConvexQuery(api.games.listPublicFinishedGames, {
            limit: args.limit ?? 20,
          })) as any[];
        }

        const responseText = userId
          ? `Found ${games.length} of your games${
              args.status ? ` (${args.status})` : ""
            }`
          : `Found ${games.length} recent public games`;

        return {
          content: [{ type: "text", text: responseText }],
          structuredContent: {
            games,
            userId: userId ?? null,
            isAuthenticated: !!userId,
          },
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error listing games: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
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
        const list = await callConvexQuery(api.games.listPublicFinishedGames, {
          limit: args.limit ?? 10,
        });
        return {
          content: [
            {
              type: "text",
              text: `Found ${
                Array.isArray(list) ? list.length : 0
              } public finished games`,
            },
          ],
          structuredContent: { games: list },
          _meta: widgetMeta(playWidget),
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error loading public games: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  s.registerTool(
    "finish_game",
    {
      securitySchemes: [
        { type: "noauth" },
        { type: "oauth2", scopes: ["games:write", "profile"] },
      ],
      title: "Finish Game",
      description:
        "Finish a game and optionally submit replay actions to store playback. User will be associated if authenticated.",
      inputSchema: {
        gameId: z.string().describe("The ID of the game to finish"),
        score: z.number().describe("Final score"),
        level: z.number().describe("Final level"),
        linesCleared: z.number().describe("Total lines cleared"),
        replayActions: z
          .array(
            z.object({ t: z.number(), a: z.string(), p: z.any().optional() })
          )
          .optional(),
        durationMs: z.number().optional(),
      },
    },
    async (args: any, context: any) => {
      try {
        if (!args.gameId) {
          return {
            content: [
              {
                type: "text",
                text: `Invalid game ID format: ${args.gameId}`,
              },
            ],
            isError: true,
          };
        }

        let userId: string | undefined = undefined;

        const token = await extractTokenFromArgs(args, context);
        if (token) {
          try {
            const payload = (await validateKindeToken(token).catch(
              () => null
            )) as Record<string, any> | null;
            let profile = await getKindeUserProfile(token).catch(() => null);

            if (!profile && payload) {
              profile = {
                email: payload.email || payload.email_address,
                given_name: payload.given_name,
                family_name: payload.family_name,
                sub: payload.sub,
                name: payload.name,
              } as any;
            }

            if (payload?.sub) {
              const linkedUserId = await callConvexMutation(
                api.users.upsertLinkedAccount,
                {
                  provider: "kinde",
                  subject: String(payload.sub),
                  profile: profile ?? payload,
                }
              ).catch(() => null);

              if (linkedUserId) {
                userId = String(linkedUserId);
              } else if (profile) {
                const user = await getOrCreateUserFromProfile(profile).catch(
                  () => null
                );
                if (user) userId = user._id;
              }
            } else if (profile) {
              const user = await getOrCreateUserFromProfile(profile).catch(
                () => null
              );
              if (user) userId = user._id;
            }
          } catch (err) {
            console.warn(
              "finish_game: token validation failed, finishing anonymously",
              err
            );
          }
        }

        const finished = await callConvexMutation(api.games.finishGame, {
          gameId: args.gameId as Id<"games">,
          score: args.score,
          level: args.level,
          linesCleared: args.linesCleared,
          replayActions: args.replayActions,
          durationMs: args.durationMs,
          userId,
        });

        let user: any = null;
        if (userId) {
          user = await callConvexQuery(api.users.getById, { userId }).catch(
            () => null
          );
        }

        const userName = user?.firstName
          ? `${user.firstName} ${user.lastName || ""}`.trim()
          : user?.email || "player";

        return {
          content: [
            {
              type: "text",
              text: `Game finished! Score: ${args.score}, Level: ${
                args.level
              }, Lines: ${args.linesCleared}${
                userId ? ` — saved for ${userName}` : " (anonymous)"
              }`,
            },
          ],
          structuredContent: { game: finished, user, userId },
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error finishing game: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
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
        if (!args.gameId) {
          return {
            content: [
              { type: "text", text: `Invalid game ID format: ${args.gameId}` },
            ],
            isError: true,
          };
        }

        const game = await callConvexQuery(api.games.getGame, {
          gameId: args.gameId as Id<"games">,
        });

        if (!game) {
          return {
            content: [
              { type: "text", text: `Game with ID ${args.gameId} not found` },
            ],
            isError: true,
          };
        }

        const gameData = game as any;
        return {
          content: [
            {
              type: "text",
              text: `Game ${gameData._id}: Score ${gameData.score}, Level ${gameData.level}, Status ${gameData.status}`,
            },
          ],
          structuredContent: game as Record<string, unknown>,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting game: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  s.registerTool(
    "delete_game",
    {
      title: "Delete Game",
      description: "Delete a game by its ID.",
      inputSchema: {
        gameId: z.string().describe("The ID of the game to delete"),
      },
    },
    async (args: any) => {
      try {
        if (!args.gameId) {
          return {
            content: [
              { type: "text", text: `Invalid game ID format: ${args.gameId}` },
            ],
            isError: true,
          };
        }

        const game = await callConvexQuery(api.games.getGame, {
          gameId: args.gameId as Id<"games">,
        });

        if (!game) {
          return {
            content: [
              { type: "text", text: `Game with ID ${args.gameId} not found` },
            ],
            isError: true,
          };
        }

        await callConvexMutation(api.games.deleteGame, {
          gameId: args.gameId as Id<"games">,
        });

        return {
          content: [
            { type: "text", text: `Game ${args.gameId} deleted successfully` },
          ],
          structuredContent: {
            gameId: args.gameId,
            deletedGame: game,
            message: "Game deleted successfully",
          },
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error deleting game: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
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
        if (!args.gameId) {
          return {
            content: [
              { type: "text", text: `Invalid game ID format: ${args.gameId}` },
            ],
            isError: true,
          };
        }

        const patchData: Record<string, unknown> = {
          gameId: args.gameId as any,
        };
        if (args.status !== undefined) patchData.status = args.status;
        if (args.score !== undefined) patchData.score = args.score;
        if (args.level !== undefined) patchData.level = args.level;
        if (args.linesCleared !== undefined)
          patchData.linesCleared = args.linesCleared;
        if (args.board !== undefined) patchData.board = args.board;

        await callConvexMutation(api.games.patchGame, patchData);

        const updatedGame = await callConvexQuery(api.games.getGame, {
          gameId: args.gameId as Id<"games">,
        });

        return {
          content: [
            { type: "text", text: `Game ${args.gameId} updated successfully` },
          ],
          structuredContent: {
            gameId: args.gameId,
            game: updatedGame,
            message: "Game updated successfully",
          },
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error updating game: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
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
          return {
            content: [
              {
                type: "text",
                text: `Invalid game ID format: ${args.gameId}`,
              },
            ],
            isError: true,
          };

          const list = (await callConvexQuery(api.replays.listByGame, {
            gameId: args.gameId as any,
          })) as any[];
          return {
            content: [
              {
                type: "text",
                text: `Found ${list.length} replays for game ${args.gameId}`,
              },
            ],
            structuredContent: { replays: list },
            _meta: widgetMeta(replaysWidget),
          };
        }

        const recent = (await callConvexQuery(
          api.replays.getRecentReplays,
          {}
        )) as any[];
        return {
          content: [
            { type: "text", text: `Found ${recent.length} recent replays` },
          ],
          structuredContent: { replays: recent },
          _meta: widgetMeta(replaysWidget),
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error listing replays: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
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
        if (!args.replayId) {
          return {
            content: [
              {
                type: "text",
                text: `Invalid replay ID format: ${args.replayId}`,
              },
            ],
            isError: true,
          };
        }

        const r = await callConvexQuery(api.replays.getReplay, {
          replayId: args.replayId as any,
        });

        if (!r) {
          return {
            content: [
              { type: "text", text: `Replay ${args.replayId} not found` },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Replay loaded: ${(r as any).actions?.length || 0} actions`,
            },
          ],
          structuredContent: { replay: r },
          _meta: widgetMeta(replaysWidget),
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error loading replay: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  s.registerTool(
    "whoami",
    {
      title: "Who Am I",
      description: "Return the current authenticated profile (for debugging).",
      securitySchemes: [{ type: "oauth2", scopes: ["profile"] }],
    },
    async (args: any, context: any) => {
      const auth = await requireAuthForTool(args, context);
      if ((auth as any).isError) return auth as any;

      const profile = (auth as any).profile || {};
      const payload = (auth as any).payload || {};
      const email =
        profile.email ||
        profile.email_address ||
        profile?.profile?.email ||
        payload?.email ||
        payload?.email_address ||
        null;
      const name =
        profile.name ||
        profile.given_name ||
        profile.firstName ||
        profile?.profile?.name ||
        null;
      const providerSubject = payload?.sub ? String(payload.sub) : null;

      let convexUserId: string | null = null;
      if (providerSubject) {
        try {
          const linkedUser = await callConvexMutation(
            api.users.upsertLinkedAccount,
            {
              provider: "kinde",
              subject: providerSubject,
              profile: profile || payload,
            }
          ).catch(() => null);
          if (linkedUser) convexUserId = String(linkedUser);
        } catch (e) {
          console.warn(
            "whoami: upsertLinkedAccount failed",
            (e as any)?.message ?? String(e)
          );
        }
      }

      return {
        content: [
          {
            type: "text",
            text: `Authenticated${email ? ` as ${email}` : ""}${
              providerSubject ? ` (${providerSubject})` : ""
            }`,
          },
        ],
        structuredContent: {
          profile,
          payload,
          email,
          name,
          provider: providerSubject
            ? { provider: "kinde", subject: providerSubject }
            : null,
          convexUserId,
        },
      };
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
        const top = (await callConvexQuery(api.leaderboards.listTop, {
          limit: args.limit,
        })) as any[];
        return {
          content: [
            { type: "text", text: `Found ${top.length} leaderboard entries` },
          ],
          structuredContent: { entries: top },
          _meta: widgetMeta(leaderboardWidget),
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error loading leaderboard: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  s.registerTool(
    "ping",
    {
      title: "Ping",
      description: "Simple health check that returns server time.",
      inputSchema: {},
    },
    async () => {
      return {
        content: [{ type: "text", text: "pong" }],
        structuredContent: { serverTime: new Date().toISOString() },
      };
    }
  );
});

import { setLastAuthToken } from "@/app/lib/mcpRequestState";
import { setTokenForRequestId } from "@/app/lib/mcpRequestMap";
import { Id } from "@/convex/_generated/dataModel";

export async function GET(req: Request) {
  return handler(req);
}

export async function POST(req: Request) {
  let clonedReq = req;

  try {
    const authHeader =
      req.headers.get("Authorization") || req.headers.get("authorization");

    if (
      authHeader &&
      typeof authHeader === "string" &&
      authHeader.startsWith("Bearer ")
    ) {
      const token = authHeader.substring(7);

      const bodyText = await req.text();
      if (bodyText) {
        let parsed: any = null;
        try {
          parsed = JSON.parse(bodyText);
        } catch (e) {}

        const idsToCheck: string[] = [];
        function collectIds(obj: any) {
          if (!obj || typeof obj !== "object") return;
          for (const k of Object.keys(obj)) {
            if (
              k === "requestId" ||
              k === "sessionId" ||
              k === "request_id" ||
              k === "id"
            ) {
              const v = obj[k];
              if (typeof v === "string") idsToCheck.push(v);
            } else if (typeof obj[k] === "object") {
              collectIds(obj[k]);
            }
          }
        }

        collectIds(parsed);

        for (const id of idsToCheck) {
          setTokenForRequestId(id, token);
          console.log("POST: mapped token to id", id);
        }

        clonedReq = new Request(req.url, {
          method: req.method,
          headers: req.headers,
          body: bodyText,
        });
      }
    }

    return await handler(clonedReq);
  } catch (error) {
    throw error;
  }
}