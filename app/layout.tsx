import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// @ts-ignore TS2307: Cannot find module or type declarations for side-effect import of './globals.css'.
import "./globals.css";
import { baseURL } from "@/baseUrl";
import { ConvexClientProvider } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tetris — played inside ChatGPT as a ChatGPT app",
  description: "Play Tetris inside ChatGPT as a ChatGPT app — save replays and compete on leaderboards.",
  icons: {
    icon: "/favicon.ico",
  },
  themeColor: "#0ea5a4",
  openGraph: {
    title: "Tetris — played inside ChatGPT (ChatGPT app)",
    description: "Play Tetris inside ChatGPT as a ChatGPT app — record replays and view top scores.",
    url: baseURL,
    siteName: "Tetris (ChatGPT app)",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <NextChatSDKBootstrap baseUrl={baseURL} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}

function NextChatSDKBootstrap({ baseUrl }: { baseUrl: string | undefined | null }) {
  // Ensure a safe baseUrl is injected into the client. If the build-time
  // `baseUrl` is missing or invalid, fall back to an empty string and let
  // the runtime decide the origin (window.location.origin). This prevents
  // runtime exceptions when the widget is loaded inside the ChatGPT app iframe (i.e., when the game is played inside ChatGPT as a ChatGPT app).
  const safeBaseUrl = baseUrl || "";

  return (
    <>
      {/* Only set a base href when we have a sensible base URL to avoid
          generating invalid <base> tags in the widget HTML. */}
      {safeBaseUrl ? <base href={safeBaseUrl}></base> : null}
      <script>{`window.innerBaseUrl = ${JSON.stringify(safeBaseUrl)}`}</script>
      <script>{`window.__isChatGptApp = typeof window.openai !== "undefined";`}</script>
      <script>
        {"(" +
          (() => {
            try {
              const baseUrl = window.innerBaseUrl || "";
              const htmlElement = document.documentElement;
              const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                  if (
                    mutation.type === "attributes" &&
                    mutation.target === htmlElement
                  ) {
                    const attrName = mutation.attributeName;
                    if (attrName && attrName !== "suppresshydrationwarning") {
                      htmlElement.removeAttribute(attrName);
                    }
                  }
                });
              });
              observer.observe(htmlElement, {
                attributes: true,
                attributeOldValue: true,
              });

              const originalReplaceState = history.replaceState;
              history.replaceState = (s, unused, url) => {
                const u = new URL(url ?? "", window.location.href);
                const href = u.pathname + u.search + u.hash;
                originalReplaceState.call(history, unused, href);
              };

              const originalPushState = history.pushState;
              history.pushState = (s, unused, url) => {
                const u = new URL(url ?? "", window.location.href);
                const href = u.pathname + u.search + u.hash;
                originalPushState.call(history, unused, href);
              };

              // If baseUrl is invalid, new URL() will throw — guard against that
              // and fall back to using window.location.origin.
              let appOrigin = null;
              try {
                appOrigin = baseUrl ? new URL(baseUrl).origin : null;
              } catch (err) {
                appOrigin = null;
              }

              const isInIframe = window.self !== window.top;

              window.addEventListener(
                "click",
                (e) => {
                  const a = (e?.target as HTMLElement)?.closest("a");
                  if (!a || !a.href) return;
                  const url = new URL(a.href, window.location.href);
                  if (
                    url.origin !== window.location.origin &&
                    (appOrigin == null || url.origin != appOrigin)
                  ) {
                    try {
                      if (window.openai) {
                        window.openai?.openExternal({ href: a.href });
                        e.preventDefault();
                      }
                    } catch {
                      console.warn(
                        "openExternal failed, likely not in OpenAI client"
                      );
                    }
                  }
                },
                true
              );

              if (isInIframe && appOrigin && window.location.origin !== appOrigin) {
                const originalFetch = window.fetch;

                window.fetch = (input: URL | RequestInfo, init?: RequestInit) => {
                  let url: URL;
                  if (typeof input === "string" || input instanceof URL) {
                    url = new URL(input, window.location.href);
                  } else {
                    url = new URL((input as Request).url, window.location.href);
                  }

                  if (url.origin === appOrigin) {
                    if (typeof input === "string" || input instanceof URL) {
                      input = url.toString();
                    } else {
                      input = new Request(url.toString(), input as RequestInit);
                    }

                    return originalFetch.call(window, input, {
                      ...(init || {}),
                      mode: "cors",
                    });
                  }

                  if (url.origin === window.location.origin) {
                    // map same-origin requests to the configured base URL so
                    // RSC requests route to the app origin when embedded.
                    const newUrl = new URL(appOrigin || window.location.origin);
                    newUrl.pathname = url.pathname;
                    newUrl.search = url.search;
                    newUrl.hash = url.hash;
                    url = newUrl;

                    if (typeof input === "string" || input instanceof URL) {
                      input = url.toString();
                    } else {
                      input = new Request(url.toString(), input as RequestInit);
                    }

                    return originalFetch.call(window, input, {
                      ...(init || {}),
                      mode: "cors",
                    });
                  }

                  return originalFetch.call(window, input, init as RequestInit | undefined);
                };
              }
            } catch (e) {
              // Fail-safe: log and swallow any errors to avoid crashing the widget
              // if an unexpected runtime environment is encountered.
              // eslint-disable-next-line no-console
              console.warn("NextChatSDKBootstrap bootstrap failed:", e);
            }
          }).toString() +
          ")()"}
      </script>
    </>
  );
}
