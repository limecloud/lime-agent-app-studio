import test from "node:test";
import assert from "node:assert/strict";
import {
  createReleaseWithDevelopmentVersionRetry,
  isReleaseAlreadyExistsError,
} from "../src/core/publisher.mjs";

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

test("重复 release 冲突要求先更新包内 manifest version", async () => {
  const apiError = new Error("409 agent app release already exists");
  apiError.status = 409;

  await assert.rejects(
    createReleaseWithDevelopmentVersionRetry({
      options: {
        createDeveloperAgentAppRelease: async () => {
          throw apiError;
        },
      },
      appId: "removebg",
      payload: {
        version: "0.1.5",
      },
    }),
    /请先更新 APP\.md 或 app\.manifest\.json 中的 version/,
  );
});
