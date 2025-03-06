import { getPublicSolanaRpcUrl } from "gill";
import { SolanaCliClusterMonikers } from "@/types/config";
import { parseRpcUrlOrMoniker } from "@/lib/solana";

type ParsedUrlAndCluster = { cluster: SolanaCliClusterMonikers; url: URL };

/**
 * Parse the CLI flag input for the rpc urls: `--url`
 */
export function parseOptionsFlagForRpcUrl(
  input: URL | string | undefined,
  fallbackUrlOrMoniker: ParsedUrlAndCluster["url"] | string,
): ParsedUrlAndCluster {
  try {
    if (!input && fallbackUrlOrMoniker) {
      if (fallbackUrlOrMoniker.toString().startsWith("http")) {
        input = new URL(fallbackUrlOrMoniker);
      } else {
        input = parseRpcUrlOrMoniker(fallbackUrlOrMoniker.toString());
      }
    }
  } catch (err) {
    throw new Error(
      `Unable to parse fallbackUrlOrMoniker: ${fallbackUrlOrMoniker}`,
    );
  }

  input = input.toString();

  let cluster: ParsedUrlAndCluster["cluster"];

  if (input.startsWith("http")) {
    /**
     * fallback to devnet for the cluster when unable to determine
     * todo: we need to figure out a better way to handle this
     * todo: without adjusting this, mucho does not really support custom rpc urls
     */
    cluster = "devnet";
  } else {
    cluster = parseRpcUrlOrMoniker(
      input,
      false /* do not allow urls while parsing the cluster */,
    );
  }

  let url: URL;

  if (input.startsWith("http")) {
    url = new URL(input);
  } else {
    url = new URL(
      getPublicSolanaRpcUrl(
        // FIXME(nick): next version of `gill` adds the `localhost` value here
        cluster == "localhost" ? "localnet" : cluster,
      ),
    );
  }

  return {
    url,
    cluster,
  };
}
