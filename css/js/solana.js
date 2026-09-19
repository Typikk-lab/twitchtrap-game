import { CONFIG } from './config.js';

export async function connectWallet() {
  if (!window.solana || !window.solana.isPhantom) {
    alert("Phantom Wallet not detected! Please install Phantom.");
    return null;
  }
  const response = await window.solana.connect();
  return response.publicKey.toString();
}

export async function executeDeposit(amountSol, referralWallet) {
  const solanaWeb3 = window.solanaWeb3;
  if (!solanaWeb3) {
    console.error("Solana Web3 library not loaded.");
    return null;
  }

  const provider = window.solana;
  if (!provider || !provider.isPhantom) {
    alert("Phantom Wallet not connected.");
    return null;
  }

  await provider.connect();
  
  const connection = new solanaWeb3.Connection(CONFIG.RPC_ENDPOINT, 'confirmed');
  const playerPubkey = provider.publicKey;
  const lamportsTotal = Math.floor(amountSol * solanaWeb3.LAMPORTS_PER_SOL);

  const devLamports = Math.floor(lamportsTotal * CONFIG.SPLITS.DEV_PCT);
  const jackpotLamports = Math.floor(lamportsTotal * CONFIG.SPLITS.JACKPOT_PCT);
  const referrerLamports = Math.floor(lamportsTotal * CONFIG.SPLITS.REFERRAL_PCT);
  const buybackLamports = lamportsTotal - (devLamports + jackpotLamports + referrerLamports);

  const targetReferrer = (referralWallet && solanaWeb3.PublicKey.isOnCurve(referralWallet))
    ? new solanaWeb3.PublicKey(referralWallet)
    : new solanaWeb3.PublicKey(CONFIG.WALLETS.DEV);

  const transaction = new solanaWeb3.Transaction();

  // Primary fee splits
  transaction.add(
    solanaWeb3.SystemProgram.transfer({
      fromPubkey: playerPubkey,
      toPubkey: new solanaWeb3.PublicKey(CONFIG.WALLETS.DEV),
      lamports: devLamports
    }),
    solanaWeb3.SystemProgram.transfer({
      fromPubkey: playerPubkey,
      toPubkey: new solanaWeb3.PublicKey(CONFIG.WALLETS.JACKPOT),
      lamports: jackpotLamports
    }),
    solanaWeb3.SystemProgram.transfer({
      fromPubkey: playerPubkey,
      toPubkey: targetReferrer,
      lamports: referrerLamports
    })
  );

  // Buyback execution logic
  if (CONFIG.TOKEN_MINT) {
    try {
      const response = await fetch(CONFIG.PUMP_PORTAL_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "publicKey": playerPubkey.toBase58(),
          "action": "buy",
          "mint": CONFIG.TOKEN_MINT,
          "denominatedInSol": "true",
          "amount": buybackLamports / solanaWeb3.LAMPORTS_PER_SOL,
          "slippage": 10,
          "priorityFee": 0.0001,
          "pool": "pump"
        })
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const swapTx = solanaWeb3.VersionedTransaction.deserialize(new Uint8Array(arrayBuffer));
        transaction.add(...swapTx.message.compiledInstructions);
      }
    } catch (err) {
      console.warn("PumpPortal execution skipped, defaulting to Dev wallet reserve:", err);
      transaction.add(
        solanaWeb3.SystemProgram.transfer({
          fromPubkey: playerPubkey,
          toPubkey: new solanaWeb3.PublicKey(CONFIG.WALLETS.DEV),
          lamports: buybackLamports
        })
      );
    }
  } else {
    // Pre-launch mode: route 50% buyback share to DEV wallet reserve
    transaction.add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: playerPubkey,
        toPubkey: new solanaWeb3.PublicKey(CONFIG.WALLETS.DEV),
        lamports: buybackLamports
      })
    );
  }

  transaction.feePayer = playerPubkey;
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  const { signature } = await provider.signAndSendTransaction(transaction);
  await connection.confirmTransaction(signature, 'confirmed');

  return signature;
}