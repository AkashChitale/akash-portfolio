import assert from "node:assert/strict";
import { appendFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export function validateSiteUrl(value) {
  assert(
    value && value === value.trim(),
    "SITE_URL must be explicitly configured without surrounding whitespace",
  );
  const url = new URL(value);
  assert(
    ["http:", "https:"].includes(url.protocol),
    "SITE_URL must use HTTP(S)",
  );
  assert(
    !url.username &&
      !url.password &&
      !url.port &&
      !url.search &&
      !url.hash &&
      url.pathname === "/",
    "SITE_URL must be an origin, without credentials, port, path, query, or fragment",
  );
  assert(
    !/(^|\.)(localhost|example\.(com|org|net))$|\.(example|invalid|test|localhost)$|your-domain|placeholder|change-?me/i.test(
      url.hostname,
    ),
    "SITE_URL must not be a placeholder",
  );
  assert(
    !/^\d+\.\d+\.\d+\.\d+$|^\[/.test(url.hostname),
    "SITE_URL must use a public hostname",
  );
  return url.origin;
}

export function assertProductionContext(env) {
  assert(
    env.GITHUB_ACTIONS === "true",
    "Deployment is CI-only; push main or use workflow_dispatch",
  );
  assert(
    env.GITHUB_REPOSITORY === "AkashChitale/akash-portfolio",
    "Unexpected production repository",
  );
  assert(env.GITHUB_REF === "refs/heads/main", "Only main may deploy");
  assert(
    ["push", "workflow_dispatch"].includes(env.GITHUB_EVENT_NAME),
    "PRs and other events cannot deploy",
  );
  assert(
    /^[a-f0-9]{40}$/.test(env.GITHUB_SHA || ""),
    "Missing workflow commit SHA",
  );
}

export function deploymentConfig(env) {
  assertProductionContext(env);
  const siteUrl = validateSiteUrl(env.SITE_URL);
  const region = env.AWS_REGION || "";
  const bucket = env.S3_BUCKET || "";
  const role = env.AWS_ROLE_ARN || "";
  assert(
    /^[a-z]{2}(?:-[a-z]+)+-\d$/.test(region),
    "AWS_REGION is missing or invalid",
  );
  assert(
    /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket) &&
      !/\.\.|^\d+\.\d+\.\d+\.\d+$|example|placeholder|your-bucket|change-?me|--x-s3$|--table-s3$|-s3alias$|\.mrap$/.test(
        bucket,
      ),
    "S3_BUCKET must be an explicit dedicated bucket name, not a URL, prefix, or placeholder",
  );
  const match = role.match(
    /^arn:aws:iam::(\d{12}):role\/[A-Za-z0-9_+=,.@/-]+$/,
  );
  assert(
    match &&
      !/^0+$/.test(match[1]) &&
      !/example|placeholder|change-?me/i.test(role),
    "AWS_ROLE_ARN is missing or invalid",
  );
  const distribution = env.CLOUDFRONT_DISTRIBUTION_ID || "";
  assert(
    !distribution || /^[A-Z0-9]{10,32}$/.test(distribution),
    "Invalid CLOUDFRONT_DISTRIBUTION_ID",
  );
  return { siteUrl, region, bucket, role, account: match[1], distribution };
}

export async function assertCurrentMain(env, request = fetch) {
  assert(
    env.GITHUB_TOKEN,
    "Missing read-only GitHub token for the production freshness check",
  );
  const response = await request(
    `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/git/ref/heads/main`,
    {
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
      signal: AbortSignal.timeout(15000),
    },
  );
  assert(response.ok, `Cannot verify current main: HTTP ${response.status}`);
  assert(
    (await response.json()).object?.sha === env.GITHUB_SHA,
    "This run is no longer current main; deploy the latest commit (rollback with a new revert commit)",
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (process.argv[2] === "site") {
    console.log(`Build origin: ${validateSiteUrl(process.env.SITE_URL)}`);
  } else if (process.argv[2] === "production") {
    const config = deploymentConfig(process.env);
    await assertCurrentMain(process.env);
    await logOidcIdentity(process.env);
    if (process.env.GITHUB_OUTPUT)
      await appendFile(
        process.env.GITHUB_OUTPUT,
        `account-id=${config.account}\n`,
      );
    console.log(
      "Production configuration and main commit verified; no AWS credentials requested yet.",
    );
  } else throw new Error("Use site or production");
}

export async function logOidcIdentity(env, request = fetch, log = console.log) {
  assert(
    env.ACTIONS_ID_TOKEN_REQUEST_URL && env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,
    "OIDC permission is unavailable",
  );
  const url = new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
  url.searchParams.set("audience", "sts.amazonaws.com");
  const response = await request(url, {
    headers: { Authorization: "Bearer " + env.ACTIONS_ID_TOKEN_REQUEST_TOKEN },
    signal: AbortSignal.timeout(15000),
  });
  assert(response.ok, "Unable to request GitHub OIDC identity");
  const { value } = await response.json();
  const claims = JSON.parse(
    Buffer.from(value.split(".")[1], "base64url").toString(),
  );
  assert(
    claims.iss === "https://token.actions.githubusercontent.com" &&
      claims.aud === "sts.amazonaws.com",
    "Unexpected OIDC issuer/audience",
  );
  // Diagnostic only: AWS verifies the JWT signature and role trust policy.
  // Never print the JWT or the request bearer token.
  log(
    "Verify this exact OIDC identity against the IAM trust policy: " +
      JSON.stringify({ iss: claims.iss, aud: claims.aud, sub: claims.sub }),
  );
}
