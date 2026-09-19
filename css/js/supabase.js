import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { CONFIG } from './config.js';

export const supabase = createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.ANON_KEY);

export async function recordDeposit(txSignature, walletAddress, solAmount, referralCode = null) {
  const { data, error } = await supabase
    .from('deposits')
    .insert([
      {
        tx_signature: txSignature,
        player_wallet: walletAddress,
        sol_amount: solAmount,
        referral_code: referralCode,
        runs_credited: 1
      }
    ]);

  if (error) console.error('Error logging deposit:', error);
  return { data, error };
}

export async function recordRun(walletAddress, secondsSurvived, seed, txSignature = null) {
  const { data, error } = await supabase
    .from('runs')
    .insert([
      {
        player_wallet: walletAddress,
        seconds_survived: secondsSurvived,
        seed: seed,
        tx_signature: txSignature
      }
    ]);

  if (error) console.error('Error recording run score:', error);
  return { data, error };
}

export async function getLeaderboard(limit = 10) {
  const { data, error } = await supabase
    .from('runs')
    .select('player_wallet, seconds_survived, created_at')
    .order('seconds_survived', { ascending: false })
    .limit(limit);

  if (error) console.error('Error fetching leaderboard:', error);
  return data || [];
}