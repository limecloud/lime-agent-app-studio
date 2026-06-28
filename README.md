# Lime Agent App Studio

Lime Agent App Studio 提供 Agent App 的可视化发布工作台和 npm CLI。首版聚焦本地项目诊断、打包、dry-run、上传安装包和创建 LimeCore release。

```bash
npm install -g @limecloud/agent-app-studio
lime-agent-app-studio auth status --tenant-id tenant-0001
lime-agent-app-studio project inspect --app-dir ./content-factory-app
lime-agent-app-studio logo brief --app-dir ./content-factory-app
lime-agent-app-studio publish --app-dir ./content-factory-app --app-id content-factory-app --tenant-id tenant-0001 --channel beta --dry-run
```

可视化工作台：

```bash
lime-agent-app-studio studio --port 4177
```

SDK 引入：

- 正式发布包通过 npm 依赖 `@lime/app-sdk` 加载 Lime 宿主能力。
- 本地联调不强制等待 npm 发布；可设置 `LIME_APP_SDK_DIST=/path/to/sdk/dist`，或让 Studio 自动读取相邻 Lime 仓库的 `packages/agent-app-runtime/dist`。

Logo 工坊：

- 在 Lime 宿主内打开可视化工作台，选择应用目录后点击“请求宿主生成”，Studio 会通过 Host Bridge 调用 `lime.agent.startTask` 发起 Logo 图片任务。
- 宿主生成完成后，Studio 会把图片写入应用目录的 `assets/app-icon.png`，并在 `APP.md` frontmatter 写入 `presentation.icon`。
- `.lapp` 打包会自动包含 `assets/app-icon.png`；Lime 应用中心会优先读取 manifest / projection 中的图标声明。
- CLI 可用 `lime-agent-app-studio logo brief --app-dir <path>` 生成同一套图片提示词，或用 `logo attach --source <image>` 接入已有图片；本地 SVG 生成只作为脱离宿主时的开发降级，不是可视化工作台主路径。

环境变量：

- `LIMECORE_API_BASE_URL`：LimeCore API base，默认 `https://lime-api.limeai.run/api`
- `LIME_AGENT_APP_STUDIO_TOKEN`：开发者登录 token，CI/CD 推荐使用
- `LIME_APP_SDK_DIST`：本地开发时覆盖 `@lime/app-sdk` vendor dist 路径
