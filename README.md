# Curator: A simple Nostr client to browse and curate kinds

Curator is a minimal Nostr client focused on **browsing, inspecting, and curating Nostr events by kind and relay**. It is built with React, Vite, TailwindCSS, shadcn/ui, and Nostrify, and provides a clean starting point for experimenting with Nostr relays, kinds, and client-side curation logic.

This repository is a concrete application, not a generic framework. It ships with a ready-to-run Nostr client UI and opinionated defaults for relays and configuration.

---

## 🧭 What Curator Does

- **Relay selection**
  - `RelaySelector` component with a configurable list of popular relays
  - Support for custom relay URLs with basic validation and normalization
  - Persists relay choices via `AppContext` and local storage

- **Nostr client plumbing**
  - `useNostr` and `useNostrPublish` hooks wired to `@nostrify/react`
  - Automatic `client` tag injection using the deployed hostname
  - Configurable publish mode (current relay vs all write relays)

- **Authentication and identity**
  - Nostr login via `@nostrify/react/login`
  - `useCurrentUser` and related hooks for working with the logged-in user

- **App shell and layout**
  - React Router–based routing in `AppRouter`
  - Dark/light/system theme support via `AppContext` and Tailwind
  - shadcn/ui components for buttons, popovers, commands, tooltips, etc.

- **Optional AI helpers**
  - `useShakespeare` hook and patterns in `docs/AI_CHAT.md` for AI chat
  - Designed for AI-assisted features, but not required to run the app

As you extend Curator, you can add pages and components that focus on specific Nostr kinds (e.g. metadata, notes, relays, classifieds) and use the existing hooks/contexts to query and display them.

---

## 🛠 Technology Stack

- **React 18.x** – modern React with hooks and Suspense
- **Vite** – fast dev server and build tool
- **TypeScript** – type-safe frontend development
- **TailwindCSS 3.x** – utility-first styling
- **shadcn/ui** – accessible UI primitives built on Radix UI
- **Nostrify** – Nostr protocol integration via `@nostrify/react`
- **React Router** – client-side routing
- **TanStack Query** – data fetching, caching, and subscriptions

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example env file and adjust as needed:

```bash
cp .env.example .env
```

Key variable:

- **`VITE_POPULAR_RELAYS`** – JSON array of popular relays used by the `RelaySelector` component. Example (see `.env.example`):

```bash
VITE_POPULAR_RELAYS='[
  { "name": "Swarm Hivetalk", "url": "wss://swarm.hivetalk.org" },
  { "name": "Beeswax Hivetalk", "url": "wss://beeswax.hivetalk.org" }
]'
```

If `VITE_POPULAR_RELAYS` is not set or is invalid, Curator falls back to a built-in default list.

### 3. Run the dev server

```bash
npm run dev
```

Then open the printed URL in your browser.

---

## 🔧 Key Concepts and Modules

- **`App.tsx`**
  - Wires up all top-level providers: `QueryClientProvider`, `NostrProvider`, `NostrLoginProvider`, `AppProvider`, `NWCProvider`, `UnheadProvider`, and UI providers like `TooltipProvider` and `Toaster`.
  - Defines default relay metadata (NIP-65–style list) and theme.

- **`AppRouter.tsx`**
  - Defines the page routes for Curator.
  - Extend this file when adding new pages for browsing specific kinds.

- **Contexts (`src/contexts/`)**
  - `AppContext` – global app configuration (theme, relay metadata, publish mode).
  - `NWCContext` – Nostr Wallet Connect context for Lightning wallets.

- **Hooks (`src/hooks/`)**
  - `useNostr` – low-level Nostr querying and subscriptions.
  - `useNostrPublish` – publishing events with automatic `client` tagging.
  - `useCurrentUser` / `useAuthor` – identity and profiles.
  - `useLocalStorage` – persisted configuration.
  - `useZaps`, `useWallet`, `useNWC`, `useShakespeare` – optional advanced features.

- **Components (`src/components/`)**
  - `RelaySelector` – dropdown + command palette for choosing relays.
  - `NostrProvider` / `NostrSync` – wrap the app with Nostr connections and sync logic.
  - `auth/`, `dm/`, and other folders – building blocks for authentication, messaging, and more.

For more detailed patterns (e.g. AI chat, comments, infinite scroll, DMs), see the docs in `docs/`.

---

## 🧪 Testing

The project includes a basic testing setup:

- Vitest with `jsdom` environment
- React Testing Library + `jest-dom`
- `TestApp` helper to mount components with all required providers

Run tests with:

```bash
npm test
```

---

## 📦 Deployment

Curator is a standard React/Vite application and can be deployed to any modern static hosting provider (e.g. Vercel, Netlify, Cloudflare Pages, static S3/CloudFront).

Typical Vite deployment steps:

```bash
npm run build
```

Then configure your host to serve the `dist/` directory as a static site.

Make sure to configure your production environment variables (such as `VITE_POPULAR_RELAYS`) in your hosting provider's dashboard.

---

## 🙌 Acknowledgements & Links

Curator was originally scaffolded from the MKStack starter but is now its own focused application.

- **Source code**: [https://github.com/bitkarrot/curator](https://github.com/bitkarrot/curator)

---

## 📄 License

Open source – build, fork, and extend Curator to explore and curate the Nostr ecosystem.
