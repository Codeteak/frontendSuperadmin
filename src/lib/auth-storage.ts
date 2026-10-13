import { clearPosGateUnlocked } from "@/lib/pos-gate-session";

const ACCESS_KEY = "yaadro_access_token";
const REFRESH_KEY = "yaadro_refresh_token";
const EMAIL_KEY = "yaadro_admin_email";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function getAdminEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(EMAIL_KEY);
}

export function setSession(tokens: {
  access_token: string;
  refresh_token: string;
  email?: string;
}) {
  localStorage.setItem(ACCESS_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
  if (tokens.email) {
    localStorage.setItem(EMAIL_KEY, tokens.email);
  }
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(EMAIL_KEY);
  clearPosGateUnlocked();
}

export function hasSession(): boolean {
  return Boolean(getAccessToken());
}
