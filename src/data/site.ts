export const site = {
  name: "Akash Chitale",
  title: "Software Engineer",
  description:
    "Computer Engineering student focused on backend systems, scalable architecture, and performance. Explore the engineering work of Akash Chitale.",
  location: "Pune, India",
  // Public profile links confirmed by the owner. Empty links stay hidden.
  profiles: {
    github: "https://github.com/AkashChitale",
    linkedin: "https://www.linkedin.com/in/akashchitale/",
    leetcode: "https://leetcode.com/u/Akash124124/",
    email: "akashchitale0@gmail.com",
  },
  resume: { path: "/resume.pdf", available: true },
} as const;

export const navigation = [
  { label: "About", id: "about" },
  { label: "Experience", id: "experience" },
  { label: "Projects", id: "projects" },
  { label: "Engineering", id: "engineering" },
  { label: "Contact", id: "contact" },
] as const;

// Supplied profile metrics, kept in one place; not a live contest-rating feed.
export const problemSolving = {
  solved: "1,300+",
  rating: "1,957",
  peak: "2,084",
} as const;

export const snapshot = [
  { value: problemSolving.solved, label: "DSA problems solved" },
  { value: problemSolving.rating, label: "LeetCode rating · approx." },
  { value: "9.1", suffix: "/ 10", label: "CGPA · VIIT Pune" },
  { value: "3", label: "ELMS workflow roles" },
];

export const experience = {
  company: "WhiskerBond",
  role: "Software Engineering Intern",
  period: "Sep 2026 – Present",
  current: true,
  area: "Pet-care platform · Product engineering",
  summary:
    "Build and refine Community experiences across React interfaces and backend APIs.",
  contributions: [
    {
      title: "Community feeds & discovery",
      text: "Built cursor-paginated feeds with TanStack Query infinite queries. Worked on feed ranking and personalization using pet relevance, content interests, interaction history and freshness, with diversity and repetition controls.",
    },
    {
      title: "Social interactions & identity",
      text: "Implemented likes, bookmarks and comments with authorization-aware flows and optimistic updates where appropriate. Developed public-profile flows, including username generation, sanitization and collision handling for Google-created accounts.",
    },
    {
      title: "Product engineering in an existing codebase",
      text: "Debugged across frontend and backend boundaries within an existing production codebase. Connected Community content to public profiles through deep links and refined responsive experiences for desktop and mobile.",
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
