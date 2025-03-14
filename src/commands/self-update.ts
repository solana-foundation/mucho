import { Argument, Command } from "@commander-js/extra-typings";
import { cliOutputConfig } from "@/lib/cli";
import { getAppInfo } from "@/lib/app-info";
import shellExec from "shell-exec";
import ora from "ora";
import {
  getCurrentNpmPackageVersion,
  getNpmRegistryPackageVersion,
} from "@/lib/npm";
import picocolors from "picocolors";

const appName = getAppInfo().name;

/**
 * Command: `self-update`
 */
export function selfUpdateCommand() {
  return new Command("self-update")
    .configureOutput(cliOutputConfig)
    .addArgument(
      new Argument(
        "<version>",
        "desired version to install (default: latest)",
      ).argOptional(),
    )
    .description(
      `update ${appName} to the latest version (or the one specified)`,
    )
    .action(async (version) => {
      version = version?.toLowerCase() || "latest";

      const spinner = ora(
        `Preparing to update ${appName} to '${version}'`,
      ).start();

      const registry = await getNpmRegistryPackageVersion(appName);
      const current = await getCurrentNpmPackageVersion(appName, true);

      if (version == "latest") {
        version = registry.latest;
      }

      if (version == current) {
        spinner.succeed(`${appName} version '${version}' already installed`);
        return;
      }

      try {
        if (registry.allVersions.find((ver) => ver === version).length == 0) {
          throw `${appName} version '${version}' not found`;
        }

        spinner.text = `Updating ${appName} to '${version}'`;

        await shellExec(`npm install -gy --force ${appName}@${version}`);

        spinner.text = `Validating installation`;
        const newCurrent = await getCurrentNpmPackageVersion(appName, true);

        if (newCurrent != version) {
          throw new Error(`Failed to update ${appName} to '${version}'`);
        }

        spinner.succeed(`${appName}@${newCurrent} installed`);
      } catch (err) {
        let message = `Failed to update ${appName} to '${version}'. Current version: ${current}`;
        if (typeof err == "string") message = err;
        spinner.fail(picocolors.red(message));
      }
    });
}
