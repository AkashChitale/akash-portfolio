import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

const site = process.env.SITE_URL || "https://akashchitale.dev";
const url = new URL(site);
if (!["http:", "https:"].includes(url.protocol))
  throw new Error("SITE_URL must be an HTTP(S) URL");

export default defineConfig({
  site: url.origin,
  output: "static",
  trailingSlash: "always",
  vite: { plugins: [tailwindcss()], build: { assetsInlineLimit: 0 } },
  markdown: { syntaxHighlight: "shiki" },
});
