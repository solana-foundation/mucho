import { join, resolve } from "path";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { createFolders } from "./utils";

/**
 * Clone or force update a git repo into the target location
 */
export function cloneOrUpdateRepo(
  repoUrl: string,
  targetFolder: string,
  branch: string = null,
): boolean {
  try {
    targetFolder = resolve(targetFolder);
    const commands: string[] = [];
    if (existsSync(targetFolder)) {
      commands.push(
        `git -C ${targetFolder} fetch origin ${branch || ""}`,
        `git -C ${targetFolder} reset --hard ${
          branch ? `origin/${branch}` : "origin"
        }`,
        `git -C ${targetFolder} pull origin ${branch || ""}`,
      );
    } else {
      commands.push(
        `git clone ${
          branch ? `--branch ${branch}` : ""
        } ${repoUrl} ${targetFolder}`,
      );
    }

    execSync(commands.join(" && "), {
      stdio: "ignore", // hide output
      // stdio: "inherit", // show output
    });

    if (existsSync(targetFolder)) return true;
    else return false;
  } catch (error) {
    console.error(
      "[cloneOrUpdateRepo]",
      "Unable to clone repo:",
      error.message,
    );
    return false;
  }
}

export function isGitRepo(targetFolder: string): boolean {
  try {
    // Run git command to check if inside a git repository
    const result = execSync(
      `git -C ${targetFolder} rev-parse --is-inside-work-tree`,
      {
        stdio: "pipe", // so we can parse output
      },
    )
      .toString()
      .trim();

    return result === "true";
  } catch (error) {
    // If command fails, it means it's not a git repo
    return false;
  }
}

export function initGitRepo(
  targetFolder: string,
  commitMessage: string = "init",
): boolean {
  try {
    createFolders(targetFolder, true);
    const commands: string[] = [];

    // Combine all Git commands in a single line
    commands.push(
      `git init ${targetFolder}`,
      `git add ${join(targetFolder, ".")} --force`,
      `git -C ${targetFolder} commit -m "${commitMessage}"`,
    );

    // Execute the command
    execSync(commands.join(" && "), {
      stdio: "ignore", // hide output
      //   stdio: "inherit", // show output
    });

    return true;
  } catch (error) {
    console.error(
      "[initGitRepo]",
      "Unable to execute 'git init'",
      // error.message,
    );
    return false;
  }
}
