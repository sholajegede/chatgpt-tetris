import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export async function POST(req: Request) {
  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json({ error: "Convex URL not configured" }, { status: 500 });
    }

    const payload = await req.json().catch(() => ({}));

    // Minimal abuse protection: enforce POST and limit automated flags
    // Only accept 'public' flag explicitly true. Otherwise keep game private.
    // Sanitize currentPiece to match Convex schema: { type, rotation?, x, y }
    let currentPiece: any = undefined;
    if (payload && typeof payload.currentPiece === 'object' && payload.currentPiece !== null) {
      const cp = payload.currentPiece;
      // Prefer explicit fields; fall back to inferred values if shape is present
      const type = typeof cp.type === 'string' ? cp.type : undefined;
      const x = typeof cp.x === 'number' ? cp.x : undefined;
      const y = typeof cp.y === 'number' ? cp.y : undefined;
      const rotation = typeof cp.rotation === 'number' ? cp.rotation : 0;
      if (type !== undefined && x !== undefined && y !== undefined) {
        currentPiece = { type, rotation, x, y };
      } else {
        // If a malformed currentPiece was supplied (for example it included 'shape' instead
        // of the expected fields), warn to make debugging easier but do not fail the request.
        // This prevents Convex validation errors while preserving developer visibility.
        // eslint-disable-next-line no-console
        console.warn('create-game: received malformed currentPiece, ignoring:', cp);
      }
    }

    const args: any = {
      public: payload.public === true ? true : false,
      seed: typeof payload.seed === 'number' ? payload.seed : undefined,
      board: Array.isArray(payload.board) ? payload.board : undefined,
      currentPiece,
      nextQueue: Array.isArray(payload.nextQueue) ? payload.nextQueue : undefined,
      holdPiece: typeof payload.holdPiece === 'string' ? payload.holdPiece : undefined,
    };

    const client = new ConvexHttpClient(convexUrl);
    const inserted = await client.mutation(api.games.createGame, args as any);

    return NextResponse.json({ gameId: inserted }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
