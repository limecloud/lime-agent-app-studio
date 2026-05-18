import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appSource = await readFile(new URL("../app/app.js", import.meta.url), "utf8");

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

test("一键上传不依赖 iframe sandbox 会拦截的浏览器 confirm", () => {
  const publishFunction = appSource.match(/async function publish\(\) \{([\s\S]*?)\n\}/);
  assert.ok(publishFunction, "应保留一键上传处理函数");
  assert.doesNotMatch(publishFunction[1], /\bconfirm\(/);
  assert.match(publishFunction[1], /setBusy\("上传中"\)/);
  assert.match(publishFunction[1], /post\("\/api\/publish", \{ \.\.\.values\(\), publish: true \}\)/);
});
