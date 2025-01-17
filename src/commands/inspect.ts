import { Argument, Command } from "@commander-js/extra-typings";
import { cliOutputConfig } from "@/lib/cli";
import { errorMessage, titleMessage, warningOutro } from "@/lib/logs";
import { COMMON_OPTIONS } from "@/const/commands";
import { getPublicSolanaRpcUrl } from "@/lib/solana";
import { inspectAddress, inspectSignature } from "@/lib/inspect";
import {
  address,
  createSolanaRpc,
  isAddress,
  isSignature,
  signature,
} from "@solana/web3.js";

/**
 * Command: `inspect`
 *
 * Solana block explorer on the CLI, akin to https://explorer.solana.com/tx/inspector
 */
export function inspectCommand() {
  return (
    new Command("inspect")
      .configureOutput(cliOutputConfig)
      .description("inspect transactions and accounts, like a block explorer")
      // intentionally make this arg optional to display a custom message
      .addArgument(
        new Argument(
          "<INPUT>",
          "transaction signature or account to inspect",
        ).argOptional(),
      )
      .addOption(COMMON_OPTIONS.url)
      .action(async (input) => {
        titleMessage("Inspector");

        if (!input) {
          console.log("Inspect a transaction or account using the cli");
          process.exit();
        }

        // when an explorer url is provided, attempt to parse this and strip away the noise
        if (input.match(/^https?:\/\//gi)) {
          try {
            const url = new URL(input);

            if (url.hostname.toLowerCase() != "explorer.solana.com") {
              return errorMessage(
                "Only the https://explorer.solana.com is supported",
              );
            }

            // todo: auto detect the cluster selected via the url

            if (url.pathname.match(/^\/address\//gi)) {
              input = url.pathname.match(/^\/address\/(.*)\/?/i)[1];
            } else if (url.pathname.match(/^\/(tx|transaction)\//gi)) {
              input = url.pathname.match(/^\/(tx|transaction)\/(.*)\/?/i)[2];
            } else {
              return warningOutro("Unsupported explorer URL");
            }
          } catch (err) {
            return errorMessage("Unable to parse inspector input as valid URL");
          }
        }

        // todo: selectable cluster
        const rpc = createSolanaRpc(getPublicSolanaRpcUrl("mainnet-beta"));

        if (isAddress(input)) {
          await inspectAddress({ rpc, address: address(input) });
        } else if (isSignature(input)) {
          await inspectSignature({ rpc, signature: signature(input) });
        }
      })
  );
}
