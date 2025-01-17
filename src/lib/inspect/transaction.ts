import ora from "ora";
import CliTable3 from "cli-table3";
import picocolors from "picocolors";
import { warnMessage } from "@/lib/logs";
import { InspectorBaseArgs } from "@/types/inspect";
import { Address, GetTransactionApi, Signature } from "@solana/web3.js";
import { unixTimestampToDate, lamportsToSol } from "@/lib/web3";

export async function inspectSignature({
  rpc,
  signature,
}: InspectorBaseArgs & { signature: Signature }) {
  const spinner = ora("Fetching transaction").start();
  try {
    const tx = await rpc
      .getTransaction(signature, {
        // always set the lowest commitment level - `processed` is not supported here for some reason?
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
        // encoding: "jsonParsed",
      })
      .send();

    if (!tx) throw "Transaction not found";

    // console.log(tx);

    if (tx.version !== "legacy") {
      // return errorMessage("Version transactions are not supported yet");
      // loaded is only for versioned transactions
      // console.log("tx.meta.loadedAddresses");
      // console.log(tx.meta.loadedAddresses);
    }

    // console.log(tx.meta);

    // console.log("tx.transaction.message.instructions");
    // console.log(tx.transaction.message.instructions);
    // const instructionsTable = new CliTable3({
    //   head: ["Index", "Account", "Details"],
    //   style: tableStyle,
    // });
    // tx.transaction.message.instructions.map((ix) => {});
    // console.log(instructionsTable.toString());

    const overviewTable = buildTransactionOverview(tx);
    const accountsTable = buildAccountsTable(tx);

    // we must the spinner before logging any thing or else the spinner will be displayed as frozen
    spinner.stop();

    console.log(overviewTable.toString());
    console.log(accountsTable.toString());
  } catch (err) {
    spinner.stop();
    warnMessage(err);
  }
}

function buildTransactionOverview(
  tx: ReturnType<GetTransactionApi["getTransaction"]>,
): CliTable3.Table {
  const table = new CliTable3({
    head: [
      "Transaction Overview",
      !tx.meta.err ? picocolors.green("SUCCESS") : picocolors.red("FAILED"),
    ],
    style: {
      head: [!tx.meta.err ? "green" : "red"],
    },
  });

  // todo: handle showing the error
  // if (tx.meta.err) {
  //   table.push(["Error", tx.meta.err.toString()]);
  //   console.log(tx.meta.err);
  // }

  const blockTime = unixTimestampToDate(tx.blockTime);
  table.push([
    "Timestamp",
    blockTime.toLocaleDateString() + blockTime.toLocaleTimeString(),
  ]);
  table.push(["Version", tx.version]);
  table.push(["Slot", new Intl.NumberFormat().format(tx.slot)]);
  table.push([
    "Compute units consumed",
    new Intl.NumberFormat().format(tx.meta.computeUnitsConsumed),
  ]);
  table.push(["Fee (SOL)", "~" + lamportsToSol(tx.meta.fee)]);

  return table;
}

function buildAccountsTable(
  tx: ReturnType<GetTransactionApi["getTransaction"]>,
): CliTable3.Table {
  const table = new CliTable3({
    head: ["Index", "Account", "Details"],
    style: {
      head: [!tx.meta.err ? "green" : "red"],
    },
  });

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
        tx.transaction.message.accountKeys.length -
          numRequiredSignatures -
          numReadonlyUnsignedAccounts
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

    table.push([index, account, details.join(", ").trim()]);
  });

  return table;
}
