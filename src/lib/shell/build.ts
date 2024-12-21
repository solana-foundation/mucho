import { spawn } from "child_process";

type BuildProgramCommandInput = {
  verbose?: boolean;
  workspace?: boolean;
  manifestPath?: string;
  toolsVersion?: string;
};

export function buildProgramCommand({
  verbose = false,
  manifestPath,
  workspace = false,
  toolsVersion,
}: BuildProgramCommandInput) {
  const command: string[] = ["cargo build-sbf"];

  if (manifestPath) {
    command.push(`--manifest-path ${manifestPath}`);
  }
  if (workspace) {
    command.push(`--workspace`);
  }
  if (toolsVersion) {
    if (!toolsVersion.startsWith("v")) toolsVersion = `v${toolsVersion}`;
    command.push(`--tools-version ${toolsVersion}`);
  }

  // todo: research features and how best to include them
  // --features <FEATURES>...
  // Space-separated list of features to activate

  // --sbf-sdk <PATH>
  // Path to the Solana SBF SDK [env: SBF_SDK_PATH=] [default: stable dir]

  // --tools-version <STRING>
  //   platform-tools version to use or to install, a version string, e.g. "v1.32"

  return command.join(" ");
}

type RunBuildCommandInput = {
  programName: string;
  command: string;
  args?: string[];
};

export async function runBuildCommand({
  programName,
  command,
  args,
}: RunBuildCommandInput): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let output = "";
    let errorOutput = "";

    // // Spawn a child process
    const child = spawn(command, args, {
      detached: false, // run the command in the same session
      stdio: "inherit", // Stream directly to the user's terminal
      shell: true, // Runs in shell for compatibility with shell commands
      // cwd: // todo: do we want this?
    });

    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        console.error(errorOutput);
        resolve(false);
      }
    });

    process.on("error", (error) => {
      reject(false);
    });
  });
}
