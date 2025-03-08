import { Argument, Command } from "@commander-js/extra-typings";
import { cliOutputConfig } from "@/lib/cli";
import ora from "ora";

import { getRunningTestValidatorCommand } from "@/lib/shell/test-validator";
import {
  Address,
  createSolanaRpc,
  getPublicSolanaRpcUrl,
  isAddress,
  lamportsToSol,
} from "gill";
import { getAddressFromStringOrFilePath } from "@/lib/solana";
import { DEFAULT_CLI_KEYPAIR_PATH } from "gill/node";

/**
 * Command: `balance`
 *
 * Get the desired account's balances
 */
export function balanceCommand() {
  return new Command("balance")
    .configureOutput(cliOutputConfig)
    .addArgument(
      new Argument(
        "[address]",
        `account balance to check, either a base58 address or path to a keypair json file ` +
          `\n(default: ${DEFAULT_CLI_KEYPAIR_PATH}`,
      ),
    )
    .description("get the balances for an account")
    .action(async (addressOrKeypairPath) => {
      // titleMessage("Gather troubleshooting info");
      // console.log();

      if (!addressOrKeypairPath)
        addressOrKeypairPath = DEFAULT_CLI_KEYPAIR_PATH;

      const spinner = ora("Getting balances").start();

      const info: string[] = [];
      let address: Address;

      try {
        address = await getAddressFromStringOrFilePath(addressOrKeypairPath);

        if (!isAddress(address)) throw new Error("Invalid address");
      } catch (err) {
        throw new Error("Unable to parse the provided address");
      }

      const testValidatorChecker = getRunningTestValidatorCommand();

      // build the test validator port, with support for an manually defined one
      let localnetClusterUrl = "http://127.0.0.1:8899";
      if (
        !!testValidatorChecker &&
        testValidatorChecker.includes("--rpc-port")
      ) {
        localnetClusterUrl = `http://127.0.0.1:${
          testValidatorChecker.match(/--rpc-port\s+(\d+)/)[1] || 8899
        }`;
      }

      const { devnet, mainnet, testnet, localnet } = {
        mainnet: createSolanaRpc(getPublicSolanaRpcUrl("mainnet-beta")),
        devnet: createSolanaRpc(getPublicSolanaRpcUrl("devnet")),
        testnet: createSolanaRpc(getPublicSolanaRpcUrl("testnet")),
        localnet: createSolanaRpc(localnetClusterUrl),
      };

      info.push("Address: " + address);

      const balances = {
        mainnet:
          (await mainnet
            .getBalance(address)
            .send()
            .then((res) => res.value)) || false,
        devnet:
          (await devnet
            .getBalance(address)
            .send()
            .then((res) => res.value)) || false,
        testnet:
          (await testnet
            .getBalance(address)
            .send()
            .then((res) => res.value)) || false,
        localnet: !!testValidatorChecker
          ? (await localnet
              .getBalance(address)
              .send()
              .then((res) => res.value)) || false
          : false,
      };

      info.push("Balances for address:");
      for (const cluster in balances) {
        info.push(
          "  - " +
            cluster +
            ": " +
            `${lamportsToSol(balances[cluster] ?? 0n)} SOL`,
        );
      }

      info.push("Is test-validator running? " + !!testValidatorChecker);
      if (!!testValidatorChecker) {
        info.push("Localnet url: " + localnetClusterUrl);
      }

      spinner.stop();

      console.log(info.join("\n"));
    });
}
