import { join, dirname } from "path";
import {
  AnchorToml,
  AnchorTomlWithConfigPath,
  AnchorVersionData,
} from "@/types/anchor";
import {
  directoryExists,
  doesFileExist,
  loadFileNamesToMap,
  loadTomlFile,
} from "@/lib/utils";
import { loadConfigToml } from "@/lib/cli";
import { warningOutro, warnMessage } from "@/lib/logs";
import { SolanaTomlCloneLocalProgram } from "@/types/config";
import { checkCommand, VERSION_REGEX } from "./shell";
import { installAnchorVersionManager } from "./install";

const ANCHOR_TOML = "Anchor.toml";

/**
 * Load an Anchor.toml file, normally from the same dir as the Solana.toml
 */
export function loadAnchorToml(
  configPath: string,
  isConfigRequired: boolean = false,
): AnchorTomlWithConfigPath | false {
  // allow the config path to be a full filepath to search that same directory
  if (!configPath.endsWith(ANCHOR_TOML)) configPath = dirname(configPath);

  // allow the config path to be a directory, with an Anchor.toml in it
  if (directoryExists(configPath)) configPath = join(configPath, ANCHOR_TOML);

  let anchor: AnchorTomlWithConfigPath = {
    configPath,
  };

  if (doesFileExist(configPath, true)) {
    anchor = loadTomlFile<AnchorTomlWithConfigPath>(configPath) || anchor;
  } else {
    if (isConfigRequired) {
      warningOutro(`No Anchor.toml config file found. Operation canceled.`);
    }
    return false;
    // else warnMessage(`No Anchor.toml config file found. Skipping.`);
  }

  anchor.configPath = configPath;
  return anchor as AnchorTomlWithConfigPath;
}

/**
 * Deconflict and merge Anchor.toml into the Solana.toml config
 *
 * note: intentionally mutates the `config`
 */
export function deconflictAnchorTomlWithConfig(
  anchorToml: AnchorToml,
  config: ReturnType<typeof loadConfigToml>,
) {
  // todo: use the provided `anchorToml.test.validator.url`?

  // copy anchor cloneable programs
  if (anchorToml.test?.validator?.clone) {
    for (const cloner in anchorToml.test.validator.clone) {
      if (
        Object.prototype.hasOwnProperty.call(
          anchorToml.test.validator.clone,
          cloner,
        ) &&
        !config.clone.program[anchorToml.test.validator.clone[cloner].address]
      ) {
        if (anchorToml.test.validator?.url) {
          anchorToml.test.validator.clone[cloner].cluster =
            anchorToml.test.validator.url;
        }

        // looks ugly, but we dont have to allocate anything
        config.clone.program[anchorToml.test.validator.clone[cloner].address] =
          anchorToml.test.validator.clone[cloner];
      }
    }
  }

  // todo: for accounts that are owned by the token programs,
  // todo: attempt to resolve them as mints and clone them using our mint cloner

  // copy anchor cloneable accounts
  if (anchorToml.test?.validator?.account) {
    for (const cloner in anchorToml.test.validator.account) {
      if (
        Object.prototype.hasOwnProperty.call(
          anchorToml.test.validator.account,
          cloner,
        ) &&
        !config.clone.account[anchorToml.test.validator.account[cloner].address]
      ) {
        if (anchorToml.test.validator?.url) {
          anchorToml.test.validator.account[cloner].cluster =
            anchorToml.test.validator.url;
        }

        // looks ugly, but we dont have to allocate anything
        config.clone.account[
          anchorToml.test.validator.account[cloner].address
        ] = anchorToml.test.validator.account[cloner];
      }
    }
  }

  // console.log(config.clone.program);

  return config;
}

export function locateLocalAnchorPrograms(
  configPath: string,
  programListing: AnchorToml["programs"],
): SolanaTomlCloneLocalProgram {
  const buildDir = join(dirname(configPath), "target/deploy");

  let localPrograms: SolanaTomlCloneLocalProgram = {};

  if (!directoryExists(buildDir)) return localPrograms;

  const anchorPrograms = loadFileNamesToMap(buildDir, ".so");

  // todo: handle the user selecting the cluster
  const cluster: keyof typeof programListing = "localnet";

  if (!Object.prototype.hasOwnProperty.call(programListing, cluster)) {
    warnMessage(`Unable to locate 'programs.${cluster}' in Anchor.toml`);
    return localPrograms;
  }

  let missingCounter = 0;

  anchorPrograms.forEach((binaryName, programName) => {
    if (
      Object.prototype.hasOwnProperty.call(
        programListing[cluster],
        programName,
      ) &&
      !Object.hasOwn(localPrograms, programName)
    ) {
      localPrograms[programName] = {
        address: programListing[cluster][programName],
        filePath: join(buildDir, binaryName),
      };
    } else {
      missingCounter++;
      warnMessage(
        `Unable to locate compiled program '${programName}' in Anchor.toml`,
      );
    }
  });

  if (missingCounter > 0) {
    // todo: add the ability to prompt the user to build their anchor programs
    warnMessage(`Have you built all your local Anchor programs?`);
  }

  return localPrograms;
}

/**
 * Use the `avm list` command to fetch the latest anchor version available
 */
export async function getAvailableAnchorVersions(): Promise<AnchorVersionData> {
  const res = await checkCommand("avm list", {
    exit: true,
    onError: async () => {
      warnMessage("Unable to detect the 'avm' command. Installing...");

      await installAnchorVersionManager();
    },
    doubleCheck: true,
  });

  const data: AnchorVersionData = {
    latest: null,
    current: null,
    installed: [],
    available: [],
  };

  if (!res) return data;

  res.split("\n").map((line) => {
    line = line.trim().toLowerCase();
    if (!line) return;
    const version = VERSION_REGEX.exec(line)[1];
    if (!version) return;

    if (line.includes("current")) data.current = version;
    if (line.includes("latest")) data.latest = version;
    if (line.includes("installed")) data.installed.push(version);

    data.available.push(version);
  });

  return data;
}
