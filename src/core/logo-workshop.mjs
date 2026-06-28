// input: Agent App manifest 与本地 Logo 资产
// output: 可打包的 SVG 图标、AI 提示词与 APP.md presentation 字段

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, resolve } from "node:path";
import { inspectProject } from "./project.mjs";

const defaultIconPath = "./assets/app-icon.svg";
const supportedImageExtensions = new Set([".svg", ".png", ".webp", ".jpg", ".jpeg"]);

export async function buildLogoBrief(options = {}) {
  const inspection = await inspectProject(options.appDir || ".");
  const profile = buildLogoProfile(inspection, options);
  return {
    appDir: inspection.appDir,
    appId: inspection.appId,
    displayName: profile.displayName,
    description: profile.description,
    appType: inspection.appType,
    iconPath: normalizeIconPath(options.iconPath || defaultIconPath),
    profile,
    prompt: buildImageGenerationPrompt(profile),
    svg: buildLogoSvg(profile),
  };
}

export async function generateLogoAsset(options = {}) {
  const brief = await buildLogoBrief(options);
  const iconPath = brief.iconPath;
  const absoluteIconPath = resolveAssetPath(brief.appDir, iconPath);
  await mkdir(dirname(absoluteIconPath), { recursive: true });
  await writeFile(absoluteIconPath, brief.svg, "utf8");

  const manifestResult = await upsertAppMdPresentationIcon({
    appDir: brief.appDir,
    iconPath,
  });

  return {
    ...brief,
    absoluteIconPath,
    manifestPath: manifestResult.manifestPath,
    manifestUpdated: manifestResult.updated,
  };
}

export async function installHostGeneratedLogo(options = {}) {
  const appDir = resolve(options.appDir || ".");
  const hostResult = options.hostResult ?? options.result ?? options;
  const image = await extractHostGeneratedImage(hostResult, { baseDir: appDir });
  const iconPath = normalizeIconPath(options.iconPath || image.defaultIconPath || defaultIconPath);
  assertSupportedImagePath(iconPath);

  const absoluteIconPath = resolveAssetPath(appDir, iconPath);
  await mkdir(dirname(absoluteIconPath), { recursive: true });
  await writeFile(absoluteIconPath, image.content);

  const manifestResult = await upsertAppMdPresentationIcon({ appDir, iconPath });
  const inspection = await inspectProject(appDir);
  return {
    appDir: inspection.appDir,
    appId: inspection.appId,
    displayName: inspection.displayName,
    iconPath,
    absoluteIconPath,
    previewDataUrl: toDataUrl(image.content, iconPath),
    sourceKind: image.sourceKind,
    manifestPath: manifestResult.manifestPath,
    manifestUpdated: manifestResult.updated,
  };
}

export async function attachLogoAsset(options = {}) {
  const appDir = resolve(options.appDir || ".");
  const sourcePath = normalizeRequiredText(options.source, "缺少 source，请传入要接入的图标文件路径");
  assertSupportedImagePath(sourcePath);
  const iconPath = normalizeIconPath(options.iconPath || defaultIconPathFromSourcePath(sourcePath));
  assertSupportedImagePath(iconPath);

  const absoluteSourcePath = resolve(sourcePath);
  const absoluteIconPath = resolveAssetPath(appDir, iconPath);
  const content = await readFile(absoluteSourcePath);
  await mkdir(dirname(absoluteIconPath), { recursive: true });
  await writeFile(absoluteIconPath, content);

  const manifestResult = await upsertAppMdPresentationIcon({ appDir, iconPath });
  const inspection = await inspectProject(appDir);
  return {
    appDir: inspection.appDir,
    appId: inspection.appId,
    displayName: inspection.displayName,
    iconPath,
    absoluteIconPath,
    sourcePath: absoluteSourcePath,
    manifestPath: manifestResult.manifestPath,
    manifestUpdated: manifestResult.updated,
  };
}

