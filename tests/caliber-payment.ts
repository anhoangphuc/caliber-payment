import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { createMint } from "@solana/spl-token";
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
  let solanaMint: PublicKey;

  before(async () => {
    await airdropSol(connection, admin.publicKey, 100);
    solanaMint = await createMint(provider.connection, admin, admin.publicKey, admin.publicKey, 6);
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

  it("Admin add allowed token", async () => {
    // Add your test here.
    const [config] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.CONFIG_SEED)],
      program.programId,
    );
    const [allowedTokenConfig] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.ALLOWED_TOKEN_CONFIG_SEED), solanaMint.toBuffer()],
      program.programId,
    );
    const priceFeedBuffer = Buffer.from(CONSTANTS.PYTH_ORACLE.SOL.ID.slice(2), 'hex');
    console.log(priceFeedBuffer);


    const tx = await program.methods.adminAddAllowedToken(CONSTANTS.PYTH_ORACLE.SOL.ID).accounts({
      admin: admin.publicKey,
      config: config,
      pythOracle: CONSTANTS.PYTH_ORACLE.SOL.KEY,
      allowedTokenConfig,
      token: solanaMint,
    }).rpc({ commitment: 'confirmed' });
    console.log("Admin add allowed token success at", tx);

    const allowedTokenConfigAccount = await program.account.allowedTokenConfig.fetch(allowedTokenConfig);
    assert.equal(allowedTokenConfigAccount.token.toBase58(), solanaMint.toBase58(), "Token is not set correctly");
    assert.equal(allowedTokenConfigAccount.pythOracle.toBase58(), CONSTANTS.PYTH_ORACLE.SOL.KEY, "Pyth oracle is not set correctly");
    assert.equal(allowedTokenConfigAccount.enabled, true, "Enabled status is not set correctly");
  });

  it("Admin update allowed token enabled status", async () => {
    // Add your test here.
    const [config] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.CONFIG_SEED)],
      program.programId,
    );
    const [allowedTokenConfig] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.ALLOWED_TOKEN_CONFIG_SEED), solanaMint.toBuffer()],
      program.programId,
    );
    const tx = await program.methods.adminUpdateAllowedTokenEnabledStatus(false).accounts({
      admin: admin.publicKey,
      config: config,
      allowedTokenConfig,
    }).rpc({ commitment: 'confirmed' });
    console.log("Admin add allowed token success at", tx);

    const allowedTokenConfigAccount = await program.account.allowedTokenConfig.fetch(allowedTokenConfig);
    assert.equal(allowedTokenConfigAccount.enabled, false, "Enabled status is not set correctly");
  });
});

