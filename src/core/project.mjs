// input: 本地 Agent App 目录
// output: appId、版本、manifest、构建产物与发布前诊断

import { access, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

export async function inspectProject(appDirInput = ".") {
  const appDir = resolve(appDirInput);
  const packageJson = await readOptionalJson(join(appDir, "package.json"));
  const appMd = await readOptionalText(join(appDir, "APP.md"));
  const capabilityYaml = await readOptionalText(join(appDir, "app.capabilities.yaml"));
  const distStatus = await pathStatus(join(appDir, "dist"));
  const distUiStatus = await pathStatus(join(appDir, "dist", "ui"));
  const vendorStatus = await pathStatus(join(appDir, "dist", "ui", "vendor"));

  const manifest = extractFrontmatter(appMd) || {};
  const appId = firstString(
    manifest.id,
    manifest.appId,
    manifest.name,
    packageJson?.name
  );
  const version = firstString(manifest.version, packageJson?.version);
  const manifestVersion = firstString(manifest.manifestVersion, manifest.standardVersion);
  const issues = [];
  const warnings = [];

  if (!appMd) issues.push("缺少 APP.md");
  if (!capabilityYaml) warnings.push("缺少 app.capabilities.yaml，云端入口可能不完整");
  if (!appId) issues.push("无法识别 appId / name");
  if (!version) issues.push("无法识别版本号");
  if (!distStatus.exists) warnings.push("缺少 dist/，发布前通常需要先执行构建");
  if (!distUiStatus.exists) warnings.push("缺少 dist/ui，UI App 可能无法运行");
  if (distUiStatus.exists && !vendorStatus.exists) {
    warnings.push("缺少 dist/ui/vendor；如果 UI import map 依赖 vendor，发布包会不可运行");
  }

  return {
    appDir,
    appId,
    version,
    manifestVersion,
    packageName: packageJson?.name || "",
    packageVersion: packageJson?.version || "",
    hasBuildScript: Boolean(packageJson?.scripts?.build),
    hasValidateScript: Boolean(packageJson?.scripts?.["validate:app"]),
    files: {
      appMd: Boolean(appMd),
      capabilities: Boolean(capabilityYaml),
      dist: distStatus.exists,
      distUi: distUiStatus.exists,
      vendor: vendorStatus.exists,
    },
    publishable: issues.length === 0,
    issues,
    warnings,
  };
}

async function readOptionalText(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    return "";
  }
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    return null;
  }
}

async function pathStatus(path) {
  try {
    const item = await stat(path);
    return { exists: true, directory: item.isDirectory(), file: item.isFile() };
  } catch (error) {
    return { exists: false, directory: false, file: false };
  }
}

function extractFrontmatter(markdown) {
  const match = String(markdown || "").match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_.-]+):\s*(.+?)\s*$/);
    if (!kv) continue;
    result[kv[1]] = kv[2].replace(/^['"]|['"]$/g, "");
  }
  return result;
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export async function ensureReadableAppDir(appDir) {
  await access(resolve(appDir));
}
