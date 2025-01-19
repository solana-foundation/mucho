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

type BuildTableInput = {
  tx: ReturnType<GetTransactionApi["getTransaction"]>;
  allAccounts: Address[];
  indexToProgramIds: Map<number, Address>;
};

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

    const allAccounts = tx.transaction.message.accountKeys
      .concat(tx.meta.loadedAddresses.writable)
      .concat(tx.meta.loadedAddresses.readonly);

    const indexToProgramIds = new Map<number, Address>();
    tx.transaction.message.instructions.map((ix) =>
      indexToProgramIds.set(ix.programIdIndex, allAccounts[ix.programIdIndex]),
    );

    const overviewTable = buildTransactionOverview({
      tx,
      allAccounts,
      indexToProgramIds,
    });
    const accountsTable = buildAccountsTable({
      tx,
      allAccounts,
      indexToProgramIds,
    });
    const ixsTable = buildInstructionsTable({
      tx,
      allAccounts,
      indexToProgramIds,
    });

    // we must the spinner before logging any thing or else the spinner will be displayed as frozen
    spinner.stop();

    console.log(accountsTable.toString());
    console.log(ixsTable.toString());
    console.log(overviewTable.toString());
  } catch (err) {
    spinner.stop();
    warnMessage(err);
  }
}

function buildTransactionOverview({ tx }: BuildTableInput): CliTable3.Table {
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

function buildInstructionsTable({
  tx,
  allAccounts,
  indexToProgramIds,
}: BuildTableInput): CliTable3.Table {
  const logs = parseProgramLogs(tx.meta.logMessages, tx.meta.err);

  const failedIx = logs.findIndex((ix) => ix.failed);

  const table = new CliTable3({
    head: ["#", "Instruction & Logs"],
    style: {
      head: [!tx.meta.err ? "green" : "red"],
    },
    wordWrap: true,
    colWidths: [3, 90],
  });

  tx.transaction.message.instructions.map((ix, index) => {
    let content: string[] = [
      indexToProgramIds.get(ix.programIdIndex) + " Program Instruction",
    ];

    if (logs[index].logs.find((log) => log.style == "error")) {
      content[0] = picocolors.red(content[0]);
    }

    // todo: support displaying the data somehow? maybe via idls?
    // content.push("  Data: " + ix.data);

    logs[index].logs.map((log) => {
      const text = log.prefix + log.text;
      if (log.style == "error") {
        content.push(picocolors.red(text));
      } else if (log.style == "success") {
        content.push(picocolors.green(text));
      } else {
        content.push(text);
      }
    });

    // debugging failed transactions could be aided by knowing which
    // accounts are actually included in the instruction that errored
    if (failedIx == index) {
      // todo: should be give a breakdown of how many accounts came from a ALT/LUT?
      content.push(`Accounts Used (${ix.accounts.length}):`);
      ix.accounts.map((index) => {
        content.push(
          "  #" +
            (index.toString().length == 1 ? `${index} ` : index) +
            " - " +
            allAccounts[index],
        );
      });
    }

    table.push([index, content.join("\n")]);
  });

  return table;
}

function buildAccountsTable({ tx }: BuildTableInput): CliTable3.Table {
  const table = new CliTable3({
    head: ["#", "Address", "Details"],
    style: {
      head: [!tx.meta.err ? "green" : "red"],
    },
  });

  let counter = 0;

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

  function isInFailedIx(index: number) {
    return tx.meta.err &&
      tx.transaction.message.instructions[
        tx.transaction.message.instructions.length - 1
      ].accounts.includes(index)
      ? true
      : false;
  }

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

    table.push([
      counter,
      isInFailedIx(index) ? picocolors.red(address) : address,
      details.join(", ").trim(),
    ]);
    counter++;
  });

  tx.meta.loadedAddresses.writable.map((address, index) => {
    table.push([
      counter,
      isInFailedIx(index) ? picocolors.red(address) : address,
      ["Address Lookup Table", "Writable"].join(", ").trim(),
    ]);
    counter++;
  });
  tx.meta.loadedAddresses.readonly.map((address, index) => {
    table.push([
      counter,
      isInFailedIx(index) ? picocolors.red(address) : address,
      ["Address Lookup Table"].join(", ").trim(),
    ]);
    counter++;
  });

  return table;
}

export type LogMessage = {
  text: string;
  prefix: string;
  style: "muted" | "info" | "success" | "error";
};

export type InstructionLogs = {
  invokedProgram: string | null;
  logs: LogMessage[];
  computeUnits: number;
  truncated: boolean;
  failed: boolean;
};

