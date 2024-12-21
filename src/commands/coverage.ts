import { Command, Option } from "@commander-js/extra-typings";
import { COMMON_OPTIONS } from "@/const/commands";
import { cliOutputConfig } from "@/lib/cli";
import { titleMessage, warnMessage } from "@/lib/logs";
import { checkCommand, shellExecInSession } from "@/lib/shell";
import { promptToInstall } from "@/lib/prompts/install";
import { installZest } from "@/lib/install";

const command = `zest coverage`;

/**
 * Command: `coverage`
 *
 * Run the zest code coverage tool
 */
export function coverageCommand() {
  return new Command("coverage")
    .configureOutput(cliOutputConfig)
    .description("run code coverage on a Solana program")
    .usage("[options] [-- <ZEST_ARGS>...]")
    .addOption(
      new Option(
        "-- <ZEST_ARGS>",
        `arguments to pass to the underlying ${command} command`,
      ),
    )
    .addOption(COMMON_OPTIONS.outputOnly)
    .action(async (options, { args: passThroughArgs }) => {
      if (!options.outputOnly) {
        titleMessage("Zest code coverage");
      }

      await checkCommand("zest --help", {
        exit: true,
        onError: async () => {
          warnMessage("Unable to detect the 'zest' command.");
          const shouldInstall = await promptToInstall("zest");
          if (shouldInstall) await installZest();
        },
        doubleCheck: true,
      });

      shellExecInSession({
        command,
        args: passThroughArgs,
        outputOnly: options.outputOnly,
      });
    });
}
