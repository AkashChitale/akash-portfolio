import { readdir, readFile, stat } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";

const root = resolve("dist");
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? walk(join(dir, entry.name))
          : [join(dir, entry.name)],
      ),
    )
  ).flat();
}
const files = await walk(root);
const pages = files.filter((file) => extname(file) === ".html");
let jsSize = 0;
for (const file of files.filter((file) => extname(file) === ".js"))
  jsSize += gzipSync(await readFile(file)).length;
const inlineScripts = new Set();
let checked = 0;
for (const page of pages) {
  const html = await readFile(page, "utf8");
  for (const script of html.matchAll(
    /<script\b([^>]*)>([\s\S]*?)<\/script>/g,
  )) {
    if (!/\bsrc=|application\/ld\+json/.test(script[1]) && script[2].trim())
      inlineScripts.add(script[2]);
  }
  assert.match(html, /<html[^>]*lang="en"/, `${page}: missing language`);
  assert.equal(
    (html.match(/<h1(?:\s|>)/g) || []).length,
    1,
    `${page}: expected one h1`,
  );
  assert.match(html, /<title>[^<]+<\/title>/, `${page}: missing title`);
  assert.match(
    html,
    /name="description" content="[^"]+"/,
    `${page}: missing description`,
  );
  assert.match(
    html,
    /rel="canonical" href="https?:\/\//,
    `${page}: missing canonical`,
  );
  for (const metadata of [
    "og:title",
    "og:description",
    "og:url",
    "twitter:card",
  ])
    assert(html.includes(metadata), `${page}: missing ${metadata}`);
  for (const json of html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
  ))
    JSON.parse(json[1]);
  const pagePath =
    "/" +
    page
      .slice(root.length + 1)
      .replaceAll("\\", "/")
      .replace(/index\.html$/, "");
  for (const link of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const value = link[1];
    if (/^(?:https?:|mailto:|data:|tel:)/.test(value)) continue;
    const target = new URL(value, `https://test.local${pagePath}`);
    let disk = join(root, decodeURIComponent(target.pathname));
    let info;
    try {
      info = await stat(disk);
    } catch {
      throw new Error(`${page}: broken asset or link ${value}`);
    }
    if (info.isDirectory()) disk = join(disk, "index.html");
    await stat(disk);
    if (target.hash) {
      const content = await readFile(disk, "utf8");
      const fragment = decodeURIComponent(target.hash.slice(1));
      assert(
        content.includes(`id="${fragment}"`),
        `${page}: missing fragment ${value}`,
      );
    }
    checked++;
  }
}
for (const script of inlineScripts) jsSize += gzipSync(script).length;
assert(jsSize <= 15 * 1024, `JavaScript budget exceeded: ${jsSize} gzip bytes`);
assert(
  !files.some((file) =>
    /notes[\\/](api-caching|refresh-token-rotation|cursor-pagination)/.test(
      file,
    ),
  ),
  "Draft note was published",
);
for (const required of [
  "robots.txt",
  "sitemap.xml",
  "favicon.svg",
  "site.webmanifest",
  "404.html",
])
  await stat(join(root, required));
const cssSize = (
  await Promise.all(
    files
      .filter((file) => extname(file) === ".css")
      .map(async (file) => gzipSync(await readFile(file)).length),
  )
).reduce((sum, bytes) => sum + bytes, 0);
console.log(
  `PASS: ${pages.length} HTML pages, ${checked} internal links/assets, metadata, structured data, draft exclusion.`,
);
console.log(
  `JavaScript: ${jsSize} bytes gzip across all JS (budget: 15360). CSS: ${cssSize} bytes gzip.`,
);
