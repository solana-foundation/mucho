import { Command } from "@commander-js/extra-typings";
import { cliOutputConfig } from "@/lib/cli";
import { getAppInfo } from "@/lib/app-info";

export function cliProgramRoot() {
  // get app info from package.json
  const app = getAppInfo();

  // console.log(picocolors.bgMagenta(` ${app.name} - v${app.version} `));

  // initialize the cli commands and options parsing
  const program = new Command()
    .name(`mucho`)
    .version(app.version, "--version", "output the version number of this tool")
    // .description("")
    .configureOutput(cliOutputConfig);

  return program;
}
