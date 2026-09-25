# Production deployment: GitHub Actions to S3

## Current architecture

```text
push main / manual run on main
  → existing GitHub Actions workflow
  → install → lint → typecheck → tests → build once → verify dist
  → immutable workflow artifact (3-day retention)
  → GitHub OIDC → short-lived deployment role → dedicated S3 bucket
  → verify S3 bytes/metadata and public website responses

Browser → existing S3 static website endpoint (HTTP)
```

The repository implements the pipeline; no AWS resources or remote GitHub settings are provisioned by these files. Application content and design are unchanged. The deploy job does not install application dependencies or rebuild. It downloads the exact artifact ID from the successful check job, with digest mismatches treated as errors.

## One-time AWS setup

1. **Use the existing dedicated portfolio bucket.** Record its exact name and Region. The final sync deletes objects not in `dist/`, so do not share this bucket with logs, backups, other sites, or private files. Confirm static website hosting has `index.html` as its index document and `404.html` as its error document. Copy the website endpoint from the S3 console; regional hostname formats vary. Keep the existing public-read setup for this interim website. Do not grant anonymous writes or add ACL permissions to the deployment role.
2. **Keep ordinary S3-managed encryption (SSE-S3) for this setup.** The example role does not grant KMS permissions. A bucket requiring customer-managed KMS encryption needs a separately reviewed, key-scoped policy; do not solve an access error by granting broad permissions.
3. **Create the GitHub OIDC identity provider** in IAM, if the account does not already have it: provider URL `https://token.actions.githubusercontent.com`, audience `sts.amazonaws.com`.
4. **Create a deployment IAM role** using [github-oidc-trust.example.json](policies/github-oidc-trust.example.json). Replace `<AWS_ACCOUNT_ID>` with your account ID. The example trusts only `AkashChitale/akash-portfolio` on `main`. The `StringEquals` subject is an example of the legacy format: **verify the exact `sub` for your repository before treating setup as complete**. Never change it to `repo:AkashChitale/akash-portfolio:*` or a wildcard repository.
5. **Attach the separate role permissions policy** from [s3-deploy.example.json](policies/s3-deploy.example.json), replacing `<S3_BUCKET>`. Bucket-level `s3:ListBucket` applies only to that bucket ARN. Object-level `s3:GetObject`, `s3:PutObject`, and `s3:DeleteObject` apply only to its objects. GetObject is needed for byte and metadata verification. The `/*` suffix scopes objects inside this one bucket; there is no global `Resource: "*"`, `s3:*`, administrator policy, bucket-policy management, or access to other buckets.
6. Record the role ARN. Do not create an IAM access key. The official credentials action exchanges a GitHub OIDC token for temporary credentials; no permanent AWS credentials belong in GitHub secrets, `.env`, or this repository.

### Verify the exact OIDC subject

The deployment job prints only `iss`, `aud`, and `sub` before assuming the AWS role. It never prints the JWT or bearer token. On the first deliberate manual run, inspect **Validate configuration and current main**. If the example subject does not match, role assumption fails before any S3 writes. Update the role's `StringEquals` value to the exact observed production subject, after confirming it identifies this repository and `refs/heads/main`, then rerun the current-main workflow.

Possible branch-bound subjects include:

```text
repo:AkashChitale/akash-portfolio:ref:refs/heads/main
repo:AkashChitale@<OWNER_ID>/akash-portfolio@<REPOSITORY_ID>:ref:refs/heads/main
```

