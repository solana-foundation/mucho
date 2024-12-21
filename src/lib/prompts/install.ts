import { select } from "@inquirer/prompts";
import { ToolNames } from "@/types";

export async function promptToInstall(
  toolName: ToolNames,
): Promise<void | boolean> {
  return select<boolean>({
    message: `Would you like to install '${toolName}' now?`,
    default: "y",
    choices: [
      {
        name: "(y) Yes",
        short: "y",
        value: true,
      },
      {
        name: "(n) No",
        short: "n",
        value: false,
      },
    ],
  })
    .then(async (answer) => {
      if (answer !== true) return false;
      return true;
    })
    .catch(() => {
      /**
       * it seems that if we execute a Commander command within another command
       * (like nesting it under test-validator and prompting the user)
       * the user may not be able to exit the parent command's process via CTRL+C
       * todo: investigate this more to see if we can still allow the command to continue
       */
      // do nothing on user cancel instead of exiting the cli
      console.log("Operation canceled.");
      process.exit();
      return;
    });
}
