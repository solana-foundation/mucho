import ora from "ora";
import CliTable3 from "cli-table3";
import { InspectorBaseArgs } from "@/types/inspect";
import type {
  AccountInfoBase,
  AccountInfoWithBase64EncodedData,
  Address,
  SolanaRpcResponse,
} from "gill";
import { getExplorerLink, lamportsToSol } from "@/lib/web3";

type GetAccountInfoApiResponse<T> = (AccountInfoBase & T) | null;

type BuildTableInput = {
  account: SolanaRpcResponse<
    GetAccountInfoApiResponse<AccountInfoWithBase64EncodedData>
  >;
};

export async function inspectAddress({
  rpc,
  cluster,
  address,
  commitment = "confirmed",
}: InspectorBaseArgs & { address: Address }) {
  const spinner = ora("Fetching account").start();
  try {
    const explorerUrl = getExplorerLink({
      cluster,
      address,
    }).toString();

    const account = await rpc
      .getAccountInfo(address, {
        commitment,
        // base58 is the default, but also deprecated and causes errors
        // for large 'data' values (like with program accounts)
        encoding: "base64",
      })
      .send();

    if (!account) {
      throw "Account not found. Try the Solana Explorer:\n" + explorerUrl;
    }

    const overviewTable = buildAccountOverview({ account });

    // we must the spinner before logging any thing or else the spinner will be displayed as frozen
    spinner.stop();

    console.log(overviewTable.toString());

    console.log("Open on Solana Explorer:");
    console.log(explorerUrl);
  } finally {
    spinner.stop();
  }
}

function buildAccountOverview({
  account: { value: account },
}: BuildTableInput): CliTable3.Table {
  const table = new CliTable3({
    head: ["Account Overview"],
    style: {
      head: ["green"],
    },
  });

  table.push(["Owner", account.owner]);
  table.push(["Executable", account.executable]);
  table.push([
    "Balance (lamports)",
    new Intl.NumberFormat().format(account.lamports),
  ]);
  table.push(["Balance (sol)", lamportsToSol(account.lamports)]);
  table.push([
    "Space",
    // @ts-expect-error - known bug: `space` is missing from the type
    // see: https://github.com/anza-xyz/solana-web3.js/issues/12
    new Intl.NumberFormat().format(account.space) + " bytes",
  ]);

  return table;
}
