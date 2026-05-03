import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

async function fetchArray(fetchPromise: Promise<Response>, label: string) {
  let res: Response;
  try {
    res = await fetchPromise;
  } catch {
    throw error(503, `${label} are temporarily unavailable`);
  }

  if (!res.ok) {
    throw error(503, `${label} are temporarily unavailable`);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw error(503, `${label} returned an invalid response`);
  }

  if (!Array.isArray(data)) {
    throw error(503, `${label} returned an invalid response`);
  }

  return data;
}

export const load: PageLoad = async ({ fetch, parent }) => {
  const { session } = await parent();
  const entriesRequest = fetchArray(fetch("/api/entries"), "Entries");
  const programmingLanguagesRequest = fetchArray(
    fetch("/api/programming-languages"),
    "Programming languages",
  );
  const [entries, programmingLanguages] = await Promise.all([
    entriesRequest,
    programmingLanguagesRequest,
  ]);

  return {
    entries,
    programmingLanguages,
    authenticated: session.authenticated,
    is_admin: session.is_admin,
    can_submit_website: session.can_submit_website,
    website_url: session.website_url,
    user_id: session.id,
  };
};
