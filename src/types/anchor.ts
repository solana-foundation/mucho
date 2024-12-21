import { ProgramsByClusterLabels, SolanaTomlCloneConfig } from "./config";

export type AnchorToml = {
  configPath?: string;
  programs?: ProgramsByClusterLabels;
  test?: {
    validator?: {
      /** rpc url to use in order to clone */
      url?: string;
      /** program to clone */
      clone?: SolanaTomlCloneConfig[];
      /** accounts to clone */
      // note: `account` also supports `filename` but we do nothing with that here
      account?: SolanaTomlCloneConfig[];
    };
  };
};

export type AnchorTomlWithConfigPath = Omit<AnchorToml, "configPath"> &
  NonNullable<{ configPath: AnchorToml["configPath"] }>;
