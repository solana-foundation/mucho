const MIN_NODE_VERSION = "22.0.0";
// const MIN_BUN_VERSION = "0.4.0";

export function checkVersion(currentVersion, requiredVersion) {
  const [major, minor] = currentVersion.split(".").map(Number);
  const [reqMajor, reqMinor] = requiredVersion.split(".").map(Number);
  return major > reqMajor || (major === reqMajor && minor >= reqMinor);
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
    // if (!checkVersion(Bun.version, MIN_BUN_VERSION)) {
    //   console.error(
    //     `This tool requires Bun v${MIN_BUN_VERSION} or higher.`,
    //     // @ts-ignore
    //     `You are using v${Bun.version}.`,
    //   );
    //   process.exit(1);
    // }
  } else {
    if (!checkVersion(process.versions.node, MIN_NODE_VERSION)) {
      console.error(
        `This tool requires Node.js v${MIN_NODE_VERSION} or higher.`,
        `You are using v${process.versions.node}.`,
      );
      process.exit(1);
    }
  }
}
