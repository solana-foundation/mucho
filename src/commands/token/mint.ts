import { Command, Option } from "@commander-js/extra-typings";
import { cliOutputConfig, loadSolanaCliConfig } from "@/lib/cli";
import { COMMON_OPTIONS } from "@/const/commands";
import { errorOutro, titleMessage } from "@/lib/logs";
import ora from "ora";

import { parseRpcUrlOrMoniker } from "@/lib/solana";
import { wordWithPlurality } from "@/lib/utils";
import {
  createSolanaClient,
  isStringifiedNumber,
  signTransactionMessageWithSigners,
  getExplorerLink,
  getPublicSolanaRpcUrl,
  isNone,
  isSome,
  SolanaClusterMoniker,
} from "gill";
import { buildMintTokensTransaction, fetchMint } from "gill/programs/token";
import { loadKeypairSignerFromFile } from "gill/node";
import { parseOrLoadSignerAddress } from "@/lib/gill/keys";

export function mintTokenCommand() {
  return new Command("mint")
    .configureOutput(cliOutputConfig)
    .description(
      "mint new tokens from an existing token's mint (raising the supply)",
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
    .addOption(COMMON_OPTIONS.keypair)
    .addOption(COMMON_OPTIONS.url)
    .action(async (options) => {
      titleMessage("Mint new tokens");

      let cliConfig = loadSolanaCliConfig();

      if (!options.mint) {
        return errorOutro(
          "Please provide a mint address -m <ADDRESS_OR_KEYPAIR_FILEPATH>",
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

      let cluster;

      try {
        options.url = options.url?.startsWith("http")
          ? new URL(options.url).toString()
          : parseRpcUrlOrMoniker(
              options.url || cliConfig.json_rpc_url || "devnet",
            );

        cluster = options.url;

        // convert monikers to public endpoints
        if (!options.url.startsWith("http")) {
          options.url = getPublicSolanaRpcUrl(options.url as any);
        }
      } catch (err) {
        return errorOutro(
          "Please provide a valid url with -u <URL_OR_MONIKER>",
          "Invalid value",
        );
      }

      // payer will always be used to pay the fees
      const payer = await loadKeypairSignerFromFile(options.keypair);

      const mint = await parseOrLoadSignerAddress(options.mint);
      const destination = await parseOrLoadSignerAddress(options.destination);

      // mint authority is required to sign in order to mint the initial tokens
      const mintAuthority = options.mintAuthority
        ? await loadKeypairSignerFromFile(options.mintAuthority)
        : payer;

      console.log(); // line spacer after the common "ExperimentalWarning for Ed25519 Web Crypto API"
      const spinner = ora("Preparing to mint tokens").start();

      const { rpc, sendAndConfirmTransaction } = createSolanaClient({
        urlOrMoniker: options.url,
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
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      spinner.text = `Preparing to mint '${options.amount}' ${tokenPlurality} to: ${destination}`;

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

      spinner.text = `Minting '${options.amount}' ${tokenPlurality} to: ${destination}`;
      let signature = await sendAndConfirmTransaction(
        await signTransactionMessageWithSigners(mintTokensTx),
      );
      spinner.succeed(
        `Minted '${options.amount}' ${tokenPlurality} to: ${destination}`,
      );
      console.log(
        " ",
        getExplorerLink({
          cluster: cluster as SolanaClusterMoniker,
          transaction: signature,
        }),
      );
    });
}
