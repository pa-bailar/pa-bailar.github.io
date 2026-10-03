interface ImportMetaEnv {
  /** Set by the deploy workflow: when the backend's sweep last checked Instagram (ISO time). */
  readonly PUBLIC_CHECKED_AT?: string;
  /** Set by the deploy workflow: the site's version (scripts/release.mjs), e.g. "1.3.0". */
  readonly PUBLIC_VERSION?: string;
  /** Build time only: absolute path of the data folder (astro.config.mjs). */
  readonly DATA_DIR: string;
  readonly ASSETS_DIR: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
