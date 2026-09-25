import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, basename, resolve } from "node:path";
import { createHash } from "node:crypto";
import {
  deploymentConfig,
  validateSiteUrl,
  assertCurrentMain,
} from "../scripts/deployment-config.mjs";
import {
  deploy,
  inspectDist,
  uploadPlan,
  invalidationPaths,
  cacheFor,
} from "../scripts/deploy-s3.mjs";

// Test fixtures only; these are not deployment configuration.
const env = {
  GITHUB_ACTIONS: "true",
  GITHUB_REPOSITORY: "AkashChitale/akash-portfolio",
  GITHUB_REF: "refs/heads/main",
  GITHUB_EVENT_NAME: "push",
  GITHUB_SHA: "a".repeat(40),
  GITHUB_RUN_ID: "42",
  GITHUB_RUN_ATTEMPT: "1",
  AWS_REGION: "ap-south-1",
  AWS_ROLE_ARN: "arn:aws:iam::111122223333:role/portfolio-test",
  S3_BUCKET: "portfolio-deployment-test",
  SITE_URL:
    "http://portfolio-deployment-test.s3-website.ap-south-1.amazonaws.com",
};

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "portfolio-deploy-test-"));
  t.after(async () => {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert(basename(root).startsWith("portfolio-deploy-test-"));
    await rm(root, { recursive: true, force: true });
  });
  const content = {
    "index.html": "home",
    "404.html": "missing",
    "projects/test/index.html": "project",
    "robots.txt": "robots",
    "sitemap.xml": "sitemap",
    "site.webmanifest": "{}",
    "favicon.svg": "<svg/>",
    "resume.pdf": "%PDF-test",
    "theme.js": "// theme",
    "_astro/app.a1234567.js": "// app",
  };
  for (const [key, text] of Object.entries(content)) {
    await mkdir(dirname(join(root, key)), { recursive: true });
    await writeFile(
      join(root, key),
      key.endsWith(".html")
        ? `<link rel="canonical" href="${env.SITE_URL}/${key}">${text}`
        : text,
    );
  }
  return root;
}

function simulation(root, options = {}) {
  const calls = [];
  const objects = new Map([
    ["old/index.html", {}],
    ["_astro/old.a1234567.js", {}],
  ]);
  const value = (args, flag) => args[args.indexOf(flag) + 1];
  const run = async (args) => {
    calls.push(args);
    const command = args.slice(0, 2).join(" ");
    if (options.fail === command) throw new Error("simulated AWS failure");
    if (command === "s3api list-objects-v2")
      return { Contents: [...objects.keys()].map((Key) => ({ Key })) };
    if (command === "s3 cp") {
      const key = args[3].replace(`s3://${env.S3_BUCKET}/`, "");
      const data = await readFile(args[2]);
      objects.set(key, {
        data,
        CacheControl: value(args, "--cache-control"),
        ContentType: value(args, "--content-type"),
        ContentLength: data.length,
      });
      return {};
    }
    if (command === "s3 sync") {
      assert(args.includes("--delete") && args.includes("--size-only"));
      assert(!args.includes("--exclude") && !args.includes("--include"));
      const files = await inspectDist(root, env.SITE_URL);
      for (const f of files)
        assert(objects.has(f.key), "cleanup ran before upload completed");
      for (const key of objects.keys())
        if (!files.some((f) => f.key === key)) objects.delete(key);
      return {};
    }
    if (command === "s3api get-object") {
      const object = objects.get(value(args, "--key"));
      await writeFile(args[6], options.corrupt ? "corrupt bytes" : object.data);
      return object;
    }
    if (command === "cloudfront create-invalidation")
      return { Invalidation: { Id: "I123" } };
    if (command === "cloudfront wait") return {};
    throw new Error("Unexpected AWS call: " + command);
  };
  const request = async (url) => {
    if (url.includes("__deployment-missing-"))
      return new Response("missing", { status: 404 });
    let key = new URL(url).pathname.slice(1);
    if (!key || key.endsWith("/")) key += "index.html";
    const object = objects.get(key);
    return new Response(options.stale ? "stale public content" : object.data, {
      status: 200,
      headers: {
        "content-type": object.ContentType,
        "cache-control": object.CacheControl,
      },
    });
  };
  return { run, request, calls, objects, log: () => {} };
}

