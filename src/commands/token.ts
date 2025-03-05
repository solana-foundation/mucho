import { Command } from "@commander-js/extra-typings";
import { cliOutputConfig } from "@/lib/cli";
import { createTokenCommand } from "./token/create";
import { mintTokenCommand } from "./token/mint";

export function tokenCommand() {
  // set the default action to `help` without an error
  if (process.argv.length === 3) {
    process.argv.push("--help");
  }

  return new Command("token")
    .configureOutput(cliOutputConfig)
    .description("create, mint, and transfer tokens")
    .addCommand(createTokenCommand())
    .addCommand(mintTokenCommand());
}
