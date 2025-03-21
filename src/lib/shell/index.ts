import os from "node:os";
import { PlatformOS, ShellExecInSessionArgs, ToolNames } from "@/types";
import fs from "fs";
import path from "path";
import shellExec from "shell-exec";
import { TOOL_CONFIG } from "@/const/setup";
import { warnMessage } from "@/lib/logs";
import { type ChildProcess, execSync, spawn } from "node:child_process";
import { logger } from "../logger";

export const VERSION_REGEX = /(?:[\w-]+\s+)?(\d+\.\d+\.?\d+?)/;

/**
 * Check if a given command name is installed and available on the system
 */
export async function installedToolVersion(name: ToolNames) {
  let command: string = "";

  if (Object.prototype.hasOwnProperty.call(TOOL_CONFIG, name)) {
    command = TOOL_CONFIG[name].version;
    // auto source the command's binary dir into the $PATH
    if (TOOL_CONFIG[name].pathSource) {
      command = `export PATH="${TOOL_CONFIG[name].pathSource}:$PATH" && ${command}`;
    }
  }

  if (!command) return false;

  const res = await checkCommand(command);

  if (res) return VERSION_REGEX.exec(res)[1] || res;
  return res;
}

/**
 * Attempt to run the given shell command, detecting if the command is available on the system
 */
export async function checkCommand(
  cmd: string,
  errorOptions: {
    message?: string;
    exit?: boolean;
    onError?: Function;
    doubleCheck?: boolean;
  } = null,
): Promise<string | false> {
  try {
    const { stdout } = await shellExec(cmd);

    if (stdout) {
      return stdout.trim();
    }

    if (errorOptions) throw "Command not found";
    return false;
  } catch (err) {
    if (!errorOptions) return false;
    // execute the onError function
    if (typeof errorOptions?.onError == "function") {
      // the onError function can attempt to fix the error of the command not executing
      // (like prompting the user to install a command)
      const res = await errorOptions.onError();

      if (errorOptions.doubleCheck) {
        return await checkCommand(cmd, {
          exit: errorOptions.exit,
        });
      }

      if (!res && errorOptions?.exit) process.exit(1);
    } else {
      warnMessage(errorOptions.message || `Unable to execute command: ${cmd}`);
      if (errorOptions.exit) process.exit(1);
    }
  }
}

/**
 * Detect the users operating system
 */
export function detectOperatingSystem(): PlatformOS {
  switch (os.platform()) {
    case "darwin":
      return "mac";
    case "win32":
      return "windows";
    case "linux":
      return "linux";
    default:
      return "unknown";
  }
}

/**
 * Add a new PATH value into the user's `.bashrc` or `.zshrc` files
 */
export function appendPathToRCFiles(
  newPath: string,
  name: string | undefined = undefined,
): void {
  // Get the home directory of the current user
  const homeDir = process.env.HOME || process.env.USERPROFILE;

  if (!homeDir) {
    console.error(
      "[appendPathToRCFiles]",
      "Unable to find the user home directory.",
    );
    return;
  }

  // List of potential RC files to check
  const rcFiles = [".bashrc", ".zshrc"].map((file) => path.join(homeDir, file));

  // The line to add to the RC file
  let exportLine = `export PATH=${newPath}:\$PATH\n`;

  // handle a better PATH flow to keep the PATH light and remove duplicates
  if (name) {
    const exportName = `${name.toUpperCase()}_HOME`;
    exportLine =
      `\n# ${name}\n` +
      `export ${exportName}="${newPath}"\n` +
      `case ":$PATH:" in\n` +
      `  *":$${exportName}:"*) ;;\n` +
      `  *) export PATH="$${exportName}:$PATH" ;;\n` +
      `esac\n` +
      `# ${name} end\n\n`;
  }

  rcFiles.forEach((rcFile) => {
    // Check if the RC file exists
    if (fs.existsSync(rcFile)) {
      // console.log(`Checking ${rcFile}...`);

      // Read the file contents
      const fileContent = fs.readFileSync(rcFile, "utf-8");

      // Check if the line is already present in the file
      if (!fileContent.includes(newPath)) {
        // Append the new export path to the RC file
        fs.appendFileSync(rcFile, exportLine);
        // console.log(`Appended PATH to ${rcFile}`);
      } else {
        // console.log(`The path is already present in ${rcFile}`);
      }
    } else {
      // console.log(`${rcFile} not found.`);
    }
  });
}

/**
 * Execute a command using the user's current shell session,
 * allowing the user to CTRL+C to cancel
 */
export function shellExecInSession({
  command,
  args = undefined,
  outputOnly,
}: ShellExecInSessionArgs): ChildProcess | void {
  if (outputOnly) {
    args = args || [];
    args.unshift(command);
    return console.log(args.join(" "));
  }

  return spawn(command, args, {
    detached: false, // run the command in the same session
    stdio: "inherit", // stream directly to the user's terminal
    shell: true, // uns in shell mode for compatibility with shell commands
  });
}

/**
 * Run a single command and get its stringified output
 * If the command fails or throws, this will return `false`
 */
export async function getCommandOutput(cmd: string): Promise<string | false> {
  try {
    return (await shellExec(cmd)).stdout.toString().trim();
  } catch (error) {
    return false;
  }
}

/**
 * Run a single command and get its stringified output
 * If the command fails or throws, this will return `false`
 */
export function getCommandOutputSync(cmd: string): string | false {
  try {
    return execSync(cmd, {
      encoding: "utf-8",
      stdio: "pipe",
    })
      .toString()
      .trim();
  } catch (error) {
    return false;
  }
}
