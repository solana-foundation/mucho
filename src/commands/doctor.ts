import { Command } from "@commander-js/extra-typings";
import { cliOutputConfig } from "@/lib/cli";
import { successOutro, warnMessage } from "@/lib/logs";

import { detectOperatingSystem } from "@/lib/shell";
import { checkInstalledTools } from "@/lib/setup";

/**
 * Command: `doctor`
 *
 * Inspect and remedy your local machine for Solana development
 */
export function doctorCommand() {
  return new Command("doctor")
    .configureOutput(cliOutputConfig)
    .description("inspect and remedy your local development environment")
    .addCommand(doctorListCommand());
}

/**
 * Command: `doctor list`
 *
 * List the current installed versions of Solana development tooling
 */
function doctorListCommand() {
  return new Command("list")
    .configureOutput(cliOutputConfig)
    .description("list the current versions of Solana development tooling")
    .action(async () => {
      // titleMessage("Solana development tooling");

      const os = detectOperatingSystem();

      if (os == "windows") {
        warnMessage(
          "Windows is not yet natively supported for the rust based tooling.\n" +
            "We recommend using WSL inside your Windows terminal.",
        );
      }

      const tools = await checkInstalledTools({
        outputToolStatus: true,
      });

      if (tools.allInstalled) {
        return successOutro("All tools are installed!");
      }

      // todo: allow a command flag to force install

      // todo: ask the user if they want to install missing tools?

      successOutro();
    });
}
