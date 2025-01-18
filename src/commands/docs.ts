import { Argument, Command } from "@commander-js/extra-typings";
import { cliOutputConfig } from "@/lib/cli";
import { shellExecInSession } from "@/lib/shell";

interface DocInfo {
  url: string;
  desc: string;
}

interface DocsGroups {
  [category: string]: {
    [tool: string]: DocInfo;
  };
}

const DOCS_GROUPS: DocsGroups = {
  "Core Development": {
    mucho: {
      url: "https://github.com/solana-developers/mucho",
      desc: "Mucho - a CLI to simplify Solana development and testing"
    },
    solana: {
      url: "https://solana.com/docs",
      desc: "Solana blockchain documentation"
    },
    "solana-cli": {
      url: "https://solana.com/docs/intro/installation#install-the-solana-cli",
      desc: "The standard tool suite required to build and deploy Solana programs"
    },
    rust: {
      url: "https://www.rust-lang.org/learn",
      desc: "Programming language for Solana smart contracts"
    },
    node: {
      url: "https://nodejs.org/en/learn",
      desc: "Node.js - runtime for building Solana client applications"
    }
  },
  "Smart Contract Tools": {
    anchor: {
      url: "https://www.anchor-lang.com",
      desc: "Anchor framework documentation"
    },
    avm: {
      url: "https://www.anchor-lang.com/docs/installation#installing-using-anchor-version-manager-avm-recommended",
      desc: "Anchor Version Manager (AVM) documentation"
    },
    spl: {
      url: "https://spl.solana.com",
      desc: "Solana Program Library documentation"
    },
    metaplex: {
      url: "https://docs.metaplex.com",
      desc: "Metaplex NFT standard documentation"
    }
  },
  "Testing & Verification": {
    "solana-verify": {
      url: "https://github.com/Ellipsis-Labs/solana-verifiable-build",
      desc: "Solana program verification tool"
    },
    trident: {
      url: "https://ackee.xyz/trident/docs/latest",
      desc: "Solana smart contract fuzzing tool"
    },
    zest: {
      url: "https://github.com/LimeChain/zest",
      desc: "Solana program code coverage tool"
    }
  }
};

// Create a flat map of all tools
const DOCS_INFO: Record<string, DocInfo> = Object.values(DOCS_GROUPS)
  .reduce((acc, group) => ({ ...acc, ...group }), {});

const TOOLS = Object.keys(DOCS_INFO);

const OPEN_COMMANDS = {
  win32: "start",
  darwin: "open",
  linux: "xdg-open"
} as const;

/**
 * Command: `docs`
 * 
 * Open documentation websites for Solana development tools
 */
export function docsCommand() {
  const openCommand = OPEN_COMMANDS[process.platform as keyof typeof OPEN_COMMANDS] ?? "xdg-open";

  return new Command("docs")
    .configureOutput(cliOutputConfig)
    .description("open documentation websites for Solana development tools")
    .addArgument(
      new Argument("[tool]", "tool to open docs for")
        .choices([...TOOLS, "help"])
        .argOptional(),
    )
    .action(async (tool?: string) => {
      // If no tool specified, open mucho docs
      if (!tool) {
        shellExecInSession({
          command: `${openCommand} ${DOCS_INFO["mucho"].url}`,
          outputOnly: false,
          args: [],
        });
        return;
      }

      // Display help if requested
      if (tool === "help") {
        console.log("Usage: mucho docs [tool] - Open documentation for Solana development tools\n");
        console.log("Available documentation by category:\n");

        const maxLength = Math.max(...TOOLS.map(name => name.length));

        Object.entries(DOCS_GROUPS).forEach(([groupName, tools]) => {
          console.log(`${groupName}:`);
          Object.entries(tools).forEach(([name, { desc, url }]) => {
            const padding = " ".repeat(maxLength - name.length + 2);
            console.log(`  ${name}${padding}${desc}`);
            console.log(`  ${" ".repeat(maxLength + 2)}${url}`);
          });
          console.log(); // Add space between groups
        });

        console.log("Examples:");
        console.log("  mucho docs         - Open Mucho documentation");
        console.log("  mucho docs solana  - Open Solana documentation");
        console.log("  mucho docs help    - Show this help message");
        return;
      }

      // Open specific tool documentation
      shellExecInSession({
        command: `${openCommand} ${DOCS_INFO[tool].url}`,
        outputOnly: false,
        args: [],
      });
    });
} 