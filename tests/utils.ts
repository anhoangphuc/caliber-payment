import { Keypair, PublicKey, Connection, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { createMintToInstruction, createAssociatedTokenAccountInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
import { AnchorProvider } from "@coral-xyz/anchor";
import { use } from "chai";
export async function airdropSol(connection: Connection, address: PublicKey, amount: number) {
    console.log(`Airdrop to ${address.toBase58()} ${amount} SOL`);
    await connection.requestAirdrop(address, amount * LAMPORTS_PER_SOL);
    await delay(3000);
}
export async function airdropToken(provider: AnchorProvider, mintAuthority: Keypair, user: PublicKey, mint: PublicKey, amount: number) {
    const associatedTokenAccount = await getAssociatedTokenAddress(mint, user);
    const craeteAtaIns = await createAssociatedTokenAccountInstruction(
        mintAuthority.publicKey,
        associatedTokenAccount,
        user,
        mint,
    )
    const mintToIns = await createMintToInstruction(
        mint,
        associatedTokenAccount,
        mintAuthority.publicKey,
        amount,
    )
    const tx = new Transaction().add(craeteAtaIns, mintToIns);
    await provider.sendAndConfirm(tx, [mintAuthority], { commitment: 'confirmed' });
}

export async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const CONSTANTS = {
    CONFIG_SEED: "CONFIG",
    FEE_RECIPIENT_SEED: "FEE_RECIPIENT",
    ALLOWED_TOKEN_CONFIG_SEED: "ALLOWED_TOKEN",
    PYTH_ORACLE: {
        SOL: {
            ID: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
            KEY: "7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE",
        }
    }
}

export async function getBlockTime(connection: Connection) {
    const slot = await connection.getSlot('confirmed');
    const blockTime = await connection.getBlockTime(slot);
    return blockTime;
}