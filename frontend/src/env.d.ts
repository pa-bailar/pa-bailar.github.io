interface ImportMetaEnv {
  /** Set by the deploy workflow: when the daily sweep last checked Instagram (ISO time). */
  readonly PUBLIC_CHECKED_AT?: string;
  /** Build time only: absolute path of the data folder (astro.config.mjs). */
  readonly DATA_DIR: string;
  readonly ASSETS_DIR: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
