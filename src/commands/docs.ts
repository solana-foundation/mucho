import { Argument, Command } from "@commander-js/extra-typings";
import { cliOutputConfig } from "@/lib/cli";
import { titleMessage } from "@/lib/logs";
import { shellExecInSession } from "@/lib/shell";
import { COMMON_OPTIONS } from "@/const/commands";

type DocInfo = {
  url: string;
  desc: string;
};

const DOCS_INFO = {
  // Core Development Tools
  mucho: {
    url: "https://github.com/solana-developers/mucho",
    desc: "A superset of popular Solana developer tools to simplify Solana program development and testing",
  },
  solana: {
    url: "https://solana.com/docs",
    desc: "Official Solana blockchain technical documentation",
  },
  "solana-cli": {
    url: "https://solana.com/docs/intro/installation#install-the-solana-cli",
    desc: "The Agave CLI tool suite required to build and deploy Solana programs (formerly known as Solana CLI tool suite)",
  },
  // Programming Languages & Runtimes
  rust: {
    url: "https://www.rust-lang.org/learn",
    desc: "Programming language for writing Solana smart contracts",
  },
  node: {
    url: "https://nodejs.org/en/learn",
    desc: "Runtime environment for Solana client applications",
  },
  typescript: {
    url: "https://www.typescriptlang.org/docs",
    desc: "TypeScript language for writing Solana client applications",
  },
  // Smart Contract Development
  anchor: {
    url: "https://www.anchor-lang.com",
    desc: "Solana's most popular smart contract framework",
  },
  avm: {
    url: "https://www.anchor-lang.com/docs/installation#installing-using-anchor-version-manager-avm-recommended",
    desc: "Anchor Version Manager (AVM) to manage multiple versions of Anchor",
  },
  spl: {
    url: "https://spl.solana.com",
    desc: "The Solana Program Library (SPL) is a collection of standard smart contracts for Solana",
  },
  metaplex: {
    url: "https://docs.metaplex.com",
    desc: "Metaplex NFT standard documentation",
  },
  // Testing & Verification Tools
  "solana-verify": {
    url: "https://github.com/Ellipsis-Labs/solana-verifiable-build",
    desc: "CLI tool for verifying Solana program builds match on-chain deployments",
  },
  trident: {
    url: "https://ackee.xyz/trident/docs/latest",
    desc: "Rust-based fuzzing framework for testing Solana programs",
  },
  zest: {
    url: "https://github.com/LimeChain/zest",
    desc: "Code coverage CLI tool for Solana programs",
  },
  // Node Related Tools
  nvm: {
    url: "https://github.com/nvm-sh/nvm",
    desc: "Node Version Manager for managing multiple versions of Node.js",
  },
  npm: {
    url: "https://docs.npmjs.com/cli/v11",
    desc: "Default package manager for Node.js - manages dependencies and project scripts",
  },
  pnpm: {
    url: "https://pnpm.io/installation",
    desc: "Fast, disk space efficient package manager for Node.js - alternative to npm",
  },
  yarn: {
    url: "https://yarnpkg.com/getting-started",
    desc: "Alternative Node.js package manager - dependency for Anchor",
  },
} as const satisfies Record<string, DocInfo>;

const OPEN_COMMANDS = {
  win32: "start",
  darwin: "open",
  linux: "xdg-open",
} as const;

/**
 * Command: `docs`
 *
 * Open documentation websites for Solana development tools
 */
export function docsCommand() {
  const openCommand =
    OPEN_COMMANDS[process.platform as keyof typeof OPEN_COMMANDS] ?? "xdg-open";
  const TOOLS = Object.keys(DOCS_INFO);

  return new Command("docs")
    .configureOutput(cliOutputConfig)
    .description("open documentation websites for Solana development tools")
    .usage("[options] [tool]")
    .addArgument(
      new Argument("[tool]", "tool to open docs for")
        .choices(TOOLS)
        .default("mucho"),
    )
    .addOption(COMMON_OPTIONS.outputOnly)
    .addHelpText(
      "after",
      `
Available documentation:
${Object.entries(DOCS_INFO)
  .map(
    ([name, { desc, url }]) =>
      `  ${name.padEnd(14)}${desc}\n  ${" ".repeat(14)}${url}`,
  )
  .join("\n\n")}

Examples:
  $ mucho docs         # open Mucho documentation
  $ mucho docs solana  # open Solana documentation`,
    )
    .action(async (tool, options) => {
      if (!options.outputOnly) {
        titleMessage("Open documentation");
      }

      shellExecInSession({
        command: `${openCommand} ${DOCS_INFO[tool].url}`,
        outputOnly: options.outputOnly,
        args: [],
      });
    });
}
