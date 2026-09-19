import { TwitchGame } from './game.js';
import { executeDeposit } from './solana.js';

let gameInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  const timerDisplay = document.getElementById('timer-display');
  const solInput = document.getElementById('solInput');
  const refCodeInput = document.getElementById('refCodeInput');
  const lockInBtn = document.getElementById('lockInBtn');
  const presetBtns = document.querySelectorAll('.preset-btn');

  // Handle Preset SOL Quick-Buttons
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const addVal = parseFloat(btn.dataset.sol);
      const currentVal = parseFloat(solInput.value) || 0;
      solInput.value = (currentVal + addVal).toFixed(2);
    });
  });

  // Instantiate Game Canvas Engine
  gameInstance = new TwitchGame(
    'gameCanvas',
    (timeSurvived, seed) => {
      alert(`1-FRAME TWITCH! LIQUIDATED at ${timeSurvived.toFixed(3)}s`);
      lockInBtn.disabled = false;
      lockInBtn.innerText = 'LOCK IN & PLAY';
    },
    (elapsedSeconds) => {
      timerDisplay.innerText = elapsedSeconds.toFixed(3) + 's';
    }
  );

  // Lock In & Play Button Action
  lockInBtn.addEventListener('click', async () => {
    const solValue = parseFloat(solInput.value);
    if (!solValue || solValue <= 0) {
      alert('Enter a valid SOL amount!');
      return;
    }

    lockInBtn.disabled = true;
    lockInBtn.innerText = 'STARTING...';

    try {
      const refCode = refCodeInput.value.trim();
      
      // Attempt on-chain deposit if wallet exists, otherwise launch directly for testing
      if (window.solana && window.solana.isPhantom) {
        lockInBtn.innerText = 'APPROVE TX...';
        await executeDeposit(solValue, refCode);
      }

      lockInBtn.innerText = 'IN GAME...';
      const randomSeed = Math.floor(Math.random() * 1000000);
      gameInstance.start(randomSeed);
    } catch (err) {
      console.error('Execution Error:', err);
      alert('Transaction Canceled or Failed. Launching local test run.');
      
      lockInBtn.innerText = 'IN GAME...';
      const randomSeed = Math.floor(Math.random() * 1000000);
      gameInstance.start(randomSeed);
    }
  });
});