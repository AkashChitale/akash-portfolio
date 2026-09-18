import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { projects } from "../data/projects";
export const GET: APIRoute = async ({ site }) => {
  const notes = await getCollection("notes", ({ data }) => !data.draft);
  const routes = [
    "/",
    ...projects.map((project) => `/projects/${project.slug}/`),
    ...notes.map((note) => `/notes/${note.id}/`),
  ];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((route) => `<url><loc>${new URL(route, site).href.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</loc></url>`).join("")}</urlset>`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
};
