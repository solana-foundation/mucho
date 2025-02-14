import { Command, Option } from "@commander-js/extra-typings";
import { cliOutputConfig, loadSolanaCliConfig } from "@/lib/cli";
import { COMMON_OPTIONS } from "@/const/commands";
import { errorOutro, titleMessage, warnMessage } from "@/lib/logs";
import ora from "ora";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  getInitializeMintInstruction,
  getMintSize,
  getMintToInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import {
  appendTransactionMessageInstructions,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  generateKeyPairSigner,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  getProgramDerivedAddress,
  getAddressEncoder,
  isStringifiedNumber,
} from "@solana/web3.js";
import {
  getAddressFromStringOrFilePath,
  loadKeypairFromFile,
  parseRpcUrlOrMoniker,
  signAndSendTransaction,
} from "@/lib/solana";
import { getCreateAccountInstruction } from "@solana-program/system";
import {
  getCreateMetadataAccountV3Instruction,
  TOKEN_METADATA_PROGRAM_ADDRESS,
} from "@/lib/codama/metadata/instructions/createMetadataAccountV3";
import { getExplorerLink, getPublicSolanaRpcUrl } from "@/lib/web3";
import { wordWithPlurality } from "@/lib/utils";
import { SolanaCluster } from "@/types/config";

