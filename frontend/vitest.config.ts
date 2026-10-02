/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// Unit tests for the site's logic (tests/*.test.ts), with Astro's settings (import.meta.env.SITE, BASE_URL).
export default getViteConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
