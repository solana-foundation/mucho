import { Command, Option } from "@commander-js/extra-typings";
import { cliOutputConfig, loadSolanaCliConfig } from "@/lib/cli";
import { COMMON_OPTIONS } from "@/const/commands";
import { errorOutro, titleMessage } from "@/lib/logs";
import ora from "ora";

import { wordWithPlurality } from "@/lib/utils";
import {
  createSolanaClient,
  isStringifiedNumber,
  signTransactionMessageWithSigners,
  getExplorerLink,
  isSolanaError,
  SOLANA_ERROR__ACCOUNTS__ACCOUNT_NOT_FOUND,
} from "gill";
import {
  buildTransferTokensTransaction,
  fetchMint,
  fetchToken,
  getAssociatedTokenAccountAddress,
} from "gill/programs/token";
import { loadKeypairSignerFromFile } from "gill/node";
import { parseOrLoadSignerAddress } from "@/lib/gill/keys";
import { parseOptionsFlagForRpcUrl } from "@/lib/cli/parsers";

export function transferTokenCommand() {
  return new Command("transfer")
    .configureOutput(cliOutputConfig)
    .description("transfer tokens from one wallet to another")
    .addHelpText(
      "after",
      `Examples:
  $ npx mucho token transfer --url devnet \\
      --mint <MINT_ADDRESS> \\
      --destination <DESTINATION_WALLET_ADDRESS> \\
      --amount 100

  $ npx mucho token transfer --url devnet \\
      --mint <MINT_ADDRESS> \\
      --destination <DESTINATION_WALLET_ADDRESS> \\
      --source /path/to/source-wallet.json \\
      --amount 100`,
    )
    .addOption(
      new Option("-a --amount <AMOUNT>", `amount of tokens to transfer`),
    )
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
        "--source <SOURCE_KEYPAIR_FILEPATH>",
        `keypair file for the source wallet (default: same as --keypair)`,
      ),
    )
    .addOption(COMMON_OPTIONS.keypair)
    .addOption(COMMON_OPTIONS.url)
    .action(async (options) => {
      titleMessage("Transfer tokens");

      const parsedRpcUrl = parseOptionsFlagForRpcUrl(
        options.url,
        /* use the Solana cli config's rpc url as the fallback */
        loadSolanaCliConfig().json_rpc_url,
      );

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

      // payer will always be used to pay the fees
      const payer = await loadKeypairSignerFromFile(options.keypair);

      const mint = await parseOrLoadSignerAddress(options.mint);
      const destination = await parseOrLoadSignerAddress(options.destination);

      // source wallet is required to sign in order to authorize the transfer
      const source = options.source
        ? await loadKeypairSignerFromFile(options.source)
        : payer;

      console.log(); // line spacer after the common "ExperimentalWarning for Ed25519 Web Crypto API"
      const spinner = ora("Preparing to transfer tokens").start();

      const { rpc, sendAndConfirmTransaction } = createSolanaClient({
        urlOrMoniker: parsedRpcUrl.url,
      });

      const tokenPlurality = wordWithPlurality(
        options.amount,
        "token",
        "tokens",
      );

      // fetch the current mint from the chain to validate it
      const mintAccount = await fetchMint(rpc, mint).catch((err) => {
        if (isSolanaError(err, SOLANA_ERROR__ACCOUNTS__ACCOUNT_NOT_FOUND)) {
          spinner.fail();
          throw errorOutro(`Mint account not found: ${mint}`, "Mint Not Found");
        }
        throw err;
      });

      // fetch the source ata from the chain to validate it
      const [sourceAta, destinationAta] = await Promise.all([
        getAssociatedTokenAccountAddress(
          mint,
          source.address,
          mintAccount.programAddress,
        ),
        getAssociatedTokenAccountAddress(
          mint,
          destination,
          mintAccount.programAddress,
        ),
      ]);

      const tokenAccount = await fetchToken(rpc, sourceAta).catch((err) => {
        if (isSolanaError(err, SOLANA_ERROR__ACCOUNTS__ACCOUNT_NOT_FOUND)) {
          spinner.fail();
          throw errorOutro(
            `Source token account not found:\n` +
              `- mint: ${mint}\n` +
              `- source owner: ${source.address}\n` +
              `- source ata: ${sourceAta}`,
            "Token Account Not Found",
          );
        }
        throw err;
      });

      if (tokenAccount.data.amount < BigInt(options.amount)) {
        spinner.fail();
        return errorOutro(
          `The provided source wallet does not have enough tokens to transfer:\n` +
            `- current balance: ${tokenAccount.data.amount}\n` +
            `- transfer amount: ${options.amount}`,
          "Insufficient Balance",
        );
      }

      spinner.text = "Fetching the latest blockhash";
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      spinner.text = `Preparing to transfer '${options.amount}' ${tokenPlurality} to ${destination}`;

      const mintTokensTx = await buildTransferTokensTransaction({
        feePayer: payer,
        latestBlockhash,
        mint,
        authority: source,
        tokenProgram: mintAccount.programAddress,
        amount: BigInt(options.amount),
        destination,
        destinationAta,
        sourceAta,
      });

      spinner.text = `Transferring '${options.amount}' ${tokenPlurality} to ${destination}`;
      let signature = await sendAndConfirmTransaction(
        await signTransactionMessageWithSigners(mintTokensTx),
      );
      spinner.succeed(
        `Transferred '${options.amount}' ${tokenPlurality} to ${destination}`,
      );
      console.log(
        " ",
        getExplorerLink({
          cluster: parsedRpcUrl.cluster,
          transaction: signature,
        }),
      );

      const [updatedSourceTokenAccount, updatedDestinationTokenAccount] =
        await Promise.all([
          fetchToken(rpc, sourceAta),
          fetchToken(rpc, destinationAta),
        ]);

      console.log();
      titleMessage("Updated token balances");

      console.log(
        // `Updated token balances:\n` +
        `- ${source.address} - source wallet: ${updatedSourceTokenAccount.data.amount}\n` +
          `- ${destination} - destination wallet: ${updatedDestinationTokenAccount.data.amount}`,
      );
    });
}
