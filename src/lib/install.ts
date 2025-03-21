/**
 * Helpers for setting up a user's local environment
 */

import { InstallCommandPropsBase } from "@/types";
import {
  appendPathToRCFiles,
  checkCommand,
  detectOperatingSystem,
  installedToolVersion,
} from "@/lib/shell";
import shellExec from "shell-exec";
import ora from "ora";
import { TOOL_CONFIG } from "@/const/setup";
import picocolors from "picocolors";
import { getCurrentNpmPackageVersion } from "./npm";
import { logger } from "./logger";

/**
 * Install the mucho cli
 * note: we have to assume `npm` is already available
 */
export async function installMucho({
  updateAvailable,
}: InstallCommandPropsBase = {}) {
  const spinner = ora("Checking the mucho cli...").start();
  try {
    let installedVersion = await getCurrentNpmPackageVersion("mucho", true);
    if (installedVersion) {
      if (!updateAvailable) {
        spinner.info(`mucho ${installedVersion} is already installed`);
        return true;
      }
      spinner.text = `Updating the mucho cli`;
    } else spinner.text = `Installing the mucho cli`;

    await shellExec(`npm install -gy --force mucho@latest`);

    spinner.text = "Verifying mucho was installed";
    installedVersion = await getCurrentNpmPackageVersion("mucho", true);

    if (installedVersion) {
      spinner.succeed(`mucho ${installedVersion} installed`);
      return installedVersion;
    } else {
      spinner.fail(picocolors.red("mucho cli failed to install"));
      return false;
    }
  } catch (err) {
    spinner.fail(picocolors.red("Unable to install the mucho cli"));
    if (typeof err == "string") console.error(err);
    else if (err instanceof Error) console.error(err.message);
    else console.error(err.message);
  }

  // default return false
  return false;
}

/**
 * Check to see which debian/ubuntu dependencies
 */
export async function checkDebianDependenciesInstalled(): Promise<
  string[] | void
> {
  const deps: string[] = [
    "build-essential",
    "pkg-config",
    "libudev-dev",
    "llvm",
    "libclang-dev",
    "protobuf-compiler",
    "libssl-dev",
  ];

  const statuses = await Promise.allSettled(
    deps.map((dep) =>
      checkCommand(`apt list ${dep} | grep \[installed\]`, {
        exit: false,
      }),
    ),
  );

  const missingDeps: string[] = [];

  statuses.map((res, index) => {
    let isInstalled = false;

    if (res.status == "rejected" || !res?.value) {
      console.error("Unable to detect dependency:", deps[index]);
    } else {
      res.value.split("\n").map((data) => {
        if (
          new RegExp(`^${deps[index]}\/[^\\s]+.+\\[installed\\]`, "m").test(
            data,
          )
        ) {
          isInstalled = true;
        }
      });
    }

    if (!isInstalled) {
      missingDeps.push(deps[index]);
    }
  });

  if (missingDeps.length == 0) return;
  return missingDeps;
}

/**
 * Install the rust toolchain with Rustup
 */
export async function installRust({}: InstallCommandPropsBase = {}) {
  const spinner = ora("Installing the rust toolchain using rustup").start();
  try {
    // we ALWAYS check for and update the PATH in the bashrc file
    appendPathToRCFiles(TOOL_CONFIG.rust.pathSource, "rust");

    const os = detectOperatingSystem();
    // todo: we need to support non-debian linux
    // if the user's system does not have `apt`, skip this check
    if (os == "linux" && (await checkCommand(`apt --version`))) {
      spinner.text = `Checking for required linux dependencies`;
      const missingDeps = await checkDebianDependenciesInstalled();
      if (missingDeps && missingDeps.length > 0) {
        spinner.fail(
          picocolors.red(`Missing dependencies: ${missingDeps.join(" ")}`),
        );

        console.log(
          "Install the missing dependencies using the following command:",
        );
        console.log(
          "sudo apt update && sudo apt install -y",
          missingDeps.join(" "),
        );

        logger.exit(0);
      }
    }

    let [installedVersion, rustupVersion] = await Promise.all([
      installedToolVersion("rust"),
      installedToolVersion("rustup"),
    ]);

    if (rustupVersion) {
      installedVersion = await installedToolVersion("rust");
      if (installedVersion) {
        spinner.info(`rust ${installedVersion} is already installed`);
        // todo: detect if the $PATH is actually loaded
        return true;
      }
    }

    spinner.text = "Installing the rust toolchain using rustup";
    const result = await shellExec(
      `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y`,
    );

    if (result && result.code != 0) {
      const error = result.stderr.trim().split("\n");

      // todo: we can handle any specific known install errors here

      // fallback to displaying the error
      throw error.join("\n");
    }

    spinner.text = "Verifying rust was installed";
    installedVersion = await installedToolVersion("rust");
    if (installedVersion) {
      spinner.succeed(`rust ${installedVersion} installed`);
      return installedVersion;
    } else {
      spinner.fail(picocolors.red("rust failed to install"));
      return false;
    }
  } catch (err) {
    spinner.fail(picocolors.red("Unable to install rust"));

    if (typeof err == "string") console.error(err);
    else if (err instanceof Error) console.error(err.message);
    else console.error(err.message);
  }

  // default return false
  return false;
}

