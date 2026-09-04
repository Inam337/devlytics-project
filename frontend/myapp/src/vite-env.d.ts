/// <reference types="vite/client" />

interface ViteTypeOptions {
  strictImportMetaEnv: unknown
}

interface ImportMetaEnv {
  /** Empty string in dev = Vite proxy to API */
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_PROXY_TARGET?: string
  /** @deprecated Use VITE_API_BASE_URL */
  readonly VITE_BACKEND_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
