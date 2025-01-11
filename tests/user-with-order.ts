import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Connection, PublicKey, ComputeBudgetProgram, Transaction } from "@solana/web3.js";
import { createMint, getAssociatedTokenAddress } from "@solana/spl-token";
import { CaliberPayment } from "../target/types/caliber_payment";
import { airdropSol, airdropToken, CONSTANTS } from "./utils";
import { assert } from "chai";
describe("caliber-payment", () => {
  // Configure the client to use the local cluster.
  const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
  const admin = anchor.web3.Keypair.generate();
  const user = anchor.web3.Keypair.generate();
  const user2 = anchor.web3.Keypair.generate();
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(admin), { commitment: 'confirmed' });
  anchor.setProvider(provider);

  const program = anchor.workspace.CaliberPayment as Program<CaliberPayment>;
  const protocolFeeRate = 300;
  const solanaDecimals = 9;
  const raydiumDecimals = 6;
  let solanaMint: PublicKey;
  let raydiumMint: PublicKey;
  const xAmount = 5;
  const order = anchor.web3.Keypair.generate();
  before(async () => {
    await airdropSol(connection, admin.publicKey, 100);
    await airdropSol(connection, user.publicKey, 100);
    await airdropSol(connection, user2.publicKey, 100);
    solanaMint = await createMint(provider.connection, admin, admin.publicKey, admin.publicKey, solanaDecimals);
    raydiumMint = await createMint(provider.connection, admin, admin.publicKey, admin.publicKey, raydiumDecimals);
    await airdropToken(provider, admin, user.publicKey, solanaMint, 1000 * 10 ** solanaDecimals);
    await airdropToken(provider, admin, user2.publicKey, raydiumMint, 1000 * 10 ** raydiumDecimals);
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
    const [solanaAllowedTokenConfig] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.ALLOWED_TOKEN_CONFIG_SEED), solanaMint.toBuffer()],
      program.programId,
    );
    const [raydiumAllowedTokenConfig] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.ALLOWED_TOKEN_CONFIG_SEED), raydiumMint.toBuffer()],
      program.programId,
    );

    const tx1 = await program.methods.adminAddAllowedToken(CONSTANTS.PYTH_ORACLE.SOL.ID).accounts({
      admin: admin.publicKey,
      config: config,
      pythOracle: CONSTANTS.PYTH_ORACLE.SOL.KEY,
      allowedTokenConfig: solanaAllowedTokenConfig,
      token: solanaMint,
    }).rpc({ commitment: 'confirmed' });
    console.log("Admin add allowed token for solana success at", tx1);

    const tx2 = await program.methods.adminAddAllowedToken(CONSTANTS.PYTH_ORACLE.RAYDIUM.ID).accounts({
      admin: admin.publicKey,
      config: config,
      pythOracle: CONSTANTS.PYTH_ORACLE.RAYDIUM.KEY,
      allowedTokenConfig: raydiumAllowedTokenConfig,
      token: raydiumMint,
    }).rpc({ commitment: 'confirmed' });
    console.log("Admin add allowed token for raydium success at", tx2);
  });

  it("User make order to buy raydium using solana", async () => {
    // Add your test here.
    const [config] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.CONFIG_SEED)],
      program.programId,
    );
    const [solanaAllowedTokenConfig] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.ALLOWED_TOKEN_CONFIG_SEED), solanaMint.toBuffer()],
      program.programId,
    );
    const [raydiumAllowedTokenConfig] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.ALLOWED_TOKEN_CONFIG_SEED), raydiumMint.toBuffer()],
      program.programId,
    );
    const [orderAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.ORDER_AUTHORITY_SEED), order.publicKey.toBuffer()],
      program.programId,
    )
    const userTokenXAccount = await getAssociatedTokenAddress(solanaMint, user.publicKey);
    const orderTokenXAccount = await getAssociatedTokenAddress(solanaMint, orderAuthority, true);
    const orderTokenYAccount = await getAssociatedTokenAddress(raydiumMint, orderAuthority, true);
    const mintXMinPrice = new BN(150 * CONSTANTS.PRICE_SCALER);
    const mintYMinPrice = new BN(3 * CONSTANTS.PRICE_SCALER);
    const mintXMaxPrice = new BN(250 * CONSTANTS.PRICE_SCALER);
    const mintYMaxPrice = new BN(6 * CONSTANTS.PRICE_SCALER);

    try {
      const tx = await program.methods.userCreateOrder({
        tokenXMint: solanaMint,
        tokenYMint: raydiumMint,
        minXPrice: mintXMinPrice,
        maxXPrice: mintXMaxPrice,
        minYPrice: mintYMinPrice,
        maxYPrice: mintYMaxPrice,
        amount: new BN(xAmount * 10 ** solanaDecimals),
        validityDuration: new BN(30),
      }).accounts({
        user: user.publicKey,
        order: order.publicKey,
        orderAuthority,
        tokenX: solanaMint,
        tokenY: raydiumMint,
        tokenXConfig: solanaAllowedTokenConfig,
        tokenYConfig: raydiumAllowedTokenConfig,
        userTokenXAccount,
        orderTokenXAccount,
        orderTokenYAccount,
      })
        .signers([order, user])
        .rpc({ commitment: 'confirmed' });
      console.log("User create order success at", tx);
    } catch (e) {
      console.log(e);
    }

    const orderAccount = await program.account.order.fetch(order.publicKey);
    assert.equal(orderAccount.user.toBase58(), user.publicKey.toBase58(), "User is not set correctly");
    assert.equal(orderAccount.tokenXMint.toBase58(), solanaMint.toBase58(), "Token X is not set correctly");
    assert.equal(orderAccount.tokenYMint.toBase58(), raydiumMint.toBase58(), "Token Y is not set correctly");
    assert.equal(orderAccount.minXPrice.toNumber(), mintXMinPrice.toNumber(), "Min X price is not set correctly");
    assert.equal(orderAccount.maxXPrice.toNumber(), mintXMaxPrice.toNumber(), "Max X price is not set correctly");
    assert.equal(orderAccount.minYPrice.toNumber(), mintYMinPrice.toNumber(), "Min Y price is not set correctly");
    assert.equal(orderAccount.maxYPrice.toNumber(), mintYMaxPrice.toNumber(), "Max Y price is not set correctly");
    const orderTokenXAccountBalance = await provider.connection.getTokenAccountBalance(orderTokenXAccount);
    assert.equal(orderTokenXAccountBalance.value.amount, (xAmount * 10 ** solanaDecimals).toString(), "Order token X account balance is not set correctly");
  });

  it('User match order', async () => {
    const yAmount = new BN(200 * 10 ** raydiumDecimals);
    const [orderAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.ORDER_AUTHORITY_SEED), order.publicKey.toBuffer()],
      program.programId,
    );
    const user2TokenXAccount = await getAssociatedTokenAddress(solanaMint, user2.publicKey);
    const user2TokenYAccount = await getAssociatedTokenAddress(raydiumMint, user2.publicKey);
    const orderTokenXAccount = await getAssociatedTokenAddress(solanaMint, orderAuthority, true);
    const orderTokenYAccount = await getAssociatedTokenAddress(raydiumMint, orderAuthority, true);
    const [solanaAllowedTokenConfig] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.ALLOWED_TOKEN_CONFIG_SEED), solanaMint.toBuffer()],
      program.programId,
    );
    const [raydiumAllowedTokenConfig] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.ALLOWED_TOKEN_CONFIG_SEED), raydiumMint.toBuffer()],
      program.programId,
    );

    try {
      const computeBudgetIns = ComputeBudgetProgram.setComputeUnitLimit({
        units: 1000000,
      });
      const matchOrderIns = await program.methods.userMatchOrder(yAmount).accounts({
        user: user2.publicKey,
        userTokenXAccount: user2TokenXAccount,
        userTokenYAccount: user2TokenYAccount,
        order: order.publicKey,
        orderAuthority,
        orderTokenXAccount,
        orderTokenYAccount,
        tokenX: solanaMint,
        tokenY: raydiumMint,
        tokenXConfig: solanaAllowedTokenConfig,
        tokenYConfig: raydiumAllowedTokenConfig,
        tokenXPythOracle: CONSTANTS.PYTH_ORACLE.SOL.KEY,
        tokenYPythOracle: CONSTANTS.PYTH_ORACLE.RAYDIUM.KEY,
      })
        .instruction()
      const transaction = new Transaction().add(computeBudgetIns, matchOrderIns);
      const tx = await provider.sendAndConfirm(transaction, [user2], { commitment: 'confirmed' });
      console.log("User match order success at", tx);
    } catch (error) {
      console.log(error);
    }
  })
});