/**
 * Install the Solana CLI tool suite
 */
export async function installSolana({
  version = "stable",
}: InstallCommandPropsBase = {}) {
  const spinner = ora("Installing the Solana CLI tool suite...").start();
  try {
    // we ALWAYS check for and update the PATH in the bashrc file
    appendPathToRCFiles(TOOL_CONFIG.solana.pathSource, "solana");

    let installedVersion = await installedToolVersion("solana");
    if (installedVersion) {
      spinner.info(`solana ${installedVersion} is already installed`);
      // todo: detect if the $PATH is actually loaded
      return true;
    }
    version = version.toLowerCase();
    if (version != "stable" && !version.startsWith("v")) {
      throw `Invalid version: '${version}'`;
    }

    spinner.text = "Installing the Solana CLI tool suite...";
    const result = await shellExec(
      // `sh -c "$(curl -sSfL https://release.solana.com/${version}/install)"`,
      `sh -c "$(curl -sSfL https://release.anza.xyz/${version}/install)"`,
    );

    if (result && result.code != 0) {
      const error = result.stderr.trim().split("\n");

      // todo: we can handle any specific known install errors here

      // fallback to displaying the error
      throw error.join("\n");
    }

    spinner.text = "Verifying solana was installed";
    installedVersion = await installedToolVersion("solana");
    if (installedVersion) {
      spinner.succeed(`solana ${installedVersion} installed`);
      return installedVersion;
    } else {
      spinner.fail(picocolors.red("solana failed to install"));
      return false;
    }
  } catch (err) {
    spinner.fail(picocolors.red("Unable to install the Solana CLI tool suite"));
    if (typeof err == "string") console.error(err);
    else if (err instanceof Error) console.error(err.message);
    else console.error(err.message);
  }

  // default return false
  return false;
}

/**
 * Install the anchor version manager (aka `avm`)
 */
export async function installAnchorVersionManager({
  // version = "latest",
  updateAvailable,
}: InstallCommandPropsBase = {}) {
  const spinner = ora("Installing avm (anchor version manager)").start();
  try {
    let installedVersion = await installedToolVersion("avm");
    if (installedVersion) {
      let message = `avm ${installedVersion} is already installed`;
      if (updateAvailable) {
        message = picocolors.yellow(message + ` - update available`);
      }
      // todo: do we want to help people update avm?
      spinner.info(message);
      return true;
    }

    spinner.text = "Installing avm (anchor version manager)";
    const result = await shellExec(
      `cargo install --git https://github.com/coral-xyz/anchor avm --locked --force`,
    );

    if (result && result.code != 0) {
      const error = result.stderr.trim().split("\n");

      // todo: we can handle any specific known install errors here

      // fallback to displaying the error
      throw error.join("\n");
    }

    spinner.text = "Verifying avm was installed";
    installedVersion = await installedToolVersion("avm");

    if (installedVersion) {
      spinner.succeed(`avm ${installedVersion} installed`);
      return installedVersion;
    } else {
      spinner.fail(picocolors.red("avm failed to install"));
      return false;
    }
  } catch (err) {
    spinner.fail(picocolors.red("Unable to install avm"));
    if (typeof err == "string") console.error(err);
    else if (err instanceof Error) console.error(err.message);
    else console.error(err.message);
  }

  // default return false
  return false;
}

