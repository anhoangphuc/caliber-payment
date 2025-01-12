import { PythSolanaReceiver, } from "@pythnetwork/pyth-solana-receiver";
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


(async () => {
    const priceServiceConnection = new HermesClient(
        "https://hermes.pyth.network/",
        {}
    );

    const base64Data = "IvEjY51+9M1gMUcENA3t3zcf1CRyFI8kjp0abRpesqw6zYt/1dayQwHvDYtv2izrpB2hXUCV0do5Kg0vjtDGx7wPTPrIwoC1bUvhu1MEAAAA2RTJAAAAAAD4////YeWBZwAAAABg5YFnAAAAAJC1s1cEAAAAXNvRAAAAAACsXqsSAAAAAAA=";
    const binaryData = Buffer.from(base64Data, 'base64')
    const binaryDataInHex = binaryData.toString('hex');
    console.log(binaryDataInHex);

    const numberInHex = "4be1bb5304000000";
    // const numberInHex = "0065cd1d00000000";
    const convertedNumber = parseInt(Buffer.from(numberInHex, 'hex').reverse().toString('hex'), 16);

    console.log("Converted number (little-endian):", convertedNumber);

    const number = 20000000000;
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64LE(BigInt(number));
    const hexString = buffer.toString('hex');
    console.log("20000000000 in hex:", hexString);
    console.log("Verify conversion back:", parseInt(Buffer.from(hexString, 'hex').reverse().toString('hex'), 16));

    const newBinaryDataInHex = binaryDataInHex.replace("4be1bb5304000000", hexString);
    const newData = Buffer.from(newBinaryDataInHex, 'hex').toString('base64');
    console.log(newData);

    // const updatedBinaryData = bina

})()
