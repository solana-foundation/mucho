import { SolanaUrlOrMoniker } from "@/lib/web3";
import type { Commitment, createSolanaRpc } from "@solana/web3.js";

export type InspectorBaseArgs = {
  cluster: SolanaUrlOrMoniker;
  rpc: ReturnType<typeof createSolanaRpc>;
  commitment?: Commitment;
};
