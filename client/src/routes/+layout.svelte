<script lang="ts">
  export let data;

  import "../app.css";
  import { MetaTags } from "svelte-meta-tags";

  $: authenticated = data.session.authenticated;

  const loginHref = new URL("https://github.com/login/oauth/authorize");
  loginHref.searchParams.set("client_id", import.meta.env.VITE_GITHUB_OAUTH_CLIENT_ID);
  loginHref.searchParams.set("allow_signup", "false");

  async function logout() {
    await fetch("/session", { method: "DELETE" });
    location.reload();
  }

  const meta = {
    title: "Web of Devs: A directory of developer websites",
    description: "Web of Devs is a community of developers with amazing personal websites, homepages, and portfolios.",
    url: "https://webofdevs.com",
    siteName: "Web of Devs",
    image: {
      url: "https://webofdevs.com/site-image.png",
      width: 1200,
      height: 627,
      alt: "Web of Devs: A directory of developer websites",
    },
  };
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" >
  <link href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@700&family=Roboto:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet"> 
</svelte:head>
<MetaTags
  title={meta.title}
  description={meta.description}
  canonical={meta.url}
  openGraph={{
    description: meta.description,
    images: [{
      ...meta.image,
    }],
    siteName: meta.siteName,
    title: meta.title,
    type: "website",
    url: meta.url,
  }}
  twitter={{
    cardType: "summary_large_image",
    title: meta.title,
    description: meta.description,
    image: meta.image.url,
    imageAlt: meta.image.alt,
  }}
/>
<div class="header bg-slate-100 flex items-center justify-between border-b border-slate-200 fixed top-0 left-0 right-0 h-10">
  <a href="/" class="left flex items-center ml-4">
    <div class="logo">
      <div class="logo-bg"></div>
    </div>
    <h1 class="pt-2 pb-2 text-2xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400 select-none ml-2.5 md:text-xl">
      Web of Devs
    </h1>
  </a>
  <div class="right flex items-center justify-end m-2 mr-8 font-medium text-lg space-x-6 md:text-lg">
    <a href="/about">
      About
    </a>
    {#if authenticated}
      <button on:click={logout}>
        Logout
      </button>
    {:else}
      <a href={loginHref.toString()}>
        GitHub Login
      </a>
    {/if}
  </div>
</div>
<div class="fixed top-10 bottom-0 left-0 right-0 overflow-y-auto">
  <slot />
</div>

<style lang="postcss">
  .left:hover .logo-bg, .left:hover h1 {
    @apply bg-gradient-to-r from-indigo-500 to-pink-500;
  }

  .logo {
    width: 32px;
    height: 32px;
    margin-top: -8px;
    clip-path: path("M17.517 0v7.704A8.296 8.296 0 0 0 16 7.582a8.296 8.296 0 0 0-1.517.122V0m8.948 19.716a7.583 7.583 0 0 1-.258.833l4.96 2.838v6.945h-3.035v-5.187l-3.427-1.957a7.492 7.492 0 0 1-11.344 0l-3.425 1.957v5.186H3.867v-6.946l4.959-2.836a7.583 7.583 0 0 1-.258-.834h-2.73l-4.17 2.776L0 19.973l4.928-3.29h3.64a7.583 7.583 0 0 1 .411-1.335L6.614 13.83l-5.416 1.335-.728-3.033 6.718-1.637 3.504 2.32a7.583 7.583 0 0 1 10.616 0l3.444-2.32 6.777 1.637-.728 3.033-5.415-1.348-2.365 1.516a7.583 7.583 0 0 1 .41 1.35h3.64L32 19.959l-1.668 2.518-4.172-2.76M14.483 18.2a1.517 1.517 0 1 0-1.517 1.516 1.517 1.517 0 0 0 1.517-1.516m6.066 0a1.517 1.517 0 1 0-1.515 1.516 1.517 1.517 0 0 0 1.515-1.516z");
    position: relative;
  }

  .logo .logo-bg {
    @apply bg-gradient-to-r from-indigo-400 to-pink-400;
    inset: -2px;
    position: absolute;
  }

  .header a, .header button {
    @apply text-transparent;
  }

  .right a, .right button {
    @apply text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400;
  }

  .right a:hover, .right button:hover {
    @apply bg-gradient-to-r from-indigo-500 to-pink-500;
  }
</style>
