import { Argument, Command } from "@commander-js/extra-typings";
import { cliOutputConfig } from "@/lib/cli";
import {
  errorMessage,
  errorOutro,
  titleMessage,
  warningOutro,
} from "@/lib/logs";
import ora from "ora";
import { COMMON_OPTIONS } from "@/const/commands";
import { getPublicSolanaRpcUrl } from "@/lib/solana";
import {
  address,
  Address,
  createSolanaRpc,
  isAddress,
  isSignature,
  Signature,
  signature,
} from "@solana/web3.js";
import CliTable3 from "cli-table3";
import picocolors from "picocolors";

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

        // let pubkey: PublicKey | null = null;
        // let signature: Signature | null = null;

        // try {
        // } catch (err) {}

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

        if (isAddress(input)) {
          await inspectAddress(address(input));
        } else if (isSignature(input)) {
          await inspectSignature(signature(input));
        }

        // const spinner = ora("Gathering mucho info").start();
      })
  );
}

async function inspectAddress(address: Address) {
  console.log("address", address);
}
async function inspectSignature(signature: Signature) {
  const rpc = createSolanaRpc(getPublicSolanaRpcUrl("mainnet-beta"));

  try {
    const tx = await rpc
      .getTransaction(signature, {
        // always set the lowest commitment level - `processed` is not supported here for some reason?
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      })
      .send();

    console.log(tx);
    const tableStyle = {
      head: [!tx.meta.err ? "green" : "red"],
    };

    if (tx.version !== "legacy") {
      // return errorMessage("Version transactions are not supported yet");
      // loaded is only for versioned transactions
      // console.log("tx.meta.loadedAddresses");
      // console.log(tx.meta.loadedAddresses);
    }

    console.log(tx.meta);

    const overviewTable = new CliTable3({
      head: [
        "Transaction Overview",
        !tx.meta.err ? picocolors.green("SUCCESS") : picocolors.red("FAILED"),
      ],
      style: tableStyle,
    });

    // todo: handle showing the error
    // if (tx.meta.err) {
    //   overviewTable.push(["Error", tx.meta.err.toString()]);
    //   console.log(tx.meta.err);
    // }

    const blockTime = new Date(Number(tx.blockTime) * 1000);
    overviewTable.push([
      "Timestamp",
      blockTime.toLocaleDateString() + blockTime.toLocaleTimeString(),
    ]);
    overviewTable.push(["Version", tx.version]);
    overviewTable.push(["Slot", new Intl.NumberFormat().format(tx.slot)]);
    overviewTable.push([
      "Compute units consumed",
      new Intl.NumberFormat().format(tx.meta.computeUnitsConsumed),
    ]);
    overviewTable.push([
      "Fee (SOL)",
      "~" +
        new Intl.NumberFormat("en-US", { maximumFractionDigits: 9 }).format(
          Number(tx.meta.fee) / 1_000_000_000,
        ),
      // new Intl.NumberFormat(undefined, {
      //   minimumSignificantDigits: 6,
      // }).format(tx.meta.fee / 1_000_000_000n),
    ]);

    console.log(overviewTable.toString());

    const numAccountKeys = tx.transaction.message.accountKeys.length;
    const {
      numRequiredSignatures,
      numReadonlySignedAccounts,
      numReadonlyUnsignedAccounts,
    } = tx.transaction.message.header;

    const indexToProgramIds = new Map<number, Address>();
    tx.transaction.message.instructions.map((ix) =>
      indexToProgramIds.set(
        ix.programIdIndex,
        tx.transaction.message.accountKeys[ix.programIdIndex],
      ),
    );

    const accountsTable = new CliTable3({
      head: ["Index", "Account", "Details"],
      style: tableStyle,
    });

    // console.log("Accounts:");
    tx.transaction.message.accountKeys.map((account, index) => {
      let details: string[] = [];

      const numUnsignedAccounts = index - numRequiredSignatures;

      // isFeePayer
      if (index == 0) details.push("Fee Payer");

      // isAccountSigner
      if (index < numRequiredSignatures) {
        details.push("Signer");
      }

      // isAccountWritable
      if (
        index >= numRequiredSignatures &&
        numUnsignedAccounts <
          numAccountKeys - numRequiredSignatures - numReadonlyUnsignedAccounts
      ) {
        details.push("Writable");
      } else if (index < numRequiredSignatures - numReadonlySignedAccounts) {
        details.push("Writable");
      }

      if (indexToProgramIds.has(index)) {
        details.push("Program");
      }

      // todo: should we note if they are read only?
      // if (details.length == 0) details.push("Read Only");

      // todo: add support for custom labels for the 'account'

      accountsTable.push([index, account, details.join(", ").trim()]);
    });
    // console.log(accountsTable.toString());

    // console.log("tx.transaction.message.instructions");
    // console.log(tx.transaction.message.instructions);
    // const instructionsTable = new CliTable3({
    //   head: ["Index", "Account", "Details"],
    //   style: tableStyle,
    // });
    // tx.transaction.message.instructions.map((ix) => {});
    // console.log(instructionsTable.toString());
  } catch (err) {
    console.error(err);
    errorOutro("Error occurred while fetching this transaction");
  }
}