export async function extractHostGeneratedImage(value, options = {}) {
  const direct = findImageCandidate(value);
  if (!direct) {
    throw new Error("宿主生成结果里没有找到可安装的图片资产");
  }

  if (direct.dataUrl) {
    return {
      content: bufferFromDataUrl(direct.dataUrl),
      sourceKind: "data-url",
      defaultIconPath: `./assets/app-icon.${extensionFromDataUrl(direct.dataUrl)}`,
    };
  }
  if (direct.base64) {
    return {
      content: Buffer.from(direct.base64, "base64"),
      sourceKind: "base64",
      defaultIconPath: `./assets/app-icon.${direct.extension || "png"}`,
    };
  }
  if (direct.path) {
    const path = resolveHostAssetPath(direct.path, options.baseDir);
    assertSupportedImagePath(path);
    return {
      content: await readFile(path),
      sourceKind: "file",
      defaultIconPath: `./assets/app-icon${extname(path).toLowerCase() || ".png"}`,
    };
  }
  if (direct.jsonPath) {
    const jsonPath = resolveHostAssetPath(direct.jsonPath, options.baseDir);
    const parsed = JSON.parse(await readFile(jsonPath, "utf8"));
    return extractHostGeneratedImage(parsed, { ...options, baseDir: dirname(jsonPath) });
  }

  throw new Error("宿主生成结果里的图片资产格式暂不支持");
}

export function buildLogoProfile(inspection = {}, options = {}) {
  const displayName = firstString(options.displayName, inspection.displayName, inspection.appId, "Agent App");
  const description = firstString(options.description, inspection.description, inspection.generated?.description, "");
  const source = `${displayName} ${description} ${inspection.appId || ""} ${inspection.appType || ""}`.toLowerCase();
  const semantic = inferLogoSemantic(source);
  return {
    displayName,
    description,
    semantic,
    metaphor: semantic.metaphor,
    accent: semantic.accent,
    primaryColor: semantic.primaryColor,
    secondaryColor: semantic.secondaryColor,
    sparkColor: semantic.sparkColor,
  };
}

export function buildImageGenerationPrompt(profile) {
  return [
    "为 Lime 桌面应用中心生成一枚应用 Logo。",
    "",
    `应用：${profile.displayName}`,
    `用途：${profile.description || profile.semantic.defaultDescription}`,
    "使用场景：应用中心卡片，约 64px 展示，同时需要能缩小到 20px 仍可识别。",
    "视觉系统：符合 Lime 桌面 GUI，浅色圆角方形底板，清晰边框，轻微阴影，专业、克制、信息优先。",
    `图形：使用 ${profile.metaphor} 作为主体，加入 ${profile.accent} 作为小角标或动作符号。`,
    `颜色：主色 ${profile.primaryColor}，辅助色 ${profile.secondaryColor}，点缀色 ${profile.sparkColor}，整体低饱和，不要大面积高饱和渐变。`,
    "小尺寸要求：20px 下仍能识别主体轮廓，不依赖文字或首字母。",
    "禁止项：不要任何文字、假字、水印、外部品牌商标、照片、通用立方体图标、复杂细线或暗色炫技背景。",
    "输出：干净、居中、边距充足、适合作为软件应用 logo。",
  ].join("\n");
}

