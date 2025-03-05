// get the updated destination balance
const ata = await fetchToken(
  rpc,
  await getAssociatedTokenAccountAddress(
    mint,
    destination,
    mintAccount.programAddress,
  ),
);

// fetch the
const res = await rpc
  .simulateTransaction(
    getBase64EncodedWireTransaction(
      compileTransaction(
        createTransaction({
          feePayer: payer,
          latestBlockhash,
          version: "legacy",
          instructions: [
            getUiAmountToAmountInstruction(
              {
                mint,
                uiAmount: String(ata.data.amount),
              },
              {
                programAddress: mintAccount.programAddress,
              },
            ),
          ],
        }),
      ),
    ),
    {
      encoding: "base64",
      // replaceRecentBlockhash: true,
      sigVerify: false,
    },
  )
  .send();

// getBase64Encoder().encode(res.value.returnData.data[0])

console.log("base64:", res.value.returnData.data[0]);

const balance = getU64Decoder().decode(
  getBase64Encoder().encode(res.value.returnData.data[0]),
);
console.log("balance:", balance);
console.log(
  "balance:",
  Number(balance) * Math.pow(10, mintAccount.data.decimals),
);

// console.log("Destination's new token balance:", uiamount);

// console.log(ata);
