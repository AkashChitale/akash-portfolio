export interface CaseSection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}
export interface Project {
  slug: string;
  number: string;
  name: string;
  kind: string;
  description: string;
  technologies: string[];
  concepts: string[];
  metric: string;
  repo: string;
  flow: string[];
  supporting: string[];
  overview: string;
  sections: CaseSection[];
}

export const projects: Project[] = [
  {
    slug: "elms",
    number: "01",
    name: "Employee Leave Management System",
    kind: "FULL-STACK APPLICATION",
    description:
      "A role-based leave system with centralized policy checks, approval workflows, and an auditable debit-and-reversal balance ledger.",
    technologies: [
      "React",
      "TypeScript",
      "Express",
      "PostgreSQL",
      "Prisma",
      "TanStack Query",
    ],
    concepts: [
      "Employee, Manager & HR roles",
      "Hashed refresh tokens & rotation",
      "Request locking & status checks",
      "Balance debits & reversals",
    ],
    metric: "Debit-and-reversal balance ledger",
    repo: "https://github.com/AkashChitale/employee-leave-management-system",
    flow: [
      "React client",
      "Express routes",
      "Controllers",
      "Leave services",
      "Prisma",
      "PostgreSQL",
    ],
    supporting: [
      "Shared policy calculation",
      "Balance transaction journal",
      "Audit & notification services",
    ],
    overview:
      "ELMS manages leave from eligibility calculation and submission through approval, withdrawal, and cancellation. Its strongest engineering decisions are the separation of HTTP handling from business rules, shared policy evaluation, and a balance journal that preserves deductions and reversals. PostgreSQL locking protects specific operations; remaining concurrency gaps define the next improvements.",
    sections: [
      {
        title: "Problem",
        paragraphs: [
          "Employees, managers, and HR administrators need different views and permissions over the same leave lifecycle. Policy decisions and balance changes need to remain explainable as requests move through approval and cancellation.",
        ],
      },
      {
        title: "Requirements",
        bullets: [
          "Employee eligibility previews, submission, history, withdrawal, and cancellation requests.",
          "Manager approval, rejection, and cancellation approval; organization-wide leave oversight for HR.",
          "Administration of departments, leave types, leave years, holidays, and settings, with current settings limitations explained below.",
          "Authenticated, role-scoped operations with a traceable balance transaction history.",
        ],
      },
      {
        title: "Core workflow",
        paragraphs: [
          "Employees preview eligibility and submit requests. Managers approve or reject pending requests, with eligibility recalculated during approval. Employees can withdraw pending requests or request cancellation of approved leave; approved cancellations create balance reversals.",
          "The application enforces PENDING → APPROVED, REJECTED, or WITHDRAWN, and APPROVED → CANCELLATION_PENDING → CANCELLED. PostgreSQL constraints do not currently enforce the complete state machine.",
        ],
      },
      {
        title: "Important engineering decisions",
        bullets: [
          "Separate routes, controllers, and services. Controllers do not access Prisma directly, and services work with application data rather than Express request objects.",
          "Reuse calculateLeaveDays for submission and approval: day counting, policy validation, overlap checks, balance lookup, and eligibility stay in one service.",
          "Use TanStack Query v5 with typed query-key factories, feature hooks, keepPreviousData, and invalidation organized around documented query-key roots.",
          "Share audit and notification services across leave workflows. Some audit writes fall outside the active transaction, so this boundary still needs correction.",
        ],
      },
      {
        title: "Authentication and authorization",
        bullets: [
          "JWT access and refresh tokens use separate secrets, pinned HS256 verification, and minimum secret-length validation.",
          "Refresh tokens have unique jti values, SHA-256 hashed storage, rotation, and revocation. Reuse detection and token-family revocation are not implemented.",
          "Access tokens contain the user subject rather than role or personal data. Authenticated requests retrieve the role from the database so authorization reflects role changes.",
          "Route-level RBAC protects manager and HR APIs. Services independently check ownership and scope rather than trusting client-supplied employee IDs.",
          "Login returns the same Invalid credentials response for unknown accounts and incorrect passwords.",
          "The backend supports refresh-token rotation, but the frontend currently clears authentication on a 401 instead of calling the refresh endpoint.",
        ],
      },
      {
        title: "Balance ledger and reversals",
        paragraphs: [
          "EmployeeLeaveBalance stores the current materialized balance. LeaveBalanceTransaction records an append-only journal, with decimal leave quantities where appropriate.",
          "Approval creates a debit. Cancellation preserves that original entry and adds a separate LEAVE_REVERSAL credit. The reversal amount comes from the original debit rather than recalculation against policy or holiday configuration that may have changed.",
          "PostgreSQL transactions group approval changes, but the request-row lock does not fully protect the shared balance from concurrent approval of different requests.",
        ],
      },
      {
        title: "Concurrency protections and limits",
        bullets: [
          "Transaction advisory locks serialize leave-request-number allocation for a year. pg_advisory_xact_lock works even when no sequence row exists to lock.",
          "Approval, rejection, and cancellation flows use SELECT … FOR UPDATE on the leave-request row, then re-check its status. This guards against duplicate transitions on the same request.",
          "During approval recalculation, the current request is excluded from overlap results so it does not conflict with itself.",
          "These protections do not lock the employee balance or prevent concurrent overlapping submissions. Request-number uniqueness and leave eligibility are separate invariants.",
        ],
      },
      {
        title: "Testing architecture and audit results",
        paragraphs: [
          "The backend creates a migrated and seeded PostgreSQL template database, then clones a database per Vitest worker. Advisory locking serializes database creation, workers use isolated databases, and explicit test-database naming guards protect cleanup.",
          "In the supplied project audit, 102 DB-free API tests passed and 101 DB-backed tests were skipped because PostgreSQL was unavailable. The audit identifies 87 important integration tests as unexecuted. Frontend tests recorded 181 passes and 1 failure.",
          "These are results from the supplied audit, not project tests executed by this portfolio. The test infrastructure is implemented; a successful run of all integration tests is not claimed.",
        ],
      },
      {
        title: "Known limitations and improvements",
        bullets: [
          "Protect the actual balance with locking, version checks, or conditional atomic updates. Different requests can validate the same available balance and oversell it; the existing balance version field is unused.",
          "Prevent concurrent overlapping submissions. Conflict checks observe committed rows, and the request-number advisory lock does not protect this business rule.",
          "Pass the active transaction client into audit writes. Some paths use the global Prisma client, risking audit records after rollback and connection-pool exhaustion or deadlock under concurrency.",
          "Correct double subtraction when a holiday falls on a weekly-off day, half-day requests spanning multiple days, server-local timezone calculations, and future leave-year attribution.",
          "Add login rate limiting and refresh-token reuse detection; align database and JWT expiry configuration and review per-request database lookup cost.",
          "Connect frontend expiry handling to the refresh endpoint.",
          "Implement or clearly limit configuration behavior. Among SystemSettings fields, only weekly_off_days currently affects business logic.",
          "Resolve the failing frontend test and run the skipped database-backed suites before claiming successful integration verification.",
        ],
      },
      {
        title: "What I learned",
        paragraphs: [
          "Locking a request protects that request, not every resource the workflow touches. The balance ledger makes changes explainable, while shared balances, overlap rules, and audit writes require their own concurrency and transaction boundaries. No production-scale, latency, or throughput claim is made.",
        ],
      },
    ],
  },
  {
    slug: "task-management",
    number: "02",
    name: "Task Management System",
    kind: "AUTHENTICATION & API DESIGN",
    description:
      "A full-stack personal task manager with JWT authentication, coordinated token refresh, and user-scoped MongoDB persistence.",
    technologies: [
      "React",
      "TypeScript",
      "Node.js",
      "Express",
      "MongoDB",
      "Mongoose",
      "Zod",
      "Axios",
    ],
    concepts: [
      "JWT & refresh-token revocation",
      "Concurrent refresh coordination",
      "Zod validation & API errors",
      "User-scoped limit + 1 pagination",
    ],
    metric: "Coordinated token refresh",
    repo: "https://github.com/AkashChitale/task-management-system",
    flow: [
      "React client",
      "Express routes",
      "Zod validation",
      "Authentication",
      "Controllers",
      "MongoDB",
    ],
    supporting: [
      "Axios refresh coordination",
      "User ownership checks",
      "Centralized error handling",
    ],
    overview:
      "A personal task manager for creating, listing, completing, and deleting tasks with optional due dates. Its most substantial engineering work is the authentication lifecycle: coordinating concurrent requests during access-token refresh, maintaining revocable refresh tokens, and enforcing user ownership at the API boundary.",
    sections: [
      {
        title: "Problem",
        paragraphs: [
          "A small task application still needs to keep one user’s records separate from another’s and handle expired access tokens predictably. Concurrent API failures should not trigger duplicate refresh attempts within the same browser tab.",
        ],
      },
      {
        title: "Requirements",
        bullets: [
          "Create, list, complete or reopen, and delete the authenticated user’s tasks, with optional due dates.",
          "JWT access and refresh authentication with server-side refresh-token revocation.",
          "Validated API inputs, consistent errors, and user-scoped persistence.",
          "Incremental task loading with offset pagination, due-date ordering, and client-side filtering.",
        ],
      },
      {
        title: "Authentication and refresh coordination",
        paragraphs: [
          "Access tokens are sent through Authorization: Bearer. The refresh token is held in an HTTP-only cookie and stored against the user in MongoDB so the server can revoke it.",
          "The Axios interceptor uses isRefreshing, failedQueue, and a _retry flag to coordinate concurrent failed requests behind one refresh operation within a browser tab. This avoids duplicate refresh attempts during access-token expiry.",
          "Refresh produces a new access token only. Refresh-token rotation, reuse detection, token families, and hashed refresh-token storage are not implemented.",
        ],
      },
      {
        title: "Validation and error handling",
        paragraphs: [
          "Express routes apply Zod validation and authentication before controllers. Request bodies, query strings, and route parameters can be validated independently, and controllers consume validated data rather than raw Express inputs.",
          "asyncHandler forwards asynchronous controller failures. AppError and centralized error mapping return a consistent API response shape.",
        ],
      },
      {
        title: "Task ownership and pagination",
        paragraphs: [
          "MongoDB is the system of record, with User and Todo models accessed through Mongoose. Ownership checks use userId so authenticated users operate on their own tasks.",
          "Task queries use skip/limit offset pagination and due-date ordering. Fetching limit + 1 records determines whether another page exists without a separate existence query.",
          "This is not cursor or keyset pagination. Deep offsets and changing due dates remain scalability and correctness concerns; compound query indexes are an improvement area.",
        ],
      },
      {
        title: "Frontend and deployment",
        paragraphs: [
          "React 19, React Router 7, and TypeScript provide the SPA. An authentication context tracks auth state, Axios handles API requests, and task completion and deletion use optimistic updates. Filtering happens in the client.",
          "The audited deployment places the frontend on Vercel and the Express 5 backend at a separate API domain. MongoDB persistence uses Mongoose 9. No traffic, latency, throughput, or measured speedup is claimed.",
        ],
      },
      {
        title: "Dormant reminder scaffolding",
        paragraphs: [
          "The repository contains Redis configuration, Bull queue code, a reminder worker, and an email service abstraction. They are not functioning reminder-delivery features: scheduling is hard-disabled, the worker cannot run from the compiled build, and email sending is a console-log stub.",
          "There is no working application caching layer. Redis is dormant for normal requests, so Redis caching, production background jobs, and cache-driven API improvements are not presented as implemented.",
        ],
      },
      {
        title: "Testing status",
        paragraphs: [
          "No automated tests or CI pipeline existed at the time of the supplied audit. Adding backend tests for authentication, refresh coordination, ownership, validation, and pagination is a next step, not completed coverage.",
        ],
      },
      {
        title: "What I would improve",
        bullets: [
          "Implement refresh-token rotation and reuse detection, hash stored refresh tokens, strengthen refresh-cookie security, and add authentication rate limiting.",
          "Add compound indexes for user-scoped queries and replace offset pagination with keyset pagination.",
          "Move filtering, search, and sorting server-side; improve concurrency handling for optimistic updates.",
          "Add automated backend tests and a CI/CD pipeline.",
          "Add health/readiness endpoints and graceful shutdown.",
          "Either complete reminder processing or remove its dormant Redis/Bull scaffolding.",
        ],
      },
      {
        title: "What I learned",
        paragraphs: [
          "The strongest work in this application is coordinating authentication recovery and making API boundaries explicit. Repository dependencies are not evidence of working features: cache, queue, and performance claims need an executable implementation and, where relevant, measurements.",
        ],
      },
    ],
  },
  {
    slug: "portfolio",
    number: "03",
    name: "This portfolio, by design",
    kind: "STATIC-FIRST WEB ARCHITECTURE",
    description:
      "An engineering portfolio that keeps content static and optional infrastructure independent.",
    technologies: ["Astro", "TypeScript", "Tailwind CSS", "GitHub Actions"],
    concepts: [
      "Static HTML",
      "Progressive enhancement",
      "JavaScript budget",
      "Independent API",
    ],
    metric: "No client framework runtime",
    repo: "https://github.com/AkashChitale/akash-portfolio",
    flow: [
      "Typed content & Markdown",
      "Astro build",
      "Static HTML, CSS & JS",
      "CDN",
      "Browser",
    ],
    supporting: ["CI checks", "Optional Systems Lab API"],
    overview:
      "The site you are reading uses pre-rendered HTML for its core experience. A small amount of JavaScript enhances theme selection and navigation. The optional Systems Lab is an isolated feature, not a requirement for reading the site.",
    sections: [
      {
        title: "Problem",
        paragraphs: [
          "A portfolio should communicate engineering work quickly, on a small screen or a slow connection. A content site does not need an application runtime to deliver its most important information.",
        ],
      },
      {
        title: "Requirements",
        bullets: [
          "Readable, responsive content and dedicated project case studies.",
          "Accessible dark and light themes with minimal browser scripting.",
          "Centralized content and draft-aware Markdown notes.",
          "Static hosting compatibility and graceful optional-service failure.",
        ],
      },
      {
        title: "Important engineering decisions",
        paragraphs: [
          "Generate HTML at build time with Astro. This leaves navigation and content available even when JavaScript is disabled.",
          "Use shared typed data for project summaries and detail pages to prevent content drift. Use Astro content collections for future Markdown articles.",
          "Make the status endpoint opt-in. A configured request runs after page load, with a timeout and a bounded, validated response.",
        ],
      },
      {
        title: "Data flow",
        paragraphs: [
          "Typed project data and local Markdown enter the Astro build. The output is a directory of static assets suitable for a CDN. The browser can independently request a public Systems Lab endpoint when one is configured.",
        ],
      },
      {
        title: "Technology choices",
        bullets: [
          "Astro renders content without shipping a component runtime.",
          "Strict TypeScript checks data and component interfaces.",
          "Tailwind CSS and shared CSS tokens provide layout utilities and a consistent visual system.",
          "Native HTML details provides the mobile navigation fallback.",
        ],
      },
      {
        title: "Challenges",
        paragraphs: [
          "The main design challenge is showing technical depth without turning the portfolio into a dashboard. A restrained visual hierarchy, explicit architecture flows, and focused case studies keep the content approachable.",
        ],
      },
      {
        title: "Testing strategy",
        paragraphs: [
          "The repository includes linting, Astro and TypeScript checks, a production build verifier, and tests for optional API failure handling. The verifier checks internal links, page metadata, draft exclusion, and a compressed JavaScript budget. Actual executed results belong in the delivery report.",
        ],
      },
      {
        title: "Security considerations",
        paragraphs: [
          "There is no contact-form backend or user authentication surface. Local Markdown is trusted, repository-reviewed content. Security header guidance includes a Content Security Policy, and no frontend environment variable should contain a secret.",
        ],
      },
      {
        title: "Performance considerations",
        paragraphs: [
          "System fonts eliminate a font download. Diagrams use CSS and SVG. There are no analytics, image libraries, animation libraries, or hydrated React components. A 15 KB compressed budget covers all shipped JavaScript, including optional code.",
        ],
      },
      {
        title: "What I learned",
        paragraphs: [
          "A small architecture can still make deliberate decisions about accessibility, failure boundaries, content ownership, and deployment. Constraints are useful when they keep the reading experience fast and understandable.",
        ],
      },
      {
        title: "Future improvements",
        bullets: [
          "Keep the résumé current.",
          "Publish engineering notes after drafting and review.",
          "Deploy static assets to S3 behind CloudFront; attach a separate read-only API only when it exists.",
        ],
      },
    ],
  },
];
