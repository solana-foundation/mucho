import { getPublicSolanaRpcUrl } from "gill";
import { getClusterMonikerFromUrl, parseRpcUrlOrMoniker } from "@/lib/solana";
import { parseOptionsFlagForRpcUrl } from "@/lib/cli/parsers";

jest.mock("gill", () => ({
  getPublicSolanaRpcUrl: jest.fn(),
}));

jest.mock("@/lib/solana", () => ({
  getClusterMonikerFromUrl: jest.fn(),
  parseRpcUrlOrMoniker: jest.fn(),
}));

describe("parseOptionsFlagForRpcUrl", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (getPublicSolanaRpcUrl as jest.Mock).mockImplementation((cluster) => {
      const urls = {
        mainnet: "https://api.mainnet-beta.solana.com",
        devnet: "https://api.devnet.solana.com",
        testnet: "https://api.testnet.solana.com",
        localnet: "http://localhost:8899",
      };
      return urls[cluster] || urls.devnet;
    });

    (getClusterMonikerFromUrl as jest.Mock).mockImplementation((url) => {
      const urlStr = url.toString();
      if (urlStr.includes("devnet")) return "devnet";
      if (urlStr.includes("testnet")) return "testnet";
      if (urlStr.includes("mainnet-beta")) return "mainnet-beta";
      if (urlStr.includes("localhost") || urlStr.includes("127.0.0.1"))
        return "localhost";
      throw new Error("Unable to determine moniker from RPC url");
    });

    (parseRpcUrlOrMoniker as jest.Mock).mockImplementation((input) => {
      if (input.startsWith("d")) return "devnet";
      if (input.startsWith("t")) return "testnet";
      if (input.startsWith("m")) return "mainnet";
      if (input.startsWith("l")) return "localhost";
      return "devnet"; // Default fallback
    });
  });

  // Test URL input scenarios
  test("should correctly parse URL string input", () => {
    const result = parseOptionsFlagForRpcUrl("https://api.devnet.solana.com");

    expect(getClusterMonikerFromUrl).toHaveBeenCalledWith(
      "https://api.devnet.solana.com",
    );
    expect(result.cluster).toBe("devnet");
    expect(result.url.toString()).toBe("https://api.devnet.solana.com/");
  });

  test("should correctly parse URL with sub paths input", () => {
    const result = parseOptionsFlagForRpcUrl(
      "https://api.devnet.solana.com/path/another-one",
    );

    expect(getClusterMonikerFromUrl).toHaveBeenCalledWith(
      "https://api.devnet.solana.com/path/another-one",
    );
    expect(result.cluster).toBe("devnet");
    expect(result.url.toString()).toBe(
      "https://api.devnet.solana.com/path/another-one",
    );
  });

  test("should correctly parse URL with search params input", () => {
    const result = parseOptionsFlagForRpcUrl(
      "https://api.devnet.solana.com/?token=whatever",
    );

    expect(getClusterMonikerFromUrl).toHaveBeenCalledWith(
      "https://api.devnet.solana.com/?token=whatever",
    );
    expect(result.cluster).toBe("devnet");
    expect(result.url.toString()).toBe(
      "https://api.devnet.solana.com/?token=whatever",
    );
  });

  test("should correctly parse URL object input", () => {
    const urlObj = new URL("https://api.testnet.solana.com");
    const result = parseOptionsFlagForRpcUrl(urlObj);

    expect(getClusterMonikerFromUrl).toHaveBeenCalledWith(
      "https://api.testnet.solana.com/",
    );
    expect(result.cluster).toBe("testnet");
    expect(result.url.toString()).toBe("https://api.testnet.solana.com/");
  });

  // Test moniker input scenarios
  test("should correctly parse moniker string input", () => {
    const result = parseOptionsFlagForRpcUrl("devnet");

    expect(parseRpcUrlOrMoniker).toHaveBeenCalledWith("devnet", false);
    expect(getPublicSolanaRpcUrl).toHaveBeenCalledWith("devnet");
    expect(result.cluster).toBe("devnet");
    expect(result.url.toString()).toBe("https://api.devnet.solana.com/");
  });

  test("should handle localhost moniker correctly", () => {
    (parseRpcUrlOrMoniker as jest.Mock).mockReturnValueOnce("localhost");

    const result = parseOptionsFlagForRpcUrl("localhost");

    expect(parseRpcUrlOrMoniker).toHaveBeenCalledWith("localhost", false);
    expect(getPublicSolanaRpcUrl).toHaveBeenCalledWith("localnet");
    expect(result.cluster).toBe("localhost");
  });

  // Test fallback scenarios
  test("should use fallback URL when input is undefined", () => {
    const result = parseOptionsFlagForRpcUrl(
      undefined,
      "https://api.mainnet-beta.solana.com",
    );

    expect(result.cluster).toBe("mainnet-beta");
    expect(result.url.toString()).toBe("https://api.mainnet-beta.solana.com/");
  });

  test("should use fallback moniker when input is undefined", () => {
    const result = parseOptionsFlagForRpcUrl(undefined, "testnet");

    expect(parseRpcUrlOrMoniker).toHaveBeenCalledWith("testnet");
    expect(result.cluster).toBe("testnet");
  });

  test("should fallback to devnet cluster when URL cluster cannot be determined", () => {
    (getClusterMonikerFromUrl as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Unable to determine moniker from RPC url");
    });

    const result = parseOptionsFlagForRpcUrl("https://custom-rpc.example.com");

    expect(result.cluster).toBe("devnet");
    expect(result.url.toString()).toBe("https://custom-rpc.example.com/");
  });

  // Test error scenarios
  test("should throw error when fallback URL is invalid", () => {
    (parseRpcUrlOrMoniker as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Parse error");
    });

    expect(() => {
      parseOptionsFlagForRpcUrl(undefined, "invalid-input");
    }).toThrow("Unable to parse fallbackUrlOrMoniker: invalid-input");
  });

  test("should throw error when no input or fallbackUrl is provided", () => {
    expect(() => {
      parseOptionsFlagForRpcUrl(undefined, undefined);
    }).toThrow("Invalid input provided for parsing the RPC url");
  });
});
