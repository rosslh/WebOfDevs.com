import { dev } from "$app/environment";
import type { Cookies } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const ACCESS_TOKEN_MAX_AGE = 15 * 60;
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60;
const PUBLIC_COOKIE_MAX_AGE = REFRESH_TOKEN_MAX_AGE;

const cookieDefaults = {
  path: "/",
  sameSite: "lax",
  secure: !dev,
} as const;

function setAuthCookie(
  cookies: Cookies,
  name: string,
  value: string,
  maxAge: number,
) {
  cookies.set(name, value, {
    ...cookieDefaults,
    httpOnly: true,
    maxAge,
  });
}

function setPublicCookie(
  cookies: Cookies,
  name: string,
  value: string,
  maxAge: number,
) {
  cookies.set(name, value, {
    ...cookieDefaults,
    httpOnly: false,
    maxAge,
  });
}

function deleteAuthCookie(cookies: Cookies, name: string) {
  cookies.delete(name, { ...cookieDefaults, httpOnly: true });
}

function deletePublicCookie(cookies: Cookies, name: string) {
  cookies.delete(name, { ...cookieDefaults, httpOnly: false });
}

const PUBLIC_COOKIE_NAMES = [
  "user_id",
  "user_name",
  "user_github_username",
  "user_profile_image_url",
  "user_website_url",
  "user_is_admin",
  "user_can_submit_website",
  "user_authenticated",
];

function redirectHome() {
  return new Response(null, {
    status: 303,
    headers: {
      location: "/",
    },
  });
}

export const GET: RequestHandler = async ({ cookies, url }) => {
  const code = url.searchParams.get("code");

  const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: code }),
  });

  if (!response.ok) {
    return redirectHome();
  }

  const data = await response.json();

  setAuthCookie(cookies, "access_token", data.access_token, ACCESS_TOKEN_MAX_AGE);
  setAuthCookie(cookies, "refresh_token", data.refresh_token, REFRESH_TOKEN_MAX_AGE);
  setPublicCookie(cookies, "user_id", String(data.user.id), PUBLIC_COOKIE_MAX_AGE);
  setPublicCookie(cookies, "user_name", data.user.name ?? "", PUBLIC_COOKIE_MAX_AGE);
  setPublicCookie(
    cookies,
    "user_github_username",
    data.user.github_username ?? "",
    PUBLIC_COOKIE_MAX_AGE,
  );
  setPublicCookie(
    cookies,
    "user_profile_image_url",
    data.user.profile_image_url ?? "",
    PUBLIC_COOKIE_MAX_AGE,
  );
  setPublicCookie(
    cookies,
    "user_website_url",
    data.user.website_url ?? "",
    PUBLIC_COOKIE_MAX_AGE,
  );
  setPublicCookie(
    cookies,
    "user_is_admin",
    String(Boolean(data.user.is_admin)),
    PUBLIC_COOKIE_MAX_AGE,
  );
  setPublicCookie(
    cookies,
    "user_can_submit_website",
    String(Boolean(data.user.can_submit_website)),
    PUBLIC_COOKIE_MAX_AGE,
  );
  setPublicCookie(cookies, "user_authenticated", "true", PUBLIC_COOKIE_MAX_AGE);

  return redirectHome();
};

export const PUT: RequestHandler = async ({ cookies, url }) => {
  const updateType = url.searchParams.get("update");
  if (updateType === "submitted_website") {
    setPublicCookie(
      cookies,
      "user_can_submit_website",
      "false",
      PUBLIC_COOKIE_MAX_AGE,
    );
    return new Response(null, { status: 200 });
  } else if (updateType === "removed_website") {
    setPublicCookie(
      cookies,
      "user_can_submit_website",
      "true",
      PUBLIC_COOKIE_MAX_AGE,
    );
    return new Response(null, { status: 200 });
  }

  return new Response(null, { status: 400 });
};

export const DELETE: RequestHandler = async ({ cookies, request }) => {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const refreshMatch = cookieHeader.match(/(?:^|;\s*)refresh_token=([^;]+)/);
  const refreshToken = refreshMatch ? decodeURIComponent(refreshMatch[1]) : "";

  if (refreshToken) {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: cookieHeader,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // best-effort revocation; cookies are cleared regardless
    }
  }

  deleteAuthCookie(cookies, "access_token");
  deleteAuthCookie(cookies, "refresh_token");
  PUBLIC_COOKIE_NAMES.forEach((name) => deletePublicCookie(cookies, name));

  return new Response(null, { status: 200 });
};
