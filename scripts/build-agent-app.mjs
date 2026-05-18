import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { copyLimeAppSdkVendor } from "../src/core/lime-app-sdk-vendor.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const distUi = join(root, "dist", "ui");

await rm(distUi, { recursive: true, force: true });
await mkdir(distUi, { recursive: true });
for (const file of ["index.html", "app.js", "styles.css"]) {
  await cp(join(root, "app", file), join(distUi, file));
}
const sdkVendor = await copyLimeAppSdkVendor(
  root,
  join(distUi, "vendor", "lime-app-sdk"),
);
console.log(`已同步 @lime/app-sdk vendor: ${sdkVendor.sourceDir}`);
console.log(`已生成 Agent App UI: ${distUi}`);
