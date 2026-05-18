import test from "node:test";
import assert from "node:assert/strict";
import { resolveApiBase } from "../src/core/config.mjs";

test("resolveApiBase 默认指向 LimeCore 生产 API", () => {
  const previous = process.env.LIMECORE_API_BASE_URL;
  delete process.env.LIMECORE_API_BASE_URL;
  try {
    assert.equal(resolveApiBase(), "https://lime-api.limeai.run/api");
  } finally {
    if (previous === undefined) delete process.env.LIMECORE_API_BASE_URL;
    else process.env.LIMECORE_API_BASE_URL = previous;
  }
});

test("resolveApiBase 会裁剪尾部斜杠", () => {
  assert.equal(resolveApiBase({ apiBase: "https://example.test/api///" }), "https://example.test/api");
});