/**
 * Install anchor via avm
 */
export async function installAnchorUsingAvm({
  verifyParentCommand = true,
  version = "latest",
  updateAvailable,
}: InstallCommandPropsBase = {}) {
  const spinner = ora("Installing anchor using avm...").start();
  try {
    let installedVersion = await installedToolVersion("anchor");

    if (installedVersion) {
      let message = `anchor ${installedVersion} is already installed`;
      if (updateAvailable) {
        message = picocolors.yellow(
          message + ` - v${updateAvailable.latest} available`,
        );
      }
      spinner.info(message);
      return true;
    }

    if (verifyParentCommand) {
      spinner.text = `Verifying avm is installed`;
      const avmVersion = await installedToolVersion("avm");

      if (!avmVersion) {
        // todo: smart install avm?
        throw `avm is NOT already installed`;
        // todo: better error response handling
      } else {
        // todo: support other versions of anchor via avm
        version = avmVersion;
      }
    }

    // note: intentionally recheck the version due to avm allowing tags like `stable`
    if (installedVersion && installedVersion == version) {
      spinner.info(`anchor ${installedVersion} is already installed`);
      return true;
    }

    let result: Awaited<ReturnType<typeof shellExec>>;

    try {
      spinner.text =
        `Installing anchor version '${version}'. ` +
        `This may take a few moments...`;
      result = await shellExec(`avm install ${version}`);
    } catch (err) {
      throw "Unable to execute `avm install`";
    }

    // handle any `avm install` errors
    if (result && result.code != 0) {
      const error = result.stderr.trim().split("\n");

      // todo: we can handle any specific known install errors here

      // fallback to displaying the error
      throw error.join("\n");
    }

    try {
      spinner.text = "Setting anchor version with avm";
      result = await shellExec(`avm use ${version}`);
    } catch (err) {
      throw "Unable to execute `avm use`";
    }

    spinner.text = "Verifying anchor was installed";
    installedVersion = await installedToolVersion("anchor");
    if (installedVersion) {
      spinner.succeed(`anchor ${installedVersion} installed using avm`);
      return installedVersion;
    } else {
      spinner.fail(picocolors.red("anchor failed to install"));
      return false;
    }
  } catch (err) {
    spinner.fail(picocolors.red("Unable to install anchor using avm"));
    if (typeof err == "string") console.error(err);
    else if (err instanceof Error) console.error(err.message);
    else console.error(err.message);
  }

  // default return false
  return false;
}

/**
 * Install the yarn package manager (since anchor uses yarn by default still)
 * note: we have to assume `npm` is already available
 */
export async function installYarn({}: InstallCommandPropsBase = {}) {
  const spinner = ora("Installing yarn package manager...").start();
  try {
    let installedVersion = await installedToolVersion("yarn");
    if (installedVersion) {
      spinner.info(`yarn ${installedVersion} is already installed`);
      return true;
    }

    spinner.text = `Installing yarn package manager`;
    await shellExec(`npm install -gy yarn`);

    spinner.text = "Verifying yarn was installed";
    installedVersion = await installedToolVersion("yarn");
    if (installedVersion) {
      spinner.succeed(`yarn ${installedVersion} installed`);
      return installedVersion;
    } else {
      spinner.fail(picocolors.red("yarn package manager failed to install"));
      return false;
    }
  } catch (err) {
    spinner.fail(picocolors.red("Unable to install yarn package manager"));
    if (typeof err == "string") console.error(err);
    else if (err instanceof Error) console.error(err.message);
    else console.error(err.message);
  }

  // default return false
  return false;
}

/**
 * Install the trident fuzzer
 */
