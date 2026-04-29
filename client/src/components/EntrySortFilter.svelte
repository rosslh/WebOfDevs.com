<script lang="ts">
  import Select from "svelte-select";
  import ChevronDownIcon from "~icons/octicon/chevron-down-16";
  import ShuffleIcon from "~icons/ph/shuffle-bold";

  export let authenticated: boolean;
  export let sortBy: string;
  export let sortDirection: "asc" | "desc";
  export let selectedLanguage: number;
  export let onlyShowMyFavorites: boolean;
  export let getRandomEntry: () => void;

  export let programmingLanguages;

  const sortOptions = [
    { value: "favorite_count_desc", label: "Favorite Count" },
    { value: "github_num_followers_desc", label: "GitHub Followers" },
    { value: "github_num_stars_desc", label: "Total GitHub Stars" },
    { value: "name_asc", label: "Alphabetical (A-Z)" },
    { value: "name_desc", label: "Alphabetical (Z-A)" },
    { value: "created_at_desc", label: "Most Recently Added" },
    { value: "created_at_asc", label: "Least Recently Added" },
  ];

  $: sortValue =
    sortOptions.find(
      (option) => option.value === `${sortBy}_${sortDirection}`
    ) ?? sortOptions[0];

  const handleSortSelect = (e) => {
    sortBy = e.detail.value.replace(/_(asc|desc)$/, "");
    sortDirection = e.detail.value.endsWith("_asc") ? "asc" : "desc";
  };

  const languageOptions = programmingLanguages.map(
    (language: { id: number; name: string }) => ({
      value: language.id,
      label: language.name,
    })
  );

  const handleLanguageSelect = (e) => {
    selectedLanguage = e?.detail?.value;
  };

  let collapsed = true;
</script>

<div class="flex flex-row bg-slate-50 md:h-12" class:shadow-sm={!collapsed}>
  <div class="md:hidden border-b border-slate-200 flex flex-row flex-1">
    <div class="flex-1 text-slate-700 pl-2">
      <button
        type="button"
        class="sort-filter-title font-bold text-slate-500 mt-3 pl-2 cursor-pointer"
        class:mb-2={!collapsed}
        aria-expanded={!collapsed}
        on:click={() => (collapsed = !collapsed)}
      >
        Sort / Filter
      </button>
      {#if !collapsed}
        <div class="dropdown-wrapper">
          <label class="select-label" for="sort">Sort by:</label>
          <Select
            id="sort"
            items={sortOptions}
            value={sortValue}
            on:select={handleSortSelect}
            clearable={false}
          />
        </div>
        <div class="dropdown-wrapper" class:pb-3={!authenticated}>
          <label class="select-label" for="language">GitHub language:</label>
          <Select
            id="language"
            items={languageOptions}
            value={languageOptions.find(
              (option) => option.value === selectedLanguage
            )}
            on:select={handleLanguageSelect}
            on:clear={handleLanguageSelect}
          />
        </div>
        {#if authenticated}
          <div class="dropdown-wrapper pt-1 pb-2 flex items-center">
            <input
              class="ml-1"
              type="checkbox"
              id="favorites"
              bind:checked={onlyShowMyFavorites}
            />
            <label class="ml-1" for="favorites">Show only my favorites</label>
          </div>
        {/if}
      {/if}
    </div>
    <button
      type="button"
      class="flex items-center justify-center text-slate-500 pl-3 pr-3 cursor-pointer"
      on:click={() => (collapsed = !collapsed)}
      aria-expanded={!collapsed}
    >
      <span
        class="chevron-wrapper"
        class:transform={!collapsed}
        class:-rotate-180={!collapsed}
      >
        <ChevronDownIcon />
      </span>
    </button>
  </div>
  <button
    class="p-3 border-l border-l-slate-200 border-b border-b-slate-200 text-slate-500 hover:bg-slate-100 w-12 {collapsed
      ? 'h-12'
      : 'h-full'} md:border-r md:border-r-slate-200 md:shadow-md md:z-20"
    on:click={getRandomEntry}
  >
    <ShuffleIcon />
  </button>
</div>

<style lang="postcss">
  .dropdown-wrapper {
    @apply mb-2 text-sm;

    --padding: 0.5rem;
    --height: 2rem;
    --clearSelectTop: 0.5rem;
    --clearSelectBottom: 0.5rem;

    --border: 1px solid rgb(226 232 240 / 1);
    --borderHoverColor: #94a3b8;
    --borderFocusColor: #94a3b8;
  }

  .dropdown-wrapper label {
    @apply font-medium text-slate-700;
  }

  .dropdown-wrapper label.select-label {
    @apply pl-2 mb-1 inline-block;
  }

  .dropdown-wrapper :global(.selectContainer) {
    @apply text-slate-700;
  }
</style>
