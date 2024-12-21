import { spawn } from "child_process";
import { resolve } from "path";
import { rmSync } from "fs";
import {
  createFolders,
  directoryExists,
  loadFileNamesToMap,
  moveFiles,
} from "@/lib/utils";
import {
  DEFAULT_ACCOUNTS_DIR,
  DEFAULT_ACCOUNTS_DIR_LOADED,
  DEFAULT_TEST_LEDGER_DIR,
} from "@/const/solana";
import { warnMessage } from "@/lib/logs";
import { SolanaTomlClone } from "@/types/config";

type BuildTestValidatorCommandInput = {
  verbose?: boolean;
  reset?: boolean;
  accountDir?: string;
  ledgerDir?: string;
  authority?: string;
  localPrograms?: SolanaTomlClone["program"];
};

export function buildTestValidatorCommand({
  reset = false,
  verbose = false,
  accountDir = DEFAULT_ACCOUNTS_DIR,
  ledgerDir = DEFAULT_TEST_LEDGER_DIR,
  authority,
  localPrograms,
}: BuildTestValidatorCommandInput = {}) {
  const command: string[] = ["solana-test-validator"];

  const stagingDir = resolve(DEFAULT_ACCOUNTS_DIR_LOADED);

  if (reset) {
    rmSync(stagingDir, {
      recursive: true,
      force: true,
    });

    command.push("--reset");
  }

  if (ledgerDir) {
    createFolders(ledgerDir);
    command.push(`--ledger ${ledgerDir}`);
  }

  // auto load in the account from the provided json files
  if (accountDir) {
    accountDir = resolve(accountDir);

    if (directoryExists(accountDir)) {
      // clone the dir to a different temp location

      createFolders(stagingDir, false);
      moveFiles(accountDir, stagingDir, true);

      // todo: update/reset the required account values (like `data` and maybe `owners`)

      command.push(`--account-dir ${stagingDir}`);

      // get the list of all the local binaries
      const clonedPrograms = loadFileNamesToMap(accountDir, ".so");
      clonedPrograms.forEach((_value, address) => {
        // console.log(`address: ${address}`),

        // todo: what is the real difference between using `--upgradeable-program` and `--bpf-program` here?

        if (authority) {
          // todo: support setting a custom authority for each program (reading it from the config toml)
          command.push(
            `--upgradeable-program ${address}`,
            resolve(accountDir, `${address}.so`),
            authority,
          );
        } else {
          command.push(
            `--bpf-program ${address}`,
            resolve(accountDir, `${address}.so`),
          );
        }
      });

      // todo: support loading in local binaries via `--bpf-program`
    } else {
      if (verbose) {
        warnMessage(`Accounts directory does not exist: ${accountDir}`);
        warnMessage("Skipping cloning of fixtures");
      }
    }
  }

  // load the local programs in directly from their build dir
  if (localPrograms) {
    for (const key in localPrograms) {
      if (Object.prototype.hasOwnProperty.call(localPrograms, key)) {
        command.push(
          `--upgradeable-program ${localPrograms[key].address}`,
          localPrograms[key].filePath,
          authority,
        );
      }
    }
  }

  // todo: support cloning programs via `--clone-upgradeable-program`?

  return command.join(" ");
}

type RunTestValidatorInput = {
  command?: string;
  args?: string[];
};

export function runTestValidator({ command, args }: RunTestValidatorInput) {
  console.log(""); // print a line separator

  // Spawn a child process
  const child = spawn(command, args, {
    detached: false, // run the command in the same session
    stdio: "inherit", // Stream directly to the user's terminal
    shell: true, // Runs in shell for compatibility with shell commands
    // cwd: // todo: do we want this?
  });

  // Handle child process events
  child.on("error", (err) => {
    console.error(`Failed to start the command: ${err.message}`);
  });

  child.on("exit", (code) => {
    if (code === 0) {
      console.log("Command executed successfully.");
    } else {
      console.error(`Command exited with code ${code}`);
    }
  });
}
