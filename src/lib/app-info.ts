import packageJson from "../../package.json";

/**
 * Load standard info about this tool
 */
export function getAppInfo(): {
  name: string;
  version: string;
} {
  return {
    version: packageJson.version,
    name: packageJson.name,
  };
}