export function buildLogoSvg(profile) {
  const colors = profile.semantic;
  const symbol = buildSemanticSymbol(profile.semantic.kind);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-label="${escapeXml(profile.displayName)} logo">
  <defs>
    <linearGradient id="tile" x1="38" y1="24" x2="218" y2="232" gradientUnits="userSpaceOnUse">
      <stop stop-color="#fbfef9"/>
      <stop offset="0.58" stop-color="${colors.surfaceTint}"/>
      <stop offset="1" stop-color="#f8fafc"/>
    </linearGradient>
    <linearGradient id="main" x1="68" y1="62" x2="188" y2="196" gradientUnits="userSpaceOnUse">
      <stop stop-color="${colors.primaryColor}"/>
      <stop offset="1" stop-color="${colors.secondaryColor}"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="150%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#0f172a" flood-opacity="0.13"/>
    </filter>
  </defs>
  <rect x="18" y="18" width="220" height="220" rx="48" fill="url(#tile)"/>
  <rect x="20" y="20" width="216" height="216" rx="46" fill="none" stroke="${colors.borderColor}" stroke-width="3"/>
  <g filter="url(#softShadow)">
    <path d="M58 146c0-9 7-17 16-18l79-10c12-2 23 8 23 20v31c0 10-7 18-17 19l-78 10c-12 2-23-8-23-20v-32z" fill="#dbeafe" opacity="0.72"/>
    <path d="M72 118c0-9 7-17 16-18l79-10c12-2 23 8 23 20v31c0 10-7 18-17 19l-78 10c-12 2-23-8-23-20v-32z" fill="#ecfdf5"/>
    <path d="M88 88c0-10 8-18 18-18h72c11 0 20 9 20 20v58c0 10-8 18-18 18h-72c-11 0-20-9-20-20V88z" fill="#ffffff"/>
    <path d="M96 86c0-6 5-11 11-11h70c8 0 15 7 15 15v55c0 7-5 12-12 12h-70c-8 0-14-6-14-14V86z" fill="url(#main)" opacity="0.13"/>
    <path d="M108 106h58M108 126h48M108 146h35" stroke="#64748b" stroke-width="7" stroke-linecap="round"/>
    ${symbol}
  </g>
  <circle cx="184" cy="72" r="16" fill="${colors.sparkColor}" opacity="0.18"/>
  <circle cx="185" cy="72" r="6" fill="${colors.sparkColor}"/>
</svg>
`;
}

export async function upsertAppMdPresentationIcon({ appDir, iconPath }) {
  const manifestPath = join(resolve(appDir), "APP.md");
  const current = await readFile(manifestPath, "utf8");
  const next = upsertFrontmatterPresentationIcon(current, iconPath);
  const updated = next !== current;
  if (updated) {
    await writeFile(manifestPath, next, "utf8");
  }
  return { manifestPath, updated };
}

export function upsertFrontmatterPresentationIcon(markdown, iconPath) {
  const source = String(markdown || "");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    throw new Error("APP.md 缺少 YAML frontmatter，无法写入 presentation.icon");
  }
  const frontmatter = match[1];
  const lines = frontmatter.split(/\r?\n/);
  const nextLines = upsertNestedScalar(lines, {
    parentKey: "presentation",
    childKey: "icon",
    value: iconPath,
  });
  return source.replace(match[0], `---\n${nextLines.join("\n")}\n---`);
}

function upsertNestedScalar(lines, { parentKey, childKey, value }) {
  const parentIndex = lines.findIndex((line) => new RegExp(`^${escapeRegExp(parentKey)}:\\s*$`).test(line));
  if (parentIndex === -1) {
    return [...trimTrailingEmpty(lines), `${parentKey}:`, `  ${childKey}: ${quoteYamlString(value)}`];
  }

  const next = [...lines];
  const childPattern = new RegExp(`^\\s{2}${escapeRegExp(childKey)}:\\s*`);
  let insertIndex = parentIndex + 1;
  while (insertIndex < next.length && /^\s+/.test(next[insertIndex])) {
    if (childPattern.test(next[insertIndex])) {
      next[insertIndex] = `  ${childKey}: ${quoteYamlString(value)}`;
      return next;
    }
    insertIndex += 1;
  }
  next.splice(insertIndex, 0, `  ${childKey}: ${quoteYamlString(value)}`);
  return next;
}

function buildSemanticSymbol(kind) {
  if (kind === "video") {
    return `
    <rect x="82" y="78" width="82" height="52" rx="14" fill="#ffffff" stroke="#94a3b8" stroke-width="5"/>
    <path d="M116 94l28 16-28 16V94z" fill="#0f766e"/>
    <path d="M166 104h22M166 121h16M142 166v-27M128 152l14 14 14-14" stroke="#0f766e" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (kind === "publisher") {
    return `
    <path d="M96 136h64c8 0 14 6 14 14v22c0 8-6 14-14 14H96c-8 0-14-6-14-14v-22c0-8 6-14 14-14z" fill="#ffffff" stroke="#94a3b8" stroke-width="5"/>
    <path d="M128 141V82M105 104l23-23 23 23" stroke="#0f766e" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M164 78c10 6 17 16 18 29M92 108c1-13 8-24 19-30" stroke="#f59e0b" stroke-width="6" stroke-linecap="round"/>`;
  }
  if (kind === "image") {
    return `
    <rect x="78" y="84" width="92" height="72" rx="16" fill="#ffffff" stroke="#94a3b8" stroke-width="5"/>
    <path d="M91 139l22-23 17 17 13-12 17 18v12H91v-12z" fill="#0f766e" opacity="0.72"/>
    <circle cx="145" cy="106" r="8" fill="#38bdf8"/>
    <path d="M161 161l25-25M176 136l10 10" stroke="#f59e0b" stroke-width="9" stroke-linecap="round"/>`;
  }
  if (kind === "data") {
    return `
    <path d="M88 100h78M88 123h78M88 146h78M110 88v70M144 88v70" stroke="#94a3b8" stroke-width="5" stroke-linecap="round"/>
    <path d="M96 155c16-28 31-34 45-18 12 13 21 9 34-20" stroke="#0f766e" stroke-width="8" stroke-linecap="round" fill="none"/>
    <circle cx="177" cy="116" r="8" fill="#f59e0b"/>`;
  }
  return `
    <path d="M82 176c31-10 52-28 64-55" stroke="#0f766e" stroke-width="10" stroke-linecap="round" fill="none"/>
    <path d="M142 87l31 31-17 17-31-31 17-17z" fill="#f59e0b"/>
    <path d="M134 95l31 31" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
    <path d="M80 166c21 4 39 0 54-12" stroke="#38bdf8" stroke-width="7" stroke-linecap="round" fill="none"/>`;
}

