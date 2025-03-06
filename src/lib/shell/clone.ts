import path from "path";
import shellExec from "shell-exec";
import {
  createFolders,
  doesFileExist,
  loadFileNamesToMap,
  loadJsonFile,
} from "@/lib/utils";
import {
  CloneAccountsFromConfigResult,
  CloneSettings,
  SolanaCluster,
  SolanaToml,
  SolanaTomlCloneConfig,
} from "@/types/config";
import { parseRpcUrlOrMoniker } from "@/lib/solana";
import {
  DEFAULT_ACCOUNTS_DIR,
  DEFAULT_ACCOUNTS_DIR_TEMP,
} from "@/const/solana";
import { warnMessage } from "@/lib/logs";

export type JsonAccountStruct = {
  pubkey: string;
  account: JsonAccountInfo;
};

type JsonAccountInfo = {
  lamports: number;
  // Array with the first element being a base64 string and the second element specifying the encoding format
  data: [string, string | "base64"];
  owner: string;
  executable: boolean;
  rentEpoch: number;
  space: number;
};

// todo: create interface for common Clone input fields
type CloneAccountInput = {
  saveDir: string;
  address: string;
  url?: SolanaCluster | string;
};

type CloneProgramInput = {
  saveDir: string;
  address: string;
  url?: SolanaCluster | string;
};

export async function cloneAccount({
  address,
  saveDir = DEFAULT_ACCOUNTS_DIR,
  url,
}: CloneAccountInput | undefined) {
  let command: string[] = [
    // comment for better diffs
    `solana account ${address}`,
    "--output json",
    // todo: enable this for production, maybe handled with a verbose mode or something?
    // "--output json-compact",
  ];

  // note: when no url/cluster is specified, the user's `solana config` url will be used
  if (url) {
    command.push(`--url ${parseRpcUrlOrMoniker(url)}`);
  }

  /**
   * todo: should we force save by default? i think so...
   *
   * todo: we could also help detect drift from an existing locally cached account and any new ones pulled in
   */
  const saveFile = path.resolve(saveDir, `${address}.json`);
  createFolders(saveFile);
  command.push(`--output-file ${saveFile}`);

  await shellExec(command.join(" "));

  if (doesFileExist(saveFile)) {
    return loadJsonFile<JsonAccountStruct>(saveFile) || false;
  } else {
    // console.error("Failed to clone:", address);
    return false;
  }
}

/**
 * Clone a program from a cluster and store it locally as a `.so` binary
 */
export async function cloneProgram({
  address,
  saveDir = "programs",
  url,
}: CloneProgramInput | undefined) {
  let command: string[] = [
    // comment for better diffs
    `solana program dump`,
  ];

  const saveFile = path.resolve(saveDir, `${address}.so`);
  createFolders(saveDir);
  command.push(address, saveFile);

  // note: when no url/cluster is specified, the user's `solana config` url will be used
  if (url) {
    command.push(`--url ${parseRpcUrlOrMoniker(url)}`);
  }

  await shellExec(command.join(" "));

  if (doesFileExist(saveFile)) {
    return true;
  } else {
    // console.error("Failed to clone program:", address);
    return false;
  }
}

/**
 * Clone all the programs listed in the config toml file
 */
export async function cloneProgramsFromConfig(
  config: SolanaToml,
  settings: CloneSettings,
  currentAccounts: ReturnType<typeof loadFileNamesToMap>,
) {
  if (!config?.clone?.program) return null;

  for (const key in config.clone.program) {
    if (!config.clone.program.hasOwnProperty(key)) {
      continue;
    }

    const program = config.clone.program[key];

    // todo: should we validate any of the data?

    // set the default info
    if (!program?.name) program.name = key;

    // the auto clone message is intentionally displayed separate
    // so we can potentially skip recloning
    if (settings.autoClone) {
      warnMessage(`Auto clone program: ${program.address}`);
    }
    if (program.frequency === "always") {
      console.log("Always clone program:", program.address);
    } else if (settings.force === true) {
      console.log("Force clone program:", program.address);
    } else if (currentAccounts.has(program.address)) {
      console.log("Skipping clone program:", program.address);
      continue;
    } else {
      console.log("Clone program:", program.address);
    }

    const newProgram = await cloneProgram({
      address: program.address,
      saveDir: DEFAULT_ACCOUNTS_DIR_TEMP,
      url: program.cluster || config?.settings?.cluster,
      // saveDir: path.resolve(saveDirTemp, "program")
    });

    if (!newProgram) {
      console.error("Failed to clone program:", program.address);
      continue;
    }

    // todo: handle the diff and deconflict
  }
}

