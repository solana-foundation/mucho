import { Command, Option } from "@commander-js/extra-typings";
import { cliOutputConfig, loadSolanaCliConfig } from "@/lib/cli";
import { COMMON_OPTIONS } from "@/const/commands";
import { errorOutro, titleMessage, warnMessage } from "@/lib/logs";
import ora from "ora";

import { getAddressFromStringOrFilePath } from "@/lib/solana";
import { wordWithPlurality } from "@/lib/utils";
import {
  createSolanaClient,
  generateKeyPairSigner,
  isStringifiedNumber,
  signTransactionMessageWithSigners,
  getExplorerLink,
  isAddress,
  address,
} from "gill";
import {
  buildCreateTokenTransaction,
  buildMintTokensTransaction,
  checkedTokenProgramAddress,
  TOKEN_2022_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
} from "gill/programs/token";
import { loadKeypairSignerFromFile } from "gill/node";
import { parseOrLoadSignerAddress } from "@/lib/gill/keys";
import { parseOptionsFlagForRpcUrl } from "@/lib/cli/parsers";

export function createTokenCommand() {
  return new Command("create")
    .configureOutput(cliOutputConfig)
    .description("create a new token with metadata")
    .addHelpText(
      "after",
      `Examples:
  $ npx mucho token create --url devnet \\
      --name NAME \\
      --symbol SYMBOL \\
      --decimals 9 \\
      --metadata https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/Climate/metadata.json

  $ npx mucho token create --url devnet \\
      --token-program token22 \\
      --name NAME \\
      --symbol SYMBOL \\
      --decimals 9 \\
      --metadata https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/Climate/metadata.json`,
    )
    .addOption(
      new Option(
        "-n --name <NAME>",
        `the name of the token you want to create`,
      ),
    )
    .addOption(
      new Option(
        "-s --symbol <SYMBOL>",
        `symbol of the token you want to create`,
      ),
    )
    .addOption(
      new Option(
        "-d --decimals <DECIMALS>",
        `decimals of the token you want to create`,
      ),
    )
    .addOption(
      new Option(
        "-m --metadata <METADATA_URI>",
        `URI for additional metadata info for your token`,
      ),
    )
    .addOption(
      new Option(
        "-a --amount <AMOUNT>",
        `amount of tokens to issue to the mint authority upon creation`,
      ),
    )
    .addOption(
      new Option(
        "--destination <ADDRESS>",
        `destination address to mint tokens to upon creation (default: same as --keypair)`,
      ),
    )
    .addOption(
      new Option(
        "--custom-mint <CUSTOM_MINT_FILEPATH>",
        `keypair file for a custom mint address (default: auto generated)`,
      ),
    )
    .addOption(
      new Option(
        "--freeze-authority <FREEZE_AUTHORITY_OR_FILEPATH>",
        `address or freeze authority for your token (default: same as --keypair)`,
      ),
    )
    .addOption(
      new Option(
        "--mint-authority <MINT_AUTHORITY_FILEPATH>",
        `keypair file for the mint authority (default: same as --keypair)`,
      ),
    )
    .addOption(
      new Option(
        "--token-program <TOKEN_PROGRAM_ADDRESS>",
        "SPL token program to for this token (default: legacy)",
      ).choices(["legacy", "token22", "tokenExtensions", "<PROGRAM_ID>"]),
    )
    .addOption(COMMON_OPTIONS.keypair)
    .addOption(COMMON_OPTIONS.url)
    .action(async (options) => {
      titleMessage("Create a new token");

      if (!options.name) {
        return errorOutro(
          "Please provide a name with -n <NAME>",
          "No name provided",
        );
      }

      if (!options.symbol) {
        return errorOutro(
          "Please provide a symbol with -s <SYMBOL>",
          "No symbol provided",
        );
      }

      if (!options.metadata) {
        return errorOutro(
          "Please provide a metadata URI with -m <METADATA_URI>",
          "No metadata URI provided",
        );
      }

      if (!options.decimals) {
        warnMessage("No decimals provided, setting default to 9");
        options.decimals = "9";
      }

      if (options.tokenProgram) {
        if (!isAddress(options.tokenProgram)) {
          options.tokenProgram = options.tokenProgram.toLowerCase();
        }

        switch (options.tokenProgram) {
          case "token":
          case "default":
          case "legacy":
          case TOKEN_PROGRAM_ADDRESS: {
            options.tokenProgram = TOKEN_PROGRAM_ADDRESS;
            break;
          }
          case "token22":
          case "token2022":
          case "tokenExtension".toLowerCase(): // toLowerCase() to satisfy the spell checker
          case "tokenExtensions".toLowerCase(): // toLowerCase() to satisfy the spell checker
          case TOKEN_2022_PROGRAM_ADDRESS: {
            options.tokenProgram = TOKEN_2022_PROGRAM_ADDRESS;
            break;
          }
          default: {
            return errorOutro(
              "Please provide a valid token program using --token-program <TOKEN_PROGRAM_ADDRESS>",
              "Invalid Token Program",
            );
          }
        }
      } else options.tokenProgram = TOKEN_PROGRAM_ADDRESS;

      if (!isStringifiedNumber(options.decimals)) {
        return errorOutro(
          "Please provide valid decimals with -d <DECIMALS>",
          "Invalid value",
        );
      }

      const parsedRpcUrl = parseOptionsFlagForRpcUrl(
        options.url,
        /* use the Solana cli config's rpc url as the fallback */
        loadSolanaCliConfig().json_rpc_url,
      );

      const tokenProgram = checkedTokenProgramAddress(
        address(options.tokenProgram),
      );

      // payer will always be used to pay the fees
      const payer = await loadKeypairSignerFromFile(options.keypair);

      // mint authority is required to sign in order to mint the initial tokens
      const mintAuthority = options.mintAuthority
        ? await loadKeypairSignerFromFile(options.mintAuthority)
        : payer;

      const freezeAuthority = await getAddressFromStringOrFilePath(
        options.freezeAuthority || payer.address,
      );

      const mint = options.customMint
        ? await loadKeypairSignerFromFile(options.customMint)
        : await generateKeyPairSigner();

      console.log(); // line spacer after the common "ExperimentalWarning for Ed25519 Web Crypto API"
      const spinner = ora("Preparing to create token").start();

      const { rpc, sendAndConfirmTransaction } = createSolanaClient({
        urlOrMoniker: parsedRpcUrl.url,
      });

      spinner.text = "Fetching the latest blockhash";
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      spinner.text = "Preparing to create token mint";

      const createMintTx = await buildCreateTokenTransaction({
        feePayer: payer,
        latestBlockhash,
        mint,
        mintAuthority,
        tokenProgram,
        freezeAuthority,
        updateAuthority: mintAuthority,
        metadata: {
          isMutable: true,
          name: options.name,
          symbol: options.symbol,
          uri: options.metadata,
        },
        decimals: Number(options.decimals),
      });

      spinner.text = "Creating token mint: " + mint.address;
      let signature = await sendAndConfirmTransaction(
        await signTransactionMessageWithSigners(createMintTx),
      );

      spinner.succeed("Token mint created: " + mint.address);

      console.log(
        " ",
        getExplorerLink({
          cluster: parsedRpcUrl.cluster,
          transaction: signature,
        }),
        "\n",
      );

      if (!options.amount) {
        warnMessage(
          "No amount provided, skipping minting tokens to your account",
        );

        const mintCommand = [
          "npx mucho token mint",
          `--url ${parsedRpcUrl.cluster}`,
          `--mint ${mint.address}`,
          `--destination <DESTINATION_ADDRESS>`,
          `--amount <AMOUNT>`,
        ];

        console.log(
          "To mint new tokens to any destination wallet in the future, run the following command:",
        );
        console.log(mintCommand.join(" "));
        spinner.stop();
        return;
      }

      if (!isStringifiedNumber(options.amount)) {
        return errorOutro(
          "Please provide a valid amount with -a <AMOUNT>",
          "Invalid value",
        );
      }

      const destination = options.destination
        ? await parseOrLoadSignerAddress(options.destination)
        : payer.address;

      spinner.start(
        `Preparing to mint '${options.amount}' tokens to ${destination}`,
      );

      const mintTokensTx = await buildMintTokensTransaction({
        feePayer: payer,
        latestBlockhash,
        mint,
        mintAuthority,
        tokenProgram,
        amount: Number(options.amount) * 10 ** Number(options.decimals),
        destination,
      });

      const tokenPlurality = wordWithPlurality(
        options.amount,
        "token",
        "tokens",
      );

      spinner.text = `Minting '${options.amount}' ${tokenPlurality} to ${destination}`;
      signature = await sendAndConfirmTransaction(
        await signTransactionMessageWithSigners(mintTokensTx),
      );
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
    });
}
