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
  devnet,
  getBase58Encoder,
  GetTransactionApi,
  mainnet,
  testnet,
  UnixTimestamp,
} from "@solana/web3.js";

/** Solana cluster moniker */
export type SolanaClusterMoniker =
  | "mainnet-beta"
  | "devnet"
  | "testnet"
  | "localnet";

/**
 * Get a public Solana RPC endpoint for a cluster based on its moniker
 *
 * Note: These RPC URLs are rate limited and not suitable for production applications.
 */
export function getPublicSolanaRpcUrl(cluster: SolanaClusterMoniker): string {
  switch (cluster) {
    case "devnet":
      return devnet("https://api.devnet.solana.com");
    case "testnet":
      return testnet("https://api.testnet.solana.com");
    case "mainnet-beta":
      return mainnet("https://api.mainnet-beta.solana.com");
    case "localnet":
      return "http://127.0.0.1:8899";
    default:
      throw new Error("Invalid cluster moniker");
  }
}

export function lamportsToSol(lamports: bigint | number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 9 }).format(
    Number(lamports) / 1_000_000_000,
  );
}

export function unixTimestampToDate(
  blockTime: UnixTimestamp | bigint | number,
) {
  return new Date(Number(blockTime) * 1000);
}

export const COMPUTE_BUDGET_PROGRAM_ID = address(
  "ComputeBudget111111111111111111111111111111",
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
      const data = getBase58Encoder().encode(
        ix.data,
      ) as Uint8Array<ArrayBufferLike>;
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
