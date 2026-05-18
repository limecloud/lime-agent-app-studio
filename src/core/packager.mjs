// input: 本地 Agent App 目录与输出目录
// output: .lapp 安装包、sha256 与 manifest hash

import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir, readFile, stat } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import yazl from "yazl";
import { inspectProject } from "./project.mjs";

const defaultExcludes = new Set([
  ".git",
  "node_modules",
  ".DS_Store",
  ".lime",
  ".local",
  "coverage",
]);

export async function packageProject(options = {}) {
  const appDir = resolve(options.appDir || ".");
  const inspection = await inspectProject(appDir);
  if (!inspection.publishable) {
    throw new Error(`项目不可发布：${inspection.issues.join("；")}`);
  }
  const outDir = resolve(options.outDir || join(appDir, "dist-package"));
  await mkdir(outDir, { recursive: true });
  const packageName = `${inspection.appId}-${inspection.version}.lapp`;
  const packagePath = join(outDir, packageName);
  const files = await collectPackageFiles(appDir, {
    includeNodeModules: Boolean(options.includeNodeModules),
  });
  await writeZip(appDir, files, packagePath);

  const packageHash = await sha256File(packagePath);
  const manifestPath = await resolveManifestPath(appDir);
  const manifestHash = manifestPath ? await sha256File(manifestPath) : "";
  return {
    ...inspection,
    packagePath,
    packageName,
    packageHash,
    manifestHash,
    sizeBytes: (await stat(packagePath)).size,
    fileCount: files.length,
  };
}

export async function collectPackageFiles(appDir, options = {}) {
  const root = resolve(appDir);
  const result = [];
  const excludes = new Set(defaultExcludes);
  if (options.includeNodeModules) {
    excludes.delete("node_modules");
  }
  await walk(root, root, result, excludes);
  result.sort((a, b) => a.localeCompare(b));
  return result;
}

async function walk(root, current, result, excludes) {
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    if (excludes.has(entry.name)) continue;
    if (entry.name === "dist-package") continue;
    const fullPath = join(current, entry.name);
    const rel = relative(root, fullPath).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      await walk(root, fullPath, result, excludes);
      continue;
    }
    if (entry.isFile()) result.push(rel);
  }
}

function writeZip(root, files, packagePath) {
  return new Promise((resolvePromise, reject) => {
    const zip = new yazl.ZipFile();
    const output = createWriteStream(packagePath);
    output.on("close", resolvePromise);
    output.on("error", reject);
    zip.outputStream.on("error", reject);
    zip.outputStream.pipe(output);
    for (const file of files) {
      zip.addFile(join(root, file), file);
    }
    zip.end();
  });
}

async function sha256File(path) {
  return new Promise((resolvePromise, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolvePromise(`sha256:${hash.digest("hex")}`));
  });
}

async function resolveManifestPath(appDir) {
  const candidates = ["APP.md", "app.manifest.json", "app.manifest.yaml"];
  for (const candidate of candidates) {
    const target = join(appDir, candidate);
    try {
      await readFile(target);
      return target;
    } catch (error) {
      // 继续尝试下一个标准清单文件。
    }
  }
  return "";
}
