# Verification — 20 September 2026

Focused visual polish of the existing engineering portfolio. The original hero typography, systems diagram, restrained green accent, and static-first architecture are preserved.

## Checks executed

- `pnpm lint`: passed.
- `pnpm typecheck`: passed with 0 errors, 0 warnings, and 0 hints.
- `pnpm test`: 7 passing tests for the optional API contract and failure handling.
- `pnpm build`: passed; 6 HTML pages plus robots.txt and sitemap.xml.
- `pnpm verify`: passed; 171 internal link/asset references, fragments, page metadata, JSON-LD, and draft exclusion.
- Total shipped JavaScript: **1,982 gzip bytes**, up 6 bytes from the previous 1,976-byte build and below the 15,360-byte budget. CSS: **9,319 gzip bytes**. No new production dependency or client framework was added.
- `node scripts/security-headers.mjs`: regenerated deployment headers from the final production HTML.
- `git diff --check`: passed.

## Visual and browser verification

Captured the unchanged homepage before editing, then the finished homepage in light and dark themes at **375, 768, 1440, and 1920 pixels**. Inspected hero composition at each width, project sections on mobile and desktop, and the complete desktop page. Screenshots are in the ignored local `artifacts/polish-before/` and `artifacts/polish-after/` directories.

No horizontal overflow occurred. The desktop homepage height decreased from 5,929 to 5,056 pixels; Selected Engineering Work begins 375 pixels earlier. All four hero actions fit in the initial 375 × 812 mobile viewport.

The broader Playwright regression checks passed at 320, 375, 768, 1024, 1440, and 1920 pixels, including case studies, resume information, and the 404 page. Theme persistence, mobile navigation, Escape focus return, keyboard skip navigation, reduced motion, 200% root font sizing, and navigation without JavaScript passed. No browser JavaScript errors occurred. Unknown project and unpublished note routes returned HTTP 404.

Additional interaction checks confirmed full-row native case-study navigation, separate repository link hit testing, keyboard focus outlines, and keyboard diagram navigation. Both DSA counts render as 1,300+. Unavailable repository actions and the unconfigured Lab panel are hidden; all three notes remain visibly in preparation without fake article links.

Mocked Systems Lab success, HTTP failure, network failure, timeout, and malformed JSON passed. Returned markup was treated as text. No real backend was contacted.

## Accessibility

axe-core 4.12.1 checked WCAG 2 A/AA, WCAG 2.1 A/AA, and best-practice rules across seven page/theme/viewport combinations: **zero detected violations**. A subsequent Lighthouse experimental label check identified the wordmark accessible-name mismatch; the redundant explicit label was removed so its accessible name comes from its text. This is not a complete manual accessibility certification.

## Lighthouse

Lighthouse 13.4.1, standard mobile configuration, against the final local production preview:

| Category | Score |
| --- | --- |
| Performance | 100 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |

LCP: **1.0 s**. CLS: **0.001**. Total blocking time: **0 ms**. First contentful paint: **1.0 s**. No run warnings. Reports: `artifacts/lighthouse.report.html` and `artifacts/lighthouse.report.json`.

An earlier polish audit measured performance 90 / LCP 2.8 s; the final isolated run above followed the accessible-name fix and a rebuild. These are variable local laboratory measurements, not field Core Web Vitals or an INP measurement. Repeat on the final HTTPS host.

## Content review and limits

- Updated the old 1,200+ DSA total to the owner's newly supplied **1,300+**, centralized to prevent drift.
- Restored GitHub, LinkedIn, LeetCode, and email from the owner's original portfolio in Git history. Linked the supplied portfolio repository.
- Removed wording implying the internship is necessarily ongoing. Contest rating is labeled approximate rather than live/current.
- Academic, placement, internship, contest-rating, and project implementation claims were checked for consistency with the supplied brief and repository history. Public-profile fetches were unsuccessful, so current external accuracy was not independently established. ELMS and task-system source repositories were unavailable for audit.
- The real resume PDF, ELMS/task repository URLs, and production canonical domain are still missing. Resume opens its existing information page. `SITE_URL` still needs production configuration before release.
- No deployment, commit, push, remote GitHub Actions run, AWS resource, or live Systems Lab service was created during this polish pass. Production hosting, DNS, TLS, caching, and deployed headers remain outside this local verification.
