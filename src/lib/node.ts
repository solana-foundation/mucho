const MIN_NODE_VERSION = "22.0.0";
// const MIN_BUN_VERSION = "0.4.0";

/**
 * Compare two version to see if the `requiredVersion` is newer than the `currentVersion`
 */
export function isVersionNewer(
  currentVersion: string,
  requiredVersion: string,
) {
  if (currentVersion == requiredVersion) return false;
  const [major, minor, patch] = currentVersion.split(".").map(Number);
  const [reqMajor, reqMinor, reqPatch] = requiredVersion.split(".").map(Number);
  return (
    major > reqMajor ||
    (major === reqMajor && minor >= reqMinor) ||
    (major === reqMajor && minor == reqMinor && patch >= reqPatch)
  );
}

/**
 * Used to assert that the javascript runtime version of the user is above
 * the minimum version needed to actually execute the cli scripts
 */
export function assertRuntimeVersion() {
  // @ts-ignore
  const isBun = typeof Bun !== "undefined";
  if (isBun) {
    // todo: we may need to actually check other javascript runtime versions
    // // @ts-ignore
    // if (!isVersionNewer(Bun.version, MIN_BUN_VERSION)) {
    //   console.error(
    //     `This tool requires Bun v${MIN_BUN_VERSION} or higher.`,
    //     // @ts-ignore
    //     `You are using v${Bun.version}.`,
    //   );
    //   process.exit(1);
    // }
  } else {
    if (!isVersionNewer(process.versions.node, MIN_NODE_VERSION)) {
      console.error(
        `This tool requires Node.js v${MIN_NODE_VERSION} or higher.`,
        `You are using v${process.versions.node}.`,
      );
      process.exit(1);
    }
  }
}

/**
 * Suppress various messages that get logged by NodeJS and other runtimes
 */
export function suppressRuntimeWarnings() {
  const FILTERED_WARNINGS = ["Ed25519", "Warning: WebSockets", "punycode"];

  process.removeAllListeners("warning");
  process.on("warning", (warning) => {
    // Only log warnings that shouldn't be suppressed
    if (!FILTERED_WARNINGS.some((filter) => warning.message.includes(filter))) {
      console.warn(warning);
    }
  });
}

export function patchBigint() {
  // @ts-ignore
  interface BigInt {
    /** Convert a BigInt to string form when calling `JSON.stringify()` */
    toJSON: () => string;
  }

  // @ts-ignore - Only add the toJSON method if it doesn't already exist
  if (BigInt.prototype.toJSON === undefined) {
    // @ts-ignore - toJSON does not exist which is why we are patching it
    BigInt.prototype.toJSON = function () {
      return String(this);
    };
  }
}
