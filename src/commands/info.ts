import { Command } from "@commander-js/extra-typings";
import { cliOutputConfig } from "@/lib/cli";
import { titleMessage } from "@/lib/logs";
import ora from "ora";

import { detectOperatingSystem, getCommandOutput } from "@/lib/shell";
import { checkInstalledTools } from "@/lib/setup";
import { getPlatformToolsVersions } from "@/lib/solana";

/**
 * Command: `info`
 *
 * Get loads of helpful troubleshooting info for the user's computer
 */
export function infoCommand() {
  return new Command("info")
    .configureOutput(cliOutputConfig)
    .description("gather helpful troubleshooting info about about your system")
    .action(async () => {
      titleMessage("Gather troubleshooting info");
      console.log();

      const spinner = ora("Gathering mucho info").start();

      const separator = "------------------------";

      const info: string[] = [];

      const os = detectOperatingSystem();

      info.push("--- start mucho info ---");
      info.push(`Operating system: ${os}`);

      const tools = await checkInstalledTools();

      info.push(separator);
      info.push("Installed tooling:");
      for (const key in tools.status) {
        info.push("  " + key + ": " + tools.status[key]);
      }

      info.push(separator);
      info.push("Platform tools:");
      const platformTools = await getPlatformToolsVersions();
      for (const key in platformTools) {
        info.push("  " + key + ": " + platformTools[key]);
      }

      info.push(separator);
      info.push("Solana CLI info:");

      const solanaConfig =
        (await getCommandOutput("solana config get")) ||
        "Unable to get 'solana config'";

      info.push(
        solanaConfig
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n"),
      );

      const address = await getCommandOutput("solana address");
      info.push("Address: " + address);

      const balances = {
        devnet: await getCommandOutput("solana balance -ud"),
        mainnet: await getCommandOutput("solana balance -um"),
        testnet: await getCommandOutput("solana balance -ut"),
        localnet: await getCommandOutput("solana balance -ul"),
      };

      info.push("Balances for address:");
      for (const key in balances) {
        info.push("  " + key + ": " + balances[key]);
      }

      const testValidatorChecker = await getCommandOutput(
        // lsof limits the program name character length
        // "lsof -i -P | grep solana-t | grep '(LISTEN)'",
        "ps aux | grep 'solana-test-validator'",
      );

      info.push("Is test-validator running? " + !!testValidatorChecker);

      info.push("---- end mucho info ----");

      spinner.stop();

      console.log(info.join("\n"));
      // todo: add the ability to save to a file

      console.log();
      console.log(
        "Looking for troubleshooting help? Post a question on the Solana StackExchange:",
      );
      console.log("https://solana.stackexchange.com");
    });
}