export function parseProgramLogs(
  logs: readonly string[] | string[],
  error: TransactionError | null,
): InstructionLogs[] {
  let depth = 0;
  const prettyLogs: InstructionLogs[] = [];
  function prefixBuilder(
    // Indent level starts at 1.
    indentLevel: number,
  ) {
    let prefix;
    if (indentLevel <= 0) {
      console.warn(
        `Tried to build a prefix for a program log at indent level \`${indentLevel}\`. ` +
          "Logs should only ever be built at indent level 1 or higher.",
      );
      prefix = "";
    } else {
      prefix = new Array(indentLevel - 1).fill("\u00A0\u00A0").join("");
    }
    return prefix + "> ";
  }

  let prettyError;
  if (error) {
    prettyError = getTransactionInstructionError(error);
  }

  logs.forEach((log) => {
    if (log.startsWith("Program data:")) {
      // do nothing
    } else if (log.startsWith("Program log:")) {
      // Use passive tense
      log = log.replace(/Program log: (.*)/g, (match, p1) => {
        return `Program logged: "${p1}"`;
      });

      prettyLogs[prettyLogs.length - 1].logs.push({
        prefix: prefixBuilder(depth),
        style: "muted",
        text: log,
      });
    } else if (log.startsWith("Log truncated")) {
      prettyLogs[prettyLogs.length - 1].truncated = true;
    } else {
      const regex = /Program (\w*) invoke \[(\d)\]/g;
      const matches = Array.from(log.matchAll(regex));

      if (matches.length > 0) {
        const programAddress = matches[0][1];
        // const programName = getProgramName(programAddress, cluster);
        const programName = false;

        if (depth === 0) {
          prettyLogs.push({
            computeUnits: 0,
            failed: false,
            invokedProgram: programAddress,
            logs: [],
            truncated: false,
          });
        } else {
          prettyLogs[prettyLogs.length - 1].logs.push({
            prefix: prefixBuilder(depth),
            style: "info",
            text: `Program invoked: ${programName || programAddress}`,
          });
        }

        depth++;
      } else if (log.includes("success")) {
        prettyLogs[prettyLogs.length - 1].logs.push({
          prefix: prefixBuilder(depth),
          style: "success",
          text: `Program returned success`,
        });
        depth--;
      } else if (log.includes("failed")) {
        const instructionLog = prettyLogs[prettyLogs.length - 1];
        instructionLog.failed = true;

        let currText = `Program returned error: "${log.slice(
          log.indexOf(": ") + 2,
        )}"`;
        // failed to verify log of previous program so reset depth and print full log
        if (log.startsWith("failed")) {
          depth++;
          currText = log.charAt(0).toUpperCase() + log.slice(1);
        }

        instructionLog.logs.push({
          prefix: prefixBuilder(depth),
          style: "error",
          text: currText,
        });
        depth--;
      } else {
        if (depth === 0) {
          prettyLogs.push({
            computeUnits: 0,
            failed: false,
            invokedProgram: null,
            logs: [],
            truncated: false,
          });
          depth++;
        }

        // Remove redundant program address from logs
        log = log.replace(
          /Program \w* consumed (\d*) (.*)/g,
          (match, p1, p2) => {
            // Only aggregate compute units consumed from top-level tx instructions
            // because they include inner ix compute units as well.
            if (depth === 1) {
              prettyLogs[prettyLogs.length - 1].computeUnits +=
                Number.parseInt(p1);
            }

            return `Program consumed: ${p1} ${p2}`;
          },
        );

        // native program logs don't start with "Program log:"
        prettyLogs[prettyLogs.length - 1].logs.push({
          prefix: prefixBuilder(depth),
          style: "muted",
          text: log,
        });
      }
    }
  });

  // If the instruction's simulation returned an error without any logs then add an empty log entry for Runtime error
  // For example BpfUpgradableLoader fails without returning any logs for Upgrade instruction with buffer that doesn't exist
  if (prettyError && prettyLogs.length === 0) {
    prettyLogs.push({
      computeUnits: 0,
      failed: true,
      invokedProgram: null,
      logs: [],
      truncated: false,
    });
  }

  if (prettyError && prettyError.index === prettyLogs.length - 1) {
    const failedIx = prettyLogs[prettyError.index];
    if (!failedIx.failed) {
      failedIx.failed = true;
      failedIx.logs.push({
        prefix: prefixBuilder(1),
        style: "error",
        text: `Runtime error: ${prettyError.message}`,
      });
    }
  }

  return prettyLogs;
}

import { TransactionError } from "@solana/web3.js";

