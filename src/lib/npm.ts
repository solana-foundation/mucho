import { getAppInfo } from "@/lib/app-info";
import { isVersionNewer } from "./node";
import { titleMessage } from "./logs";
import picocolors from "picocolors";
import { getCommandOutput, VERSION_REGEX } from "./shell";

type NpmRegistryResponse = {
  "dist-tags": {
    latest: string;
  };
  versions: {
    [version: string]: {
      version: string;
      description?: string;
    };
  };
};

/**
 * Get the installed package version using the `npm list` command
 */
export async function getCurrentNpmPackageVersion(
  packageName: string,
  global: boolean = false,
): Promise<string | false> {
  // always check the global package for mucho to avoid issues when testing
  if (packageName == "mucho") global = true;

  return await getCommandOutput(
    `npm list ${global ? "-g " : ""}${packageName}`,
  ).then((res) => {
    if (!res) return res;
    return (
      res
        .match(new RegExp(`${packageName}@(.*)`, "gi"))?.[0]
        .match(VERSION_REGEX)?.[1] || false
    );
  });
}

/**
 * Poll the npm registry to fetch the latest version of any package name
 */
export async function getNpmRegistryPackageVersion(
  packageName: string,
): Promise<
  | {
      latest: string;
      allVersions: string[];
      error?: never;
    }
  | {
      latest?: never;
      allVersions?: never;
      error: string;
    }
> {
  try {
    if (!packageName || typeof packageName !== "string") {
      throw new Error("Invalid package name");
    }

    const response = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(packageName)}`,
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Package "${packageName}" not found`);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as NpmRegistryResponse;

    const allVersions = Object.keys(data.versions).sort((a, b) => {
      // Simple semver comparison for sorting
      const aParts = a.split(".").map(Number);
      const bParts = b.split(".").map(Number);

      for (let i = 0; i < 3; i++) {
        if (aParts[i] !== bParts[i]) {
          return aParts[i] - bParts[i];
        }
      }
      return 0;
    });

    return {
      latest: data["dist-tags"].latest,
      allVersions,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 *
 */
export async function checkForSelfUpdate() {
  const registry = await getNpmRegistryPackageVersion(getAppInfo().name);
  const current = await getCurrentNpmPackageVersion(getAppInfo().name, true);

  if ("error" in registry) {
    // console.error(`Unable to perform the mucho self update checks`);
    // console.error("Error:", npmVersion.error);
    return;
  }

  // do nothing if on the same version
  if (registry.latest == current) {
    return;
  }

  // if not installed globally, we will prompt to install
  if (!current || isVersionNewer(registry.latest, current)) {
    titleMessage(
      `${getAppInfo().name} update available - v${registry.latest}`,
      (val) => picocolors.inverse(picocolors.green(val)),
    );
    // console.log(`A new version of ${getAppInfo().name} is available!`);
    console.log(
      "  ",
      `To install the latest version, run the following command:`,
    );
    console.log(
      "  ",
      picocolors.green(`npx ${getAppInfo().name}@latest install`),
    );

    console.log(); // print a spacer
  }
}
