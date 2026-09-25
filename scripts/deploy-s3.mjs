import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readdir, readFile, mkdtemp, unlink, rmdir } from "node:fs/promises";
import { join, resolve, extname } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { deploymentConfig } from "./deployment-config.mjs";

export const STABLE_CACHE = "public,max-age=0,must-revalidate";
export const IMMUTABLE_CACHE = "public,max-age=31536000,immutable";
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".webmanifest": "application/manifest+json",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};
const digest = (data) => createHash("sha256").update(data).digest("hex");
const immutable = (key) => key.startsWith("_astro/");
export const cacheFor = (key) =>
  immutable(key) ? IMMUTABLE_CACHE : STABLE_CACHE;

export async function inspectDist(root, siteUrl) {
  const files = [];
  async function walk(dir, prefix = "") {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const key = prefix + entry.name;
      assert(!entry.isSymbolicLink(), `Symlinks cannot be deployed: ${key}`);
      assert(
        /^[A-Za-z0-9_./-]+$/.test(key) &&
          !key
            .split("/")
            .some(
              (p) =>
                p.startsWith(".") ||
                [
                  "src",
                  "node_modules",
                  "tests",
                  "scripts",
                  "deployment",
                  "credentials",
                ].includes(p),
            ),
        `Unexpected build path: ${key}`,
      );
      if (entry.isDirectory()) await walk(join(dir, entry.name), key + "/");
      else {
        assert(
          entry.isFile() && types[extname(key)],
          `Unexpected production file: ${key}`,
        );
        assert(
          !/(^|\/)(package|package-lock|tsconfig|credentials|secrets)(\.|$)/i.test(
            key,
          ),
          `Development or credential file: ${key}`,
        );
        if (immutable(key))
          assert(
            /\.[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/.test(key),
            `Unfingerprinted _astro asset: ${key}`,
          );
        const data = await readFile(join(root, key));
        if (key.endsWith(".html"))
          assert(
            data.toString().includes(`rel="canonical" href="${siteUrl}/`),
            `Build origin does not match SITE_URL: ${key}`,
          );
        files.push({
          key,
          size: data.length,
          sha256: digest(data),
          type: types[extname(key)],
        });
      }
    }
  }
  await walk(root);
  for (const key of [
    "index.html",
    "404.html",
    "robots.txt",
    "sitemap.xml",
    "site.webmanifest",
    "favicon.svg",
    "resume.pdf",
  ])
    assert(
      files.some((f) => f.key === key),
      `Incomplete build: missing ${key}`,
    );
  assert(
    files.some((f) => immutable(f.key)),
    "Missing fingerprinted assets",
  );
  return files.sort((a, b) => a.key.localeCompare(b.key));
}

export function uploadPlan(files, root, bucket) {
  const rank = (key) => (immutable(key) ? 0 : key.endsWith(".html") ? 2 : 1);
  const ordered = [...files].sort(
    (a, b) => rank(a.key) - rank(b.key) || a.key.localeCompare(b.key),
  );
  // cp deliberately overwrites unchanged files too: sync alone does not repair metadata.
  const commands = ordered.map((f) => [
    "s3",
    "cp",
    join(root, f.key),
    `s3://${bucket}/${f.key}`,
    "--cache-control",
    cacheFor(f.key),
    "--content-type",
    f.type,
    "--only-show-errors",
  ]);
  // No filters: all uploaded files are present before this final, deliberate cleanup.
  // Matching sizes prevent sync from replacing the per-file cache/type metadata.
  commands.push([
    "s3",
    "sync",
    root,
    `s3://${bucket}/`,
    "--delete",
    "--size-only",
    "--only-show-errors",
  ]);
  return commands;
}

export function invalidationPaths(keys) {
  const paths = new Set();
  for (const key of keys) {
    if (immutable(key)) continue;
    paths.add("/" + key.split("/").map(encodeURIComponent).join("/"));
    if (key.endsWith("index.html")) {
      const directory =
        "/" + key.slice(0, -10).split("/").map(encodeURIComponent).join("/");
      paths.add(directory);
      if (directory !== "/") paths.add(directory.slice(0, -1));
    }
  }
  return [...paths].sort();
}

export function awsRunner(region) {
  return async (args) => {
    const result = spawnSync(
      "aws",
      [...args, "--region", region, "--no-cli-pager"],
      {
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
        env: { ...process.env, AWS_PAGER: "" },
      },
    );
    if (result.error) throw result.error;
    assert(
      result.status === 0,
      `AWS CLI ${args.slice(0, 2).join(" ")} failed: ${result.stderr}`,
    );
    return result.stdout.trim() ? JSON.parse(result.stdout) : {};
  };
}

