import { parseRpcUrlOrMoniker } from "@/lib/solana";

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
