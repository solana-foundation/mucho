import ora from "ora";
import CliTable3 from "cli-table3";
import { warnMessage } from "@/lib/logs";
import { InspectorBaseArgs } from "@/types/inspect";
import { Address, GetBlockApi } from "@solana/web3.js";
import {
  COMPUTE_BUDGET_PROGRAM_ID,
  unixTimestampToDate,
  VOTE_PROGRAM_ID,
} from "@/lib/web3";
import { numberStringToNumber, timeAgo } from "@/lib/utils";

export async function inspectBlock({
  rpc,
  block: blockNumber,
  commitment = "confirmed",
}: InspectorBaseArgs & { block: number | bigint | string }) {
  const spinner = ora("Fetching block, this could take a few moments").start();

  try {
    if (typeof blockNumber == "string") {
      try {
        // accept locale based numbers (1,222 for US and 1.222 for EU, etc)
        blockNumber = parseInt(numberStringToNumber(blockNumber).toString());
      } catch (err) {
        throw "Invalid block number provided";
      }
    }

    if (typeof blockNumber != "bigint" && typeof blockNumber != "number") {
      throw "Provided block number is not an actual number";
    }

    const [block, leaders] = await Promise.all([
      await rpc
        .getBlock(BigInt(blockNumber), {
          commitment,
          maxSupportedTransactionVersion: 0,
          rewards: true,
        })
        .send(),
      rpc.getSlotLeaders(BigInt(blockNumber), 1).send(),
    ]);

    if (!block) throw "Block not found";

    const overviewTable = buildBlockOverview({ block, leader: leaders[0] });

    // we must the spinner before logging any thing or else the spinner will be displayed as frozen
    spinner.stop();

    console.log(overviewTable.toString());
  } catch (err) {
    spinner.stop();
    warnMessage(err);
  }
}

function buildBlockOverview({
  block,
  leader,
}: {
  block: ReturnType<GetBlockApi["getBlock"]>;
  leader: Address;
}): CliTable3.Table {
  const table = new CliTable3({
    head: ["Block Overview"],
    style: {
      head: ["green"],
    },
  });

  const blockTime = unixTimestampToDate(block.blockTime);

  const successfulTxs = block.transactions.filter(
    (tx) => tx.meta?.err === null,
  );
  const voteTxs = block.transactions.filter((tx) =>
    tx.transaction.message.accountKeys.find(
      (account) => account == VOTE_PROGRAM_ID,
    ),
  );
  const failedTxCount = block.transactions.length - successfulTxs.length;
  const nonVoteTxCount = block.transactions.length - voteTxs.length;
  const computeBudgetTxs = block.transactions.filter((tx) =>
    tx.transaction.message.accountKeys.find(
      (account) => account == COMPUTE_BUDGET_PROGRAM_ID,
    ),
  );

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
  table.push(["Leader", leader]);
  table.push(["Blockhash", block.blockhash]);
  table.push(["Previous blockhash", block.previousBlockhash]);
  table.push([
    "Block height",
    new Intl.NumberFormat().format(block.blockHeight),
  ]);
  table.push(["Parent slot", new Intl.NumberFormat().format(block.parentSlot)]);
  table.push([
    "Total transactions",
    new Intl.NumberFormat().format(block.transactions.length),
  ]);
  table.push([
    "Successful transactions",
    new Intl.NumberFormat().format(successfulTxs.length) +
      ` (${new Intl.NumberFormat(undefined, {
        style: "percent",
      }).format(successfulTxs.length / block.transactions.length)})`,
  ]);
  table.push([
    "Failed transactions",
    new Intl.NumberFormat().format(failedTxCount) +
      ` (${new Intl.NumberFormat(undefined, {
        style: "percent",
      }).format(failedTxCount / block.transactions.length)})`,
  ]);
  table.push([
    "Vote transactions",
    new Intl.NumberFormat().format(voteTxs.length) +
      ` (${new Intl.NumberFormat(undefined, {
        style: "percent",
      }).format(voteTxs.length / block.transactions.length)})`,
  ]);
  table.push([
    "Non-vote transactions",
    new Intl.NumberFormat().format(nonVoteTxCount) +
      ` (${new Intl.NumberFormat(undefined, {
        style: "percent",
      }).format(nonVoteTxCount / block.transactions.length)})`,
  ]);
  table.push([
    "Compute budget transactions",
    new Intl.NumberFormat().format(computeBudgetTxs.length) +
      ` (${new Intl.NumberFormat(undefined, {
        style: "percent",
      }).format(computeBudgetTxs.length / block.transactions.length)})`,
  ]);

  return table;
}
