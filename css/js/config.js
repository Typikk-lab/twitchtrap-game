import { PublicKey, Connection, clusterApiUrl } from "@solana/web3.js";

// On-Chain Program Connection
export const PROGRAM_ID = new PublicKey("F8Ah3o1rb3tvjaSi1BL9jZHVyYAb1Zod8QnuAaS1ZgCG");
export const NETWORK = clusterApiUrl("devnet");
export const connection = new Connection(NETWORK, "confirmed");

export const CONFIG = {
  TOKEN_MINT: null, // Pre-launch mode: set to null. Insert Pump.fun mint address post-launch.
  WALLETS: {
    DEV: "D926ra7L1bCjpcZPZUgFNeYhXs9LXVcAwiAjyRtMAN3G",
    JACKPOT: "66qyYsz3nXsoSGTHRt54MzMML4dc9MoECVujwTu7yEyo"
  },
  SPLITS: {
    BUYBACK_PCT: 0.50,
    REFERRAL_PCT: 0.20,
    JACKPOT_PCT: 0.15,
    DEV_PCT: 0.15
  },
  PUMP_PORTAL_API: "https://pumpportal.fun/api/trade-local",
  RPC_ENDPOINT: "https://api.devnet.solana.com", // Change to https://api.mainnet-beta.solana.com for mainnet
  SUPABASE: {
    URL: "https://supabase.com/dashboard/project/jbjisomsmvixassrcchd/settings/api-keys",
    ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impiamlzb21zbXZpeGFzc3JjY2hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NjU4ODAsImV4cCI6MjEwNTI0MTg4MH0.NiwKJrZ2TM3ObWrSmfiWmG8kJhclo-cCVKUnt-9tkm4"
  },
  ENTRY_FEE_SOL: 0.05
};