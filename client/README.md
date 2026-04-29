# Web of Devs — Client

SvelteKit frontend for [Web of Devs](https://webofdevs.com). It renders the browsable directory of developer sites with sort and filter controls, embedded live previews, favorites, site submission, and reporting.

For the high-level architecture, see the [root README](../README.md).

## Stack

- **SvelteKit** (Node adapter) + **TypeScript**
- **Tailwind CSS** for styling, [`unplugin-icons`](https://github.com/unplugin/unplugin-icons) + [`@iconify/json`](https://github.com/iconify/icon-sets) for icons
- [`svelte-select`](https://github.com/rob-balfre/svelte-select), [`svelte-meta-tags`](https://github.com/oekazuma/svelte-meta-tags)
- **Playwright** for end-to-end tests

## Prerequisites

- Node.js (matching `../.node-version`)
- A running server — see [`../server`](../server)

## Setup

```bash
npm install
cp .env .env.local   # or edit .env directly
```

A checked-in `.env` ships with sensible local defaults (`VITE_API_URL=http://localhost:9000` and a dev GitHub OAuth client ID).

## Run

```bash
npm run dev         # vite dev on port 3000
npm run build       # production build via the Node adapter
npm run preview     # preview the production build on port 3000
npm run check       # svelte-check
npm run lint        # eslint
npm test            # playwright e2e
```

## Environment variables

- `VITE_API_URL` — base URL of the NestJS API (default `http://localhost:9000`)
- `VITE_GITHUB_OAUTH_CLIENT_ID` — public client ID of the GitHub OAuth app the server is configured for

## How it talks to the server

The client uses a backend-for-frontend pattern. Browser code does not call the NestJS API directly for authenticated flows. Instead, SvelteKit's server routes call the API on the user's behalf, receive JWT access and refresh tokens in the JSON response, and set them as HttpOnly cookies on the browser response. The refresh token never reaches client-side JavaScript.

GitHub OAuth uses `VITE_GITHUB_OAUTH_CLIENT_ID` to start the authorization redirect; the server exchanges the resulting code and issues the tokens.