export async function installTrident({
  // version = "latest",
  verifyParentCommand = true,
  updateAvailable,
}: InstallCommandPropsBase = {}): Promise<boolean | string> {
  const spinner = ora("Installing trident (fuzzer)").start();
  try {
    let installedVersion = await installedToolVersion("trident");
    if (installedVersion) {
      let message = `trident ${installedVersion} is already installed`;
      if (updateAvailable) {
        message = picocolors.yellow(
          message + ` - ${updateAvailable.latest} available`,
        );
      }
      spinner.info(message);
      return true;
    }

    if (verifyParentCommand) {
      const isParentInstalled = await installedToolVersion("rust");
      if (!isParentInstalled) {
        spinner.fail(picocolors.red("Rust/cargo was not found"));
        throw "parent command not found";
      }
    }

    spinner.text = "Installing trident (fuzzer)";
    // note: trident requires `honggfuzz`
    const result = await shellExec(`cargo install honggfuzz trident-cli`);

    if (result && result.code != 0) {
      const error = result.stderr.trim().split("\n");

      // todo: we can handle any specific known install errors here

      // fallback to displaying the error
      throw error.join("\n");
    }

    spinner.text = "Verifying trident was installed";
    installedVersion = await installedToolVersion("trident");

    if (installedVersion) {
      spinner.succeed(`trident ${installedVersion} installed`);
      return installedVersion;
    } else {
      spinner.fail(picocolors.red("trident failed to install"));
      return false;
    }
  } catch (err) {
    spinner.fail(picocolors.red("Unable to install the trident fuzzer"));
    if (typeof err == "string") console.error(err);
    else if (err instanceof Error) console.error(err.message);
    else console.error(err.message);
  }

  // default return false
  return false;
}

/**
 * Install the Zest (from LimeChain) - code coverage tool
 */
export async function installZest({
  // version = "latest",
  verifyParentCommand = true,
  updateAvailable,
}: InstallCommandPropsBase = {}) {
  const spinner = ora("Installing zest (code coverage)").start();
  try {
    let installedVersion = await installedToolVersion("zest");
    if (installedVersion) {
      let message = `zest ${installedVersion} is already installed`;
      if (updateAvailable) {
        message = picocolors.yellow(message + ` - update available`);
      }
      spinner.info(message);
      return true;
    }

    if (verifyParentCommand) {
      const parentVersion = await installedToolVersion("rust");
      if (!parentVersion) {
        throw "rustc/cargo was not found but is required";
      }
    }

    let result: Awaited<ReturnType<typeof shellExec>>;

    try {
      spinner.text = `Installing zest (code coverage)...`;
      result = await shellExec(
        `cargo install --git https://github.com/LimeChain/zest zest --force`,
      );
    } catch (err) {
      throw "Unable to execute the zest installer";
    }

    if (result && result.code != 0) {
      const error = result.stderr.trim().split("\n");
      let parsed: string | null = null;

      // ensure the user has the minimum rustc version
      if (
        (parsed = error
          .slice(-1)[0]
          .match(
            /(?<=\bit requires rustc\s)\d+\.\d+(\.\d+)?(?=\sor newer\b)/gi,
          )[0])
      ) {
        throw (
          `Zest requires a minimum rustc version of ${parsed}. ` +
          `To set your rustc version, run the following command:\n` +
          `rustup default ${parsed}`
        );
      }

      // fallback to displaying the error
      throw error.join("\n");
    }

    try {
      spinner.text = "Installing the 'llvm-tools-preview' component in rustup";
      result = await shellExec(`rustup component add llvm-tools-preview`);
    } catch (err) {
      throw (
        `Unable to execute 'rustup component add llvm-tools-preview'. ` +
        `Try running manually.`
      );
    }

    spinner.text = "Verifying zest was installed";
    installedVersion = await installedToolVersion("zest");

    if (installedVersion) {
      spinner.succeed(`zest ${installedVersion} installed`);
      return installedVersion;
    } else {
      spinner.fail(picocolors.red("zest failed to install"));
      return false;
    }
  } catch (err) {
    spinner.fail(picocolors.red("Unable to install zest"));
    if (typeof err == "string") console.error(err);
    else if (err instanceof Error) console.error(err.message);
    else console.error(err.message);
  }

  // default return false
  return false;
}

/**
 * Install the `cargo-update` tool to help detect installed crate versions
 */
