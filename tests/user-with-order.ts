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
  const xAmount = new BN(5 * 10 ** solanaDecimals);
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
    const [feeRecipient] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.FEE_RECIPIENT_SEED)],
      program.programId,
    );
    const feeRecipientSolanaTokenAccount = await getAssociatedTokenAddress(solanaMint, feeRecipient, true);
    const feeRecipientRaydiumTokenAccount = await getAssociatedTokenAddress(raydiumMint, feeRecipient, true);
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
      feeRecipient,
      feeRecipientTokenAccount: feeRecipientSolanaTokenAccount,
      pythOracle: CONSTANTS.PYTH_ORACLE.SOL.KEY,
      allowedTokenConfig: solanaAllowedTokenConfig,
      token: solanaMint,
    }).rpc({ commitment: 'confirmed' });
    console.log("Admin add allowed token for solana success at", tx1);

    const tx2 = await program.methods.adminAddAllowedToken(CONSTANTS.PYTH_ORACLE.RAYDIUM.ID).accounts({
      admin: admin.publicKey,
      config: config,
      feeRecipient,
      feeRecipientTokenAccount: feeRecipientRaydiumTokenAccount,
      pythOracle: CONSTANTS.PYTH_ORACLE.RAYDIUM.KEY,
      allowedTokenConfig: raydiumAllowedTokenConfig,
      token: raydiumMint,
    }).rpc({ commitment: 'confirmed' });
    console.log("Admin add allowed token for raydium success at", tx2);
  });

  it("User make order failed to invalid price range", async () => {
    // Add your test here.
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
        minXPrice: mintXMinPrice,
        maxXPrice: mintXMaxPrice,
        minYPrice: mintYMaxPrice,
        maxYPrice: mintYMinPrice,
        amount: xAmount,
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
      assert.fail("User create order should fail");
    } catch (e) {
      assert.equal(e.error.errorCode.code, "InvalidPriceRange", "Invalid price range");
    }
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
        minXPrice: mintXMinPrice,
        maxXPrice: mintXMaxPrice,
        minYPrice: mintYMinPrice,
        maxYPrice: mintYMaxPrice,
        amount: xAmount,
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
    assert.equal(orderTokenXAccountBalance.value.amount, xAmount.toString(), "Order token X account balance is not set correctly");
  });

  it('User match order with 150 raydium for 3.75 SOL', async () => {
    const yAmount = new BN(150 * 10 ** raydiumDecimals);
    const [config] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.CONFIG_SEED)],
      program.programId,
    );
    const [feeRecipient] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.FEE_RECIPIENT_SEED)],
      program.programId,
    );
    const feeRecipientRaydiumTokenAccount = await getAssociatedTokenAddress(raydiumMint, feeRecipient, true);
    const feeRecipientRaydiumBalanceBefore = Number((await provider.connection.getTokenAccountBalance(feeRecipientRaydiumTokenAccount)).value.amount);
    const [orderAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.ORDER_AUTHORITY_SEED), order.publicKey.toBuffer()],
      program.programId,
    );
    const user2TokenXAccount = await getAssociatedTokenAddress(solanaMint, user2.publicKey);
    const user2TokenYAccount = await getAssociatedTokenAddress(raydiumMint, user2.publicKey);
    const user2TokenYBalanceBefore = Number((await provider.connection.getTokenAccountBalance(user2TokenYAccount)).value.amount);
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

    const computeBudgetIns = ComputeBudgetProgram.setComputeUnitLimit({
      units: 1000000,
    });
    const matchOrderIns = await program.methods.userMatchOrder(yAmount).accounts({
      config,
      feeRecipient,
      feeRecipientTokenYAccount: feeRecipientRaydiumTokenAccount,
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
    // 3% protocol fee
    const protocolFee = yAmount.mul(new BN(3)).div(new BN(100));
    const user2TokenYBalanceAfter = Number((await provider.connection.getTokenAccountBalance(user2TokenYAccount)).value.amount);
    const user2TokenXBalanceAfter = Number((await provider.connection.getTokenAccountBalance(user2TokenXAccount)).value.amount);
    const feeRecipientRaydiumBalanceAfter = Number((await provider.connection.getTokenAccountBalance(feeRecipientRaydiumTokenAccount)).value.amount);
    assert.equal(feeRecipientRaydiumBalanceAfter - feeRecipientRaydiumBalanceBefore, protocolFee.toNumber(), "Protocol fee is not set correctly");
    assert.equal(user2TokenXBalanceAfter, Number(3.75 * 10 ** solanaDecimals), "User token X balance is not set correctly");
    assert.equal(user2TokenYBalanceBefore - user2TokenYBalanceAfter, yAmount.add(protocolFee).toNumber(), "User token Y balance is not set correctly");
  })

  it('User match order with 150 raydium, for 1.25 remain SOL, and transfer only 50 raydium', async () => {
    const [config] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.CONFIG_SEED)],
      program.programId,
    );
    const [feeRecipient] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.FEE_RECIPIENT_SEED)],
      program.programId,
    );
    const feeRecipientRaydiumTokenAccount = await getAssociatedTokenAddress(raydiumMint, feeRecipient, true);
    const feeRecipientRaydiumBalanceBefore = Number((await provider.connection.getTokenAccountBalance(feeRecipientRaydiumTokenAccount)).value.amount);
    const yAmount = new BN(150 * 10 ** raydiumDecimals);
    const [orderAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.ORDER_AUTHORITY_SEED), order.publicKey.toBuffer()],
      program.programId,
    );
    const user2TokenXAccount = await getAssociatedTokenAddress(solanaMint, user2.publicKey);
    const user2TokenYAccount = await getAssociatedTokenAddress(raydiumMint, user2.publicKey);
    const user2TokenXBalanceBefore = Number((await provider.connection.getTokenAccountBalance(user2TokenXAccount)).value.amount);
    const user2TokenYBalanceBefore = Number((await provider.connection.getTokenAccountBalance(user2TokenYAccount)).value.amount);
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

    const computeBudgetIns = ComputeBudgetProgram.setComputeUnitLimit({
      units: 1000000,
    });
    const matchOrderIns = await program.methods.userMatchOrder(yAmount).accounts({
      config,
      feeRecipient,
      feeRecipientTokenYAccount: feeRecipientRaydiumTokenAccount,
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
    // 3% protocol fee
    const protocolFee = new BN(50 * 3 / 100 * 10 ** raydiumDecimals);
    const user2TokenYBalanceAfter = Number((await provider.connection.getTokenAccountBalance(user2TokenYAccount)).value.amount);
    const user2TokenXBalanceAfter = Number((await provider.connection.getTokenAccountBalance(user2TokenXAccount)).value.amount);
    const feeRecipientRaydiumBalanceAfter = Number((await provider.connection.getTokenAccountBalance(feeRecipientRaydiumTokenAccount)).value.amount);
    assert.equal(user2TokenYBalanceBefore - user2TokenYBalanceAfter, Number(50 * 10 ** raydiumDecimals) + protocolFee.toNumber(), "User token Y balance is not set correctly");
    assert.equal(user2TokenXBalanceAfter - user2TokenXBalanceBefore, Number(1.25 * 10 ** solanaDecimals), "User token X balance is not set correctly");
    assert.equal(feeRecipientRaydiumBalanceAfter - feeRecipientRaydiumBalanceBefore, protocolFee.toNumber(), "Protocol fee is not set correctly");
  })

  it('User match order failed to no remain', async () => {
    const [config] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.CONFIG_SEED)],
      program.programId,
    );
    const [feeRecipient] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.FEE_RECIPIENT_SEED)],
      program.programId,
    );
    const feeRecipientSolanaTokenAccount = await getAssociatedTokenAddress(solanaMint, feeRecipient, true);
    const feeRecipientRaydiumTokenAccount = await getAssociatedTokenAddress(raydiumMint, feeRecipient, true);
    const yAmount = new BN(150 * 10 ** raydiumDecimals);
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

    const computeBudgetIns = ComputeBudgetProgram.setComputeUnitLimit({
      units: 1000000,
    });
    const matchOrderIns = await program.methods.userMatchOrder(yAmount).accounts({
      config,
      feeRecipient,
      feeRecipientTokenYAccount: feeRecipientRaydiumTokenAccount,
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
    try {
      const transaction = new Transaction().add(computeBudgetIns, matchOrderIns);
      await provider.sendAndConfirm(transaction, [user2], { commitment: 'confirmed' });
      assert.fail("User match order should fail");
    } catch (e) {
      assert.ok(e.transactionLogs.some(log => log.includes('NoTokenXAmount')))
    }
  })

  it('Owner user finish order and withdraw remaining token', async () => {
    const [orderAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.ORDER_AUTHORITY_SEED), order.publicKey.toBuffer()],
      program.programId,
    );
    const userTokenXAccount = await getAssociatedTokenAddress(solanaMint, user.publicKey);
    const userTokenYAccount = await getAssociatedTokenAddress(raydiumMint, user.publicKey);
    const orderTokenXAccount = await getAssociatedTokenAddress(solanaMint, orderAuthority, true);
    const orderTokenYAccount = await getAssociatedTokenAddress(raydiumMint, orderAuthority, true);
    const userTokenXBalanceBefore = Number((await provider.connection.getTokenAccountBalance(userTokenXAccount)).value.amount);

    const computeBudgetIns = ComputeBudgetProgram.setComputeUnitLimit({
      units: 1000000,
    });
    const finishOrderIns = await program.methods.userFinishOrder().accounts({
      user: user.publicKey,
      userTokenXAccount: userTokenXAccount,
      userTokenYAccount: userTokenYAccount,
      order: order.publicKey,
      orderAuthority,
      orderTokenXAccount,
      orderTokenYAccount,
      tokenX: solanaMint,
      tokenY: raydiumMint,
    })
      .instruction()
    const transaction = new Transaction().add(computeBudgetIns, finishOrderIns);
    const tx = await provider.sendAndConfirm(transaction, [user], { commitment: 'confirmed' });
    console.log("User finish order success at", tx);
    const userTokenXBalanceAfter = Number((await provider.connection.getTokenAccountBalance(userTokenXAccount)).value.amount);
    const userTokenYBalanceAfter = Number((await provider.connection.getTokenAccountBalance(userTokenYAccount)).value.amount);
    assert.equal(userTokenXBalanceAfter - userTokenXBalanceBefore, Number(0 * 10 ** solanaDecimals), "User token X balance is not set correctly");
    assert.equal(userTokenYBalanceAfter, Number(200 * 10 ** raydiumDecimals), "User token Y balance is not set correctly");
  })
});


