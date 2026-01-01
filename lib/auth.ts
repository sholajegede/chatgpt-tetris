import { createRemoteJWKSet, jwtVerify } from 'jose';

export type VerifyOptions = {
  issuer: string;
  audience: string | string[];
  requiredScopes?: string[];
};

let jwksMap = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

async function resolveJwksUri(issuer: string) {
  const base = issuer.replace(/\/+$/, '');
  const openid = `${base}/.well-known/openid-configuration`;
  try {
    const res = await fetch(openid, { method: 'GET' });
    if (res.ok) {
      const json = await res.json();
      if (json && json.jwks_uri) return String(json.jwks_uri);
    }
  } catch (_) {
    // ignore and fall through to other well-known paths
  }

  // Try oauth-authorization-server discovery
  try {
    const res = await fetch(`${base}/.well-known/oauth-authorization-server`, { method: 'GET' });
    if (res.ok) {
      const json = await res.json();
      if (json && json.jwks_uri) return String(json.jwks_uri);
    }
  } catch (_) {}

  // Fallbacks
  return `${base}/.well-known/jwks.json`;
}

async function getJwks(issuer: string) {
  const jwksUri = await resolveJwksUri(issuer);
  if (!jwksMap.has(jwksUri)) {
    jwksMap.set(jwksUri, createRemoteJWKSet(new URL(jwksUri)));
  }
  return jwksMap.get(jwksUri)!;
}

export async function verifyAccessToken(token: string, opts: VerifyOptions) {
  if (!token) throw new Error('no token provided');
  const { issuer, audience, requiredScopes } = opts;
  const jwks = await getJwks(issuer);

  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    audience,
  } as any);

  // Optionally enforce scopes in the token (space-separated in `scope` claim or array in `scp`)
  if (requiredScopes && requiredScopes.length > 0) {
    const scopeClaim = (payload as any).scope || (payload as any).scp || '';
    const tokenScopes = Array.isArray(scopeClaim) ? scopeClaim : String(scopeClaim).split(/\s+/).filter(Boolean);
    const missing = requiredScopes.filter((s) => !tokenScopes.includes(s));
    if (missing.length) {
      const err = new Error('insufficient_scope: missing scopes ' + missing.join(','));
      (err as any).missing = missing;
      throw err;
    }
  }

  return payload as Record<string, any>;
}
