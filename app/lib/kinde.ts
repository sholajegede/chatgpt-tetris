import { createRemoteJWKSet, jwtVerify } from 'jose';

const KINDE_ISSUER_URL = process.env.KINDE_ISSUER_URL || process.env.KINDE_ISSUER;
const MCP_AUDIENCE = process.env.MCP_AUDIENCE || process.env.MCP_SERVER_URL || process.env.NEXT_PUBLIC_MCP_AUDIENCE;

function getJwks() {
  if (!KINDE_ISSUER_URL) throw new Error('KINDE_ISSUER_URL (or KINDE_ISSUER) environment variable is not set');
  return createRemoteJWKSet(new URL(`${KINDE_ISSUER_URL}/.well-known/jwks`));
}

export async function validateKindeToken(token: string) {
  if (!token) throw new Error('No token provided');
  if (!KINDE_ISSUER_URL) throw new Error('KINDE_ISSUER_URL not configured');
  if (!MCP_AUDIENCE) throw new Error('MCP_AUDIENCE (or MCP_SERVER_URL) not configured');

  const JWKS = getJwks();
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: KINDE_ISSUER_URL,
    audience: MCP_AUDIENCE,
  } as any);

  return payload as Record<string, any>;
}

export async function getKindeUserProfile(token: string) {
  if (!token) throw new Error('No token provided');
  if (!KINDE_ISSUER_URL) throw new Error('KINDE_ISSUER_URL not configured');

  const url = `${KINDE_ISSUER_URL}/oauth2/v2/user_profile`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to fetch user profile: ${res.status} ${txt}`);
  }
  return (await res.json()) as Record<string, any>;
}
