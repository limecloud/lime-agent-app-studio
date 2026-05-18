// input: CLI argv
// output: 稳定的命令名、选项与位置参数

export function parseArgs(argv) {
  const tokens = [...argv];
  const command = [];
  const options = {};
  const positionals = [];

  while (tokens.length > 0) {
    const token = tokens.shift();
    if (!token.startsWith("-")) {
      if (command.length < 2) {
        command.push(token);
      } else {
        positionals.push(token);
      }
      continue;
    }

    const [rawKey, inlineValue] = token.replace(/^--?/, "").split("=", 2);
    const key = toCamelCase(rawKey);
    if (inlineValue !== undefined) {
      options[key] = inlineValue;
      continue;
    }
    const next = tokens[0];
    if (!next || next.startsWith("-")) {
      options[key] = true;
      continue;
    }
    options[key] = tokens.shift();
  }

  return { command: command.join(" "), options, positionals };
}

function toCamelCase(value) {
  return String(value || "").replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}
