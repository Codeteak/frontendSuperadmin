import { apiFetch } from "@/lib/api";
import { clearSession, setSession } from "@/lib/auth-storage";
import type { AuthVerifyResponse } from "@/types/api";



export function requestLoginCode(email: string) {
  return apiFetch<{ accepted: boolean; expires_in?: number }>(
    "/v2/auth/login/request-code",
    {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email }),
    },
  );
}

export async function verifyLoginCode(email: string, otp: string) {
  const data = await apiFetch<AuthVerifyResponse>("/v2/auth/login/verify", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, otp }),
  });

  setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    email: data.email ?? email,
  });

  return data;
}

export async function logout() {
  const refreshToken =
    typeof window !== "undefined"
      ? localStorage.getItem("yaadro_refresh_token")
      : null;

  try {
    if (refreshToken) {
      await apiFetch<{ revoked: boolean }>("/v2/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
        skipRefresh: true,
      });
    }
  } finally {
    clearSession();
  }
}
