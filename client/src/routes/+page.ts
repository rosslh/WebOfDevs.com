import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, parent }) => {
  const { session } = await parent();
  const entriesRequest = fetch("/api/entries").then((res) => res.json());
  const programmingLanguagesRequest = fetch(
    "/api/programming-languages",
  ).then((res) => res.json());
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