test("rejects missing, placeholder and unsafe deployment destinations before AWS access", () => {
  for (const key of ["S3_BUCKET", "SITE_URL", "AWS_REGION", "AWS_ROLE_ARN"])
    assert.throws(() => deploymentConfig({ ...env, [key]: "" }));
  for (const bucket of [
    "s3://bucket",
    "bucket/prefix",
    "*",
    "../other",
    "example-bucket",
    " bucket ",
  ])
    assert.throws(() => deploymentConfig({ ...env, S3_BUCKET: bucket }));
  for (const url of [
    "https://portfolio.example.com",
    "http://localhost",
    "http://127.0.0.1",
    "https://your-domain.example",
    "https://host.dev/path",
    "https://user:pass@host.dev",
  ])
    assert.throws(() => validateSiteUrl(url));
  assert.equal(deploymentConfig(env).distribution, "");
  assert.equal(
    validateSiteUrl("https://akashchitale.dev/"),
    "https://akashchitale.dev",
  );
});

test("only pushes and manual runs of main in the intended repository can deploy", () => {
  for (const change of [
    { GITHUB_EVENT_NAME: "pull_request" },
    { GITHUB_REF: "refs/heads/feature" },
    { GITHUB_ACTIONS: "false" },
    { GITHUB_REPOSITORY: "fork/akash-portfolio" },
  ])
    assert.throws(() => deploymentConfig({ ...env, ...change }));
  assert(deploymentConfig({ ...env, GITHUB_EVENT_NAME: "workflow_dispatch" }));
});

test("stale production runs fail instead of overwriting newer main", async () => {
  await assert.rejects(
    assertCurrentMain({ ...env, GITHUB_TOKEN: "test-only" }, async () =>
      Response.json({ object: { sha: "b".repeat(40) } }),
    ),
    /no longer current main/,
  );
  await assertCurrentMain({ ...env, GITHUB_TOKEN: "test-only" }, async () =>
    Response.json({ object: { sha: env.GITHUB_SHA } }),
  );
});

test("artifact rejects source/credential files, missing pages and a mismatched build origin", async (t) => {
  const root = await fixture(t);
  await assert.rejects(inspectDist(root, "https://another.dev"), /origin/);
  for (const name of [".env", "source.ts", "app.js.map", "credentials.json"]) {
    await writeFile(join(root, name), "test-only");
    await assert.rejects(inspectDist(root, env.SITE_URL));
    await rm(join(root, name));
  }
  await rm(join(root, "index.html"));
  await assert.rejects(inspectDist(root, env.SITE_URL), /Incomplete build/);
});

test("uploads assets before HTML, repairs stable metadata and performs unfiltered cleanup last", async (t) => {
  const root = await fixture(t);
  const files = await inspectDist(root, env.SITE_URL);
  const plan = uploadPlan(files, root, env.S3_BUCKET);
  assert(plan[0][3].includes("/_astro/"));
  assert(plan.at(-2)[3].endsWith(".html"));
  assert.deepEqual(plan.at(-1).slice(0, 2), ["s3", "sync"]);
  for (const f of files)
    assert.equal(
      cacheFor(f.key).includes("immutable"),
      f.key.startsWith("_astro/"),
    );
  assert.equal(
    files.find((f) => f.key === "resume.pdf").type,
    "application/pdf",
  );
});

test("complete S3 deployment verifies exact bytes, metadata and public routes without CloudFront", async (t) => {
  const root = await fixture(t);
  const mock = simulation(root);
  await deploy(env, { root, ...mock });
  assert(!mock.calls.some((args) => args[0] === "cloudfront"));
  assert(
    !mock.objects.has("old/index.html") &&
      !mock.objects.has("_astro/old.a1234567.js"),
  );
  const data = await readFile(join(root, "resume.pdf"));
  assert.equal(
    createHash("sha256")
      .update(mock.objects.get("resume.pdf").data)
      .digest("hex"),
    createHash("sha256").update(data).digest("hex"),
  );
});

