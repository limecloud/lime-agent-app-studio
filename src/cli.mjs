// input: lime-agent-app-studio 命令
// output: auth、inspect、package、publish 与可视化工作台

import { parseArgs } from "./core/args.mjs";
import { resolveAuthContext, saveStudioConfig } from "./core/config.mjs";
import { getDeveloperProfile } from "./core/api.mjs";
import { inspectProject } from "./core/project.mjs";
import { packageProject } from "./core/packager.mjs";
import { publishProject } from "./core/publisher.mjs";
import { startStudioServer } from "./server.mjs";

export async function runCli(argv) {
  const { command, options } = parseArgs(argv);
  switch (command) {
    case "auth login":
      return authLogin(options);
    case "auth status":
      return authStatus(options);
    case "project inspect":
      return printJson(await inspectProject(options.appDir || "."));
    case "package":
      return printJson(
        await packageProject({
          appDir: options.appDir || ".",
          outDir: options.outDir,
          includeNodeModules: Boolean(options.includeNodeModules),
        })
      );
    case "publish": {
      const auth = await resolveAuthContext(options);
      return printJson(
        await publishProject({
          ...options,
          ...auth,
          dryRun: Boolean(options.dryRun) || !options.publish,
          publish: Boolean(options.publish),
        })
      );
    }
    case "studio": {
      const { url } = await startStudioServer(options);
      console.log(`Lime Agent App Studio 已启动：${url}`);
      console.log("按 Ctrl+C 停止。");
      return new Promise(() => {});
    }
    case "":
    case "help":
    default:
      return printHelp();
  }
}

async function authLogin(options) {
  const auth = await resolveAuthContext(options);
  if (!auth.token) {
    throw new Error("请通过 --token 传入开发者 token；该 token 仅用于校验，不会落盘。");
  }
  await getDeveloperProfile(auth);
  const config = await saveStudioConfig({
    tenantId: auth.tenantId,
    apiBase: auth.apiBase,
  });
  console.log(
    `已验证并保存 Studio 登录配置：tenantId=${config.tenantId || "未设置"}（token 不落盘）`,
  );
}

async function authStatus(options) {
  const auth = await resolveAuthContext(options);
  const hasEnvToken = Boolean(process.env.LIME_AGENT_APP_STUDIO_TOKEN);
  if (!auth.token || !auth.tenantId) {
    return printJson({
      authenticated: false,
      tenantId: auth.tenantId,
      apiBase: auth.apiBase,
      hasLocalToken: hasEnvToken,
      hasEnvToken,
      message: "缺少可用 token 或 tenantId，无法查询云端开发者认证状态。",
    });
  }
  const profile = await getDeveloperProfile(auth);
  return printJson({ authenticated: true, apiBase: auth.apiBase, tenantId: auth.tenantId, profile });
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Lime Agent App Studio

Usage:
  lime-agent-app-studio auth login --tenant-id <id> --token <token> [--api-base <url>]  # token 仅用于校验
  lime-agent-app-studio auth status --tenant-id <id>
  lime-agent-app-studio project inspect --app-dir <path>
  lime-agent-app-studio package --app-dir <path> [--out-dir <path>] [--include-node-modules]
  lime-agent-app-studio publish --app-dir <path> --app-id <id> --tenant-id <id> --channel beta --dry-run
  lime-agent-app-studio publish --app-dir <path> --app-id <id> --tenant-id <id> --channel stable --publish
  lime-agent-app-studio studio --port 4177
`);
}

function isMainModule() {
  return process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href;
}

if (isMainModule()) {
  runCli(process.argv.slice(2)).catch((error) => {
    console.error(error?.message || String(error));
    process.exitCode = 1;
  });
}
