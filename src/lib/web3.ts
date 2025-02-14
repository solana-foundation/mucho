import { SolanaCluster } from "@/types/config";
import {
  ComputeBudgetInstruction,
  identifyComputeBudgetInstruction,
  parseRequestHeapFrameInstruction,
  parseRequestUnitsInstruction,
  parseSetComputeUnitLimitInstruction,
  parseSetComputeUnitPriceInstruction,
  parseSetLoadedAccountsDataSizeLimitInstruction,
} from "@solana-program/compute-budget";
import {
  address,
  Blockhash,
  createSolanaRpc,
  devnet,
  DevnetUrl,
  getBase58Encoder,
  GetTransactionApi,
  mainnet,
  MainnetUrl,
  testnet,
  TestnetUrl,
  UnixTimestamp,
} from "@solana/web3.js";

type GenericUrl = string & {};

export type ModifiedClusterUrl =
  | DevnetUrl
  | MainnetUrl
  | TestnetUrl
  | GenericUrl;

export type SolanaUrlOrMoniker = SolanaCluster | ModifiedClusterUrl;

/**
 * Get a public Solana RPC endpoint for a cluster based on its moniker
 *
 * Note: These RPC URLs are rate limited and not suitable for production applications.
 */
export function getPublicSolanaRpcUrl(cluster: SolanaCluster | string): string {
  switch (cluster) {
    case "devnet":
      return devnet("https://api.devnet.solana.com");
    case "testnet":
      return testnet("https://api.testnet.solana.com");
    case "mainnet":
    case "mainnet-beta":
      return mainnet("https://api.mainnet-beta.solana.com");
    case "localnet":
    case "localhost":
      return "http://127.0.0.1:8899";
    default:
      throw new Error("Invalid cluster moniker");
  }
}

/**
 * Genesis hash for Solana networks
 */
export const GENESIS_HASH = {
  mainnet: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
  devnet: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
  testnet: "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY",
};

/**
 * Determine the Solana moniker from its genesis hash (or an RPC connection to fetch the genesis hash)
 *
 * note: if the hash is NOT known, this will assume it is localnet and return as such
 */
export async function getMonikerFromGenesisHash(
  args: { hash: Blockhash } | { rpc: ReturnType<typeof createSolanaRpc> },
): Promise<SolanaCluster> {
  if ("rpc" in args) {
    const hash = await args.rpc.getGenesisHash().send();
    args = { hash };
  }

  if ("hash" in args) {
    switch (args.hash) {
      case GENESIS_HASH.mainnet:
        return "mainnet-beta";
      case GENESIS_HASH.devnet:
        return "devnet";
      case GENESIS_HASH.testnet:
        return "testnet";
      default: {
        // todo: can we detect if localnet is running
        return "localnet";
      }
    }
  }

  throw Error("Unable to process genesis hash or rpc connection");
}

export function lamportsToSol(lamports: bigint | number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 9 }).format(
    Number(lamports) / 1_000_000_000,
  );
}

type ExplorerLinkAccount = {
  address: string;
};
type ExplorerLinkTransaction = {
  transaction: string;
};
type ExplorerLinkBlock = {
  block: string;
};

export type GetExplorerLinkArgs = {
  cluster?: SolanaUrlOrMoniker;
} & (ExplorerLinkAccount | ExplorerLinkTransaction | ExplorerLinkBlock | {});

/**
 * Craft a Solana Explorer link on any cluster
 */
export function getExplorerLink(props: GetExplorerLinkArgs): URL {
  let url: URL | null = null;

  if (!props.cluster) props.cluster = "mainnet-beta";

  if ("address" in props) {
    url = new URL(`https://explorer.solana.com/address/${props.address}`);
  } else if ("transaction" in props) {
    url = new URL(`https://explorer.solana.com/tx/${props.transaction}`);
  } else if ("block" in props) {
    url = new URL(`https://explorer.solana.com/block/${props.block}`);
  }

  if (!url) throw new Error("Invalid Solana Explorer URL created");

  if (props.cluster !== "mainnet-beta") {
    if (props.cluster === "localnet") {
      // localnet technically isn't a cluster, so requires special handling
      url.searchParams.set("cluster", "custom");
      url.searchParams.set("customUrl", "http://localhost:8899");
    } else if (props.cluster.startsWith("http")) {
      // localnet technically isn't a cluster, so requires special handling
      url.searchParams.set("cluster", "custom");
      url.searchParams.set("customUrl", props.cluster);
    } else {
      url.searchParams.set("cluster", props.cluster);
    }
  }

  return url;
}

