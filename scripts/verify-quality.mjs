import { spawnSync } from "node:child_process";

for (const script of ["lint", "typecheck", "build"]) {
  const result = spawnSync("npm", ["run", script], { stdio: "inherit", shell: true, env: { ...process.env, AI_ENABLED: "false" } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log("quality verification passed");
