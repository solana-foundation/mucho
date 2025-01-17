import { devnet, mainnet, testnet, UnixTimestamp } from "@solana/web3.js";

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
