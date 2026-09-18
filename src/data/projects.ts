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
      "A permission-aware leave system, built around secure sessions, approval workflows, and data integrity.",
    technologies: ["React", "TypeScript", "Express", "PostgreSQL", "Prisma"],
    concepts: [
      "Token rotation",
      "Role-based access",
      "Transactional balances",
      "Audit logging",
    ],
    metric: "200+ backend tests",
    repo: "",
    flow: [
      "React client",
      "Express API",
      "Authentication & authorization",
      "Leave services",
      "Prisma",
      "PostgreSQL",
    ],
    supporting: ["Refresh token lifecycle", "Notifications", "Audit logging"],
    overview:
      "Leave management is a coordination problem: different roles make decisions, balances change, and every transition needs to remain explainable. This project approaches those rules as a modular backend with an accessible React and TypeScript interface.",
    sections: [
      {
        title: "Problem",
        paragraphs: [
          "A leave request moves through more than a create-and-edit cycle. Employees submit and cancel requests, managers approve them, and HR administrators oversee balances and policy. The system needs to preserve those boundaries while keeping the underlying records consistent.",
        ],
      },
      {
        title: "Requirements",
        bullets: [
          "Employee, Manager, and HR Admin roles with distinct access boundaries.",
          "An explicit approval lifecycle and cancellation workflow.",
          "Leave balance transactions, audit records, and notifications.",
          "Access and refresh authentication with rotation and revocation.",
        ],
      },
      {
        title: "Important engineering decisions",
        paragraphs: [
          "Keep business rules inside leave services. Routing, request validation, and authorization form the boundary; approval and balance behavior belong to the domain. This makes the same rules easier to reason about and integration-test.",
          "Use PostgreSQL and Prisma for related records and balance transactions. A balance change is part of a business operation, so its consistency matters more than merely persisting an individual field.",
          "Treat refresh tokens as a lifecycle. Rotation and revocation provide controls beyond issuing a long-lived JWT. They also introduce state that needs to be tested across refresh and logout flows.",
        ],
      },
      {
        title: "Data flow",
        paragraphs: [
          "The client sends a request to the API. Authentication establishes the session; authorization checks the role. Validated input reaches the leave service, which applies the relevant lifecycle and balance rules through Prisma and PostgreSQL. Notifications and audit logging support the resulting operation.",
          "The diagram is a conceptual view of the supplied project architecture; it does not claim a particular event-delivery or transaction-boundary implementation.",
        ],
      },
      {
        title: "Technology choices",
        bullets: [
          "React and TypeScript provide the interface and typed client logic.",
          "Express keeps HTTP concerns separate from modular services.",
          "PostgreSQL models related workflow data; Prisma provides the data access layer.",
          "Centralized validation and error handling establish a consistent API boundary.",
        ],
      },
      {
        title: "Challenges",
        paragraphs: [
          "The central engineering challenge is consistency across transitions: approving, cancelling, and checking balances all interact. Another is enforcing role boundaries on the API even when an action is hidden in the interface. These are the decisions that make this project more than a collection of endpoints.",
        ],
      },
      {
        title: "Testing strategy",
        paragraphs: [
          "The project includes 200+ backend tests and integration testing. The useful focus is behavior at the API boundary: session handling, authorization, validation, and workflow transitions.",
          "The repository and test report have not been linked here yet. The test count is a supplied project metric, not a test run performed by this portfolio.",
        ],
      },
      {
        title: "Security considerations",
        bullets: [
          "Enforce role-based access at the API boundary.",
          "Rotate and revoke refresh tokens as part of session management.",
          "Validate input centrally and return consistent errors.",
          "Keep audit history available for reviewing important actions.",
        ],
      },
      {
        title: "Performance considerations",
        paragraphs: [
          "Correctness is the priority for balance-changing operations. Query shape, relation loading, and transaction scope are useful review points as usage grows. No throughput or latency benchmark is claimed.",
        ],
      },
      {
        title: "What I learned",
        paragraphs: [
          "This project brought authentication, authorization, state transitions, and data integrity into one system. It strengthened my focus on modeling rules explicitly and making the backend testable beyond the happy path.",
        ],
      },
      {
        title: "Future improvements",
        bullets: [
          "Verify concurrency behavior with simultaneous approval and cancellation tests.",
          "Document transaction boundaries and failure behavior for audit and notification delivery.",
          "Add structured operational metrics and measured load tests before making scaling claims.",
        ],
      },
    ],
  },
  {
    slug: "task-management",
    number: "02",
    name: "Task Management System",
    kind: "BACKEND & PERFORMANCE",
    description:
      "A task platform that uses caching and asynchronous jobs to keep work off the request path.",
    technologies: ["React", "Node.js", "Express", "MongoDB", "Redis", "Bull"],
    concepts: [
      "Redis caching",
      "Background queues",
      "Query optimization",
      "Pagination",
    ],
    metric: "Cache + queue architecture",
    repo: "",
    flow: [
      "React client",
      "Express API",
      "JWT authentication",
      "Task services",
      "MongoDB",
    ],
    supporting: ["Redis cache", "Bull queue", "Background worker"],
    overview:
      "This project explores how a task application changes when the request path is treated as a limited resource. Pagination, database query improvements, Redis caching, and Bull background processing address different kinds of work.",
    sections: [
      {
        title: "Problem",
        paragraphs: [
          "Task interfaces repeatedly read collections of records, while some work does not need to finish before an API response returns. The engineering problem is deciding which work belongs in a query, a cache, or an asynchronous job.",
        ],
      },
      {
        title: "Requirements",
        bullets: [
          "JWT authentication with an access and refresh lifecycle.",
          "Paginated task access and optimized database queries.",
          "Redis caching for reusable reads.",
          "Asynchronous background processing with Bull.",
        ],
      },
      {
        title: "Important engineering decisions",
        paragraphs: [
          "Use pagination to bound the amount of data requested and rendered at once. It makes response size a deliberate part of the API contract.",
          "Use Redis for cached reads and Bull for background processing. A cache avoids repeated work; a queue moves work out of the synchronous response path. These address different performance concerns.",
          "Keep MongoDB as the application data store. A cache should accelerate reads without becoming the only durable source of task data.",
        ],
      },
      {
        title: "Data flow",
        paragraphs: [
          "Authenticated requests reach the task service. Read paths can use Redis-backed caching and query MongoDB when data must be loaded. Work assigned to Bull is processed asynchronously by a worker, independently of the client response.",
          "The diagram expresses the supplied components. Cache keys, TTLs, job payloads, and retry policies are intentionally not represented as verified implementation details.",
        ],
      },
      {
        title: "Technology choices",
        bullets: [
          "Node.js and Express handle the API; React presents the task interface.",
          "MongoDB stores task records and supports query-based retrieval.",
          "Redis provides caching; Bull supplies the background queue.",
        ],
      },
      {
        title: "Challenges",
        paragraphs: [
          "Caching adds a freshness problem: a fast response is useful only if its data is appropriate for the request. Background processing adds another boundary where failures and retries need to be understood. These tradeoffs shape the next stage of the project.",
        ],
      },
      {
        title: "Testing strategy",
        paragraphs: [
          "A recommended test plan covers authenticated access, pagination boundaries, cache misses and invalidation, and worker failure behavior. Unlike ELMS, a test count or completed coverage report has not been supplied for this project.",
        ],
      },
      {
        title: "Security considerations",
        paragraphs: [
          "The API uses JWT access and refresh authentication. Cache keys and queries should be reviewed for user isolation. Queue payloads should avoid unnecessary sensitive data, and Redis should remain inaccessible to public clients. These are review priorities, not claims of a completed security audit.",
        ],
      },
      {
        title: "Performance considerations",
        paragraphs: [
          "The work includes optimized queries, caching, and API performance improvements. There is no supplied before-and-after benchmark, so this case study does not assign a numerical speedup. The next useful measurement is latency across warm-cache, cold-cache, and background-work scenarios.",
        ],
      },
      {
        title: "What I learned",
        paragraphs: [
          "Performance work is about locating avoidable work and choosing where it belongs. Query improvements, caching, and asynchronous processing each come with different consistency and operational tradeoffs.",
        ],
      },
      {
        title: "Future improvements",
        bullets: [
          "Measure cache hit rate and endpoint latency under a repeatable workload.",
          "Review invalidation, retry, and idempotency behavior explicitly.",
          "Add queue-depth monitoring and a documented cache-outage strategy.",
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
    repo: "",
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
          "Add real profile links, a résumé, and project repositories.",
          "Publish engineering notes after drafting and review.",
          "Deploy static assets to S3 behind CloudFront; attach a separate read-only API only when it exists.",
        ],
      },
    ],
  },
];
