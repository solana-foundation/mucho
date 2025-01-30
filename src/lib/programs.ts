import { dirname, join, resolve } from "path";
import {
  ProgramsByClusterLabels,
  SolanaTomlCloneLocalProgram,
} from "@/types/config";
import { directoryExists, loadFileNamesToMap } from "@/lib//utils";
import { DEFAULT_BUILD_DIR } from "@/const/solana";
import { warnMessage } from "@/lib/logs";

/**
 * List all the local program binaries in the specified build directory
 */
export function listLocalPrograms({
  labels = {},
  buildDir = DEFAULT_BUILD_DIR,
  basePath,
  configPath,
  cluster = "localnet",
}: {
  buildDir?: string;
  basePath?: string;
  labels?: ProgramsByClusterLabels;
  configPath?: string;
  cluster?: keyof ProgramsByClusterLabels;
} = {}): {
  locatedPrograms: SolanaTomlCloneLocalProgram;
  buildDirListing: Map<string, string>;
  allFound: boolean;
} {
  let allFound: boolean = false;
  let locatedPrograms: SolanaTomlCloneLocalProgram = {};
  let buildDirListing: Map<string, string> = new Map<string, string>();

  if (basePath) {
    buildDir = resolve(join(basePath, buildDir));
  } else if (configPath) {
    buildDir = resolve(join(dirname(configPath), buildDir));
  } else {
    buildDir = resolve(join(process.cwd(), buildDir));
  }

  if (!directoryExists(buildDir)) {
    // warnMessage(`Unable to locate build output directory: ${buildDir}`);
    return { locatedPrograms, buildDirListing, allFound };
  }

  buildDirListing = loadFileNamesToMap(buildDir, ".so");

  if (!Object.prototype.hasOwnProperty.call(labels, cluster)) {
    // warnMessage(`Unable to locate 'programs.${cluster}'`);
    return { locatedPrograms, buildDirListing, allFound };
  }

  let missingCounter = 0;

  buildDirListing.forEach((binaryName, programName) => {
    if (
      Object.prototype.hasOwnProperty.call(labels[cluster], programName) &&
      !Object.hasOwn(locatedPrograms, programName)
    ) {
      locatedPrograms[programName] = {
        address: labels[cluster][programName],
        filePath: join(buildDir, binaryName),
      };
    } else {
      missingCounter++;

      if (!Object.prototype.hasOwnProperty.call(labels[cluster], programName)) {
        warnMessage(
          `Compiled program '${programName}' was found with no config info`,
        );
      } else {
        warnMessage(
          `Unable to locate compiled program '${programName}' from config`,
        );
      }
    }
  });

  if (missingCounter == 0) allFound = true;

  return { locatedPrograms, buildDirListing, allFound };
}
