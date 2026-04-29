<script lang="ts">
  import { tick } from "svelte";
  import shuffle from "lodash/shuffle";

  import EntrySortFilter from "../components/EntrySortFilter.svelte";
  import EntryList from "../components/EntryList.svelte";
  import WebsiteFrame from "../components/WebsiteFrame.svelte";
  import AddSiteButton from "../components/AddSiteButton.svelte";
  import AddSiteModal from "../components/AddSiteModal.svelte";
  import ReportSiteModal from "../components/ReportSiteModal.svelte";
  import RemoveSiteModal from "../components/RemoveSiteModal.svelte";

  export let data;

  $: entries = data.entries;
  $: programmingLanguages = data.programmingLanguages;
  $: is_admin = data.is_admin;
  $: authenticated = data.authenticated;
  $: can_submit_website = data.can_submit_website;
  $: website_url = data.website_url;
  $: user_id = data.user_id;

  let selected = null;

  $: shuffledEntries = is_admin
    ? entries.some((e) => e.status === "requires_review")
      ? shuffle(entries.filter((e) => e.status === "requires_review"))
      : shuffle(entries)
    : shuffle(entries);

  let currentShuffledIndex = 0;

  const getRandomEntry = async () => {
    selected = shuffledEntries[currentShuffledIndex % shuffledEntries.length];
    currentShuffledIndex += 1;
    await tick();
    document
      .querySelector("[data-selected]")
      .scrollIntoView({ behavior: "smooth", block: "start", inline: "start" });
  };

  let sortBy = "favorite_count";
  let sortDirection = "desc" as "asc" | "desc";
  let selectedLanguage = null;
  let onlyShowMyFavorites = false;

  $: comparingStrings = sortBy === "name";
  $: sortedEntries = entries
    .sort((a, b) => {
      const aValue = comparingStrings ? a[sortBy].toLowerCase() : a[sortBy];
      const bValue = comparingStrings ? b[sortBy].toLowerCase() : b[sortBy];

      // first sort by selected method
      if (aValue < bValue) {
        return sortDirection === "desc" ? 1 : -1;
      } else if (aValue > bValue) {
        return sortDirection === "desc" ? -1 : 1;
      } else {
        // then sort by name and id
        if (a.name < b.name) {
          return -1;
        } else if (a.name > b.name) {
          return 1;
        } else {
          return a.id - b.id;
        }
      }
    })
    .filter((entry) => !onlyShowMyFavorites || entry.favorited);

  const getFilteredEntries = async (filterByLanguage: number) => {
    if (filterByLanguage) {
      entries = await fetch(
        `/api/entries?programmingLanguageId=${filterByLanguage}`
      ).then((res) => res.json());
    } else {
      entries = await fetch("/api/entries").then((res) => res.json());
    }
    currentShuffledIndex = 0;
  };

  let handledLanguage = null;
  $: {
    if (selectedLanguage !== handledLanguage) {
      handledLanguage = selectedLanguage;
      getFilteredEntries(selectedLanguage);
    }
  }

  let showAddSiteModal = false;
  let showReportSiteModalForEntry = null;
  let showRemoveSiteModal = false;

  const submitWebsite = async (website: string) => {
    const submitWebsiteRequest = fetch("/api/entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        website,
      }),
    });

    const updateSessionRequest = fetch(`/session?update=submitted_website`, {
      method: "PUT",
    });

    await Promise.all([submitWebsiteRequest, updateSessionRequest]);

    setTimeout(() => window.location.reload(), 8000);
  };

  const reportWebsite = async (websiteId: number, reason: string) => {
    await fetch(`/api/reports/${websiteId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason,
      }),
    });
  };

  const removeWebsite = async () => {
    const deleteWebsiteRequest = fetch(`/api/entries/${user_id}`, {
      method: "DELETE",
    });

    const updateSessionRequest = fetch(`/session?update=removed_website`, {
      method: "PUT",
    });

    await Promise.all([deleteWebsiteRequest, updateSessionRequest]);

    setTimeout(() => window.location.reload(), 8000);
  };
</script>

<div class="flex flex-row h-full md:flex-col">
  {#if showAddSiteModal}
    <AddSiteModal
      {submitWebsite}
      detectedWebsiteUrl={website_url}
      bind:showAddSiteModal
    />
  {/if}
  {#if showReportSiteModalForEntry}
    <ReportSiteModal {reportWebsite} bind:showReportSiteModalForEntry />
  {/if}
  {#if showRemoveSiteModal}
    <RemoveSiteModal {removeWebsite} bind:showRemoveSiteModal />
  {/if}
  <div
    class="w-80 shrink-0 border-r border-slate-200 flex flex-col md:w-full md:flex-row"
  >
    <EntrySortFilter
      {authenticated}
      {programmingLanguages}
      {getRandomEntry}
      bind:selectedLanguage
      bind:sortBy
      bind:sortDirection
      bind:onlyShowMyFavorites
    />
    <EntryList
      bind:selected
      bind:showReportSiteModalForEntry
      bind:showRemoveSiteModal
      {sortedEntries}
      {is_admin}
      {authenticated}
      {sortBy}
      {user_id}
    />
    {#if authenticated && can_submit_website}
      <AddSiteButton bind:showAddSiteModal />
    {/if}
  </div>
  <WebsiteFrame bind:selected />
</div>
