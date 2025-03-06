import { AllSolanaClusters } from "@/types/config";
import type { Commitment, createSolanaRpc } from "gill";

export type InspectorBaseArgs = {
  cluster: AllSolanaClusters;
  rpc: ReturnType<typeof createSolanaRpc>;
  commitment?: Commitment;
};
