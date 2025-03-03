import type { SolanaCluster } from "@/types/config";
import {
  ComputeBudgetInstruction,
  identifyComputeBudgetInstruction,
  parseRequestHeapFrameInstruction,
  parseRequestUnitsInstruction,
  parseSetComputeUnitLimitInstruction,
  parseSetComputeUnitPriceInstruction,
  parseSetLoadedAccountsDataSizeLimitInstruction,
  COMPUTE_BUDGET_PROGRAM_ADDRESS,
} from "gill/programs";
import {
  address,
  getBase58Encoder,
  type GetTransactionApi,
  type UnixTimestamp,
  type ModifiedClusterUrl,
} from "gill";

export type SolanaUrlOrMoniker = SolanaCluster | ModifiedClusterUrl;

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
  if (!tx) throw new Error("A transaction is required");
  const budget: ComputeBudgetData = {
    unitsConsumed: Number(tx.meta?.computeUnitsConsumed),
    unitsRequested: null,
    unitLimit: null,
    unitPrice: null,
    accountDataSizeLimit: null,
    heapFrameSize: null,
  };

  const computeBudgetIndex = tx.transaction.message.accountKeys.findIndex(
    (address) => address == COMPUTE_BUDGET_PROGRAM_ADDRESS,
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
            programAddress: COMPUTE_BUDGET_PROGRAM_ADDRESS,
          });
          budget.unitPrice = Number(microLamports);
          return;
        }
        case ComputeBudgetInstruction.SetComputeUnitLimit: {
          const {
            data: { units },
          } = parseSetComputeUnitLimitInstruction({
            data,
            programAddress: COMPUTE_BUDGET_PROGRAM_ADDRESS,
          });
          budget.unitLimit = units;
          return;
        }
        case ComputeBudgetInstruction.RequestUnits: {
          const {
            data: { units },
          } = parseRequestUnitsInstruction({
            data,
            programAddress: COMPUTE_BUDGET_PROGRAM_ADDRESS,
          });
          budget.unitsRequested = units;
          return;
        }
        case ComputeBudgetInstruction.SetLoadedAccountsDataSizeLimit: {
          const {
            data: { accountDataSizeLimit },
          } = parseSetLoadedAccountsDataSizeLimitInstruction({
            data,
            programAddress: COMPUTE_BUDGET_PROGRAM_ADDRESS,
          });
          budget.accountDataSizeLimit = accountDataSizeLimit;
          return;
        }
        case ComputeBudgetInstruction.RequestHeapFrame: {
          const {
            data: { bytes },
          } = parseRequestHeapFrameInstruction({
            data,
            programAddress: COMPUTE_BUDGET_PROGRAM_ADDRESS,
          });
          budget.heapFrameSize = bytes;
          return;
        }
      }
    });

  return budget;
}