/**
 * Clone all the tokens listed in the config toml file
 */
export async function cloneTokensFromConfig(
  config: SolanaToml,
  settings: CloneSettings,
  currentAccounts: ReturnType<typeof loadFileNamesToMap>,
) {
  if (!config?.clone?.token) return null;

  for (const key in config.clone.token) {
    if (!config.clone.token.hasOwnProperty(key)) {
      continue;
    }

    const token = config.clone.token[key];
    // todo: should we validate any of the data?

    // set the default token info
    if (!token?.name) token.name = key;

    if (token.frequency === "always") {
      console.log("Always clone token:", token.address);
    } else if (settings.force === true) {
      console.log("Force clone token:", token.address);
    } else if (currentAccounts.has(token.address)) {
      console.log("Skipping clone token:", token.address);
      continue;
    } else {
      console.log("Clone token:", token.address);
    }

    /**
     * todo: we should likely check if any of the accounts are already cloned
     * - for ones that are already cloned:
     *    - default not reclone
     *    - have some options to control when to clone and when to notify the user
     *       -
     * - if they do not exist, clone them
     */

    // todo: if cloning lots of accounts, we can likely make this more efficient
    // todo: handle errors on cloning (like if the clone failed and the json file does not exist)
    const newAccount = await cloneAccount({
      saveDir: DEFAULT_ACCOUNTS_DIR_TEMP,
      address: token.address,
      url: token.cluster || config.settings.cluster,
    });

    if (!newAccount) {
      console.error("Failed to clone token:", token.address);
      continue;
    }

    /**
     * todo: we should ensure the cloned account's `owner` program is auto cloned
     * - from the same network as the token
     * - not to override any manually defined configs settings
     */

    if (settings.force == true) {
      // do nothing since we are going to force clone/refresh
    } else if (
      doesFileExist(
        path.join(config.settings.accountDir, `${token.address}.json`),
      )
    ) {
      // detect diff from any existing accounts already cloned
      const oldAccount = loadJsonFile<JsonAccountStruct>(
        path.resolve(config.settings.accountDir, `${token.address}.json`),
      );

      if (JSON.stringify(newAccount) !== JSON.stringify(oldAccount)) {
        warnMessage(`${token.address} has changed`);

        // todo: do we want to support another options to error on diff?

        if (settings.prompt) {
          // console.log(
          //   "todo: prompt the user to determine if they want to clone",
          // );
        }

        continue;
      } else {
        // console.log("  ", token.address, "did not change");
        // delete the new file one to avoid dirtying the git history
        // unlinkSync(
        //   path.resolve(saveDirTemp, `${token.address}.json`),
        // );
      }
    }
  }
}

/**
 * Clone all the accounts listed in the config toml file
 */
