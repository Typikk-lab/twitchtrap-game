let playerWallet = null;

const connectBtn = document.getElementById('connectBtn');
const playBtn = document.getElementById('playBtn');
const walletStatus = document.getElementById('walletStatus');
const timerDisplay = document.getElementById('timer');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- PHANTOM WALLET CONNECTION ---
async function connectPhantom() {
  if ("solana" in window && window.solana.isPhantom) {
    try {
      const response = await window.solana.connect();
      playerWallet = response.publicKey.toString();
      
      const shortAddr = `${playerWallet.slice(0, 4)}...${playerWallet.slice(-4)}`;
      walletStatus.innerText = `CONNECTED: ${shortAddr}`;
      walletStatus.style.color = '#00ff66';
      
      connectBtn.innerText = "CONNECTED";
      connectBtn.disabled = true;
      playBtn.disabled = false;
    } catch (err) {
      console.error("User rejected connection:", err);
      alert("Wallet connection rejected.");
    }
  } else {
    alert("Phantom Wallet extension not found! Install Phantom in Chrome/Brave.");
    window.open("https://phantom.app/", "_blank");
  }
}

connectBtn.addEventListener('click', connectPhantom);

// --- SIMPLE GAME LOOP ---
let running = false;
let startTime = 0;
let box = { x: 230, y: 110, size: 80 };
let cursor = { x: 270, y: 150 };

function startArcadeRun() {
  running = true;
  startTime = performance.now();
  playBtn.disabled = true;
  playBtn.innerText = "RUN IN PROGRESS...";

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    cursor.x = e.clientX - rect.left;
    cursor.y = e.clientY - rect.top;
  });

  requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
  if (!running) return;

  const elapsed = (timestamp - startTime) / 1000;
  timerDisplay.innerText = elapsed.toFixed(3) + 's';

  // Move box in Lissajous pattern
  box.x = (canvas.width / 2 - 40) + Math.sin(elapsed * 2) * 120;
  box.y = (canvas.height / 2 - 40) + Math.cos(elapsed * 2.5) * 60;

  // Render Frame
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Box
  ctx.strokeStyle = '#00ff66';
  ctx.lineWidth = 2;
  ctx.strokeRect(box.x, box.y, box.size, box.size);

  // Cursor dot
  ctx.fillStyle = '#ff0055';
  ctx.beginPath();
  ctx.arc(cursor.x, cursor.y, 4, 0, Math.PI * 2);
  ctx.fill();

  // Collision check
  if (
    cursor.x < box.x || cursor.x > box.x + box.size ||
    cursor.y < box.y || cursor.y > box.y + box.size
  ) {
    running = false;
    alert(`LIQUIDATED! You survived ${elapsed.toFixed(2)} seconds.`);
    playBtn.disabled = false;
    playBtn.innerText = "INSERT COIN (0.05 SOL) & PLAY";
    return;
  }

  requestAnimationFrame(gameLoop);
}

playBtn.addEventListener('click', startArcadeRun);