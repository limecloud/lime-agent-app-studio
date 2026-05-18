---
manifestVersion: 0.7.0
name: lime-agent-app-studio
displayName: Lime Agent App Studio
version: 0.1.1
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

# Lime Agent App Studio

Lime Agent App Studio 是开发者工具入口。已认证开发者可以在 Lime 应用中心安装它，并通过可视化工作台或 npm CLI 将 Agent App 打包、Dry-run 和发布到 LimeCore 云端。

## CLI

```bash
npm install -g @limecloud/agent-app-studio
lime-agent-app-studio auth status --tenant-id tenant-0001
lime-agent-app-studio publish --app-dir ./my-agent-app --channel beta --dry-run
```
