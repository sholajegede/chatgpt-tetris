# Tetris — Play inside ChatGPT (ChatGPT app)

A lightweight Tetris game that can be played inside ChatGPT as a ChatGPT app using the OpenAI Apps SDK. Play directly in ChatGPT, save replays, and compete on leaderboards without leaving the chat.

## 🌟 Features

- **Play inside ChatGPT**: Play Tetris directly inside ChatGPT as a ChatGPT app using embedded widgets
- **Replays**: Record, save, and share game replays; view and filter saved runs
- **Leaderboards**: Global and public leaderboards showcasing top scores
- **Anonymous & Spectator Modes**: Start anonymous games and allow public spectating
- **Controls**: Keyboard, touch, and basic gamepad support
- **Responsive UI**: Lightweight, mobile-friendly widgets optimized for ChatGPT

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- OpenAI Developer Account with Apps SDK access
- ChatGPT account with app development access

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/sholajegede/chatgpt-tetris-app.git
   cd chatgpt-tetris-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   # Update the environment variables in .env.local
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## � Deploy to Vercel

Deploy your Tetris with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sholajegede/chatgpt-tetris-app)

### Manual Deployment

1. Push your code to a GitHub repository
2. Import the repository to Vercel
3. Set up the required environment variables
4. Deploy!

## �🔧 Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```
# Required for local development
NEXT_PUBLIC_APP_NAME=Tetris
NEXT_PUBLIC_APP_DESCRIPTION="Play Tetris inside ChatGPT as a ChatGPT app"
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Required for production
NEXT_PUBLIC_VERCEL_URL=${VERCEL_URL}
NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL=${VERCEL_PROJECT_PRODUCTION_URL}

# Add your OpenAI API key if needed (server-side only)
# OPENAI_API_KEY=your_openai_api_key
# NEXT_PUBLIC_CONVEX_URL=https://your-convex-instance
```

## 🛠️ Development

### Project Structure

```
.
├── app/
│   ├── api/              # API routes
│   ├── mcp/              # Model Context Protocol implementation
│   ├── components/       # Reusable React components
│   ├── lib/              # Shared utilities and services
│   └── types/            # TypeScript type definitions
├── public/               # Static files
└── tests/                # Test files
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## 🤖 Integration with ChatGPT

This app integrates with ChatGPT using the OpenAI Apps SDK, allowing users to play Tetris directly inside ChatGPT as a ChatGPT app. The MCP server exposes tools and widget resources used by the ChatGPT app to render the game UI and fetch leaderboard and replay data.

### Example Interactions

- "Play a quick Tetris game"
- "Show me the leaderboard"
- "Show my saved replays"
- "Start a new anonymous game"

## 🔧 How It Works

1. **Tool Invocation**: A ChatGPT app calls a tool registered in `app/mcp/route.ts`
2. **Game Processing**: The MCP server creates/fetches game and replay records in Convex
3. **Widget Rendering**: Game board, leaderboards, and replay viewers are rendered in interactive widgets
4. **Real-time Updates**: Leaderboards and replays reflect new finishes and saves

## �📚 Documentation

For detailed documentation on the OpenAI Apps SDK and MCP server implementation, please refer to:

- [OpenAI Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [Model Context Protocol (MCP) Reference](https://developers.openai.com/apps-sdk/build/mcp-server)
- [Widget Development Guide](https://developers.openai.com/apps-sdk/build/widgets)
- [Next.js Documentation](https://nextjs.org/docs)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ using Next.js and the OpenAI Apps SDK

```typescript
const nextConfig: NextConfig = {
  assetPrefix: baseURL,  // Prevents 404s on /_next/ files in iframe
};
```

Without this, Next.js will attempt to load assets from the iframe's URL, causing 404 errors.

### 3. CORS Middleware (`middleware.ts`)

Handles browser OPTIONS preflight requests required for cross-origin RSC (React Server Components) fetching during client-side navigation:

```typescript
export function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    // Return 204 with CORS headers
  }
  // Add CORS headers to all responses
}
```

### 4. SDK Bootstrap (`app/layout.tsx`)

The `<NextChatSDKBootstrap>` component patches browser APIs to work correctly within the ChatGPT app iframe (when played inside ChatGPT as a ChatGPT app):

**What it patches:**
- `history.pushState` / `history.replaceState` - Prevents full-origin URLs in history
- `window.fetch` - Rewrites same-origin requests to use the correct base URL
- `<html>` attribute observer - Prevents ChatGPT from modifying the root element

**Required configuration:**
```tsx
<html lang="en" suppressHydrationWarning>
  <head>
    <NextChatSDKBootstrap baseUrl={baseURL} />
  </head>
  <body>{children}</body>
</html>
```

**Note:** `suppressHydrationWarning` is currently required because ChatGPT modifies the initial HTML before the Next.js app hydrates, causing hydration mismatches.

## Getting Started

### Installation

```bash
npm install
# or
pnpm install
```

### Development

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Testing the MCP Server

The MCP server is available at:
```
http://localhost:3000/mcp
```

### Connecting from ChatGPT

1. Deploy your app to Vercel using the button below:

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sholajegede/chatgpt-tetris-app)

2. After deployment, copy your deployed URL (e.g., `https://your-app.vercel.app`)

3. In ChatGPT, navigate to **Settings → [Connectors](https://chatgpt.com/#settings/Connectors) → Create** and add your MCP server URL with the `/mcp` path (e.g., `https://your-app.vercel.app/mcp`)

**Note:** Connecting MCP servers to ChatGPT requires developer mode access. See the [connection guide](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt) for setup instructions.


## Project Structure

```
app/
├── mcp/
│   └── route.ts          # MCP server with tool/resource registration
├── layout.tsx            # Root layout with SDK bootstrap
├── page.tsx              # Homepage content
└── globals.css           # Global styles
middleware.ts             # CORS handling for RSC
next.config.ts            # Asset prefix configuration
```

## How It Works

1. **Tool Invocation**: A ChatGPT app calls a tool registered in `app/mcp/route.ts`
2. **Resource Reference**: Tool responses include `templateUri` pointing to widget resources that render the game, replays, or leaderboards
3. **Widget Rendering**: The ChatGPT app fetches the resource HTML and renders it in a widget iframe
4. **Client Hydration**: Next.js hydrates the app inside the iframe with patched APIs
5. **Navigation**: Client-side navigation uses the patched `fetch` to load RSC payloads while embedded

## Learn More

- [OpenAI Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [OpenAI Apps SDK - MCP Server Guide](https://developers.openai.com/apps-sdk/build/mcp-server)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Next.js Documentation](https://nextjs.org/docs)

## Deployment

This project is designed to work seamlessly with [Vercel](https://vercel.com) deployment. The `baseUrl.ts` configuration automatically detects Vercel environment variables and sets the correct asset URLs.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sholajegede/chatgpt-tetris-app)

The configuration automatically handles:
- Production URLs via `VERCEL_PROJECT_PRODUCTION_URL`
- Preview/branch URLs via `VERCEL_BRANCH_URL`
- Asset prefixing for correct resource loading in iframes