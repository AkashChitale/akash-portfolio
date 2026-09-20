# Akash Chitale — Engineering Portfolio

A static-first portfolio focused on backend engineering, data integrity, performance, and deliberate software design. Built with Astro, strict TypeScript, and Tailwind CSS. No React runtime, client router, animation library, contact backend, or analytics.

## Getting started

Use Node.js 24 LTS and pnpm 11.19.0 (pinned in `package.json`).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed by Astro. Copy `.env.example` to `.env` for the optional endpoint. Set `SITE_URL` in the **build process environment** for the real canonical origin; `astro.config.mjs` reads `process.env.SITE_URL`, so a `.env` entry alone is not used for this value.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify
pnpm preview
node scripts/security-headers.mjs
```

`pnpm test` uses Node’s built-in test runner and TypeScript stripping. Node 24 is recommended locally and used by CI. The production output is `dist/`; do not deploy source, dependencies, or environment files.

## Architecture

```text
src/
  components/       Shared navigation, icons, diagram, résumé, optional API panel
  content/notes/    Local Markdown and frontmatter
  content.config.ts Validated, draft-aware Astro content collection
  data/             Shared profile, experience, principles, project case studies
  layouts/          HTML document, metadata, structured data, shared shell
  lib/              Small progressive enhancements and independent API client
  pages/            Home, static project routes, notes, résumé fallback, 404, SEO
  sections/         Homepage composition
  styles/           Theme tokens, responsive design, interaction styles
public/             Favicon, manifest, first-paint theme preference script
deployment/         CloudFront URL rewrite and generated security headers
scripts/            Build validation and CSP hash generation
tests/              Optional API contract and failure tests
.github/workflows/  Install, lint, typecheck, test, build, artifact verification
```

Astro renders each page at build time. A shared typed project model supplies both the homepage and each case study. Content is available without JavaScript. Native `details` provides the mobile menu; JavaScript adds close-on-navigation, Escape handling, theme persistence, and active desktop section links. Theme selection follows the device by default and persists an explicit choice locally.

Tailwind supplies the CSS foundation and small utilities. Shared CSS tokens implement the responsive visual language and both themes. System fonts avoid an external font request. SVG is limited to icons and functional architecture diagrams; no photography is required.

### Routes

- `/` — portfolio
- `/projects/elms/` — Employee Leave Management System
- `/projects/task-management/` — Task Management System
- `/projects/portfolio/` — this site's actual architecture
- `/resume/` — honest fallback until the PDF is supplied
- `/notes/<id>/` — generated only for published Markdown
- `/404.html` — custom error page
- `/robots.txt`, `/sitemap.xml`

WhiskerBond is professional experience, not a public-source project. The third case study documents this portfolio itself. No unverified benchmarks or confidential details are included. Project claims are based on the supplied brief; the underlying project repositories have not been audited.

## Personalization before publishing

1. Review `profiles.github`, `profiles.linkedin`, `profiles.leetcode`, and `profiles.email` in `src/data/site.ts`; these were restored from the original portfolio in Git history. Use full HTTPS profile URLs and a plain email address. Empty profile links are hidden.
2. Put the real résumé in `public/resume.pdf`, then set `site.resume.available` to `true`. The navigation and hero will download `/resume.pdf`. No fabricated PDF is supplied.
3. The portfolio repository is linked in `src/data/projects.ts`. Add the ELMS and task-system `repo` URLs when available; unavailable repository actions stay hidden.
4. Set the build environment `SITE_URL=https://your-domain.example`. The default `https://portfolio.example.com` is a clearly documented placeholder and must not be used for a public production release.
5. Review profile details, current/peak contest ratings, placement wording, and case-study descriptions for currency. The supplied metrics are static, not live.

No photo or project screenshots are needed for this design. If adding images later, use Astro's image tooling, explicit dimensions, descriptive alt text, and responsive assets. Do not publish broken image placeholders. Open Graph and X title/description metadata are present; a social image is not generated. A custom social image can be added later when available.

## Editing projects and experience

Edit `src/data/projects.ts` to change a project's summary, technologies, conceptual flow, and detailed sections. Its `slug` creates the route through `getStaticPaths()`. Keep a unique, lowercase URL-safe slug. Update `repo` there rather than scattering links through components. The case-study layout renders the same data and generates the contents navigation.

Edit `experience`, `snapshot`, `principles`, and profile settings in `src/data/site.ts`. Homepage sections own layout, not duplicate content records.

## Adding an engineering article

Create `src/content/notes/your-topic.md`:

```md
---
title: Your article title
description: A concrete one-sentence description.
category: Backend systems
draft: true
order: 4
publishedAt: 2026-09-18
---

Your reviewed article goes here.
```

Set `draft: false` only when ready to publish. The route becomes `/notes/your-topic/` and enters the sitemap. The homepage shows the first three entries by `order`, with draft entries explicitly marked “In preparation” and no article link. Adjust ordering to feature a new article. No fake article bodies are shipped.

Markdown is supported out of the box via Astro content collections. MDX can be added later with Astro's official integration if components in articles become useful; it is intentionally not installed now. Content is trusted, local, version-controlled author input. Never feed arbitrary user HTML or remote untrusted Markdown into this pipeline without sanitization. JSON-LD is generated from controlled data and escapes `<` before embedding.

