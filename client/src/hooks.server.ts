import { dev } from "$app/environment";
import type { Handle, RequestEvent } from "@sveltejs/kit";

const ACCESS_TOKEN_MAX_AGE = 15 * 60;
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60;
const securePart = dev ? "" : " Secure;";

function authCookie(name: string, value: string, maxAgeSeconds: number) {
  return `${name}=${encodeURIComponent(
    value,
  )}; Path=/; HttpOnly;${securePart} SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

function clearedAuthCookie(name: string) {
  return `${name}=; Path=/; HttpOnly;${securePart} SameSite=Lax; Max-Age=0`;
}

function getCookieValue(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]+)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function replaceCookie(cookieHeader: string, name: string, value: string) {
  const re = new RegExp(`(^|;\\s*)${name}=[^;]*`);
  if (re.test(cookieHeader)) {
    return cookieHeader.replace(re, `$1${name}=${encodeURIComponent(value)}`);
  }
  return cookieHeader
    ? `${cookieHeader}; ${name}=${encodeURIComponent(value)}`
    : `${name}=${encodeURIComponent(value)}`;
}

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
} | null> {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.access_token || !data?.refresh_token) return null;
    return { access_token: data.access_token, refresh_token: data.refresh_token };
  } catch {
    return null;
  }
}

async function proxyRequest(
  method: string,
  url: string,
  cookieHeader: string,
  bodyBuffer: ArrayBuffer | null,
) {
  const hasBody = bodyBuffer !== null;
  return await fetch(url, {
    method,
    headers: {
      cookie: cookieHeader,
      "Content-Type": "application/json",
    },
    body: hasBody ? bodyBuffer : undefined,
  });
}

async function handleApiRequest(event) {
  const url =
    import.meta.env.VITE_API_URL +
    event.url.pathname.replace(/^\/api/, "") +
    event.url.search;
  let cookieHeader = event.request.headers.get("cookie") ?? "";
  const hasBody =
    event.request.method !== "GET" && event.request.method !== "HEAD";
  const bodyBuffer = hasBody ? await event.request.arrayBuffer() : null;

  let response = await proxyRequest(
    event.request.method,
    url,
    cookieHeader,
    bodyBuffer,
  );

  let refreshedSetCookies: string[] | null = null;
  const refreshToken = getCookieValue(cookieHeader, "refresh_token");
  if (response.status === 401 && refreshToken) {
    const refreshed = await refreshAccessToken(refreshToken);
    if (refreshed) {
      cookieHeader = replaceCookie(
        cookieHeader,
        "access_token",
        refreshed.access_token,
      );
      cookieHeader = replaceCookie(
        cookieHeader,
        "refresh_token",
        refreshed.refresh_token,
      );
      refreshedSetCookies = [
        authCookie(
          "access_token",
          refreshed.access_token,
          ACCESS_TOKEN_MAX_AGE,
        ),
        authCookie(
          "refresh_token",
          refreshed.refresh_token,
          REFRESH_TOKEN_MAX_AGE,
        ),
      ];
      response = await proxyRequest(
        event.request.method,
        url,
        cookieHeader,
        bodyBuffer,
      );
    } else {
      refreshedSetCookies = [
        clearedAuthCookie("access_token"),
        clearedAuthCookie("refresh_token"),
      ];
    }
  }

  // undici has already decompressed the body, so the upstream
  // content-encoding/content-length headers no longer describe what we're
  // sending. Leaving them on causes the browser to fail with
  // "Decoding failed" on client-side navigations.
  const headers = new Headers(response.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  if (refreshedSetCookies) {
    for (const c of refreshedSetCookies) headers.append("set-cookie", c);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function getParsedValue(value: string) {
  if (value === "true") {
    return true;
  } else if (value === "false") {
    return false;
  } else if (value.match(/^\d+$/)) {
    return Number(value);
  } else {
    return value;
  }
}

const HIDDEN_COOKIES = new Set(["access_token", "refresh_token"]);

function addCookiesToLocals(event: RequestEvent) {
  for (const { name, value } of event.cookies.getAll()) {
    if (HIDDEN_COOKIES.has(name)) continue;
    const key = name.replace(/^user_/, "");
    event.locals[key] = getParsedValue(value);
  }
}

export const handle: Handle = async ({ event: e, resolve }) => {
  const event = e; // conform to no-param-reassign rule

  const isApiRequest = event.url.pathname.startsWith("/api/");
  if (isApiRequest) {
    return await handleApiRequest(event);
  }

  addCookiesToLocals(event);

  return await resolve(event);
};
