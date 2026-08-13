export const TOKEN_KEY = 'accessToken';

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

type TokenListener = () => void;

const logoutListeners = new Set<TokenListener>();

export function onAccessTokenCleared(listener: TokenListener): () => void {
  logoutListeners.add(listener);
  return () => logoutListeners.delete(listener);
}

export function clearAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  logoutListeners.forEach((listener) => listener());
}
