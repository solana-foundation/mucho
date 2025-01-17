import { Address, createSolanaRpc, Rpc, Signature } from "@solana/web3.js";
import CliTable3 from "cli-table3";
import picocolors from "picocolors";

type InspectorInputBase = {
  rpc: ReturnType<typeof createSolanaRpc>;
};

export async function inspectAddress({
  rpc,
  address,
}: InspectorInputBase & { address: Address }) {
  console.log("address", address);
}

export async function inspectSignature({
  rpc,
  signature,
}: InspectorInputBase & { signature: Signature }) {
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
}
