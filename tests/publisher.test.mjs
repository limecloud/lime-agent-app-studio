import test from "node:test";
import assert from "node:assert/strict";
import {
  buildConflictResolutionVersion,
  isReleaseAlreadyExistsError,
} from "../src/core/publisher.mjs";

test("重复 release 冲突会生成可追踪的开发构建版本", () => {
  assert.equal(
    buildConflictResolutionVersion("0.1.7", new Date("2026-05-18T17:01:23.456Z")),
    "0.1.7+studio.20260518170123456",
  );
  assert.equal(
    buildConflictResolutionVersion("0.1.7+old", new Date("2026-05-18T17:01:23.456Z")),
    "0.1.7+studio.20260518170123456",
  );
});

test("识别 LimeCore release 已存在错误", () => {
  const badRequest = new Error("400 agent app release already exists");
  badRequest.status = 400;
  assert.equal(isReleaseAlreadyExistsError(badRequest), true);

  const conflict = new Error("409 agent app release already exists");
  conflict.status = 409;
  assert.equal(isReleaseAlreadyExistsError(conflict), true);

  const unrelated = new Error("400 validation failed");
  unrelated.status = 400;
  assert.equal(isReleaseAlreadyExistsError(unrelated), false);
});
