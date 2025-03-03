import { SolanaCluster } from "@/types/config";
import { parseRpcUrlOrMoniker } from "@/lib/solana";
import shellExec from "shell-exec";
import { parseJson } from "@/lib/utils";
import { ProgramInfoStruct } from "@/types/solana";

type DeployProgramCommandInput = {
  programId: string;
  programPath: string;
  verbose?: boolean;
  workspace?: boolean;
  manifestPath?: string;
  upgradeAuthority?: string;
  keypair?: string;
  url?: SolanaCluster | string;
  priorityFee?: string;
};

export function buildDeployProgramCommand({
  programPath,
  programId,
  // verbose = false,
  // manifestPath,
  // workspace = false,
  url,
  keypair,
  upgradeAuthority,
  priorityFee,
}: DeployProgramCommandInput) {
  const command: string[] = ["solana program deploy"];

  // command.push(`--output json`);

  // note: when no url/cluster is specified, the user's `solana config` url will be used
  if (url) {
    command.push(
      `--url ${parseRpcUrlOrMoniker(url, true /* enforce the "beta" label */)}`,
    );
  }

  if (keypair) {
    // todo: detect if the keypair exists?
    command.push(`--keypair ${keypair}`);
  }

  // when not set, defaults to the cli keypair
  if (upgradeAuthority) {
    // todo: detect if this file path exists?
    command.push(`--upgrade-authority ${upgradeAuthority}`);
  }

  // programId must be a file path for initial deployments
  if (programId) {
    // todo: detect if this file path exists?
    command.push(`--program-id ${programId}`);
  }

  // Add priority fee if specified
  if (priorityFee) {
    command.push(`--with-compute-unit-price ${priorityFee}`);
  }

  // todo: validate the `programPath` file exists
  command.push(programPath);

  return command.join(" ");
}

export async function getDeployedProgramInfo(
  programId: string,
  cluster: string,
): Promise<ProgramInfoStruct | false> {
  const command: string[] = [
    "solana program show",
    "--output json",
    `--url ${parseRpcUrlOrMoniker(
      cluster,
      true /* enforce the "beta" label */,
    )}`,
    programId,
  ];

  let { stderr, stdout } = await shellExec(command.join(" "));

  if (stderr) {
    // const error = stderr.trim().split("\n");
    // let parsed: string | null = null;

    // console.log("error:");
    // console.log(error);

    return false;
  }

  if (!stdout.trim()) return false;

  const programInfo = parseJson<ProgramInfoStruct>(stdout);
  if (programInfo.authority == "none") programInfo.authority = false;

  return programInfo;
}
