import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Minimal middleware kept to satisfy Next's loader while we use next.config headers + app/api OPTIONS route.
// Recommended: migrate middleware behavior to `proxy` configuration and remove this file in the future.
export function middleware(request: NextRequest) {
  // no-op: we handle CORS in next.config.ts headers and app/api/[...rest]/route.ts
  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
