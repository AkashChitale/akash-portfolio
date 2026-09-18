import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
const hashes = new Set();
async function collect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (entry.name.endsWith(".html")) {
      const html = await readFile(path, "utf8");
      for (const script of html.matchAll(
        /<script\b([^>]*)>([\s\S]*?)<\/script>/g,
      )) {
        if (!/\bsrc=/.test(script[1]))
          hashes.add(
            `'sha256-${createHash("sha256").update(script[2]).digest("base64")}'`,
          );
      }
    }
  }
}
await collect("dist");
const lab = process.env.PUBLIC_SYSTEMS_LAB_URL;
const connect = lab ? ` ${new URL(lab).origin}` : "";
const csp = `default-src 'self'; script-src 'self' ${[...hashes].join(" ")}; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'${connect}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'; upgrade-insecure-requests`;
const headers = {
  "Content-Security-Policy": csp,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000",
  "X-Frame-Options": "DENY",
};
await writeFile(
  "deployment/generated-headers.json",
  JSON.stringify(headers, null, 2) + "\n",
);
console.log(
  "Generated deployment/generated-headers.json from the exact production HTML.",
);
