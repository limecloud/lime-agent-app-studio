// input: lime-agent-app-studio 命令
// output: auth、inspect、package、publish 与可视化工作台

import { parseArgs } from "./core/args.mjs";
import { loadStudioConfig, resolveAuthContext, saveStudioConfig } from "./core/config.mjs";
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
  if (!options.token) {
    throw new Error("请通过 --token 传入开发者 token；后续版本会接入浏览器 / 设备码登录。");
  }
  const config = await saveStudioConfig({
    token: options.token,
    tenantId: options.tenantId,
    apiBase: options.apiBase,
  });
  console.log(`已保存 Studio 登录配置：tenantId=${config.tenantId || "未设置"}`);
}

async function authStatus(options) {
  const auth = await resolveAuthContext(options);
  const config = await loadStudioConfig();
  if (!auth.token || !auth.tenantId) {
    return printJson({
      authenticated: false,
      tenantId: auth.tenantId,
      apiBase: auth.apiBase,
      hasLocalToken: Boolean(config.token),
      message: "缺少 token 或 tenantId，无法查询云端开发者认证状态。",
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
  lime-agent-app-studio auth login --tenant-id <id> --token <token> [--api-base <url>]
  lime-agent-app-studio auth status --tenant-id <id>
  lime-agent-app-studio project inspect --app-dir <path>
  lime-agent-app-studio package --app-dir <path> [--out-dir <path>] [--include-node-modules]
  lime-agent-app-studio publish --app-dir <path> --app-id <id> --tenant-id <id> --channel beta --dry-run
  lime-agent-app-studio publish --app-dir <path> --app-id <id> --tenant-id <id> --channel stable --publish
  lime-agent-app-studio studio --port 4177
`);
}
