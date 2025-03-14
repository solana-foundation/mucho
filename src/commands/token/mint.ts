import { Command, Option } from "@commander-js/extra-typings";
import { cliOutputConfig, loadSolanaCliConfig } from "@/lib/cli";
import { COMMON_OPTIONS } from "@/const/commands";
import { errorOutro, titleMessage, warningOutro } from "@/lib/logs";
import ora from "ora";

import { wordWithPlurality } from "@/lib/utils";
import {
  createSolanaClient,
  isStringifiedNumber,
  getExplorerLink,
  isNone,
  isSome,
  isSolanaError,
} from "gill";
import { buildMintTokensTransaction, fetchMint } from "gill/programs/token";
import { loadKeypairSignerFromFile } from "gill/node";
import { parseOrLoadSignerAddress } from "@/lib/gill/keys";
import { parseOptionsFlagForRpcUrl } from "@/lib/cli/parsers";
import { simulateTransactionOnThrow } from "@/lib/gill/errors";
import { getRunningTestValidatorCommand } from "@/lib/shell/test-validator";

export function mintTokenCommand() {
  return new Command("mint")
    .configureOutput(cliOutputConfig)
    .description(
      "mint new tokens from an existing token's mint (raising the supply)",
    )
    .addHelpText(
      "after",
      `Examples:
  $ npx mucho token mint --url devnet \\
      --mint <MINT_ADDRESS> \\
      --destination <DESTINATION_WALLET_ADDRESS> \\
      --amount 100

  $ npx mucho token mint --url devnet \\
      --mint <MINT_ADDRESS> \\
      --destination <DESTINATION_WALLET_ADDRESS> \\
      --mint-authority /path/to/mint-authority.json \\
      --amount 100`,
    )
    .addOption(new Option("-a --amount <AMOUNT>", `amount of tokens to create`))
    .addOption(
      new Option(
        "-m --mint <ADDRESS_OR_KEYPAIR_FILEPATH>",
        `token's mint address or keypair file`,
      ),
    )
    .addOption(
      new Option(
        "-d --destination <ADDRESS>",
        `destination address to mint tokens to`,
      ),
    )
    .addOption(
      new Option(
        "--mint-authority <MINT_AUTHORITY_FILEPATH>",
        `keypair file for the mint authority (default: same as --keypair)`,
      ),
    )
    .addOption(COMMON_OPTIONS.skipPreflight)
    .addOption(COMMON_OPTIONS.commitment)
    .addOption(COMMON_OPTIONS.keypair)
    .addOption(COMMON_OPTIONS.url)
    .action(async (options) => {
      titleMessage("Mint new tokens");
      const spinner = ora();

      const parsedRpcUrl = parseOptionsFlagForRpcUrl(
        options.url,
        /* use the Solana cli config's rpc url as the fallback */
        loadSolanaCliConfig().json_rpc_url,
      );

      if (
        parsedRpcUrl.cluster == "localhost" &&
        !getRunningTestValidatorCommand()
      ) {
        spinner.stop();
        return warningOutro(
          `Attempted to use localnet with no local validator running. Operation canceled.`,
        );
      }

      if (!options.mint) {
        return errorOutro(
          "Please provide a mint address or keypair -m <ADDRESS_OR_KEYPAIR_FILEPATH>",
          "No mint address provided",
        );
      }

      if (!options.destination) {
        return errorOutro(
          "Please provide a destination address -d <ADDRESS>",
          "No destination address provided",
        );
      }

      if (!options.amount) {
        return errorOutro(
          "Please provide a valid amount with -a <AMOUNT>",
          "Invalid amount",
        );
      }

      if (!isStringifiedNumber(options.amount)) {
        return errorOutro(
          "Please provide valid amount with -a <AMOUNT>",
          "Invalid amount",
        );
      }

      spinner.start("Preparing to mint tokens");

      try {
        // payer will always be used to pay the fees
        const payer = await loadKeypairSignerFromFile(options.keypair);

        const mint = await parseOrLoadSignerAddress(options.mint);
        const destination = await parseOrLoadSignerAddress(options.destination);

        // mint authority is required to sign in order to mint the initial tokens
        const mintAuthority = options.mintAuthority
          ? await loadKeypairSignerFromFile(options.mintAuthority)
          : payer;

        const { rpc, sendAndConfirmTransaction, simulateTransaction } =
          createSolanaClient({
            urlOrMoniker: parsedRpcUrl.url,
          });

        const tokenPlurality = wordWithPlurality(
          options.amount,
          "token",
          "tokens",
        );

        // fetch the current mint from the chain to validate it
        const mintAccount = await fetchMint(rpc, mint);

        // supply is capped when the mint authority is removed
        if (isNone(mintAccount.data.mintAuthority)) {
          return errorOutro(
            "This token's can no longer mint new tokens to holders",
            "Frozen Mint",
          );
        }

        // only the current mint authority can authorize issuing new supply
        if (
          isSome(mintAccount.data.mintAuthority) &&
          mintAccount.data.mintAuthority.value !== mintAuthority.address
        ) {
          return errorOutro(
            `The provided mint authority cannot mint new tokens: ${mintAuthority.address}\n` +
              `Only ${mintAccount.data.mintAuthority.value} can authorize minting new tokens`,
            "Incorrect Mint Authority",
          );
        }

        spinner.text = "Fetching the latest blockhash";
        const { value: latestBlockhash } = await rpc
          .getLatestBlockhash()
          .send();

        spinner.text = `Preparing to mint '${options.amount}' ${tokenPlurality} to ${destination}`;

        const mintTokensTx = await buildMintTokensTransaction({
          feePayer: payer,
          latestBlockhash,
          mint,
          mintAuthority,
          tokenProgram: mintAccount.programAddress,
          amount: Number(options.amount),
          // amount: Number(options.amount) * 10 ** Number(options.decimals),
          destination: destination,
        });

        spinner.text = `Minting '${options.amount}' ${tokenPlurality} to ${destination}`;
        let signature = await sendAndConfirmTransaction(mintTokensTx, {
          commitment: options.commitment || "confirmed",
          skipPreflight: options.skipPreflight,
        }).catch(async (err) => {
          await simulateTransactionOnThrow(
            simulateTransaction,
            err,
            mintTokensTx,
          );
          throw err;
        });

        spinner.succeed(
          `Minted '${options.amount}' ${tokenPlurality} to ${destination}`,
        );
        console.log(
          " ",
          getExplorerLink({
            cluster: parsedRpcUrl.cluster,
            transaction: signature,
          }),
        );
      } catch (err) {
        spinner.stop();
        let title = "Failed to complete operation";
        let message = err;
        let extraLog = null;

        if (isSolanaError(err)) {
          title = "SolanaError";
          message = err.message;
          extraLog = err.context;
        }

        errorOutro(message, title, extraLog);
      }
    });
}
