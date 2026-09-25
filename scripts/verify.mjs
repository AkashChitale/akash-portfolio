import { spawnSync } from "node:child_process";

// Only these fixed commands reach the Windows shell; no user-supplied arguments.
for (const step of ["lint", "typecheck", "test", "build", "verify:build"]) {
  const result =
    process.platform === "win32"
      ? spawnSync(`pnpm run ${step}`, { stdio: "inherit", shell: true })
      : spawnSync("pnpm", ["run", step], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