export async function installCargoUpdate({
  // version = "latest",
  verifyParentCommand = true,
}: InstallCommandPropsBase = {}) {
  const spinner = ora("Installing cargo-update").start();
  try {
    let installedVersion = await installedToolVersion("cargo-update");
    if (installedVersion) {
      spinner.info(`cargo-update ${installedVersion} is already installed`);
      return true;
    }

    if (verifyParentCommand) {
      const parentVersion = await installedToolVersion("rust");
      if (!parentVersion) {
        throw "rustc/cargo was not found but is required";
      }
    }

    let result: Awaited<ReturnType<typeof shellExec>>;

    try {
      spinner.text = `Installing cargo-update...`;
      result = await shellExec(`cargo install cargo-update`);
    } catch (err) {
      throw "Unable to execute the cargo-update installer";
    }

    if (result && result.code != 0) {
      const error = result.stderr.trim().split("\n");

      // todo: we can handle any specific known install errors here

      // fallback to displaying the error
      throw error.join("\n");
    }

    spinner.text = "Verifying cargo-update was installed";
    installedVersion = await installedToolVersion("cargo-update");

    if (installedVersion) {
      spinner.succeed(`cargo-update ${installedVersion} installed`);
      return installedVersion;
    } else {
      spinner.fail(picocolors.red("cargo-update failed to install"));
      return false;
    }
  } catch (err) {
    spinner.fail(picocolors.red("Unable to install cargo-update"));
    if (typeof err == "string") console.error(err);
    else if (err instanceof Error) console.error(err.message);
    else console.error(err.message);
  }

  // default return false
  return false;
}

/**
 * Install the solana-verify tool
 */
export async function installSolanaVerify({
  // version = "latest",
  verifyParentCommand = true,
  updateAvailable,
}: InstallCommandPropsBase = {}) {
  const spinner = ora("Installing solana-verify").start();
  try {
    let installedVersion = await installedToolVersion("verify");
    if (installedVersion) {
      let message = `solana-verify ${installedVersion} is already installed`;
      if (updateAvailable) {
        message = picocolors.yellow(
          message + ` - ${updateAvailable.latest} available`,
        );
      }
      spinner.info(message);

      await isDockerInstalled();
      return true;
    }

    if (verifyParentCommand) {
      const parentVersion = await installedToolVersion("rust");
      if (!parentVersion) {
        throw "rustc/cargo was not found but is required";
      }
    }

    let result: Awaited<ReturnType<typeof shellExec>>;

    try {
      spinner.text = `Installing solana-verify...`;
      result = await shellExec(`cargo install solana-verify`);
    } catch (err) {
      throw "Unable to execute the solana-verify installer";
    }

    if (result && result.code != 0) {
      const error = result.stderr.trim().split("\n");
      // let parsed: string | null = null;

      // // ensure the user has the minimum rustc version
      // if (
      //   (parsed = error
      //     .slice(-1)[0]
      //     .match(
      //       /(?<=\bit requires rustc\s)\d+\.\d+(\.\d+)?(?=\sor newer\b)/gi,
      //     )[0])
      // ) {
      //   throw (
      //     `Zest requires a minimum rustc version of ${parsed}. ` +
      //     `To set your rustc version, run the following command:\n` +
      //     `rustup default ${parsed}`
      //   );
      // }

      // fallback to displaying the error
      throw error.join("\n");
    }

    spinner.text = "Verifying solana-verify was installed";
    installedVersion = await installedToolVersion("verify");

    if (installedVersion) {
      spinner.succeed(`solana-verify ${installedVersion} installed`);
      await isDockerInstalled();
      return installedVersion;
    } else {
      spinner.fail(picocolors.red("solana-verify failed to install"));
      return false;
    }
  } catch (err) {
    spinner.fail(picocolors.red("Unable to install solana-verify"));
    if (typeof err == "string") console.error(err);
    else if (err instanceof Error) console.error(err.message);
    else console.error(err.message);
  }

  // default return false
  return false;
}

export async function isDockerInstalled() {
  return checkCommand("docker --version", {
    exit: false,
    onError: () => {
      console.error(
        `Unable to detect Docker (which is required for 'solana-verify'). Do you have it installed?`,
      );

      console.error(
        "To install Docker, follow the instructions in the official Docker documentation:",
        "\nhttps://docs.docker.com/engine/install/",
      );
    },
  });
}
