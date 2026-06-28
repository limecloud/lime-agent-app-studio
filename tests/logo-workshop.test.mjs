import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  attachLogoAsset,
  buildLogoBrief,
  extractHostGeneratedImage,
  installHostGeneratedLogo,
  upsertFrontmatterPresentationIcon,
} from "../src/core/logo-workshop.mjs";
import { collectPackageFiles } from "../src/core/packager.mjs";

const tinyPngDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIElEQVR42mP8z8DwnwEJMDIwMDAwYGRk+M8ABYwMDAwAw8AD9tHX3zYAAAAASUVORK5CYII=";

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "lime-agent-app-studio-logo-"));
  await writeFile(join(root, "package.json"), JSON.stringify({ name: "content-factory-app", version: "0.3.0" }));
  await writeFile(
    join(root, "APP.md"),
    [
      "---",
      "manifestVersion: 0.7.0",
      "name: content-factory-app",
      "displayName: 内容工厂",
      "version: 0.3.0",
      "appType: agent-app",
      "description: 用三层知识库驱动批量内容生产、脚本工厂、策略报告、PPT 交付和数据复盘。",
      "categories:",
      "  - content-tool",
      "---",
      "# 内容工厂",
      "",
    ].join("\n"),
  );
  await mkdir(join(root, "dist", "ui"), { recursive: true });
  await writeFile(join(root, "dist", "ui", "index.html"), "ok");
  return root;
}

test("buildLogoBrief 按应用语义生成宿主图片任务提示词", async () => {
  const root = await createFixture();
  const brief = await buildLogoBrief({ appDir: root });
  assert.equal(brief.displayName, "内容工厂");
  assert.equal(brief.iconPath, "./assets/app-icon.svg");
  assert.match(brief.prompt, /分层文档、写作流水线和笔尖生成轨迹/);
  assert.match(brief.prompt, /不要任何文字/);
});

test("installHostGeneratedLogo 写入宿主图片结果并声明 presentation.icon", async () => {
  const root = await createFixture();
  const result = await installHostGeneratedLogo({
    appDir: root,
    hostResult: {
      taskId: "task-logo",
      status: "succeeded",
      result: {
        images: [{ dataUrl: tinyPngDataUrl }],
      },
    },
    iconPath: "./assets/app-icon.png",
  });

  assert.equal(result.iconPath, "./assets/app-icon.png");
  assert.equal(result.sourceKind, "data-url");
  assert.match(result.previewDataUrl, /^data:image\/png;base64,/);

  const icon = await readFile(join(root, "assets", "app-icon.png"));
  assert.ok(icon.length > 0);

  const appMd = await readFile(join(root, "APP.md"), "utf8");
  assert.match(appMd, /presentation:\n  icon: "\.\/assets\/app-icon\.png"/);

  const files = await collectPackageFiles(root);
  assert.ok(files.includes("assets/app-icon.png"));
});

test("attachLogoAsset 默认按源文件扩展名写入可打包图标", async () => {
  const root = await createFixture();
  const source = join(root, "source-logo.png");
  await writeFile(source, Buffer.from(tinyPngDataUrl.split(",")[1], "base64"));

  const result = await attachLogoAsset({
    appDir: root,
    source,
  });

  assert.equal(result.iconPath, "./assets/app-icon.png");
  const icon = await readFile(join(root, "assets", "app-icon.png"));
  assert.ok(icon.length > 0);

  const appMd = await readFile(join(root, "APP.md"), "utf8");
  assert.match(appMd, /presentation:\n  icon: "\.\/assets\/app-icon\.png"/);
});

test("extractHostGeneratedImage 可递归读取宿主 artifact json", async () => {
  const root = await createFixture();
  const artifactPath = join(root, ".lime", "tasks", "image_generate", "task-logo.json");
  await mkdir(join(root, ".lime", "tasks", "image_generate"), { recursive: true });
  await writeFile(artifactPath, JSON.stringify({ images: [{ dataUrl: tinyPngDataUrl }] }));

  const image = await extractHostGeneratedImage({
    result: {
      absolute_artifact_path: artifactPath,
    },
  });

  assert.equal(image.sourceKind, "data-url");
  assert.ok(image.content.length > 0);
});

test("extractHostGeneratedImage 可读取宿主订阅事件里的图片 artifact 路径", async () => {
  const root = await createFixture();
  const artifactPath = join(root, ".lime", "tasks", "image_generate", "task-logo-event.json");
  await mkdir(join(root, ".lime", "tasks", "image_generate"), { recursive: true });
  await writeFile(artifactPath, JSON.stringify({ images: [{ dataUrl: tinyPngDataUrl }] }));

  const image = await extractHostGeneratedImage({
    taskId: "task-logo-event",
    events: [
      {
        eventType: "artifact:created",
        payload: {
          artifact: {
            metadata: {
              image: {
                absolute_artifact_path: artifactPath,
              },
            },
          },
        },
      },
    ],
  });

  assert.equal(image.sourceKind, "data-url");
  assert.ok(image.content.length > 0);
});

test("installHostGeneratedLogo 按 App 目录解析宿主相对 artifact 路径", async () => {
  const root = await createFixture();
  const artifactPath = join(root, ".lime", "tasks", "image_generate", "task-logo-relative.json");
  await mkdir(join(root, ".lime", "tasks", "image_generate"), { recursive: true });
  await writeFile(artifactPath, JSON.stringify({ images: [{ dataUrl: tinyPngDataUrl }] }));

  const result = await installHostGeneratedLogo({
    appDir: root,
    hostResult: {
      taskId: "task-logo-relative",
      status: "completed",
      result: {
        artifacts: [
          {
            path: ".lime/tasks/image_generate/task-logo-relative.json",
            title: "应用 Logo",
          },
        ],
      },
    },
  });

  assert.equal(result.iconPath, "./assets/app-icon.png");
  assert.equal(result.sourceKind, "data-url");
  const icon = await readFile(join(root, "assets", "app-icon.png"));
  assert.ok(icon.length > 0);
});

test("upsertFrontmatterPresentationIcon 更新已有 presentation.icon", () => {
  const next = upsertFrontmatterPresentationIcon(
    [
      "---",
      "name: sample",
      "presentation:",
      "  icon: \"./assets/old.png\"",
      "---",
      "# Sample",
      "",
    ].join("\n"),
    "./assets/app-icon.png",
  );
  assert.match(next, /presentation:\n  icon: "\.\/assets\/app-icon\.png"/);
  assert.doesNotMatch(next, /old\.png/);
});
