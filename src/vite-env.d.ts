/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POPULAR_RELAYS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