function findImageCandidate(value, seen = new Set()) {
  if (!value || typeof value !== "object") return null;
  if (seen.has(value)) return null;
  seen.add(value);

  const record = value;
  const dataUrl = firstString(record.dataUrl, record.data_url, record.url, record.src);
  if (dataUrl && /^data:image\/(?:png|svg\+xml|webp|jpeg|jpg);base64,/i.test(dataUrl)) {
    return { dataUrl };
  }

  const base64 = firstString(record.base64, record.b64_json, record.imageBase64, record.image_base64);
  if (base64 && /^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    return {
      base64,
      extension: firstString(record.extension, extensionFromMime(record.mimeType), extensionFromMime(record.mime_type), "png"),
    };
  }

  const path = firstString(
    record.absolute_artifact_path,
    record.absoluteArtifactPath,
    record.absolute_path,
    record.absolutePath,
    record.output_path,
    record.outputPath,
    record.artifact_path,
    record.artifactPath,
    record.file_path,
    record.filePath,
    record.image_path,
    record.imagePath,
    record.local_path,
    record.localPath,
    record.output_file,
    record.outputFile,
    record.file,
    record.path,
  );
  if (path && isSupportedLocalImagePath(path)) {
    return { path };
  }
  if (path && isSupportedLocalJsonPath(path)) {
    return { jsonPath: path };
  }

  for (const key of [
    "image",
    "asset",
    "result",
    "output",
    "artifact",
    "metadata",
    "payload",
    "task",
    "snapshot",
    "runtimeEvent",
    "value",
  ]) {
    const nested = record[key];
    if (nested && typeof nested === "object") {
      const candidate = findImageCandidate(nested, seen);
      if (candidate) return candidate;
    }
  }

  for (const key of [
    "images",
    "assets",
    "artifacts",
    "outputs",
    "files",
    "events",
    "taskEvents",
    "blocks",
    "items",
  ]) {
    const list = Array.isArray(record[key]) ? record[key] : [];
    for (const item of list) {
      const candidate = findImageCandidate(item, seen);
      if (candidate) return candidate;
    }
  }

  return null;
}

function bufferFromDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:image\/(?:png|svg\+xml|webp|jpeg|jpg);base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) {
    throw new Error("图片 data URL 格式无效");
  }
  return Buffer.from(match[1], "base64");
}

function extensionFromDataUrl(dataUrl) {
  const mime = String(dataUrl).match(/^data:image\/([^;]+);base64,/i)?.[1];
  return extensionFromMime(mime) || "png";
}

function extensionFromMime(mime) {
  const normalized = String(mime || "").toLowerCase();
  if (normalized.includes("svg")) return "svg";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return "jpg";
  if (normalized.includes("png")) return "png";
  return "";
}

