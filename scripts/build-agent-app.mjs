import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const distUi = join(root, "dist", "ui");

await rm(distUi, { recursive: true, force: true });
await mkdir(join(distUi, "vendor"), { recursive: true });
for (const file of ["index.html", "app.js", "styles.css"]) {
  await cp(join(root, "app", file), join(distUi, file));
}
await writeFile(join(distUi, "vendor", ".gitkeep"), "");
console.log(`已生成 Agent App UI: ${distUi}`);
