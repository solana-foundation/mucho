import type { Commitment, createSolanaRpc } from "@solana/web3.js";

export type InspectorBaseArgs = {
  rpc: ReturnType<typeof createSolanaRpc>;
  commitment?: Commitment;
};
