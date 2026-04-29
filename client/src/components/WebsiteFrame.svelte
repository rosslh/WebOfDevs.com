<script lang="ts">
  import type { EntryData } from "../app";
  import ReloadIcon from "~icons/ooui/reload";
  import ExternalLinkIcon from "~icons/octicon/link-external-16";

  export let selected: EntryData;

  const reload = () => {
    selected.reloadKey = !selected.reloadKey;
    selected = selected;
  };

  $: url = selected ? selected.website_url.replace(/\/$/, '') : "";
</script>
<div class="w-full h-full flex flex-col p-1 bg-slate-50 md:w-full md:h-full md:z-30">
  {#if selected}
    <div class="flex items-center justify-center pt-2 pb-2 pl-7 pr-7 bg-slate-white border border-slate-300 border-b-0 rounded-tl-md rounded-tr-md">
      <button class="mr-4 text-slate-500 hover:text-slate-400" on:click={reload}>
        <ReloadIcon />
      </button>
      <a
        href={url}
        rel="noopener noreferrer"
        target="_blank"
        class="group bg-slate-200 flex-1 flex flex-row items-center rounded-full p-1 pl-5 pr-5 text-slate-550 tracking-wide text-sm hover:bg-slate-250"
      >
        {url}
        <span class="ml-1.5 text-xs hidden group-hover:inline">
          <ExternalLinkIcon />
        </span>
      </a>
    </div>
    {#key `${selected.website_url}|${selected.reloadKey}`}
      <iframe
        class="w-full flex-grow bg-white border border-slate-300 rounded-bl-md rounded-br-md"
        src={selected.website_url}
        title=""
        sandbox="allow-forms allow-modals allow-popups allow-scripts allow-downloads"
      ></iframe>
    {/key}
  {:else}
    <div class="flex flex-grow flex-col items-center justify-center text-center px-6 -mt-8">
      <div class="max-w-md flex flex-col items-center">
        <h2 class="text-3xl font-bold mb-6 leading-tight pb-1">
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
            Web of Devs is now open source!
          </span>
        </h2>
        <p class="text-slate-500 mb-8 leading-relaxed max-w-xs">
          If it's helped you discover great developers, a star on GitHub goes a long way.
        </p>
        <a
          class="github-button"
          href="https://github.com/rosslh/webofdevs.com"
          data-color-scheme="no-preference: light; light: light; dark: light;"
          data-icon="octicon-star"
          data-size="large"
          data-show-count="true"
          aria-label="Star rosslh/webofdevs.com on GitHub"
        >
          Star on GitHub
        </a>
      </div>
    </div>
  {/if}
</div>
