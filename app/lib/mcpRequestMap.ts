const tokenMap = new Map<string, string>();

export function setTokenForRequestId(id: string, token: string) {
  tokenMap.set(id, token);
}

export function getTokenForRequestId(id: string): string | null {
  return tokenMap.get(id) ?? null;
}

export function clearTokenForRequestId(id: string) {
  tokenMap.delete(id);
}

export function clearAll() {
  tokenMap.clear();
}
