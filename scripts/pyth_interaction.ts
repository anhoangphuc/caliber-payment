import { PythSolanaReceiver,  } from "@pythnetwork/pyth-solana-receiver";
import { Connection, Keypair, clusterApiUrl } from "@solana/web3.js";
import { Wallet } from "@coral-xyz/anchor";
import { HermesClient } from "@pythnetwork/hermes-client";
import { CONSTANTS } from "../tests/utils";
// You will need a Connection from @solana/web3.js and a Wallet from @coral-xyz/anchor to create
// the receiver.
const connection: Connection = new Connection(clusterApiUrl("mainnet-beta"), 'confirmed');
const wallet: Wallet = new Wallet(Keypair.generate());
const pythSolanaReceiver = new PythSolanaReceiver({ connection, wallet });

// There are up to 2^16 different accounts for any given price feed id.
// The 0 value below is the shard id that indicates which of these accounts you would like to use.
// However, you may choose to use a different shard to prevent Solana congestion on another app from affecting your app.
const solUsdPriceFeedAccount = pythSolanaReceiver
  .getPriceFeedAccountAddress(0, CONSTANTS.PYTH_ORACLE.RAYDIUM.ID)


console.log(solUsdPriceFeedAccount);
(async () => {
const priceServiceConnection = new HermesClient(
    "https://hermes.pyth.network/",
    {}
  );

  const price = await priceServiceConnection.getLatestPriceUpdates(
    [CONSTANTS.PYTH_ORACLE.RAYDIUM.ID],
    { encoding: "base64" }
  );

  console.log(JSON.stringify(price, null, 2));
})()
