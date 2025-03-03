import { PackageUpdate } from "@/types";
import { installCargoUpdate } from "./install";
import { warnMessage } from "./logs";
import { checkCommand } from "./shell";
import {
  getCurrentNpmPackageVersion,
  getNpmRegistryPackageVersion,
} from "./npm";
import { isVersionNewer } from "./node";

/**
 * Check for updates to any npm package
 *
 */
export async function getNpmPackageUpdates(
  packageName: string,
  global: boolean = false,
): Promise<PackageUpdate[]> {
  const updates: PackageUpdate[] = [];

  // always check the global package for mucho to avoid issues when testing
  if (packageName == "mucho") global = true;

  const current = await getCurrentNpmPackageVersion(packageName, global);
  const registry = await getNpmRegistryPackageVersion(packageName);
  if (
    !current ||
    (registry.latest && isVersionNewer(registry.latest, current))
  ) {
    updates.push({
      installed: current,
      needsUpdate: true,
      latest: registry.latest || "",
      name: packageName,
    });
  }

  return updates;
}

/**
 * Use the `install-update` crate to help manage the various rust
 * based cli tool version, like avm and trident
 */
export async function getCargoUpdateOutput(): Promise<PackageUpdate[]> {
  const res = await checkCommand("cargo install-update --git --list", {
    exit: true,
    onError: async () => {
      warnMessage(
        "Unable to detect the 'cargo install-update' command. Installing...",
      );

      await installCargoUpdate();
    },
    doubleCheck: true,
  });

  if (!res) return [];

  const results: PackageUpdate[] = [];
  const lines = res.split("\nPackage").slice(1).join("Package");
  const linesToParse = ("Package" + lines)
    .split("\n")
    .filter((line) => line.trim().length > 0);

  let currentChunk: string[] = [];

  for (const line of linesToParse) {
    if (line.startsWith("Package")) {
      if (currentChunk.length > 1) {
        processChunk(currentChunk, results);
      }
      currentChunk = [line];
    } else {
      currentChunk.push(line);
    }
  }

  // process the final chunk
  if (currentChunk.length > 1) {
    processChunk(currentChunk, results);
  }

  return results;
}

function processChunk(chunk: string[], results: PackageUpdate[]) {
  const headerLine = chunk[0];
  const dataLines = chunk.slice(1);

  // determine if we're dealing with version numbers or commit hashes
  const isCommitHash =
    headerLine.toLowerCase().includes("installed") &&
    headerLine.split(/\s+/).length > 4;

  for (const line of dataLines) {
    const parts = line.split(/\s+/).filter((part) => part.length > 0);

    if (isCommitHash) {
      results.push({
        name: parts[0],
        installed: parts[1],
        latest: parts[2],
        needsUpdate: parts[3].toLowerCase() === "yes",
      });
    } else {
      results.push({
        name: parts[0],
        installed: parts[1],
        latest: parts[2],
        needsUpdate: parts[3].toLowerCase() === "yes",
      });
    }
  }
}
