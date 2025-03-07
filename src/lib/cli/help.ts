/**
 * Make the default output for a given command be the `--help` response
 *
 * Offset: default arg offset to get the user supplied command
 * - [0]  = node
 * - [1]  = mucho
 * - [2+] = command and args
 */
export function setHelpCommandAsDefault(
  command: string,
  offset: number = 2,
): string {
  const splitter = command.toLowerCase().split(" ");
  const checkCommand = process.argv.slice(offset, offset + splitter.length);

  // only add the help flag when the configured command is used
  if (checkCommand.join(" ").toLowerCase() == splitter.join(" ")) {
    if (process.argv.length === offset + splitter.length) {
      process.argv.push("--help");
    }
  }

  return splitter.slice(splitter.length - 1)[0];
}