export async function verifyPublic(files, origin, request = fetch) {
  for (const file of files) {
    const path = file.key.endsWith("index.html")
      ? file.key.slice(0, -10)
      : file.key;
    let failure;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await request(`${origin}/${path}`, {
          headers: { "Cache-Control": "no-cache" },
          signal: AbortSignal.timeout(15000),
        });
        assert(response.status === 200, `${path}: HTTP ${response.status}`);
        assert(
          response.headers.get("content-type")?.split(";")[0] === file.type,
          `${path}: incorrect content type`,
        );
        assert(
          response.headers.get("cache-control") === cacheFor(file.key),
          `${path}: incorrect public cache policy`,
        );
        assert(
          digest(Buffer.from(await response.arrayBuffer())) === file.sha256,
          `${path}: public bytes differ from verified build`,
        );
        failure = undefined;
        break;
      } catch (error) {
        failure = error;
      }
    }
    if (failure) throw failure;
  }
  const missing = await request(
    `${origin}/__deployment-missing-${Date.now()}/`,
    { signal: AbortSignal.timeout(15000) },
  );
  assert(missing.status === 404, "Missing routes must return HTTP 404");
  await missing.body?.cancel();
}

export async function deploy(
  env,
  { root = resolve("dist"), run, request = fetch, log = console.log } = {},
) {
  const config = deploymentConfig(env);
  const files = await inspectDist(root, config.siteUrl);
  const aws = run || awsRunner(config.region);
  const list = async () =>
    (
      await aws([
        "s3api",
        "list-objects-v2",
        "--bucket",
        config.bucket,
        "--output",
        "json",
      ])
    ).Contents?.map((o) => o.Key) || [];
  const previous = await list();
  const paths = invalidationPaths([...previous, ...files.map((f) => f.key)]);
  if (config.distribution)
    assert(
      paths.length <= 3000,
      "Too many stable invalidation paths; review the release before uploading",
    );
  log(
    `Uploading ${files.length} verified files: hashed assets, stable assets, then HTML.`,
  );
  for (const command of uploadPlan(files, root, config.bucket))
    await aws(command);
  assert.deepEqual(
    (await list()).sort(),
    files.map((f) => f.key).sort(),
    "S3 inventory differs from the verified artifact",
  );
  // A fresh private temp directory; remove only the files this process creates.
  const temporary = await mkdtemp(join(tmpdir(), "portfolio-deploy-"));
  try {
    for (const file of files) {
      const destination = join(temporary, "object");
      try {
        const metadata = await aws([
          "s3api",
          "get-object",
          "--bucket",
          config.bucket,
          "--key",
          file.key,
          destination,
          "--output",
          "json",
        ]);
        assert.equal(
          metadata.CacheControl,
          cacheFor(file.key),
          `${file.key}: incorrect S3 cache policy`,
        );
        assert.equal(
          metadata.ContentType,
          file.type,
          `${file.key}: incorrect S3 content type`,
        );
        assert.equal(
          metadata.ContentLength,
          file.size,
          `${file.key}: incorrect S3 length`,
        );
        assert.equal(
          digest(await readFile(destination)),
          file.sha256,
          `${file.key}: S3 bytes differ`,
        );
      } finally {
        await unlink(destination).catch((error) => {
          if (error.code !== "ENOENT") throw error;
        });
      }
    }
  } finally {
    await rmdir(temporary);
  }
  if (config.distribution) {
    const result = await aws([
      "cloudfront",
      "create-invalidation",
      "--distribution-id",
      config.distribution,
      "--invalidation-batch",
      JSON.stringify({
        CallerReference: `${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`,
        Paths: { Quantity: paths.length, Items: paths },
      }),
      "--output",
      "json",
    ]);
    assert(result.Invalidation?.Id, "CloudFront returned no invalidation ID");
    await aws([
      "cloudfront",
      "wait",
      "invalidation-completed",
      "--distribution-id",
      config.distribution,
      "--id",
      result.Invalidation.Id,
    ]);
  } else log("No CloudFront distribution configured; invalidation skipped.");
  await verifyPublic(files, config.siteUrl, request);
  log(
    "Deployment verified: S3 inventory, bytes, cache metadata, public routes, PDF, and 404 status.",
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (process.argv[2] === "--check") {
    const config = deploymentConfig(process.env);
    const files = await inspectDist(resolve("dist"), config.siteUrl);
    console.log(
      "Verified downloaded artifact: " + files.length + " production files.",
    );
  } else await deploy(process.env);
}
