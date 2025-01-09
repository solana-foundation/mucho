#!/usr/bin/env node

import { assertRuntimeVersion } from "@/lib/node";
import { checkForSelfUpdate } from "@/lib/npm";
import { errorMessage } from "@/lib/logs";
import { cliProgramRoot } from "@/commands";

import { installCommand } from "@/commands/install";
// import { doctorCommand } from "@/commands/doctor";
import { infoCommand } from "@/commands/info";
import { cloneCommand } from "@/commands/clone";
import { validatorCommand } from "@/commands/validator";
import { buildCommand } from "@/commands/build";
import { coverageCommand } from "@/commands/coverage";
import { deployCommand } from "@/commands/deploy";

// ensure the user running the cli tool is on a supported javascript runtime version
assertRuntimeVersion();

async function main() {
  // auto check for new version of the cli
  await checkForSelfUpdate();

  try {
    const program = cliProgramRoot();

    program
      .addCommand(installCommand())
      // .addCommand(doctorCommand())
      .addCommand(validatorCommand())
      .addCommand(cloneCommand())
      .addCommand(buildCommand())
      .addCommand(deployCommand())
      .addCommand(coverageCommand())
      .addCommand(infoCommand());

    // set the default action to `help` without an error
    if (process.argv.length === 2) {
      process.argv.push("--help");
    }

    await program.parseAsync();
  } catch (err) {
    errorMessage(err.toString());
  }
}

main();
