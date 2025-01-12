import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, Keypair } from "@solana/web3.js";
import { CaliberPayment } from "../target/types/caliber_payment";
(async () => {
    const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
    const listenKeypair = Keypair.generate();
    const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(listenKeypair), { commitment: 'confirmed' });
    anchor.setProvider(provider);
    const program = anchor.workspace.CaliberPayment as Program<CaliberPayment>;

    program.addEventListener('CreateOrderEvent', (event) => {
        console.log('CreateOrderEvent');
        console.log(event);
    })
    program.addEventListener('MatchOrderEvent', (event) => {
        console.log('MatchOrderEvent');
        console.log(event);
    })
    program.addEventListener('FinishOrderEvent', (event) => {
        console.log('FinishOrderEvent');
        console.log(event);
    })
})()