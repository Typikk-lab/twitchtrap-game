export class TwitchGame {
  constructor(canvasId, onDeath, onTick) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.onDeath = onDeath;
    this.onTick = onTick;
    this.running = false;
    this.startTime = 0;
    this.seed = 0;

    this.targetMouse = { x: 300, y: 300 };
    this.cursor = { x: 300, y: 300 };
    this.lerpFactor = 0.15; // ICE DRIFT PHYSICS
    this.box = { x: 250, y: 250, size: 120 };
    
    this.boundTrackMouse = this.trackMouse.bind(this);
  }

  // Mulberry32 Seeded Deterministic PRNG
  prng(seed) {
    return function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 8, t | 41);
      return ((t ^ t >>> 24) >>> 0) / 4294967296;
    };
  }

  start(seed) {
    this.seed = seed || Math.floor(Math.random() * 1000000);
    this.rand = this.prng(this.seed);
    this.running = true;
    this.startTime = performance.now();
    
    // Reset cursor to center
    this.cursor = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
    this.targetMouse = { ...this.cursor };

    this.canvas.requestPointerLock();
    window.addEventListener('mousemove', this.boundTrackMouse);
    requestAnimationFrame(this.loop.bind(this));
  }

  trackMouse(e) {
    this.targetMouse.x += e.movementX;
    this.targetMouse.y += e.movementY;
  }

  loop(timestamp) {
    if (!this.running) return;

    const elapsed = (timestamp - this.startTime) / 1000;
    this.onTick(elapsed);

    // 1. Lerp Cursor Smooth Momentum
    this.cursor.x += (this.targetMouse.x - this.cursor.x) * this.lerpFactor;
    this.cursor.y += (this.targetMouse.y - this.cursor.y) * this.lerpFactor;

    // 2. Progressive Box Shrink
    const shrinkStage = Math.floor(elapsed / 10);
    this.box.size = Math.max(35, 120 * Math.pow(0.88, shrinkStage));

    // 3. Seeded Lissajous Safe-Zone Movement Path
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const speed = 1.2 + (shrinkStage * 0.2);
    this.box.x = cx + Math.sin(elapsed * speed + this.seed) * (120 + shrinkStage * 12) - (this.box.size / 2);
    this.box.y = cy + Math.cos(elapsed * speed * 1.3 + this.seed) * (90 + shrinkStage * 12) - (this.box.size / 2);

    // 4. Sub-frame Instant Collision Check
    const isOut = (
      this.cursor.x < this.box.x ||
      this.cursor.x > this.box.x + this.box.size ||
      this.cursor.y < this.box.y ||
      this.cursor.y > this.box.y + this.box.size
    );

    if (isOut) {
      this.die(elapsed);
      return;
    }

    this.render();
    requestAnimationFrame(this.loop.bind(this));
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Dark Grid
    this.ctx.strokeStyle = '#111118';
    this.ctx.lineWidth = 1;
    for (let x = 0; x < this.canvas.width; x += 30) {
      this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.canvas.height); this.ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += 30) {
      this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.canvas.width, y); this.ctx.stroke();
    }

    // Draw Electric Green Safe-Zone
    this.ctx.strokeStyle = '#00FF66';
    this.ctx.lineWidth = 3;
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#00FF66';
    this.ctx.strokeRect(this.box.x, this.box.y, this.box.size, this.box.size);

    // Draw Crimson Cursor
    this.ctx.fillStyle = '#FF0055';
    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = '#FF0055';
    this.ctx.beginPath();
    this.ctx.arc(this.cursor.x, this.cursor.y, 5, 0, Math.PI * 2);
    this.ctx.fill();
  }

  die(elapsed) {
    this.running = false;
    if (document.pointerLockElement) document.exitPointerLock();
    window.removeEventListener('mousemove', this.boundTrackMouse);
    this.onDeath(elapsed, this.seed);
  }
}