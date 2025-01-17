import ora from "ora";
import CliTable3 from "cli-table3";
import picocolors from "picocolors";
import { warnMessage } from "@/lib/logs";
import { InspectorBaseArgs } from "@/types/inspect";
import { Address, GetTransactionApi, Signature } from "@solana/web3.js";
import {
  unixTimestampToDate,
  lamportsToSol,
  getComputeBudgetDataFromTransaction,
} from "@/lib/web3";
import { timeAgo } from "../utils";

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

    const overviewTable = buildTransactionOverview(tx);
    const accountsTable = buildAccountsTable(tx);

    // we must the spinner before logging any thing or else the spinner will be displayed as frozen
    spinner.stop();

    console.log(accountsTable.toString());
    console.log(overviewTable.toString());
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
    blockTime.toLocaleDateString(undefined, {
      dateStyle: "medium",
    }) +
      " " +
      blockTime.toLocaleTimeString(undefined, {
        timeZoneName: "short",
      }) +
      `\n(${timeAgo(blockTime)})`,
  ]);
  table.push(["Version", tx.version]);
  table.push(["Slot", new Intl.NumberFormat().format(tx.slot)]);
  table.push(["Fee (SOL)", "~" + lamportsToSol(tx.meta.fee)]);

  const budget = getComputeBudgetDataFromTransaction(tx);
  table.push([
    "Compute units consumed",
    new Intl.NumberFormat().format(budget.unitsConsumed),
  ]);
  // table.push([
  //   "Compute unit limit",
  //   new Intl.NumberFormat().format(budget.unitLimit),
  // ]);
  table.push([
    "Compute units requested",
    budget.unitsRequested
      ? new Intl.NumberFormat().format(budget.unitsRequested)
      : picocolors.red(
          `NONE SET - fallback to ${new Intl.NumberFormat().format(
            200_000 * tx.transaction.message.instructions.length,
          )}`,
        ),
  ]);
  table.push([
    "Compute unit price (in microLamports)",
    budget.unitPrice
      ? new Intl.NumberFormat().format(budget.unitPrice)
      : picocolors.red("NONE"),
  ]);

  return table;
}

function buildAccountsTable(
  tx: ReturnType<GetTransactionApi["getTransaction"]>,
): CliTable3.Table {
  const table = new CliTable3({
    head: ["#", "Address", "Details"],
    style: {
      head: [!tx.meta.err ? "green" : "red"],
    },
  });

  let counter = 1;

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

  tx.transaction.message.accountKeys.map((address, index) => {
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

    // todo: add support for custom labels for the 'address'

    table.push([counter, address, details.join(", ").trim()]);
    counter++;
  });

  tx.meta.loadedAddresses.writable.map((address) => {
    table.push([
      counter,
      address,
      ["Address Lookup Table", "Writable"].join(", ").trim(),
    ]);
    counter++;
  });
  tx.meta.loadedAddresses.readonly.map((address) => {
    table.push([counter, address, ["Address Lookup Table"].join(", ").trim()]);
    counter++;
  });

  return table;
}
