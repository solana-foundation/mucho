import { Argument, Command } from "@commander-js/extra-typings";
import { cliOutputConfig, loadSolanaCliConfig } from "@/lib/cli";
import {
  errorMessage,
  titleMessage,
  warningOutro,
  warnMessage,
} from "@/lib/logs";
import { COMMON_OPTIONS } from "@/const/commands";
import { inspectAddress, inspectSignature } from "@/lib/inspect";
import { getMonikerFromGenesisHash, getPublicSolanaRpcUrl } from "@/lib/web3";
import {
  address,
  createSolanaRpc,
  isAddress,
  isSignature,
  isStringifiedNumber,
  signature,
} from "@solana/web3.js";
import { inspectBlock } from "@/lib/inspect/block";
import { numberStringToNumber } from "@/lib/utils";
import { parseRpcUrlOrMoniker } from "@/lib/solana";
import { SolanaCluster } from "@/types/config";

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
      .addOption(COMMON_OPTIONS.config)
      .action(async (input, options) => {
        titleMessage("Inspector");

        if (!input) {
          console.log("Inspect a transaction or account using the cli");
          process.exit();
        }

        // construct the rpc url endpoint to use based on the provided url option or the solana cli config.yml file
        const cliConfig = loadSolanaCliConfig();
        let clusterUrl = parseRpcUrlOrMoniker(
          options.url || cliConfig.json_rpc_url,
        );

        // when an explorer url is provided, attempt to parse this and strip away the noise
        if (input.match(/^https?:\/\//gi)) {
          try {
            const url = new URL(input);

            if (url.hostname.toLowerCase() != "explorer.solana.com") {
              return errorMessage(
                "Only the https://explorer.solana.com is supported",
              );
            }

            let clusterFromUrl = (
              url.searchParams.get("cluster") || "mainnet"
            ).toLowerCase();

            // accept custom rpc urls via the query param
            if (clusterFromUrl == "custom") {
              if (url.searchParams.has("customUrl")) {
                clusterFromUrl = url.searchParams.get("customUrl");
              } else clusterFromUrl = "localhost";
            }

            // auto detect the cluster selected via the url
            clusterUrl = parseRpcUrlOrMoniker(clusterFromUrl);

            if (url.pathname.match(/^\/address\//gi)) {
              input = url.pathname.match(/^\/address\/(.*)\/?/i)[1];
            } else if (url.pathname.match(/^\/(tx|transaction)\//gi)) {
              input = url.pathname.match(/^\/(tx|transaction)\/(.*)\/?/i)[2];
            } else if (url.pathname.match(/^\/(block)\//gi)) {
              input = url.pathname.match(/^\/block\/(.*)\/?/i)[1];
            } else {
              return warningOutro("Unsupported explorer URL");
            }
          } catch (err) {
            return errorMessage("Unable to parse inspector input as valid URL");
          }
        }

        clusterUrl = clusterUrl.startsWith("http")
          ? clusterUrl
          : getPublicSolanaRpcUrl(clusterUrl as SolanaCluster);
        const rpc = createSolanaRpc(clusterUrl);

        try {
          const selectedCluster = await getMonikerFromGenesisHash({ rpc });

          if (isAddress(input)) {
            await inspectAddress({
              rpc,
              cluster: selectedCluster,
              address: address(input),
            });
          } else if (isSignature(input)) {
            await inspectSignature({
              rpc,
              cluster: selectedCluster,
              signature: signature(input),
            });
          } else if (
            isStringifiedNumber(numberStringToNumber(input).toString())
          ) {
            await inspectBlock({
              rpc,
              cluster: selectedCluster,
              block: input,
            });
          } else {
            warnMessage(
              "Unable to determine your 'INPUT'. Check it's formatting and try again :)",
            );
          }
        } catch (err) {
          // node js fetch throws a TypeError for network errors (for some reason...)
          if (err instanceof TypeError) {
            warnMessage(
              "A network error occurred while connecting to your configured RPC endpoint." +
                "\nIs your RPC connection available at: " +
                clusterUrl,
            );
          } else {
            warnMessage(err);
          }
        }
      })
  );
}
