import { select } from "@inquirer/prompts";
import { cloneCommand } from "@/commands/clone";

export async function promptToAutoClone(): Promise<void | boolean> {
  console.log(); // print a line separator
  return select<boolean>({
    message: "Would you like to perform the 'clone' command now?",
    default: "y",
    choices: [
      {
        name: "(y) Yes",
        short: "y",
        value: true,
        description: `Yes, clone all the accounts and programs in Solana.toml`,
      },
      {
        name: "(n) No",
        short: "n",
        value: false,
        description: "Do not run the 'clone' command now",
      },
    ],
  })
    .then(async (answer) => {
      if (answer !== true) return false;

      // run the clone command with default options
      // todo: could we pass options in here if we want?
      await cloneCommand().parseAsync([]);
    })
    .catch(() => {
      /**
       * it seems that if we execute the run clone command within another command
       * (like nesting it under test-validator and prompting the user)
       * the user may not be able to exit the test-validator process via Ctrl+c
       * todo: investigate this more to see if we can still allow the command to continue
       */
      // do nothing on user cancel instead of exiting the cli
      console.log("Operation canceled.");
      process.exit();
      return;
    });
}
