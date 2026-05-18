// input: 本机平台能力
// output: 可选的本机目录选择器结果

import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

export function buildDirectoryPickerCommand(platform = process.platform) {
  if (platform === "darwin") {
    return {
      command: "osascript",
      args: [
        "-e",
        'POSIX path of (choose folder with prompt "选择 Agent App 目录")',
      ],
    };
  }

  if (platform === "win32") {
    return {
      command: "powershell.exe",
      args: [
        "-NoProfile",
        "-Command",
        [
          "Add-Type -AssemblyName System.Windows.Forms;",
          "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog;",
          "$dialog.Description = '选择 Agent App 目录';",
          "if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $dialog.SelectedPath }",
        ].join(" "),
      ],
    };
  }

  return {
    command: "zenity",
    args: ["--file-selection", "--directory", "--title=选择 Agent App 目录"],
  };
}

export async function selectDirectory(options = {}) {
  const commandSpec = buildDirectoryPickerCommand(options.platform);
  const runner = options.execFile ?? execFile;
  try {
    const { stdout } = await runner(commandSpec.command, commandSpec.args, {
      windowsHide: true,
    });
    const path = String(stdout || "").trim();
    return path ? { path } : { cancelled: true };
  } catch (error) {
    if (options.platform === "linux" || (!options.platform && process.platform === "linux")) {
      return selectLinuxDirectoryFallback(runner);
    }
    return {
      cancelled: true,
      message: error?.message || String(error),
    };
  }
}

async function selectLinuxDirectoryFallback(runner) {
  try {
    const { stdout } = await runner("kdialog", ["--getexistingdirectory"], {
      windowsHide: true,
    });
    const path = String(stdout || "").trim();
    return path ? { path } : { cancelled: true };
  } catch (error) {
    return {
      cancelled: true,
      message: error?.message || String(error),
    };
  }
}
