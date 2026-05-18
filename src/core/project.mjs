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
  const displayName = firstString(manifest.displayName, manifest.title, packageJson?.displayName, appId);
  const description = firstString(manifest.description, packageJson?.description);
  const appType = firstString(manifest.appType, inferAppType(`${displayName} ${description} ${appId}`));
  const categories = uniqueStrings([...(Array.isArray(manifest.categories) ? manifest.categories : []), appType]);
  const generated = buildGeneratedMetadata({ displayName, description, appId, appType, categories });
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
    displayName,
    description,
    appType,
    categories,
    generated,
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
  let currentKey = "";
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, "");
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const listMatch = line.match(/^\s+-\s+(.+?)\s*$/);
    if (listMatch && currentKey) {
      const current = result[currentKey];
      result[currentKey] = Array.isArray(current) ? [...current, cleanScalar(listMatch[1])] : [cleanScalar(listMatch[1])];
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_.-]+):\s*(.*?)\s*$/);
    if (!kv) continue;
    currentKey = kv[1];
    result[currentKey] = kv[2] ? cleanScalar(kv[2]) : [];
  }
  return result;
}

function cleanScalar(value) {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
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


function inferAppType(source) {
  const text = String(source || "").toLowerCase();
  if (/content|article|post|copy|media|image|创作|内容|图片/.test(text)) return "content-tool";
  if (/deploy|publish|studio|developer|cli|release|开发|发布/.test(text)) return "developer-tool";
  if (/data|sheet|report|analysis|analytics|数据|报表/.test(text)) return "analytics-tool";
  if (/browser|crawl|search|research|采集|搜索|研究/.test(text)) return "research-tool";
  return "workflow-tool";
}

function buildGeneratedMetadata({ displayName, description, appId, appType, categories }) {
  const name = firstString(displayName, appId, "Agent App");
  return {
    displayName: name,
    description: firstString(description, "自动识别的 Agent App"),
    appType,
    appTypeLabel: labelForAppType(appType),
    categories,
    icon: {
      kind: "monogram",
      label: monogram(name),
      background: colorForText(name),
    },
  };
}

function labelForAppType(type) {
  return {
    "developer-tool": "开发者工具",
    "content-tool": "内容生产",
    "analytics-tool": "数据分析",
    "research-tool": "研究采集",
    "workflow-tool": "流程工具",
  }[type] || "Agent App";
}

function monogram(value) {
  const text = String(value || "App").trim();
  const chinese = text.match(/[\u4e00-\u9fa5]/);
  if (chinese) return chinese[0];
  const letters = text.match(/[A-Za-z0-9]/g) || ["A"];
  return letters.slice(0, 2).join("").toUpperCase();
}

function colorForText(value) {
  const colors = ["#2f8a54", "#145c72", "#16356f", "#8a5a23", "#6f7f3b"];
  const sum = String(value || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[sum % colors.length];
}

function uniqueStrings(values) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}
