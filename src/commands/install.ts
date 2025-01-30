import { Argument, Command, Option } from "@commander-js/extra-typings";
import { cliOutputConfig } from "@/lib/cli";
import { titleMessage, warningOutro } from "@/lib/logs";
import { detectOperatingSystem, getCommandOutput } from "@/lib/shell";
import type { ToolNames } from "@/types";
import {
  installAnchorVersionManager,
  installRust,
  installSolana,
  installAnchorUsingAvm,
  installYarn,
  installTrident,
  installZest,
  installSolanaVerify,
  installMucho,
} from "@/lib/install";
import { checkShellPathSource } from "@/lib/setup";
import { PathSourceStatus, TOOL_CONFIG } from "@/const/setup";
import { getCargoUpdateOutput, getNpmPackageUpdates } from "@/lib/update";
import { getAvailableAnchorVersions } from "@/lib/anchor";
import { isVersionNewer } from "@/lib/node";

const toolNames: Array<ToolNames> = [
  "rust",
  "solana",
  "avm",
  "anchor",
  "trident",
  "zest",
  "yarn",
  "verify",
];

/**
 * Command: `install`
 *
 * Setup your local machine for Solana development
 */
export function installCommand() {
  return new Command("install")
    .configureOutput(cliOutputConfig)
    .description("install Solana development tooling")
    .addArgument(
      new Argument("<tool>", "tool to install")
        .choices(toolNames)
        .argOptional(),
    )
    .addArgument(
      new Argument(
        "<version>",
        "desired tool version to install (default: stable)",
      ).argOptional(),
    )
    .addOption(
      new Option(
        "--core",
        "install only the core tools and their dependencies - rust, solana, anchor",
      ).default(true),
    )
    .addOption(
      new Option(
        "--all",
        "install all the tools, not just the core tooling",
      ).default(false),
    )
    .action(async (toolName, version, options) => {
      titleMessage("Install Solana development tools");
      if (options.all) options.core = true;

      const os = detectOperatingSystem();

      if (os == "windows") {
        return warningOutro(
          "Windows is not yet natively supported for the rust based tooling.\n" +
            "We recommend using WSL inside your Windows terminal.",
        );
      }

      const postInstallMessages: string[] = [];

      // track which commands may require a path/session refresh
      const pathsToRefresh: string[] = [];

      const updatesAvailable = await getNpmPackageUpdates("mucho", true);

      if (options.all) {
        console.log(""); // spacer
        console.log("Core tools:");
      }

      // always check and install `mucho`
      await installMucho({
        os,
        version,
        updateAvailable: updatesAvailable.filter(
          (data) => data.name.toLowerCase() == "mucho",
        )[0],
      });

      // we require rust to check for available updates on many of the other tools
      // so we install it first before performing that version check
      if (!toolName || toolName == "rust") {
        await installRust({
          os,
          version,
        });

        await checkShellPathSource(
          TOOL_CONFIG.rust.version,
          TOOL_CONFIG.rust.pathSource,
        ).then((status) =>
          status == PathSourceStatus.MISSING_PATH
            ? pathsToRefresh.push(TOOL_CONFIG.rust.pathSource)
            : true,
        );
      }

      const anchorVersions = await getAvailableAnchorVersions();
      if (
        anchorVersions.current &&
        anchorVersions.latest &&
        isVersionNewer(anchorVersions.latest, anchorVersions.current)
      ) {
        updatesAvailable.push({
          installed: anchorVersions.current,
          latest: anchorVersions.latest,
          name: "anchor",
          needsUpdate: true,
        });
      }

      // this requires cargo to already be installed, so we must do it after the rust check
      updatesAvailable.push(...(await getCargoUpdateOutput()));

      if (!toolName || toolName == "solana") {
        const res = await installSolana({
          os,
          version,
        });

        // string response means this was a fresh install
        // so we can perform additional setup steps
        if (typeof res == "string") {
          await getCommandOutput("solana config set --url localhost");
          postInstallMessages.push(
            "Create a Solana wallet for your CLI with the following command: solana-keygen new",
          );
        }

        await checkShellPathSource(
          TOOL_CONFIG.solana.version,
          TOOL_CONFIG.solana.pathSource,
        ).then((status) =>
          status == PathSourceStatus.MISSING_PATH
            ? pathsToRefresh.push(TOOL_CONFIG.solana.pathSource)
            : true,
        );
      }

      // anchor is installed via avm
      if (!toolName || toolName == "avm" || toolName == "anchor") {
        await installAnchorVersionManager({
          os,
          version,
          updateAvailable: updatesAvailable.filter(
            (data) => data.name.toLowerCase() == "avm",
          )[0],
        });
      }
      if (!toolName || toolName == "anchor") {
        await installAnchorUsingAvm({
          os,
          version,
          updateAvailable: updatesAvailable.filter(
            (data) => data.name.toLowerCase() == "anchor",
          )[0],
        });
      }

      if (!toolName || toolName == "verify") {
        await installSolanaVerify({
          os,
          version,
          updateAvailable: updatesAvailable.filter(
            (data) => data.name.toLowerCase() == "solana-verify",
          )[0],
        });
      }

      // yarn is considered a "core" tool because it is currently a dependency of anchor (sadly)
      // this is expected to change in anchor 0.31
      if (!toolName || toolName == "yarn") {
        await installYarn({
          os,
          version,
        });
      }

      if (options.all) {
        console.log(""); // spacer
        console.log("Additional tools:");
      }

      if ((options.all && !toolName) || toolName == "trident") {
        await installTrident({
          os,
          version,
          updateAvailable: updatesAvailable.filter(
            (data) => data.name.toLowerCase() == "trident-cli",
          )[0],
        });
      }

      if ((options.all && !toolName) || toolName == "zest") {
        await installZest({
          os,
          version,
          updateAvailable: updatesAvailable.filter(
            (data) => data.name.toLowerCase() == "zest",
          )[0],
        });
      }

      if (pathsToRefresh.length > 0) {
        console.log(
          "\nClose and reopen your terminal to apply the required",
          "PATH changes \nor run the following in your existing shell:",
          "\n",
        );
        console.log(`export PATH="${pathsToRefresh.join(":")}:$PATH"`, "\n");
      }

      if (postInstallMessages.length > 0) {
        console.log(); // spacer line
        console.log(postInstallMessages.join("\n"));
      }
    });
}