function inferLogoSemantic(source) {
  if (/video|download|media|link|cookie|视频|下载|链接/.test(source)) {
    return {
      kind: "video",
      metaphor: "播放卡片、下载队列和向下箭头",
      accent: "队列线或链接解析动作",
      defaultDescription: "视频下载、链接解析和下载队列管理",
      primaryColor: "#0f766e",
      secondaryColor: "#2563eb",
      sparkColor: "#38bdf8",
      surfaceTint: "#eff6ff",
      borderColor: "#bfdbfe",
    };
  }
  if (/publish|deploy|release|studio|developer|cli|发布|开发/.test(source)) {
    return {
      kind: "publisher",
      metaphor: "发布托盘、上传箭头和轻量上线轨迹",
      accent: "小火箭感的上行动作",
      defaultDescription: "开发者发布工作台和打包入口",
      primaryColor: "#0f766e",
      secondaryColor: "#14532d",
      sparkColor: "#f59e0b",
      surfaceTint: "#ecfdf5",
      borderColor: "#bbf7d0",
    };
  }
  if (/remove|background|image|photo|eraser|抠图|背景|图片|图像/.test(source)) {
    return {
      kind: "image",
      metaphor: "图片画框、透明棋盘格和橡皮擦动作",
      accent: "边缘擦除轨迹",
      defaultDescription: "图片抠图、修边和背景替换",
      primaryColor: "#0f766e",
      secondaryColor: "#0284c7",
      sparkColor: "#f59e0b",
      surfaceTint: "#f0fdfa",
      borderColor: "#bae6fd",
    };
  }
  if (/content|article|post|copy|script|slides|ppt|创作|内容|文案|脚本|文章|演示/.test(source)) {
    return {
      kind: "content",
      metaphor: "分层文档、写作流水线和笔尖生成轨迹",
      accent: "生成火花或正在写入的笔尖",
      defaultDescription: "内容生产、脚本工厂和资料整理",
      primaryColor: "#0f766e",
      secondaryColor: "#475569",
      sparkColor: "#f59e0b",
      surfaceTint: "#ecfdf5",
      borderColor: "#bbf7d0",
    };
  }
  if (/data|sheet|report|analysis|analytics|数据|报表|分析/.test(source)) {
    return {
      kind: "data",
      metaphor: "表格、折线和报告页",
      accent: "洞察高亮点",
      defaultDescription: "数据分析、报表和洞察整理",
      primaryColor: "#0f766e",
      secondaryColor: "#334155",
      sparkColor: "#f59e0b",
      surfaceTint: "#f8fafc",
      borderColor: "#cbd5e1",
    };
  }
  return {
    kind: "content",
    metaphor: "分层文档、写作流水线和笔尖生成轨迹",
    accent: "生成火花或正在写入的笔尖",
    defaultDescription: "内容生产、脚本工厂和资料整理",
    primaryColor: "#0f766e",
    secondaryColor: "#475569",
    sparkColor: "#f59e0b",
    surfaceTint: "#ecfdf5",
    borderColor: "#bbf7d0",
  };
}

function resolveAssetPath(appDir, iconPath) {
  const normalized = normalizeIconPath(iconPath);
  const withoutDot = normalized.replace(/^\.\//, "");
  return join(resolve(appDir), withoutDot);
}

function normalizeIconPath(value) {
  const text = normalizeRequiredText(value, "缺少 iconPath");
  const normalized = text.replace(/\\/g, "/");
  if (/^(?:https?:|data:|blob:|asset:|tauri:)/i.test(normalized)) {
    throw new Error("iconPath 必须是可打包的本地相对路径");
  }
  if (normalized.startsWith("/") || normalized.includes("../")) {
    throw new Error("iconPath 必须位于应用目录内");
  }
  return normalized.startsWith("./") ? normalized : `./${normalized}`;
}

function assertSupportedImagePath(path) {
  const extension = path.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || "";
  if (!supportedImageExtensions.has(extension)) {
    throw new Error("Logo 资产仅支持 svg、png、webp、jpg 或 jpeg");
  }
}

function isSupportedLocalImagePath(path) {
  if (/^(?:https?:|data:|blob:|asset:|tauri:)/i.test(String(path || ""))) {
    return false;
  }
  const extension = String(path || "").toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || "";
  return supportedImageExtensions.has(extension);
}

function isSupportedLocalJsonPath(path) {
  if (/^(?:https?:|data:|blob:|asset:|tauri:)/i.test(String(path || ""))) {
    return false;
  }
  return String(path || "").toLowerCase().endsWith(".json");
}

function resolveHostAssetPath(path, baseDir) {
  const text = normalizeRequiredText(path, "缺少宿主图片资产路径");
  if (isAbsolute(text)) {
    return text;
  }
  return resolve(baseDir || ".", text);
}

function toDataUrl(content, path) {
  const mime = mimeForImagePath(path);
  return `data:${mime};base64,${Buffer.from(content).toString("base64")}`;
}

function mimeForImagePath(path) {
  const extension = String(path || "").toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || "";
  return {
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
  }[extension] || "image/png";
}

function defaultIconPathFromSourcePath(path) {
  const extension = extname(String(path || "")).toLowerCase();
  return `./assets/app-icon${supportedImageExtensions.has(extension) ? extension : ".png"}`;
}

function normalizeRequiredText(value, message) {
  const text = String(value || "").trim();
  if (!text) {
    throw new Error(message);
  }
  return text;
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function trimTrailingEmpty(lines) {
  const next = [...lines];
  while (next.length > 0 && !next.at(-1).trim()) {
    next.pop();
  }
  return next;
}

function quoteYamlString(value) {
  return JSON.stringify(String(value));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
