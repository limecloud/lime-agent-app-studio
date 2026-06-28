---
manifestVersion: 0.7.0
name: lime-agent-app-studio
displayName: 发布应用
version: 0.2.1
status: preview
appType: developer-tool
description: 面向已认证开发者的 Agent App 可视化发布工作台和 npm CLI 入口。
runtimeTargets:
  - local
requires:
  lime:
    appRuntime: ">=0.7.0 <1.0.0"
  sdk: "@lime/app-sdk@^0.7.0"
  capabilities:
    - lime.ui
    - lime.files
    - lime.agent
    - lime.evidence
    - lime.cloudSession
    - lime.storage
presentation:
  icon: ./assets/app-icon.svg
categories:
  - developer
  - developer_only
  - tools
publisher:
  publisherId: lime-cloud
  name: Lime Cloud
  displayName: Lime Cloud
  kind: platform
  verified: true
distribution:
  channel: developer-preview
  visibility: developer_only
  pricing: included
  billingModel: none
runtimePackage:
  ui:
    path: ./dist/ui
entries:
  - key: dashboard
    kind: page
    title: 发布工作台
    route: /dashboard
  - key: cli_quickstart
    kind: page
    title: CLI 快速开始
    route: /cli
quickstart:
  entry: dashboard
  setupSteps:
    - complete_developer_certification
    - install_npm_cli
    - run_publish_dry_run
support:
  url: ./docs/v1/README.md
license: Apache-2.0
---

# 发布应用

发布应用是 Lime 提供给已认证开发者的 Agent App 发布入口。开发者可以在 Lime 应用中心安装它，并通过可视化工作台或 npm CLI 将 Agent App 打包、Dry-run 和发布到 LimeCore 云端。

当 Studio 嵌入 Lime 时，发布认证会通过 `lime.cloudSession` 从宿主即时获取当前会话 token；CLI 或脱离宿主场景可以继续使用环境变量或命令行临时 token，但不会把 token 写入本机配置。

Logo 工坊通过 Lime 宿主的 `lime.agent` 任务生成应用中心图标；Studio 只负责将宿主返回的图片资产写入目标应用目录，并把 `presentation.icon` 写回 `APP.md`，确保生成结果随 `.lapp` 一起打包。

## CLI

```bash
npm install -g @limecloud/agent-app-studio
lime-agent-app-studio auth status --tenant-id tenant-0001
lime-agent-app-studio publish --app-dir ./my-agent-app --channel beta --dry-run
```
