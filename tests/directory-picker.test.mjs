import test from "node:test";
import assert from "node:assert/strict";
import { buildDirectoryPickerCommand, selectDirectory } from "../src/core/directory-picker.mjs";

test("buildDirectoryPickerCommand 为 macOS 生成系统目录选择命令", () => {
  const spec = buildDirectoryPickerCommand("darwin");
  assert.equal(spec.command, "osascript");
  assert.match(spec.args.join(" "), /choose folder/);
});

test("buildDirectoryPickerCommand 为 Windows 生成目录选择命令", () => {
  const spec = buildDirectoryPickerCommand("win32");
  assert.equal(spec.command, "powershell.exe");
  assert.match(spec.args.join(" "), /FolderBrowserDialog/);
});

test("selectDirectory 在 Linux 上从 zenity 回退到 kdialog", async () => {
  const calls = [];
  const result = await selectDirectory({
    platform: "linux",
    execFile: async (command) => {
      calls.push(command);
      if (command === "zenity") throw new Error("missing zenity");
      return { stdout: "/tmp/sample-app\n" };
    },
  });

  assert.deepEqual(calls, ["zenity", "kdialog"]);
  assert.deepEqual(result, { path: "/tmp/sample-app" });
});