const instructionErrorMessage: Map<string, string> = new Map([
  ["GenericError", "generic instruction error"],
  ["InvalidArgument", "invalid program argument"],
  ["InvalidInstructionData", "invalid instruction data"],
  ["InvalidAccountData", "invalid account data for instruction"],
  ["AccountDataTooSmall", "account data too small for instruction"],
  ["InsufficientFunds", "insufficient funds for instruction"],
  ["IncorrectProgramId", "incorrect program id for instruction"],
  ["MissingRequiredSignature", "missing required signature for instruction"],
  [
    "AccountAlreadyInitialized",
    "instruction requires an uninitialized account",
  ],
  ["UninitializedAccount", "instruction requires an initialized account"],
  [
    "UnbalancedInstruction",
    "sum of account balances before and after instruction do not match",
  ],
  ["ModifiedProgramId", "instruction modified the program id of an account"],
  [
    "ExternalAccountLamportSpend",
    "instruction spent from the balance of an account it does not own",
  ],
  [
    "ExternalAccountDataModified",
    "instruction modified data of an account it does not own",
  ],
  [
    "ReadonlyLamportChange",
    "instruction changed the balance of a read-only account",
  ],
  ["ReadonlyDataModified", "instruction modified data of a read-only account"],
  ["DuplicateAccountIndex", "instruction contains duplicate accounts"],
  ["ExecutableModified", "instruction changed executable bit of an account"],
  ["RentEpochModified", "instruction modified rent epoch of an account"],
  ["NotEnoughAccountKeys", "insufficient account keys for instruction"],
  ["AccountDataSizeChanged", "non-system instruction changed account size"],
  ["AccountNotExecutable", "instruction expected an executable account"],
  [
    "AccountBorrowFailed",
    "instruction tries to borrow reference for an account which is already borrowed",
  ],
  [
    "AccountBorrowOutstanding",
    "instruction left account with an outstanding borrowed reference",
  ],
  [
    "DuplicateAccountOutOfSync",
    "instruction modifications of multiply-passed account differ",
  ],
  ["Custom", "custom program error: {0}"],
  ["InvalidError", "program returned invalid error code"],
  ["ExecutableDataModified", "instruction changed executable accounts data"],
  [
    "ExecutableLamportChange",
    "instruction changed the balance of a executable account",
  ],
  ["ExecutableAccountNotRentExempt", "executable accounts must be rent exempt"],
  ["UnsupportedProgramId", "Unsupported program id"],
  ["CallDepth", "Cross-program invocation call depth too deep"],
  ["MissingAccount", "An account required by the instruction is missing"],
  [
    "ReentrancyNotAllowed",
    "Cross-program invocation reentrancy not allowed for this instruction",
  ],
  [
    "MaxSeedLengthExceeded",
    "Length of the seed is too long for address generation",
  ],
  ["InvalidSeeds", "Provided seeds do not result in a valid address"],
  ["InvalidRealloc", "Failed to reallocate account data"],
  ["ComputationalBudgetExceeded", "Computational budget exceeded"],
  [
    "PrivilegeEscalation",
    "Cross-program invocation with unauthorized signer or writable account",
  ],
  [
    "ProgramEnvironmentSetupFailure",
    "Failed to create program execution environment",
  ],
  ["ProgramFailedToComplete", "Program failed to complete"],
  ["ProgramFailedToCompile", "Program failed to compile"],
  ["Immutable", "Account is immutable"],
  ["IncorrectAuthority", "Incorrect authority provided"],
  ["BorshIoError", "Failed to serialize or deserialize account data: {0}"],
  [
    "AccountNotRentExempt",
    "An account does not have enough lamports to be rent-exempt",
  ],
  ["InvalidAccountOwner", "Invalid account owner"],
  ["ArithmeticOverflow", "Program arithmetic overflowed"],
  ["UnsupportedSysvar", "Unsupported sysvar"],
  ["IllegalOwner", "Provided owner is not allowed"],
]);

export type ProgramError = {
  index: number;
  message: string;
};

export function getTransactionInstructionError(
  error?: TransactionError | null,
): ProgramError | undefined {
  if (!error) {
    return;
  }

  if (typeof error === "object" && "InstructionError" in error) {
    const innerError = error["InstructionError"] as any;
    const index = innerError[0] as number;
    const instructionError = innerError[1];

    return {
      index,
      message: getInstructionError(instructionError),
    };
  }
}

function getInstructionError(error: any): string {
  let out;
  let value;

  if (typeof error === "string") {
    const message = instructionErrorMessage.get(error);
    if (message) {
      return message;
    }
  } else if ("Custom" in error) {
    out = instructionErrorMessage.get("Custom");
    value = error["Custom"];
  } else if ("BorshIoError" in error) {
    out = instructionErrorMessage.get("BorshIoError");
    value = error["BorshIoError"];
  }

  if (out && value) {
    return out.replace("{0}", value);
  }

  return "Unknown instruction error";
}
