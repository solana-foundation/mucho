import { select } from "@inquirer/prompts";
import { type SolanaCluster } from "@/types/config";

export async function promptToSelectCluster(
  message: string = "Select a cluster?",
  defaultValue: SolanaCluster = "mainnet",
): Promise<SolanaCluster> {
  console.log(); // print a line separator
  return select<SolanaCluster>({
    message,
    theme: {
      // style: {
      // todo: we could customize the message here?
      //   error: (text) => text,
      // },
    },
    default: defaultValue,
    choices: [
      {
        short: "m",
        name: "m) mainnet",
        value: "mainnet",
      },
      {
        short: "d",
        name: "d) devnet",
        value: "devnet",
      },
      {
        short: "t",
        name: "t) testnet",
        value: "testnet",
      },
      {
        short: "l",
        name: "l) localnet",
        value: "localnet",
        // description: defaultValue.startsWith("l")
        //   ? "Default value selected"
        //   : "",
      },
    ],
  })
    .then(async (answer) => {
      // if (!answer) return false;

      if (answer.startsWith("m")) answer = "mainnet";

      return answer;
    })
    .catch(() => {
      /**
       * it seems that if we execute the run clone command within another command
       * (like nesting it under `mucho validator` and prompting the user)
       * the user may not be able to exit the `mucho validator` process via Ctrl+c
       * todo: investigate this more to see if we can still allow the command to continue
       */
      // do nothing on user cancel instead of exiting the cli
      console.log("Operation canceled.");
      process.exit();
      // todo: support selecting a default value here?
      return defaultValue;
    });
}
