let lastAuthToken: string | null = null;

export function setLastAuthToken(token: string | null) {
  lastAuthToken = token;
}

export function getLastAuthToken() {
  return lastAuthToken;
}