const toggle = document.querySelector<HTMLButtonElement>(".theme-toggle");
const dark = window.matchMedia("(prefers-color-scheme: dark)");
function currentTheme() {
  return (
    document.documentElement.dataset.theme || (dark.matches ? "dark" : "light")
  );
}
function updateLabel() {
  toggle?.setAttribute(
    "aria-label",
    `Switch to ${currentTheme() === "dark" ? "light" : "dark"} theme`,
  );
}
if (toggle) {
  toggle.hidden = false;
  updateLabel();
  toggle.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("akash-theme", next);
    } catch {
      /* Theme remains usable without persistence. */
    }
    updateLabel();
  });
  dark.addEventListener("change", updateLabel);
}
const menu = document.querySelector<HTMLDetailsElement>(".mobile-menu");
menu?.querySelectorAll("a").forEach((link) =>
  link.addEventListener("click", () => {
    menu.open = false;
  }),
);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu?.open) {
    menu.open = false;
    menu.querySelector("summary")?.focus();
  }
});
document.addEventListener("click", (event) => {
  if (
    menu?.open &&
    event.target instanceof Node &&
    !menu.contains(event.target)
  )
    menu.open = false;
});
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        if (entry.isIntersecting) {
          document.querySelectorAll("[data-nav]").forEach((link) => {
            if ((link as HTMLElement).dataset.nav === entry.target.id)
              link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
          });
        }
    },
    { rootMargin: "-15% 0px -60% 0px", threshold: 0 },
  );
  document
    .querySelectorAll("section[id]")
    .forEach((section) => observer.observe(section));
}
