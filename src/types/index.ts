export type PlatformOS = "unknown" | "linux" | "mac" | "windows";

export type ToolNames =
  | "rust"
  | "solana"
  | "avm"
  | "anchor"
  | "yarn"
  | "zest"
  | "cargo-update"
  | "verify"
  | "trident";

export type ToolCommandConfig = {
  /** $PATH location for the command's tools */
  pathSource?: string;
  /** command to get the tool version */
  version: string;
  /** command to install the tool */
  // install: string;
  /** command to update the tool */
  // update: string;
  dependencies?: ToolNames[];
};

export type PlatformToolsVersions = Partial<{
  rust: string;
  platformTools: string;
  buildSbf: string;
}>;

/**
 *
 */
export type InstallCommandPropsBase = {
  /**  */
  os?: PlatformOS;
  /**  */
  version?: string;
  /**  */
  verbose?: boolean;
  /**  */
  verifyParentCommand?: boolean;
  /**  */
  updateAvailable?: PackageUpdate | undefined;

  /**
   * Reference to an existing `spinner`
   */
  // spinner: ReturnType<typeof spinner>;
};

export type ShellExecInSessionArgs = {
  command: string;
  args?: string[];
  outputOnly?: boolean;
};

export type PackageUpdate = {
  name: string;
  installed: string;
  latest: string;
  needsUpdate: boolean;
};
