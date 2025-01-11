import { PythSolanaReceiver,  } from "@pythnetwork/pyth-solana-receiver";
import { Connection, Keypair, clusterApiUrl } from "@solana/web3.js";
import { Wallet } from "@coral-xyz/anchor";
import { HermesClient } from "@pythnetwork/hermes-client";
// You will need a Connection from @solana/web3.js and a Wallet from @coral-xyz/anchor to create
// the receiver.
const connection: Connection = new Connection(clusterApiUrl("mainnet-beta"), 'confirmed');
const wallet: Wallet = new Wallet(Keypair.generate());
const pythSolanaReceiver = new PythSolanaReceiver({ connection, wallet });

const SOL_PRICE_FEED_ID = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";
 
// There are up to 2^16 different accounts for any given price feed id.
// The 0 value below is the shard id that indicates which of these accounts you would like to use.
// However, you may choose to use a different shard to prevent Solana congestion on another app from affecting your app.
const solUsdPriceFeedAccount = pythSolanaReceiver
  .getPriceFeedAccountAddress(0, SOL_PRICE_FEED_ID)


console.log(solUsdPriceFeedAccount);
(async () => {
const priceServiceConnection = new HermesClient(
    "https://hermes.pyth.network/",
    {}
  );
  const priceUpdateData = (
    await priceServiceConnection.getLatestPriceUpdates(
      ["0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"],
      { encoding: "base64" }
    )
  ).binary.data;

  console.log(priceUpdateData);

  const price = await priceServiceConnection.getLatestPriceUpdates(
    [SOL_PRICE_FEED_ID],
    { encoding: "base64" }
  );

  console.log(JSON.stringify(price, null, 2));
})()
