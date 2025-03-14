import {
  isSolanaError,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
  SolanaError,
  type simulateTransactionFactory,
} from "gill";

function encodeValue(value: unknown): string {
  if (Array.isArray(value)) {
    const commaSeparatedValues = value
      .map(encodeValue)
      .join("%2C%20" /* ", " */);
    return "%5B" /* "[" */ + commaSeparatedValues + /* "]" */ "%5D";
  } else if (typeof value === "bigint") {
    return `${value}n`;
  } else {
    return encodeURIComponent(
      String(
        value != null && Object.getPrototypeOf(value) === null
          ? // Plain objects with no prototype don't have a `toString` method.
            // Convert them before stringifying them.
            { ...(value as object) }
          : value,
      ),
    );
  }
}

function encodeObjectContextEntry([key, value]: [
  string,
  unknown,
]): `${typeof key}=${string}` {
  return `${key}=${encodeValue(value)}`;
}

export function encodeContextObject(context: object): string {
  const searchParamsString = Object.entries(context)
    .map(encodeObjectContextEntry)
    .join("&");
  return Buffer.from(searchParamsString, "utf8").toString("base64");
}

/**
 *
 */
export async function simulateTransactionOnThrow(
  simulateTransaction: ReturnType<typeof simulateTransactionFactory>,
  err: any,
  tx: Parameters<ReturnType<typeof simulateTransactionFactory>>["0"],
) {
  if (
    isSolanaError(
      err,
      SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
    )
  ) {
    const { value } = await simulateTransaction(tx, {
      replaceRecentBlockhash: true,
      innerInstructions: true,
    });

    // console.log(
    //   `npx @solana/errors decode -- ${err.context.__code} ${encodeContextObject(
    //     err.context,
    //   )}`,
    // );

    throw new SolanaError(
      SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
      {
        ...value,
        unitsConsumed: Number(value.unitsConsumed),
      },
    );
  } else throw err;
}
