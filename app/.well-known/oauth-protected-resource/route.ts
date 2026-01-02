import { NextResponse } from 'next/server';

const MCP_SERVER_URL = process.env.MCP_AUDIENCE || process.env.MCP_SERVER_URL || `https://${process.env.VERCEL_URL || 'localhost'}`;
const DEFAULT_KINDE_ISSUER = 'https://devrelstudio.kinde.com';
const KINDE_ISSUER_URL = process.env.KINDE_ISSUER_URL || process.env.KINDE_ISSUER || DEFAULT_KINDE_ISSUER;

export async function GET() {
  const authServers = [KINDE_ISSUER_URL];
  console.log('oauth-protected-resource using authorization_servers:', authServers);
  return NextResponse.json({
    resource: MCP_SERVER_URL,
    authorization_servers: authServers,
    scopes_supported: ['openid', 'profile', 'email'],
    bearer_methods_supported: ['header'],
    resource_documentation: `${MCP_SERVER_URL}/docs`,
  });
}