export function createTokenCommand() {
  return new Command("create")
    .configureOutput(cliOutputConfig)
    .description("create a new token")
    .usage("[options] [-- <CREATE_TOKEN_ARGS>...]")
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
    .addOption(new Option("-a --amount <AMOUNT>", `amount of tokens to create`))
    .addOption(
      new Option(
        "-m --metadata <METADATA_URI>",
        `URI for additional metadata info for your token`,
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
    .addOption(COMMON_OPTIONS.keypair)
    .addOption(COMMON_OPTIONS.url)
    .action(async (options) => {
      titleMessage("Create a new token");

      let cliConfig = loadSolanaCliConfig();

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

      if (!isStringifiedNumber(options.decimals)) {
        return errorOutro(
          "Please provide valid decimals with -d <DECIMALS>",
          "Invalid value",
        );
      }

      let cluster: SolanaCluster | string;

      try {
        options.url = options.url.startsWith("http")
          ? new URL(options.url).toString()
          : parseRpcUrlOrMoniker(options.url || cliConfig.json_rpc_url);

        cluster = options.url;

        // convert monikers to public endpoints
        if (!options.url.startsWith("http")) {
          options.url = getPublicSolanaRpcUrl(options.url);
        }
      } catch (err) {
        return errorOutro(
          "Please provide a valid url with -u <URL_OR_MONIKER>",
          "Invalid value",
        );
      }

      // payer will always be used to pay the fees
      const payer = await loadKeypairFromFile(options.keypair);

      // mint authority is required to sign in order to mint the initial tokens
      const mintAuthority = options.mintAuthority
        ? await loadKeypairFromFile(options.mintAuthority)
        : payer;

      const freezeAuthority = await getAddressFromStringOrFilePath(
        options.freezeAuthority || payer.address,
      );

      const mint = options.customMint
        ? await loadKeypairFromFile(options.customMint)
        : await generateKeyPairSigner();

      console.log(); // line spacer after the common "ExperimentalWarning for Ed25519 Web Crypto API"
      const spinner = ora("Preparing to create token").start();

      const websocketUrl = new URL(options.url);
      websocketUrl.protocol = "ws";
      cliConfig.websocket_url = websocketUrl.toString();

      const rpc = createSolanaRpc(options.url);
      const rpcSubscriptions = createSolanaRpcSubscriptions(
        cliConfig.websocket_url,
      );

      const space = BigInt(getMintSize());
      const rent = await rpc.getMinimumBalanceForRentExemption(space).send();
      const instructions = [
        getCreateAccountInstruction({
          payer,
          newAccount: mint,
          lamports: rent,
          space,
          programAddress: TOKEN_PROGRAM_ADDRESS,
        }),
        getInitializeMintInstruction({
          mint: mint.address,
          decimals: Number(options.decimals),
          mintAuthority: mintAuthority.address,
          freezeAuthority,
        }),
      ];

      spinner.text = "Fetching the latest blockhash";
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      const createMintTransaction = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(payer, tx),
        (tx) =>
          setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions(instructions, tx),
      );

      spinner.text = "Creating token mint: " + mint.address;
      const createMintSignature = await signAndSendTransaction(
        { rpc, rpcSubscriptions },
        createMintTransaction,
      );

      spinner.succeed("Token mint account created: " + mint.address);

      console.log(
        " ",
        getExplorerLink({
          cluster,
          transaction: createMintSignature,
        }).toString(),
        "\n",
      );

      spinner.start("Preparing to create metadata account");

      // Create metadata account
      const [metadataPda] = await getProgramDerivedAddress({
        programAddress: TOKEN_METADATA_PROGRAM_ADDRESS,
        seeds: [
          Buffer.from("metadata"),
          getAddressEncoder().encode(TOKEN_METADATA_PROGRAM_ADDRESS),
          getAddressEncoder().encode(mint.address),
        ],
      });

      const metadataInstruction = getCreateMetadataAccountV3Instruction({
        metadata: metadataPda,
        mint: mint.address,
        mintAuthority,
        payer,
        updateAuthority: mintAuthority,
        data: {
          name: options.name,
          symbol: options.symbol,
          uri: options.metadata,
          sellerFeeBasisPoints: 0,
          creators: null,
          collection: null,
          uses: null,
        },
        isMutable: true,
        collectionDetails: null,
      });

      const createMetadataTransaction = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(payer, tx),
        (tx) =>
          setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions([metadataInstruction], tx),
      );

      spinner.text = "Creating metadata account: " + metadataPda;
      const createMetadataSignature = await signAndSendTransaction(
        { rpc, rpcSubscriptions },
        createMetadataTransaction,
      );
      spinner.succeed("Metadata account created: " + metadataPda);

      console.log(
        " ",
        getExplorerLink({
          cluster,
          transaction: createMetadataSignature,
        }).toString(),
        "\n",
      );

      if (!options.amount) {
        warnMessage(
          "No amount provided, skipping minting tokens to your account",
        );
        // warnMessage(
        //   "Please provide an amount to mint tokens to your account with -a <AMOUNT>",
        // );
        spinner.stop();
        return;
      }

      if (!isStringifiedNumber(options.amount)) {
        return errorOutro(
          "Please provide a valid amount with -a <AMOUNT>",
          "Invalid value",
        );
      }

      spinner.start(
        `Preparing to mint '${options.amount}' tokens to: ${payer.address}`,
      );

      const [ata] = await findAssociatedTokenPda({
        owner: payer.address,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
        mint: mint.address,
      });

      const createATA =
        await getCreateAssociatedTokenIdempotentInstructionAsync({
          mint: mint.address,
          payer,
          owner: payer.address,
        });

      const mintTo = getMintToInstruction({
        mint: mint.address,
        token: ata,
        amount: BigInt(Number(options.amount) * 10 ** Number(options.decimals)),
        mintAuthority,
      });

      const createTokens = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(payer, tx),
        (tx) =>
          setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions([createATA, mintTo], tx),
      );

      const tokenPlurality = wordWithPlurality(
        options.amount,
        "token",
        "tokens",
      );

      spinner.text = `Minting '${options.amount}' ${tokenPlurality} to: ${payer.address}`;
      const createTokensSignature = await signAndSendTransaction(
        { rpc, rpcSubscriptions },
        createTokens,
      );
      spinner.succeed(
        `Minted '${options.amount}' ${tokenPlurality} to: ${payer.address}`,
      );
      console.log(
        " ",
        getExplorerLink({
          cluster,
          transaction: createTokensSignature,
        }).toString(),
      );
    });
}
