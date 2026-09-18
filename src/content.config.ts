import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const notes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/notes" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    draft: z.boolean().default(true),
    order: z.number(),
    publishedAt: z.coerce.date().optional(),
    category: z.string(),
  }),
});
export const collections = { notes };
