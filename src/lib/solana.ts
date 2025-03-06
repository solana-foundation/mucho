import {
  AllSolanaClusters,
  ProgramsByClusterLabels,
  SolanaCliClusterMonikers,
} from "@/types/config";
import { getCommandOutputSync, VERSION_REGEX } from "@/lib/shell";
import { PlatformToolsVersions } from "@/types";
import { address, isAddress } from "gill";
import { loadKeypairSignerFromFile } from "gill/node";

export async function getAddressFromStringOrFilePath(input: string) {
  if (isAddress(input)) return address(input);
  else {
    return (await loadKeypairSignerFromFile(input)).address;
  }
}

/**
 * Given a RPC url string, attempt to determine the cluster moniker
 */
export function getClusterMonikerFromUrl(
  punitiveUrl: string | URL,
): SolanaCliClusterMonikers {
  try {
    punitiveUrl = new URL(punitiveUrl);
  } catch (err) {
    throw new Error("Unable to parse RPC url");
  }

  switch (punitiveUrl.hostname) {
    case "api.devnet.solana.com": {
      return "devnet";
    }
    case "api.testnet.solana.com": {
      return "testnet";
    }
    case "api.mainnet-beta.solana.com": {
      return "mainnet-beta";
    }
    case "0.0.0.0":
    case "127.0.0.1":
    case "localhost": {
      return "localhost";
    }
  }

  // todo(nick): add support for common rpc provider urls

  throw new Error("Unable to determine moniker from RPC url");
}

/**
 * Parse the provided url to correct it into a valid moniker or rpc url
 */
export function parseRpcUrlOrMoniker(
  input: string,
): SolanaCliClusterMonikers | string;
export function parseRpcUrlOrMoniker(
  input: string,
  allowUrl: true,
): SolanaCliClusterMonikers | string;
export function parseRpcUrlOrMoniker(
  input: string,
  allowUrl: false,
): SolanaCliClusterMonikers;
export function parseRpcUrlOrMoniker(
  input: string,
  allowUrl: boolean = true,
): SolanaCliClusterMonikers | string {
  if (input.match(/^https?/i)) {
    if (!allowUrl) {
      throw new Error(`RPC url not allowed. Please provide a moniker.`);
    }

    try {
      return new URL(input).toString();
    } catch (err) {
      throw new Error(`Invalid RPC url provided: ${input}`);
    }
  }

  input = input.toLowerCase(); // case insensitive for monikers
  switch (input) {
    case "l":
    case "local":
    case "localnet":
    case "localhost": {
      return "localhost";
    }
    case "m":
    case "mainnet":
    case "mainnet-beta": {
      return "mainnet-beta";
    }
    case "l":
    case "localnet":
    case "localhost": {
      return "localhost";
    }
    case "t":
    case "testnet": {
      return "testnet";
    }
    case "d":
    case "devnet": {
      return "devnet";
    }
  }

  throw new Error(`Invalid RPC url provided: ${input}`);
}

/**
 * Validate and sanitize the provided cluster moniker
 */
export function getSafeClusterMoniker(
  cluster: AllSolanaClusters | string,
  labels?: ProgramsByClusterLabels,
): false | keyof ProgramsByClusterLabels {
  cluster = parseRpcUrlOrMoniker(
    cluster,
    false /* do not allow parsing urls, only monikers */,
  );

  if (!labels) {
    labels = {
      devnet: {},
      localnet: {},
      mainnet: {},
      testnet: {},
    };
  }

  // allow equivalent cluster names
  switch (cluster) {
    case "localhost":
    case "localnet": {
      cluster = "localnet";
      break;
    }
    case "mainnet":
    case "mainnet-beta": {
      cluster = "mainnet";
      break;
    }
    //  we do not need to handle these since there is not a common equivalent
    // case "devnet":
    // case "testnet":
    // default:
  }

  if (Object.hasOwn(labels, cluster)) {
    return cluster as keyof ProgramsByClusterLabels;
  } else return false;
}

/**
 * Get the listing of the user's platform tools versions
 */
export function getPlatformToolsVersions(): PlatformToolsVersions {
  const res = getCommandOutputSync("cargo build-sbf --version");
  const tools: PlatformToolsVersions = {};

  if (!res) return tools;

  res.split("\n").map((line) => {
    line = line.trim().toLowerCase();
    if (!line) return;

    const version = VERSION_REGEX.exec(line)?.[1];

    if (line.startsWith("rustc")) tools.rustc = version;
    if (line.startsWith("platform-tools")) tools["platform-tools"] = version;
    if (line.startsWith("solana-cargo-build-")) tools["build-sbf"] = version;
  });

  return tools;
}
