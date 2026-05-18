# Lime Agent App Studio

Lime Agent App Studio 提供 Agent App 的可视化发布工作台和 npm CLI。首版聚焦本地项目诊断、打包、dry-run、上传安装包和创建 LimeCore release。

```bash
npm install -g @limecloud/agent-app-studio
lime-agent-app-studio auth status --tenant-id tenant-0001
lime-agent-app-studio project inspect --app-dir ./content-factory-app
lime-agent-app-studio publish --app-dir ./content-factory-app --app-id content-factory-app --tenant-id tenant-0001 --channel beta --dry-run
```

可视化工作台：

```bash
lime-agent-app-studio studio --port 4177
```

环境变量：

- `LIMECORE_API_BASE_URL`：LimeCore API base，默认 `https://api.limecloud.run/api`
- `LIME_AGENT_APP_STUDIO_TOKEN`：开发者登录 token，CI/CD 推荐使用
