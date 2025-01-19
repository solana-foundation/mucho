import { Argument, Command } from "@commander-js/extra-typings";
import { cliOutputConfig } from "@/lib/cli";
import { shellExecInSession } from "@/lib/shell";

type DocInfo = {
  url: string;
  desc: string;
};

const DOCS_INFO = {
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
  "solana-verify": {
    url: "https://github.com/Ellipsis-Labs/solana-verifiable-build",
    desc: "A CLI tool to build and verify Solana programs",
  },
  trident: {
    url: "https://ackee.xyz/trident/docs/latest",
    desc: "Rust-based Fuzzing framework for Solana programs",
  },
  zest: {
    url: "https://github.com/LimeChain/zest",
    desc: "Code coverage CLI tool for Solana programs",
  },
  pnpm: {
    url: "https://pnpm.io/installation",
    desc: "Fast, disk space efficient package manager for Node.js (alternative to npm)",
  },
  yarn: {
    url: "https://yarnpkg.com/getting-started",
    desc: "Node.js package manager (dependency for Anchor)",
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
    .addArgument(
      new Argument("[tool]", "tool to open docs for")
        .choices([...TOOLS, "help"])
        .argOptional(),
    )
    .action(async (tool?: string) => {
      // Open mucho docs by default
      if (!tool) {
        shellExecInSession({
          command: `${openCommand} ${DOCS_INFO.mucho.url}`,
          outputOnly: false,
          args: [],
        });
        return;
      }

      // Show help menu
      if (tool === "help") {
        const maxLength = Math.max(...TOOLS.map((name) => name.length));

        console.log(
          "Usage: mucho docs [tool] - Open documentation for Solana development tools\n",
        );
        console.log("Available documentation:\n");

        Object.entries(DOCS_INFO).forEach(([name, { desc, url }]) => {
          console.log(`${name.padEnd(maxLength + 2)}${desc}`);
          console.log(`${" ".repeat(maxLength + 2)}${url}\n`);
        });

        console.log("Examples:");
        console.log("  mucho docs         - Open Mucho documentation");
        console.log("  mucho docs solana  - Open Solana documentation");
        console.log("  mucho docs help    - Show this help message");
        return;
      }

      // Open specified tool docs
      shellExecInSession({
        command: `${openCommand} ${DOCS_INFO[tool].url}`,
        outputOnly: false,
        args: [],
      });
    });
}