## Performance philosophy

- Pre-render all content and routes; ship no component-framework runtime.
- No font downloads, blocking API dependencies, large images, or analytics.
- External, cacheable enhancement scripts; the tiny first-paint theme script prevents a saved-theme flash.
- No hidden-until-JavaScript content or delayed entrance animation.
- CSS transitions are short and disabled under reduced motion.
- The entire shipped JavaScript set has a **15 KB gzip budget**, enforced by `pnpm verify`, including executable inline code if any is introduced.
- Build verification covers local links, fragments, assets, metadata, JSON-LD, one H1 per page, and draft exclusion.

Lighthouse targets: at least 95 for performance, accessibility, best practices, and SEO. LCP target: under 2 seconds; CLS near zero. These are targets, not claims. Run Lighthouse against a production HTTPS deployment and measure real devices before treating them as verified. Local compressed asset sizes do not establish Core Web Vitals.

## Accessibility

Semantic landmarks, a keyboard skip link, visible focus indicators, labeled theme controls, native mobile-menu behavior, correct heading levels, both color themes, and reduced-motion support are built in. Links remain in the same browsing context. Unavailable links are hidden; the Resume action opens the existing information page until the real PDF is supplied. The optional API communicates asynchronously through a polite status region. Section and case-study navigation account for the sticky header.

Browser QA should cover 320, 375, 768, 1024, and 1440+ widths, keyboard use, 200% text resizing, both themes, no JavaScript, and unavailable API states. A passing lint/build is not an accessibility certification.

## CI

`.github/workflows/ci.yml` runs installation from the frozen lockfile, lint, Astro/TypeScript checks, the API tests, a static build, and output verification. Node and pnpm caching is enabled. A failed check fails the workflow. The `dist` artifact is retained for seven days. Set the GitHub repository variable `SITE_URL` before deployment. CI validates the site but does **not** deploy it or require AWS credentials.

The repository includes a lockfile; commit it with source changes. Only the required `esbuild` and `sharp` dependency install scripts are allowed in `pnpm-workspace.yaml`. Review dependency updates and run `pnpm audit` periodically. All framework/compiler/checker dependencies run at build time, not as an exposed production server.

## Future AWS deployment

```text
Developer → GitHub → CI checks → S3 static assets
                                  ↑
Reader → Route 53 → CloudFront → private S3 REST origin
                       ↑
                 ACM TLS certificate
```

See [deployment/AWS.md](deployment/AWS.md) for concrete routing, caching, headers, permissions, and release steps. No AWS resources or paid services were created. The portfolio needs no EC2 instance.

## Future Systems Lab

Leave `PUBLIC_SYSTEMS_LAB_URL` unset to hide the inactive Lab panel and disable all lab network traffic. When a public endpoint exists, configure `PUBLIC_SYSTEMS_LAB_URL=https://api.your-domain.example/api/status` **at build time**, then rebuild. It is public configuration, never a secret.

Expected JSON:

```json
{
  "status": "healthy",
  "version": "v1.0.0",
  "region": "ap-south-1",
  "uptime": "2h 14m",
  "responseTime": 42,
  "deployedAt": "2026-09-18T10:00:00Z"
}
```

`responseTime` is a finite, nonnegative **number in milliseconds reported by the service**, not a browser-measured round trip. `deployedAt` must be a parseable date, preferably ISO 8601. `status` supports `healthy`, `degraded`, and `unhealthy`; the other text fields are limited to 120 characters. The response is bounded to 8 KB.

The client makes one request after `load`, without credentials, with a four-second abort timeout, schema validation, and a readable fallback for HTTP/network/JSON/timeout errors. It neither retries nor blocks the page. It inserts values using `textContent`, never HTML. Core content is available without JavaScript or the API. There is no polling and no secret, cookie, or token required.

The backend can later run as a container on EC2 or any suitable service, behind HTTPS on an independent domain. Configure CORS for the exact portfolio origin, support the public GET endpoint, avoid sensitive internal details, and apply public-endpoint rate limits. Add its origin to `connect-src` by running `scripts/security-headers.mjs` with the same `PUBLIC_SYSTEMS_LAB_URL` environment used for the build. EC2 deployment, backend code, and live health claims are intentionally out of scope.

## Security headers

Run `node scripts/security-headers.mjs` after each final build. It emits `deployment/generated-headers.json` with SHA-256 hashes of the exact inline JSON-LD and any other inline scripts. Apply these headers through a CloudFront response headers policy; the JSON file is documentation/configuration input, not automatically served by S3.

The policy uses same-origin scripts/styles, restricts connections, forbids framing and objects, sets MIME sniffing protection, and requests HTTPS. There is no `unsafe-inline` or `unsafe-eval`. Recompute hashes after changing content or metadata, and update the response policy with the release. If many future articles make the CSP too large for CloudFront's header limits, generate CSP per path at the edge rather than widening the policy. Do not apply a production CSP to Astro's development server.

## Optional analytics

No analytics run today. If useful later, use a privacy-focused service or server/CDN aggregate logs, load a small script after initial rendering, avoid collecting personal content, update the CSP for explicit domains, and re-run the JavaScript budget and Lighthouse checks. Keep analytics failure independent of the site.
