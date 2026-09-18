export const site = {
  name: "Akash Chitale",
  title: "Software Engineer",
  description:
    "Computer Engineering student focused on backend systems, scalable architecture, and performance. Explore the engineering work of Akash Chitale.",
  location: "Pune, India",
  // PERSONALIZE: use full HTTPS URLs and a real email. Empty values render as unavailable.
  profiles: { github: "", linkedin: "", leetcode: "", email: "" },
  resume: { path: "/resume.pdf", available: false },
} as const;

export const navigation = [
  { label: "About", id: "about" },
  { label: "Experience", id: "experience" },
  { label: "Projects", id: "projects" },
  { label: "Engineering", id: "engineering" },
  { label: "Contact", id: "contact" },
] as const;

export const snapshot = [
  { value: "1,200+", label: "DSA problems solved" },
  { value: "1,957", label: "LeetCode contest rating" },
  { value: "9.1", suffix: "/ 10", label: "CGPA · VIIT Pune" },
  { value: "200+", label: "ELMS backend tests" },
];

export const experience = {
  company: "WhiskerBond",
  role: "Software Engineering Intern",
  area: "Pet-care platform · Product engineering",
  summary:
    "Working across the interface and the API layer of a community-driven pet-care platform.",
  contributions: [
    {
      title: "Feeds that keep moving.",
      text: "Built community feed experiences using cursor-based pagination and TanStack Query infinite queries.",
    },
    {
      title: "Interactions that feel immediate.",
      text: "Worked on likes, bookmarks, and comments with optimistic updates and authorization-aware flows.",
    },
    {
      title: "Engineering in an existing codebase.",
      text: "Developed React interfaces and backend APIs, debugged across application layers, and refined responsive mobile experiences.",
    },
  ],
  tags: ["React", "Backend APIs", "TanStack Query", "Authorization"],
};

export const principles = [
  {
    number: "01",
    title: "Backend systems",
    detail: "Make the contract clear.",
    items:
      "REST APIs · authentication · authorization · Zod validation · consistent errors",
  },
  {
    number: "02",
    title: "Data & correctness",
    detail: "Model the rules, then the tables.",
    items: "PostgreSQL · MongoDB · Prisma · indexes · transactions · Redis",
  },
  {
    number: "03",
    title: "Reliability",
    detail: "Make failure understandable.",
    items:
      "Vitest · Supertest · integration tests · audit logs · structured errors",
  },
  {
    number: "04",
    title: "Performance",
    detail: "Do less work on the critical path.",
    items: "Caching · pagination · query optimization · Bull background jobs",
  },
  {
    number: "05",
    title: "Infrastructure",
    detail: "Build with deployment in mind.",
    items:
      "Docker · Git · GitHub Actions · AWS fundamentals · learning CloudFront & health checks",
  },
  {
    number: "06",
    title: "Frontend",
    detail: "Keep the experience considered.",
    items: "React · TypeScript · TanStack Query · HTML & CSS · Tailwind · Vite",
  },
];