export async function cloneAccountsFromConfig(
  config: SolanaToml,
  settings: CloneSettings,
  currentAccounts: ReturnType<typeof loadFileNamesToMap>,
): Promise<CloneAccountsFromConfigResult | false> {
  if (!config?.clone?.account) return false;

  // accumulator to track any `owner`s (aka programs) that will need to be cloned
  const owners = new Map<string, SolanaTomlCloneConfig["cluster"]>();
  const changedAccounts = new Map<string, JsonAccountStruct>();

  let newAccount: JsonAccountStruct | false = false;

  for (const key in config.clone.account) {
    if (!config.clone.account.hasOwnProperty(key)) {
      continue;
    }

    const account = config.clone.account[key];
    // todo: should we validate any of the data?

    // set the default account info
    if (!account?.name) account.name = key;

    if (account.frequency === "always") {
      console.log("Always clone account:", account.address);
    } else if (settings.force === true) {
      console.log("Force clone account:", account.address);
    } else if (currentAccounts.has(account.address)) {
      newAccount = loadJsonFile<JsonAccountStruct>(
        path.join(
          config.settings.accountDir,
          currentAccounts.get(account.address),
        ),
      );

      owners.set(
        newAccount.account.owner,
        account.cluster || config.settings.cluster,
      );
      console.log("Skipping clone account:", account.address);
      continue;
    } else {
      console.log("Clone account:", account.address);
    }

    /**
     * todo: we should likely check if any of the accounts are already cloned
     * - for ones that are already cloned:
     *    - default not reclone
     *    - have some options to control when to clone and when to notify the user
     *       -
     * - if they do not exist, clone them
     */

    // todo: if cloning lots of accounts, we can likely make this more efficient
    // todo: handle errors on cloning (like if the clone failed and the json file does not exist)
    newAccount = await cloneAccount({
      saveDir: DEFAULT_ACCOUNTS_DIR_TEMP,
      address: account.address,
      url: account.cluster || config.settings.cluster,
    });

    if (!newAccount) {
      console.error("Failed to clone account:", account.address);
      continue;
    }

    owners.set(
      newAccount.account.owner,
      account.cluster || config.settings.cluster,
    );

    if (settings.force == true) {
      // do nothing since we are going to force clone/refresh
    } else if (
      doesFileExist(
        path.join(config.settings.accountDir, `${account.address}.json`),
      )
    ) {
      const oldAccount = loadJsonFile<JsonAccountStruct>(
        path.resolve(config.settings.accountDir, `${account.address}.json`),
      );

      if (JSON.stringify(newAccount) !== JSON.stringify(oldAccount)) {
        warnMessage(`${account.address} has changed`);

        // todo: do we want to support another options to error on diff?

        if (settings.prompt) {
          changedAccounts.set(newAccount.account.owner, newAccount);
          // console.log(
          //   "todo: prompt the user to determine if they want to clone",
          // );
        }

        continue;
      } else {
        // console.log("  ", account.address, "did not change");
        // delete the new file one to avoid dirtying the git history
        // unlinkSync(
        //   path.resolve(saveDirTemp, `${account.address}.json`),
        // );
      }
    }
  }

  return {
    owners,
    changedAccounts,
  };
}

/**
 * Merge a hashmap of owners into the TOML config format
 */
export function mergeOwnersMapWithConfig(
  owners: Map<string, SolanaTomlCloneConfig["cluster"]>,
  config: SolanaToml["clone"]["program"] = {},
): SolanaToml["clone"]["program"] {
  if (!owners) return config;

  // force remove the default programs
  owners.delete("11111111111111111111111111111111");
  owners.delete("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  owners.delete("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
  // todo: add other programs that are builtins on the network
  // todo: handle the builtin programs being migrated to the core-bpf

  if (owners.size == 0) return config;

  owners.forEach((cluster, address) => {
    config[address] = {
      address: address,
      cluster: cluster,
    };
  });

  return config;
}

export function validateExpectedCloneCounts(
  accountDir: string,
  clone: SolanaToml["clone"],
): { expected: number; actual: number } {
  accountDir = path.resolve(accountDir);
  const clonedAccounts = loadFileNamesToMap(accountDir, ".json");

  const clonedPrograms = loadFileNamesToMap(accountDir, ".so");

  const actual = clonedAccounts.size + clonedPrograms.size;

  // handle auto cloned programs
  const autoCloned = new Map<string, SolanaTomlCloneConfig["cluster"]>();

  // count the number of deduplicated `owners` for all the cloned accounts
  clonedAccounts.forEach((filename) => {
    autoCloned.set(
      loadJsonFile<JsonAccountStruct>(path.join(accountDir, filename)).account
        .owner,
      "", // this value here does not matter
    );
  });

  let expected: number = 0;

  if (clone) {
    if (clone.account) {
      expected += Object.keys(clone.account).length;
    }
    if (clone.token) {
      expected += Object.keys(clone.token).length;
    }
    if (clone.program) {
      clone.program =
        mergeOwnersMapWithConfig(autoCloned, clone?.program || {}) || {};

      expected += Object.keys(clone.program).length;
    }
  }

  return { actual, expected };
}
