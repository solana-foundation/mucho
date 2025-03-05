import { Command } from "@commander-js/extra-typings";
import { cliOutputConfig } from "@/lib/cli";
import { createTokenCommand } from "./token/create";
import { mintTokenCommand } from "./token/mint";
import { transferTokenCommand } from "./token/transfer";

export function tokenCommand() {
  return new Command("token")
    .configureOutput(cliOutputConfig)
    .description("create, mint, and transfer tokens")
    .addCommand(createTokenCommand())
    .addCommand(mintTokenCommand())
    .addCommand(transferTokenCommand());
}
