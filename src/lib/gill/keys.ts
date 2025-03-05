import { address, Address, isAddress } from "gill";
import { loadKeypairSignerFromFile } from "gill/node";
import { doesFileExist } from "../utils";

/**
 * Get the Solana address from the provided input string,
 * either validating it as an `Address` directly or loading the Signer's address from filepath
 */
export async function parseOrLoadSignerAddress(
  input: string,
): Promise<Address> {
  if (isAddress(input)) return address(input);
  if (!doesFileExist(input)) {
    throw new Error("Invalid address or keypair file provided: " + input);
  }
  const signer = await loadKeypairSignerFromFile(input);
  return signer.address;
}