test("AWS failure stops before destructive cleanup; corrupted S3 or stale public bytes fail verification", async (t) => {
  const root = await fixture(t);
  const failed = simulation(root, { fail: "s3 cp" });
  await assert.rejects(deploy(env, { root, ...failed }), /simulated/);
  assert(!failed.calls.some((args) => args[1] === "sync"));
  await assert.rejects(
    deploy(env, { root, ...simulation(root, { corrupt: true }) }),
    /S3 bytes differ/,
  );
  await assert.rejects(
    deploy(env, { root, ...simulation(root, { stale: true }) }),
    /public bytes differ/,
  );
});

test("invalid configuration cannot call AWS or delete objects", async () => {
  let called = false;
  await assert.rejects(
    deploy(
      { ...env, S3_BUCKET: "" },
      {
        run: async () => {
          called = true;
        },
      },
    ),
  );
  assert.equal(called, false);
});

test("optional CloudFront invalidates current and removed stable paths plus clean route aliases", async (t) => {
  const root = await fixture(t);
  const mock = simulation(root);
  await deploy(
    { ...env, CLOUDFRONT_DISTRIBUTION_ID: "E1234567890123" },
    { root, ...mock },
  );
  const command = mock.calls.find((args) => args[1] === "create-invalidation");
  const paths = JSON.parse(command[command.indexOf("--invalidation-batch") + 1])
    .Paths.Items;
  for (const path of [
    "/",
    "/index.html",
    "/projects/test",
    "/projects/test/",
    "/projects/test/index.html",
    "/old/",
    "/old/index.html",
    "/resume.pdf",
  ])
    assert(paths.includes(path));
  assert(!paths.some((path) => path.startsWith("/_astro/") || path === "/*"));
  assert(
    mock.calls.some((args) => args[0] === "cloudfront" && args[1] === "wait"),
  );
  assert.deepEqual(invalidationPaths(["_astro/x.a1234567.js"]), []);
});

test("OIDC diagnostics expose identity claims but never the JWT or request token", async () => {
  const { logOidcIdentity } = await import("../scripts/deployment-config.mjs");
  const claims = {
    iss: "https://token.actions.githubusercontent.com",
    aud: "sts.amazonaws.com",
    sub: "repo:AkashChitale/akash-portfolio:ref:refs/heads/main",
  };
  const jwt =
    "header." +
    Buffer.from(JSON.stringify(claims)).toString("base64url") +
    ".signature";
  const messages = [];
  await logOidcIdentity(
    {
      ACTIONS_ID_TOKEN_REQUEST_URL: "https://oidc.test/token",
      ACTIONS_ID_TOKEN_REQUEST_TOKEN: "private-test-bearer",
    },
    async (url) => {
      assert.equal(url.searchParams.get("audience"), "sts.amazonaws.com");
      return Response.json({ value: jwt });
    },
    (message) => messages.push(message),
  );
  assert(messages[0].includes(claims.sub));
  assert(
    !messages[0].includes(jwt) && !messages[0].includes("private-test-bearer"),
  );
});

test("IAM examples restrict trust to this main branch and resources to one bucket/distribution", async () => {
  const policy = async (name) =>
    JSON.parse(
      await readFile(
        new URL(`../deployment/policies/${name}.example.json`, import.meta.url),
        "utf8",
      ),
    );
  const trust = await policy("github-oidc-trust");
  const conditions = trust.Statement[0].Condition.StringEquals;
  assert.equal(
    conditions["token.actions.githubusercontent.com:sub"],
    "repo:AkashChitale/akash-portfolio:ref:refs/heads/main",
  );
  assert.equal(
    conditions["token.actions.githubusercontent.com:aud"],
    "sts.amazonaws.com",
  );
  const s3 = await policy("s3-deploy");
  assert.equal(s3.Statement[0].Resource, "arn:aws:s3:::<S3_BUCKET>");
  assert.equal(s3.Statement[1].Resource, "arn:aws:s3:::<S3_BUCKET>/*");
  assert.deepEqual(s3.Statement[1].Action, [
    "s3:GetObject",
    "s3:PutObject",
    "s3:DeleteObject",
  ]);
  const cf = await policy("cloudfront-invalidation");
  assert.deepEqual(cf.Statement[0].Action, [
    "cloudfront:CreateInvalidation",
    "cloudfront:GetInvalidation",
  ]);
  assert.equal(
    cf.Statement[0].Resource,
    "arn:aws:cloudfront::<AWS_ACCOUNT_ID>:distribution/<CLOUDFRONT_DISTRIBUTION_ID>",
  );
});
