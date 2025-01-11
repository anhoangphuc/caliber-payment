import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";
import { CaliberPayment } from "../target/types/caliber_payment";
import { airdropSol, CONSTANTS } from "./utils";
import { assert } from "chai";
describe("caliber-payment", () => {
  // Configure the client to use the local cluster.
  const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
  const admin = anchor.web3.Keypair.generate();
  const user = anchor.web3.Keypair.generate();
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(admin), { commitment: 'confirmed' });
  anchor.setProvider(provider);

  const program = anchor.workspace.CaliberPayment as Program<CaliberPayment>;
  const protocolFeeRate = 300;

  before(async () => {
    await airdropSol(connection, admin.publicKey, 100);
  });

  it("Is initialized!", async () => {
    // Add your test here.
    const [config] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.CONFIG_SEED)],
      program.programId,
    );
    const [feeRecipient] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.FEE_RECIPIENT_SEED)],
      program.programId,
    );
    const tx = await program.methods.adminInitialize(300).accounts({
      admin: admin.publicKey,
      feeRecipient: feeRecipient,
      config: config,
    }).rpc({ commitment: 'confirmed' });
    console.log("Admin initialize success at", tx);

    const configAccount = await program.account.config.fetch(config);
    assert.equal(configAccount.admin.toBase58(), admin.publicKey.toBase58(), "Admin is not set correctly");
    assert.equal(configAccount.feeRecipient.toBase58(), feeRecipient.toBase58(), "Fee recipient is not set correctly");
    assert.equal(configAccount.protocolFeeRate, protocolFeeRate, "Protocol fee rate is not set correctly");
  });
});