Repositories created after July 15, 2026, or opted into immutable subject claims may use the ID-bearing form. Custom subject templates can differ again. Do not guess IDs, accept PR subjects, or remove the branch restriction. See [GitHub's AWS OIDC guidance](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws).

### Optional production environment

The current workflow deliberately uses branch-bound OIDC and **repository variables**, without a required GitHub Environment. This keeps automatic deployment simple and restricts the trust policy to main.

If you later add `environment: production` to the deploy job, first restrict that environment to **main only**, without required reviewers unless you want approvals. Verify the new exact subject: it will reference `environment:production` rather than the branch (and may include immutable IDs). Update IAM to that exact value and keep the workflow's main/event gates. Keep `SITE_URL` at repository scope because the build job is not attached to the deployment environment. Environment-scoped AWS variables are optional after this change.

## GitHub configuration

In **AkashChitale/akash-portfolio → Settings → Secrets and variables → Actions → Variables**, add these non-secret repository variables:

| Variable | Value to supply |
| --- | --- |
| `AWS_REGION` | The existing bucket's Region |
| `AWS_ROLE_ARN` | ARN of the OIDC deployment role just created |
| `S3_BUCKET` | Exact dedicated bucket name, with no `s3://`, slash, or prefix |
| `SITE_URL` | Actual public website origin, including its scheme |
| `CLOUDFRONT_DISTRIBUTION_ID` | Leave absent now; configure only after CloudFront exists |

**Now:** use the actual `http://...s3-website...amazonaws.com` endpoint copied from the console for `SITE_URL`. S3 website endpoints do not support HTTPS. This value controls canonical URLs, sitemap output, and public deployment verification. Do not put `https://akashchitale.dev` here until that hostname actually serves this build over HTTPS. The `.dev` hostname should wait for the CloudFront/ACM migration.

**Later:** set `SITE_URL=https://akashchitale.dev` after DNS and TLS work. Deployable runs reject missing origins and obvious placeholders such as `https://portfolio.example.com`. PR checks may use `https://akashchitale.dev` as a build-only fallback without deploying.

Use branch protection/rulesets on main to require the `check` job and your normal review policy. There is no per-deployment approval requirement. No GitHub AWS secrets are needed.

## Local workflow and automatic deployment

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Before pushing:

```sh
pnpm verify
```

This now runs lint, typecheck, all tests, one production build, and the existing output verifier. `pnpm verify:build` checks an already-built `dist/` without rebuilding. Local verification needs no AWS CLI, AWS profile, OIDC token, bucket, or cloud connection.

Normal release:

```sh
git push origin main
```

PRs only run checks and create a short-lived build artifact. A successful push to main, or **Actions → Portfolio checks and deployment → Run workflow → main**, enables the deploy job. Production jobs use one concurrency group with `cancel-in-progress: false`; an active S3 upload is not cancelled by a newer run. GitHub may replace an older pending job with a newer pending job, and does not promise FIFO ordering. A current-main check rejects stale jobs before AWS authentication. A newer push during an active deployment waits; this is not an atomic release platform.

There is no recommended laptop-to-S3 helper. `scripts/deploy-s3.mjs` requires the intended GitHub repository, main ref, and push/manual event. AWS CLI v2 and Node 24 run on the hosted deployment runner. All AWS CLI arguments are passed without shell interpolation, and any command failure fails the job.

## Upload and cache behavior

The artifact validator rejects incomplete builds, source files, hidden paths, symlinks, source maps, credential paths, unrecognized file types, mismatched canonical origins, and unhashed files under `_astro/`.

| Object | Cache-Control |
| --- | --- |
| Fingerprinted `_astro/*` | `public,max-age=31536000,immutable` |
| HTML, robots.txt, sitemap.xml | `public,max-age=0,must-revalidate` |
| theme.js, manifest, favicon, resume.pdf and other stable names | `public,max-age=0,must-revalidate` |

The script uploads fingerprinted assets first, stable assets second, and HTML last. AWS CLI `s3 cp` overwrites each verified file with explicit MIME and cache metadata, including unchanged files. This intentionally repairs old metadata: `s3 sync` alone does not update metadata on files it skips. The résumé is uploaded as `application/pdf` without a forced-download disposition.

Only after every upload succeeds does the script run:

```text
aws s3 sync dist/ s3://<configured-bucket>/ --delete --size-only --only-show-errors
```

There are no include/exclude filters in the cleanup pass. Since every current file was just uploaded with the correct bytes and size, the final sync preserves its metadata and removes only keys absent from the artifact. Inventory and full-object SHA-256 checks follow. No source tree, credentials, or deployment scripts are uploaded.

This simple release is not atomic. A failed upload can leave a partial release; the next successful run repairs it. Cleanup also removes older hashed assets, so an already-open old page may need a refresh if it requests a removed asset after release. Git-based redeployment is the rollback mechanism. If uninterrupted support for old in-flight pages becomes a requirement, change retention deliberately; do not silently disable cleanup forever.

After storage verification, public GET checks compare every deployed file's bytes, MIME type, and cache headers against the artifact, exercise clean directory URLs, and require HTTP 404 for a missing route. Public verification can fail after objects have been uploaded; investigate and rerun or roll back rather than assuming failure means no files changed.

## Test the first deployment

1. Complete the AWS role/provider setup and all four required repository variables. Verify the bucket is dedicated to this site.
2. Commit/push these workflow changes on main using your normal review process, or select a manual run on main once they are there.
3. Confirm the check job passes and uploads a three-day artifact. Confirm the deploy job downloads that artifact ID, validates the configuration/build, and prints the intended OIDC identity.
4. If assumption fails, verify the exact trust subject/audience/provider and role ARN. Do not weaken IAM to a wildcard or substitute permanent keys.
5. Confirm the S3 inventory/byte/metadata checks and public URL checks pass. CloudFront should explicitly be skipped while its ID is absent.
6. Visit the S3 website homepage, both project pages, résumé PDF, and a nonexistent URL. Confirm refreshes show current content. Optionally inspect response headers in browser developer tools.
7. Open a PR: it must have checks, with deploy skipped and no AWS credential step.

No real AWS deployment has been executed merely by running the local tests. The tests simulate AWS CLI outcomes, including upload failure, corruption, cleanup, cache metadata, and optional invalidation.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Missing/placeholder SITE_URL | Set the repository variable; local Astro defaults are not accepted as deployment configuration |
| Invalid bucket or role | Use a plain bucket name and real IAM role ARN; inspect Region and policy substitutions |
| OIDC AccessDenied | Compare logged exact `sub` and `aud` with IAM; account for immutable IDs or environment subjects |
| S3 AccessDenied | Verify the role is scoped to the same bucket, public GET setup, encryption requirements, and any bucket-policy explicit deny |
| Public HTTP 403/404 | Use the website endpoint, confirm public-read setup, index/error documents, and the correct Region |
| Public byte/cache mismatch | Check the endpoint/domain serves this bucket; after migration inspect CloudFront cache policy/invalidation and function behavior |
| Stale run rejected | Run the current-main workflow; restore an older release using a new revert commit |
| Optional invalidation denied | Add the distribution-scoped policy below, including GetInvalidation for the waiter |
| Metadata changes skipped | This pipeline deliberately uses cp before sync; do not replace it with sync-only without a metadata repair strategy |

## Rollback

For a bad release, revert its change on main (or through a reviewed PR), keeping a functioning deployment workflow:

```sh
git switch main
git pull --ff-only
git revert BAD_COMMIT
pnpm verify
git push origin main
```

The new revert commit produces a newly verified artifact and redeploys it. To inspect an older release, check out its known-good commit locally; restore the required site files into a **new main commit** rather than force-pushing main backwards. Rerunning an old workflow whose SHA is no longer main is intentionally rejected. Rerun the current-main workflow when retrying a transient deployment failure.

If S3 versioning is already enabled, prior object versions/delete markers can help an administrator recover files. It is not assumed, enabled, or required here; the deployment role does not have version-recovery permissions. Prefer a complete Git-based release over restoring individual objects with mismatched HTML/assets.

## Future CloudFront, OAC, domain, and HTTPS

```text
GitHub Actions → OIDC → S3 (deployment unchanged)
Browser → Route 53 → CloudFront → OAC → private S3 REST origin
```

Do not provision these resources as part of the current S3-only setup.

1. Request a viewer ACM certificate in **us-east-1** covering `akashchitale.dev` and `www.akashchitale.dev`; complete DNS validation.
2. Create CloudFront with the normal regional **S3 REST origin**, not the S3 website endpoint. Use **OAC**, with requests always signed, and bucket-owner-enforced ownership. Do not use legacy OAI.
3. Add the distribution-scoped [OAC bucket-policy example](policies/cloudfront-oac-bucket.example.json). Once OAC works, remove the public website read policy, enable all **S3 Block Public Access** settings, and disable website hosting if no longer needed. The production site must no longer be publicly accessible through S3.
4. Set the default root object to `index.html`. Attach the existing [CloudFront viewer-request function](cloudfront-function.js) to resolve directory and extensionless URLs. Keep genuine missing pages as 404: map private-origin 403/404 errors to `/404.html` with response status 404 and a short error TTL. Do not use a blanket SPA fallback.
5. Configure a cache policy with minimum TTL 0 so stable-name revalidation is respected; allow the one-year TTL for immutable hashed assets, and enable compression. Redirect viewers from HTTP to HTTPS. Apply a tested response-headers policy. Generate CSP hashes from the exact deployed artifact using the existing security-header script; the current S3 pipeline does not manage CloudFront response-headers policies automatically. Direct S3 website hosting cannot apply those custom security headers.
6. Attach the us-east-1 ACM certificate and add both hostnames as CloudFront alternate domain names. Add Route 53 A and AAAA alias records to CloudFront (enable IPv6 if using AAAA).
7. Use **akashchitale.dev** as canonical. Extend the viewer-request function to redirect `www.akashchitale.dev` to the canonical HTTPS host, preserving path and query string, before applying path rewrites. Both hosts still need certificate coverage and DNS. Test the redirect; do not create a second canonical site.
8. Set `SITE_URL=https://akashchitale.dev` when the domain is live. Set `CLOUDFRONT_DISTRIBUTION_ID` and add [cloudfront-invalidation.example.json](policies/cloudfront-invalidation.example.json) to the deployment role, scoped to that distribution. It grants only CreateInvalidation and GetInvalidation (needed to wait for completion).
9. Deploy main again. The script automatically invalidates current and removed stable file paths plus `/`, directory aliases, and extensionless aliases; it excludes `_astro/*` and waits for completion before public verification. Domain, IAM, cache-policy, HTTPS, and OAC setup remain manual.

**Invalidation strategies:** targeted invalidation is implemented and suitable for the current portfolio. Invalidating `/*` is a simpler emergency option for a small site when repairing unknown stale paths, but unnecessarily evicts hashed assets; it is not done on each release. Either strategy needs only the same distribution-scoped invalidation permissions. Use an administrator's approved SSO/profile for emergency console/CLI work, not long-lived keys or broader pipeline permissions.

## Action pins and primary references

All workflow actions are pinned to full release commits, resolved from their official repositories on 25 September 2026. pnpm/action-setup's annotated v6.1.0 tag was dereferenced to its commit. Review both the release and commit before updating pins.

- [AWS credentials v6.3.0](https://github.com/aws-actions/configure-aws-credentials/releases/tag/v6.3.0)
- [Checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1), [setup-node v7.0.0](https://github.com/actions/setup-node/releases/tag/v7.0.0)
- [upload-artifact v7.0.1](https://github.com/actions/upload-artifact/releases/tag/v7.0.1), [download-artifact v8.0.1](https://github.com/actions/download-artifact/releases/tag/v8.0.1)
- [pnpm/action-setup v6.1.0](https://github.com/pnpm/action-setup/releases/tag/v6.1.0)
- [GitHub concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
- [S3 sync metadata and deletion behavior](https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html)
- [S3 website endpoints](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteEndpoints.html)
- [CloudFront OAC](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html), [certificate requirements](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html)

## Local verification — 25 September 2026

- `pnpm verify` passed: lint, typecheck (0 errors/warnings/hints), all 18 tests, one production build, and the existing build verifier.
- Build verification covered 6 HTML pages and 170 internal links/assets. Shipped JavaScript remains 1,982 gzip bytes. No browser runtime dependency was added.
- The actual 15-file production build passed the deployment artifact allowlist/origin check.
- Workflow YAML parsed successfully. Actionlint 1.7.12 passed. Its official Windows release archive was verified against the published SHA-256 manifest before execution. Bash syntax checks passed for all workflow run commands; Node syntax checks and formatting checks passed for the new scripts, tests, workflow, and policy examples.
- Offline tests covered bad configuration, branch/event gates, stale-main rejection, unsafe build files, ordered uploads, metadata correction, cleanup boundaries, AWS failure, byte corruption, public-content mismatch, optional CloudFront invalidation, OIDC log redaction, and IAM resource scope.
- Credential pattern checks found no AWS keys. Git ignore checks covered .env, local AWS credentials, and private key files. No application source, public content, Astro configuration, or lockfile changes were made.
- These are local and simulated checks. No AWS CLI deployment, OIDC role assumption, remote workflow run, S3 mutation, CloudFront change, or public production verification was performed. Complete the setup above before the first deployment.
