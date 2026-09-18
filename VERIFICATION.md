# Verification — 18 September 2026

Executed locally on Windows with Node 24.19.0, pnpm 11.19.0, Astro 7.3.3, and the static production build.

## Checks executed

- `pnpm lint`: passed.
- `pnpm typecheck`: passed with 0 errors, 0 warnings, and 0 hints.
- `pnpm test`: 7 passing tests for the optional API contract and failure handling.
- `pnpm build`: passed; 6 HTML pages plus robots.txt and sitemap.xml.
- `pnpm verify`: passed; 173 internal link/asset references, fragments, page metadata, JSON-LD, and draft exclusion.
- Total shipped JavaScript: 1,976 gzip bytes, below the 15,360-byte budget. CSS: 7,457 gzip bytes.
- `node scripts/security-headers.mjs`: generated deployment headers from the final production HTML.
- The initial Astro version was upgraded after advisories were found. The final `pnpm audit --prod --json` result is in `artifacts/dependency-audit.json`.

## Browser verification

Headless Chrome through Playwright checked the homepage at 320, 375, 768, 1024, 1440, and 1920 pixels. Every case study, the resume fallback, and the 404 page also fit all five required widths. No horizontal overflow was detected.

Theme switching and persistence, mobile navigation, Escape focus return, keyboard skip navigation, reduced motion, and 200% root font sizing passed. No browser JavaScript errors occurred. With JavaScript disabled, content, the native menu, and case-study navigation worked. Unknown project and unpublished note routes returned the custom page with HTTP 404.

Mocked Systems Lab success, HTTP failure, network failure, timeout, and malformed JSON all produced the correct panel state while main content remained usable. Returned markup was treated as text. No real backend was contacted.

Screenshots were inspected for desktop and mobile composition and both themes. Screenshots and detailed results are in the ignored local `artifacts/` directory.

## Accessibility

axe-core 4.12.1 checked WCAG 2 A/AA, WCAG 2.1 A/AA, and best-practice rules across seven page/theme/viewport combinations. The final run detected **zero violations**. This is not a complete manual accessibility certification.

## Lighthouse

Lighthouse 13.4.1, standard mobile configuration, against the local production preview:

| Category | Score |
| --- | --- |
| Performance | 100 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |

LCP: **1.0 s**. CLS: **0.001**. Total blocking time: **0 ms**. First contentful paint: **1.0 s**. No run warnings. Reports are saved as `artifacts/lighthouse.report.html` and `artifacts/lighthouse.report.json`.

These are local laboratory measurements, not field Core Web Vitals or an INP measurement. Repeat on the final HTTPS host after personalization and deployment.

## Limits

No AWS resources, public deployment, remote GitHub Actions run, or live Systems Lab service was created. Hosting permissions, DNS, TLS, CDN caching, and deployed security headers remain to be verified during deployment. Profile links, repository URLs, email, canonical domain, and the real resume are still required. Existing project implementation claims come from the supplied brief; their source repositories were not available to audit.
