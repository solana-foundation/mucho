import { select } from "@inquirer/prompts";
import { initGitRepo, isGitRepo } from "@/lib/git";
import { warningOutro } from "@/lib/logs";

export async function promptToInitGitRepo(
  defaultGitDir: string,
  exitOnFailToCreate: boolean = true,
): Promise<boolean> {
  return select<boolean>({
    message: "Would you like to initialize a git repo?",
    default: "y",
    choices: [
      {
        name: "(y) Yes",
        short: "y",
        value: true,
        description: `Default repo directory: ${defaultGitDir}`,
      },
      // todo: support the user manually defining the repo root, including from the cli args
      // {
      //   name: "(m) Manually define the repo root",
      //   short: "m",
      //   value: "m",
      //   description: "",
      // },
      {
        name: "(n) No",
        short: "n",
        value: false,
        description: "Skip it",
      },
    ],
  })
    .then((answer) => {
      if (answer == true) {
        initGitRepo(defaultGitDir);
        if (!isGitRepo(defaultGitDir) && exitOnFailToCreate) {
          warningOutro(
            `Unable to initialize a new git repo at: ${defaultGitDir}`,
          );
        }
      }

      return true;
    })
    .catch((err) => {
      // do nothing on user cancel
      return false;
    });
}
