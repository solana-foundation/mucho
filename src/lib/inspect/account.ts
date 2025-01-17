import ora from "ora";
import CliTable3 from "cli-table3";
import picocolors from "picocolors";
import { warnMessage } from "@/lib/logs";
import { InspectorBaseArgs } from "@/types/inspect";
import { Address, GetTransactionApi, Signature } from "@solana/web3.js";

export async function inspectAddress({
  rpc,
  address,
  commitment = "confirmed",
}: InspectorBaseArgs & { address: Address }) {
  console.log("address", address);

  const spinner = ora("Fetching transaction").start();
  try {
    const account = await rpc
      .getAccountInfo(address, {
        commitment,
        // encoding: "jsonParsed",
      })
      .send();

    if (!account) throw "Account not found";

    // we must the spinner before logging any thing or else the spinner will be displayed as frozen
    spinner.stop();

    console.log(account);

    // console.log(overviewTable.toString());
    // console.log(accountsTable.toString());
  } catch (err) {
    spinner.stop();
    warnMessage(err);
  }
}
