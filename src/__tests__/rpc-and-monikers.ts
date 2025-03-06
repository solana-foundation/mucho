import { parseRpcUrlOrMoniker, getClusterMonikerFromUrl } from "@/lib/solana";

describe("parseRpcUrlOrMoniker", () => {
  // Test URL parsing
  test("should properly parse valid URLs", () => {
    expect(parseRpcUrlOrMoniker("https://api.mainnet-beta.solana.com")).toBe(
      "https://api.mainnet-beta.solana.com/",
    );
    expect(
      parseRpcUrlOrMoniker("https://api.mainnet-beta.solana.com", true),
    ).toBe("https://api.mainnet-beta.solana.com/");

    expect(parseRpcUrlOrMoniker("http://localhost:8899")).toBe(
      "http://localhost:8899/",
    );
  });

  test("should not parse URLs when allowUrl is false", () => {
    expect(() =>
      parseRpcUrlOrMoniker("https://api.mainnet-beta.solana.com", false),
    ).toThrow();
  });

  // Test moniker parsing
  test("should parse localhost/localnet monikers", () => {
    expect(parseRpcUrlOrMoniker("local")).toBe("localhost");
    expect(parseRpcUrlOrMoniker("localhost")).toBe("localhost");
    expect(parseRpcUrlOrMoniker("l")).toBe("localhost");
    // note: solana cli only supports `localhost` as a value, not `localnet`
    expect(parseRpcUrlOrMoniker("localnet")).toBe("localhost");
  });

  test("should parse testnet monikers", () => {
    expect(parseRpcUrlOrMoniker("testnet")).toBe("testnet");
    expect(parseRpcUrlOrMoniker("t")).toBe("testnet");
  });

  test("should parse devnet monikers", () => {
    expect(parseRpcUrlOrMoniker("devnet")).toBe("devnet");
    expect(parseRpcUrlOrMoniker("d")).toBe("devnet");
  });

  test("should parse mainnet monikers", () => {
    expect(parseRpcUrlOrMoniker("mainnet-beta")).toBe("mainnet-beta");
    expect(parseRpcUrlOrMoniker("m")).toBe("mainnet-beta");

    // note: solana cli only supports `mainnet-beta` as a value, not `mainnet`
    expect(parseRpcUrlOrMoniker("mainnet")).toBe("mainnet-beta");
  });

  test("should not parse unknown monikers", () => {
    expect(() => parseRpcUrlOrMoniker("unknown", false)).toThrow();
    expect(() => parseRpcUrlOrMoniker("unknown")).toThrow();
    expect(() => parseRpcUrlOrMoniker("unknown", true)).toThrow();
  });

  // Test case insensitivity
  test("should be case insensitive for monikers", () => {
    expect(parseRpcUrlOrMoniker("MAINNET")).toBe("mainnet-beta");
    expect(parseRpcUrlOrMoniker("Devnet")).toBe("devnet");
    expect(parseRpcUrlOrMoniker("TestNet")).toBe("testnet");
    expect(parseRpcUrlOrMoniker("LocalHost")).toBe("localhost");
  });
});

describe("getClusterMonikerFromUrl", () => {
  test("should identify devnet from url", () => {
    expect(getClusterMonikerFromUrl("https://api.devnet.solana.com")).toBe(
      "devnet",
    );
    expect(getClusterMonikerFromUrl("http://api.devnet.solana.com/")).toBe(
      "devnet",
    );
    expect(
      getClusterMonikerFromUrl("http://api.devnet.solana.com/some/path"),
    ).toBe("devnet");
    expect(
      getClusterMonikerFromUrl(new URL("https://api.devnet.solana.com")),
    ).toBe("devnet");
  });

  test("should identify testnet from url", () => {
    expect(getClusterMonikerFromUrl("https://api.testnet.solana.com")).toBe(
      "testnet",
    );
    expect(getClusterMonikerFromUrl("http://api.testnet.solana.com")).toBe(
      "testnet",
    );
    expect(
      getClusterMonikerFromUrl(new URL("https://api.testnet.solana.com")),
    ).toBe("testnet");
  });

  test("should identify mainnet-beta from url", () => {
    expect(
      getClusterMonikerFromUrl("https://api.mainnet-beta.solana.com"),
    ).toBe("mainnet-beta");
    expect(getClusterMonikerFromUrl("http://api.mainnet-beta.solana.com")).toBe(
      "mainnet-beta",
    );
    expect(
      getClusterMonikerFromUrl(new URL("https://api.mainnet-beta.solana.com")),
    ).toBe("mainnet-beta");
  });

  test("should identify localhost from various local urls", () => {
    expect(getClusterMonikerFromUrl("http://localhost")).toBe("localhost");
    expect(getClusterMonikerFromUrl("http://localhost:8899")).toBe("localhost");
    expect(getClusterMonikerFromUrl("http://127.0.0.1")).toBe("localhost");
    expect(getClusterMonikerFromUrl("http://127.0.0.1:8899")).toBe("localhost");
    expect(getClusterMonikerFromUrl("http://0.0.0.0")).toBe("localhost");
    expect(getClusterMonikerFromUrl("http://0.0.0.0:8899")).toBe("localhost");
    expect(getClusterMonikerFromUrl(new URL("http://localhost:8899"))).toBe(
      "localhost",
    );
  });

  // Test error cases
  test("should throw error for invalid url strings", () => {
    expect(() => getClusterMonikerFromUrl("not-a-url")).toThrow(
      "Unable to parse RPC url",
    );
    expect(() => getClusterMonikerFromUrl("")).toThrow(
      "Unable to parse RPC url",
    );
  });

  test("should throw error for unrecognized hostnames", () => {
    expect(() => getClusterMonikerFromUrl("https://example.com")).toThrow(
      "Unable to determine moniker from RPC url",
    );
    expect(() =>
      getClusterMonikerFromUrl("https://unknown-rpc.solana.com"),
    ).toThrow("Unable to determine moniker from RPC url");
    expect(() => getClusterMonikerFromUrl("https://api.solana.com")).toThrow(
      "Unable to determine moniker from RPC url",
    );
  });

  // Test edge cases
  test("should handle URLs with different protocols", () => {
    expect(getClusterMonikerFromUrl("wss://api.devnet.solana.com")).toBe(
      "devnet",
    );
    expect(getClusterMonikerFromUrl("ws://api.testnet.solana.com")).toBe(
      "testnet",
    );
  });

  test("should handle URLs with query parameters", () => {
    expect(
      getClusterMonikerFromUrl(
        "https://api.mainnet-beta.solana.com?param=value",
      ),
    ).toBe("mainnet-beta");
  });
});
