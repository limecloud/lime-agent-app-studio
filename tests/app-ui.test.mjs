import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appSource = await readFile(new URL("../app/app.js", import.meta.url), "utf8");
const htmlSource = await readFile(new URL("../app/index.html", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../app/styles.css", import.meta.url), "utf8");
const capabilitiesSource = await readFile(new URL("../app.capabilities.yaml", import.meta.url), "utf8");

test("嵌入 Lime 时目录选择失败不再回退到本地 HTTP 选择器", () => {
  assert.match(
    appSource,
    /if \(isEmbeddedRuntime\(\)\) \{\s*return await selectDirectoryFromHostBridge\(\);\s*\}/s,
  );
  assert.doesNotMatch(
    appSource,
    /catch \(error\) \{\s*return post\("\/api\/select-directory", \{\}\);?\s*\}/s,
  );
});

test("目录选择不可用时自动展开手动目录输入", () => {
  assert.match(appSource, /function openManualDirectoryFallback\(\)/);
  assert.match(appSource, /advancedPanel\.open = true/);
  assert.match(appSource, /appDirInput\.focus\(\)/);
  assert.match(appSource, /已切换到手动目录模式/);
});

test("嵌入 Lime 时点击选择目录直接调用目录选择能力", () => {
  const bridgePicker = appSource.match(/async function selectDirectoryFromHostBridge\(\) \{([\s\S]*?)\n\}/);
  assert.ok(bridgePicker, "应保留 Host Bridge 目录选择入口");
  assert.doesNotMatch(bridgePicker[1], /getSnapshot/);
  assert.match(bridgePicker[1], /createLimeHostBridgeCapabilityInvoker/);
  assert.match(bridgePicker[1], /selectDirectoryHost/);
});

test("Studio 通过 npm SDK 名称加载 @lime/app-sdk，并允许本地开发 fallback", () => {
  assert.match(appSource, /const limeAppSdkImport = "@lime\/app-sdk"/);
  assert.match(appSource, /import\(limeAppSdkImport\)\.catch\(\(\) => null\)/);
  assert.match(appSource, /function selectDirectoryFromLegacyHostBridge\(\)/);
  assert.match(appSource, /invokeLegacyHostBridgeCapability/);
});

test("独立 Tauri Shell 优先调用 Lime 宿主目录选择命令", () => {
  assert.match(appSource, /function getTauriCore\(\)/);
  assert.match(appSource, /async function selectDirectoryFromTauriHost\(tauriCore\)/);
  assert.match(appSource, /agent_app_select_directory/);
  assert.match(appSource, /旧宿主未提供 agent_app_select_directory/);
});

test("Host 返回浏览器 mock 目录时不写入当前目录", () => {
  assert.match(appSource, /function isMockDirectoryPath\(value\)/);
  assert.match(appSource, /Host returned a browser mock directory path/);
  assert.ok(appSource.includes("return /^[/\\\\]mock[/\\\\]path[/\\\\]to[/\\\\]/.test"));
});

test("一键发布不依赖 iframe sandbox 会拦截的浏览器 confirm", () => {
  const publishFunction = appSource.match(/async function publish\(\) \{([\s\S]*?)\n\}/);
  assert.ok(publishFunction, "应保留一键发布处理函数");
  assert.doesNotMatch(publishFunction[1], /\bconfirm\(/);
  assert.match(publishFunction[1], /setBusy\("发布中/);
  assert.match(publishFunction[1], /post\("\/api\/publish", \{ \.\.\.\(await resolvePublishValues\(\)\), publish: true \}\)/);
});

test("可视化发布页保持极简主路径，技术信息默认收进折叠区", () => {
  assert.match(htmlSource, /<title>发布应用<\/title>/);
  assert.match(htmlSource, /<p class="eyebrow">开发者工具<\/p>/);
  assert.match(htmlSource, /<h1 id="pageTitle">发布应用<\/h1>/);
  assert.match(htmlSource, /id="dirText"/);
  assert.match(htmlSource, /id="publishBtn"[^>]*>发布到云端<\/button>/);
  assert.match(htmlSource, /<summary>手动设置<\/summary>/);
  assert.match(htmlSource, /<span>诊断详情<\/span>/);
  assert.match(htmlSource, /id="resultBanner"[^>]*hidden/);
  assert.doesNotMatch(htmlSource, /stageSelect|stageGenerate|stageUpload/);
  assert.doesNotMatch(htmlSource, /自动生成<\/p>|生成结果|运行明细|一键上传|先预演|高级设置 \/ 认证与技术参数/);
  assert.doesNotMatch(appSource, /dryRunBtn|addEventListener\("click", dryRun\)|#autoIconState|#autoType|updateStages/);
});

test("Logo 工坊通过 Lime 宿主生成并写回可打包资产", () => {
  assert.match(htmlSource, /id="logoBriefBtn"[^>]*>生成提示词<\/button>/);
  assert.match(htmlSource, /id="logoGenerateBtn"[^>]*>请求宿主生成<\/button>/);
  assert.match(appSource, /async function generateLogoWithHost\(\)/);
  assert.match(appSource, /capability:\s*"lime\.agent"/);
  assert.match(appSource, /method:\s*"startTask"/);
  assert.match(appSource, /taskKind:\s*"agent_app\.logo_generate"/);
  assert.match(appSource, /requiredCapabilities:\s*\["lime\.capability\.image\.generate"\]/);
  assert.match(appSource, /capability:\s*"lime\.ui"[\s\S]*method:\s*"openAgentRun"/);
  assert.match(appSource, /\/api\/logo\/install-host-result/);
  assert.match(capabilitiesSource, /lime\.agent:\s*[\s\S]*通过宿主 Agent 任务生成应用中心 Logo/);
  assert.match(capabilitiesSource, /lime\.storage:\s*[\s\S]*Host Bridge SDK 在宿主内需要应用级临时状态上下文/);
  assert.match(appSource, /logoBriefBtn\.addEventListener\("click", showLogoBrief\)/);
  assert.match(appSource, /logoGenerateBtn\.addEventListener\("click", generateLogoWithHost\)/);
  assert.doesNotMatch(appSource, /generateLogoWithHost[\s\S]*\/api\/logo\/generate/);
  assert.doesNotMatch(capabilitiesSource, /后续版本用于生成/);
});

test("Logo 工坊独立浏览器不伪造宿主生成结果", () => {
  assert.match(appSource, /Logo 生成需要在 Lime 宿主内运行 Studio/);
  assert.match(appSource, /当前独立浏览器没有 Host Bridge/);
  assert.match(appSource, /waitForHostLogoResult/);
  assert.match(appSource, /subscribeCapability/);
});

test("发布页跟随宿主主题，并提供本地主题切换", () => {
  assert.match(capabilitiesSource, /features:\s*[\s\S]*-\s+theme/);
  assert.match(htmlSource, /class="theme-switcher"/);
  assert.match(htmlSource, /data-theme-option="system"[\s\S]*data-theme-option="light"[\s\S]*data-theme-option="dark"/);
  assert.match(appSource, /const themeStorageKey = "lime-agent-app-studio:theme-mode"/);
  assert.match(appSource, /function startHostThemeSync\(sdk\)/);
  assert.match(appSource, /sdk\.syncLimeHostTheme\(invoker\)/);
  assert.match(appSource, /dataset\.limeThemeEffective/);
  assert.match(appSource, /window\.matchMedia\?\.\("\(prefers-color-scheme: dark\)"\)/);
  assert.doesNotMatch(appSource, /function applyHostThemeFromSnapshot|root\.style\.setProperty\(name, value\)|theme\.tokens/);
  assert.match(cssSource, /--bg: var\(--app-bg, var\(--lime-chrome-surface/);
  assert.match(cssSource, /--primary: var\(--app-primary, var\(--lime-sidebar-active-text/);
  assert.match(cssSource, /:root\[data-lime-theme-effective="dark"\]/);
  assert.doesNotMatch(cssSource, /--page:|--ink:|radial-gradient/);
});

test("Studio 通过 lime.cloudSession 即时获取宿主 token，且不再依赖本机配置 token", () => {
  assert.match(appSource, /function normalizeHostCloud\(value\)/);
  assert.match(appSource, /hasSession: Boolean\(cloud\.hasSession\)/);
  assert.match(appSource, /function resolveHostCloudSessionValues\(options = \{\}\)/);
  assert.match(appSource, /function buildHostCloudSessionRequest\(\{ capability, method, input \}\)/);
  assert.match(appSource, /capability:\s*"lime\.cloudSession"/);
  assert.match(appSource, /method:\s*"getAccessToken"/);
  assert.match(appSource, /method:\s*"requestLogin"/);
  assert.match(appSource, /function requestHostCloudLogin\(invoker, input = \{\}\)/);
  assert.match(appSource, /requestHostCloudLogin\(invoker, \{ force: true \}\)/);
  assert.match(appSource, /forceLogin/);
  assert.match(appSource, /isHostCloudAuthRefreshableError/);
  assert.match(appSource, /requestTimeoutMs:\s*5 \* 60 \* 1000/);
  assert.match(appSource, /function resolvePublishValues\(options = \{\}\)/);
  assert.doesNotMatch(appSource, /\bbuildLimeCapabilityInvokeRequest\b/);
  assert.doesNotMatch(appSource, /config\.token/);

  const authValues = appSource.match(/function hostCloudAuthValues\(\) \{([\s\S]*?)\n\}/);
  assert.ok(authValues, "应保留 Host 用户态默认值转换");
  assert.match(authValues[1], /tenantId: cloud\.tenantId/);
  assert.doesNotMatch(authValues[1], /token:/);
});
