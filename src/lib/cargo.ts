/**
 * Assorted helper functions and wrappers for working in the CLI
 */

import { CargoTomlWithConfigPath } from "@/types/cargo";
import { directoryExists, doesFileExist, loadTomlFile } from "@/lib/utils";
import { readdirSync, statSync } from "fs";
import { dirname, join, relative } from "path";

const DEFAULT_CARGO_TOML_FILE = "Cargo.toml";

/**
 * Load a Cargo.toml file
 */
export function loadCargoToml(
  manifestPath: string = DEFAULT_CARGO_TOML_FILE,
  settings: object = {},
  isManifestRequired: boolean = false,
): CargoTomlWithConfigPath | false {
  // allow the config path to be a directory, with a Solana.toml in it
  if (directoryExists(manifestPath)) {
    manifestPath = join(manifestPath, DEFAULT_CARGO_TOML_FILE);
  }

  if (doesFileExist(manifestPath, true)) {
    return loadTomlFile<CargoTomlWithConfigPath>(manifestPath);
  } else {
    return false;
    // if (isManifestRequired) {
    //   warningOutro(`No Cargo.toml file found. Operation canceled.`);
    // } else warnMessage(`No Cargo.toml file found. Skipping.`);
  }
}

export function findAllCargoToml(
  startDir: string,
  whitelist: string[] = [],
  blacklist: string[] = ["node_modules", "dist", "target"],
  maxDepth: number = 3,
): string[] {
  const cargoTomlPaths: string[] = [];

  // Convert whitelist patterns to regular expressions for wildcard matching
  const whitelistPatterns = whitelist.map(
    (pattern) => new RegExp("^" + pattern.replace(/\*/g, ".*") + "$"),
  );

  // Helper function to check if a directory matches any whitelist pattern
  function isWhitelisted(relativeDir: string): boolean {
    if (whitelistPatterns.length === 0) {
      return true;
    }
    return whitelistPatterns.some((regex) => regex.test(relativeDir));
  }

  // Helper function to recursively search directories
  function searchDir(dir: string, depth: number): void {
    // Stop searching if maxDepth is reached
    if (depth > maxDepth) {
      return;
    }

    const items = readdirSync(dir);
    for (const item of items) {
      const itemPath = join(dir, item);
      const stats = statSync(itemPath);

      if (stats.isFile() && item === "Cargo.toml") {
        cargoTomlPaths.push(itemPath);
      }

      if (stats.isDirectory()) {
        const relativeDir = relative(startDir, itemPath);

        if (blacklist.includes(relativeDir) && !isWhitelisted(relativeDir)) {
          continue;
        }

        searchDir(itemPath, depth + 1);
      }
    }
  }

  searchDir(startDir, 0);

  return cargoTomlPaths;
}

export function getProgramPathsInWorkspace(
  startDir: string,
  workspaceDirs: string[],
) {
  const programPaths = new Map<string, string>();

  let tempToml: false | ReturnType<typeof loadCargoToml> = false;

  if (doesFileExist(startDir)) startDir = dirname(startDir);

  const allTomls = findAllCargoToml(startDir, workspaceDirs);

  allTomls.map((progPath) => {
    if (!doesFileExist(progPath)) return;

    tempToml = loadCargoToml(progPath);
    if (!tempToml || tempToml.workspace) return;

    const name = tempToml?.lib?.name || tempToml?.package?.name;
    if (!name) return;
    // require that the package name matches the directory name
    // if (name !== basename(dirname(tempToml.configPath))) return;

    programPaths.set(name, tempToml.configPath);
  });

  return programPaths;
}

export function autoLocateProgramsInWorkspace(
  manifestPath: string = join(process.cwd(), "Cargo.toml"),
  workspaceDirs: string[] = ["temp", "programs/*", "program"],
): {
  programs: Map<string, string>;
  cargoToml: false | CargoTomlWithConfigPath;
} {
  // determine if we are in a program specific dir or the workspace
  let cargoToml = loadCargoToml(manifestPath);

  if (!cargoToml) {
    workspaceDirs.some((workspace) => {
      const filePath = join(
        process.cwd(),
        workspace.replace(/\*+$/, ""),
        "Cargo.toml",
      );
      if (doesFileExist(filePath)) {
        cargoToml = loadCargoToml(filePath);
        if (cargoToml) return;
      }
    });
  }

  let programs = new Map<string, string>();

  if (cargoToml) {
    // always update the current manifest path to the one of the loaded Cargo.toml
    if (cargoToml.configPath) {
      manifestPath = cargoToml.configPath;
    }

    if (cargoToml.workspace?.members) {
      workspaceDirs = cargoToml.workspace.members;
    }

    programs = getProgramPathsInWorkspace(manifestPath, workspaceDirs);
  }

  return { programs, cargoToml };
}