export function unixTimestampToDate(
  blockTime: UnixTimestamp | bigint | number,
) {
  return new Date(Number(blockTime) * 1000);
}

export function unixTimestampToRelativeDate(
  time: UnixTimestamp | bigint | number,
) {}

export const COMPUTE_BUDGET_PROGRAM_ID = address(
  "ComputeBudget111111111111111111111111111111",
);
export const VOTE_PROGRAM_ID = address(
  "Vote111111111111111111111111111111111111111",
);

type ComputeBudgetData = {
  /** Number of compute units consumed by the transaction */
  unitsConsumed: number;
  /** Units to request for transaction-wide compute */
  unitsRequested?: null | number;
  /** Transaction-wide compute unit limit */
  unitLimit?: null | number;
  /** Transaction compute unit price used for prioritization fees */
  unitPrice?: null | number;
  /**  */
  accountDataSizeLimit?: null | number;
  /** Requested transaction-wide program heap size in bytes */
  heapFrameSize?: null | number;
};

export function getComputeBudgetDataFromTransaction(
  tx: ReturnType<GetTransactionApi["getTransaction"]>,
): ComputeBudgetData {
  const budget: ComputeBudgetData = {
    unitsConsumed: Number(tx.meta.computeUnitsConsumed),
    unitsRequested: null,
    unitLimit: null,
    unitPrice: null,
    accountDataSizeLimit: null,
    heapFrameSize: null,
  };

  const computeBudgetIndex = tx.transaction.message.accountKeys.findIndex(
    (address) => address == COMPUTE_BUDGET_PROGRAM_ID,
  );

  tx.transaction.message.instructions
    .filter((ix) => ix.programIdIndex == computeBudgetIndex)
    .map((ix) => {
      const data = getBase58Encoder().encode(ix.data) as Uint8Array;
      const type = identifyComputeBudgetInstruction(data);
      switch (type) {
        case ComputeBudgetInstruction.SetComputeUnitPrice: {
          const {
            data: { microLamports },
          } = parseSetComputeUnitPriceInstruction({
            data,
            programAddress: COMPUTE_BUDGET_PROGRAM_ID,
          });
          budget.unitPrice = Number(microLamports);
          return;
        }
        case ComputeBudgetInstruction.SetComputeUnitLimit: {
          const {
            data: { units },
          } = parseSetComputeUnitLimitInstruction({
            data,
            programAddress: COMPUTE_BUDGET_PROGRAM_ID,
          });
          budget.unitLimit = units;
          return;
        }
        case ComputeBudgetInstruction.RequestUnits: {
          const {
            data: { units },
          } = parseRequestUnitsInstruction({
            data,
            programAddress: COMPUTE_BUDGET_PROGRAM_ID,
          });
          budget.unitsRequested = units;
          return;
        }
        case ComputeBudgetInstruction.SetLoadedAccountsDataSizeLimit: {
          const {
            data: { accountDataSizeLimit },
          } = parseSetLoadedAccountsDataSizeLimitInstruction({
            data,
            programAddress: COMPUTE_BUDGET_PROGRAM_ID,
          });
          budget.accountDataSizeLimit = accountDataSizeLimit;
          return;
        }
        case ComputeBudgetInstruction.RequestHeapFrame: {
          const {
            data: { bytes },
          } = parseRequestHeapFrameInstruction({
            data,
            programAddress: COMPUTE_BUDGET_PROGRAM_ID,
          });
          budget.heapFrameSize = bytes;
          return;
        }
      }
    });

  return budget;
}
