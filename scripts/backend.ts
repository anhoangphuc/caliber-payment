export async function registerAccount(email: string, address: string, signature: string) {
    console.log(`Verify ${signature} signed by @solana/web3.js`);
    console.log(`Register ${address} with email ${email}`);
}

export async function notifyEvent(event: any) {
    const { order } = event;
    console.log(`Get order info ${order}`);
    console.log(`Parsed event ${event}`);
    console.log(`Notify event to email for user ${order.user}`)
}