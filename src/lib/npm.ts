import { getAppInfo } from "@/lib/app-info";
import { isVersionNewer } from "./node";
import { titleMessage } from "./logs";
import picocolors from "picocolors";

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
 * Poll the npm registry to fetch the latest version of any package name
 */
export async function getLatestNpmPackageVersion(packageName: string): Promise<
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
  const res = await getLatestNpmPackageVersion(getAppInfo().name);

  if ("error" in res) {
    // console.error(`Unable to perform the mucho self update checks`);
    // console.error("Error:", npmVersion.error);
    return;
  }

  // do nothing if on the same version
  if (res.latest == getAppInfo().version) {
    return;
  }

  // console.log("latest", res.latest);
  // console.log("current:", getAppInfo().version);

  if (isVersionNewer(res.latest, getAppInfo().version)) {
    titleMessage(
      `${getAppInfo().name} update available - v${res.latest}`,
      (val) => picocolors.inverse(picocolors.green(val)),
    );
    // console.log(`A new version of ${getAppInfo().name} is available!`);
    console.log(
      "  ",
      `To install the latest version, run the following command:`,
    );
    console.log(
      "  ",
      picocolors.green(`npm install -g ${getAppInfo().name}@latest`),
    );

    console.log(); // print a spacer
  }
}
