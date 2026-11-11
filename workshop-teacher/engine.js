"use strict";

// SPELMOTOR: allt här är färdigt. Arbeta i student.js.

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const width = canvas.width;
const height = canvas.height;

const keys = new Set();

let state = "menu";
let player, bullets, enemies, particles;
let score, enemyTimer, shootTimer;

let elapsed = 0;
let screenShake = 0;
let shakeTime = 0;
let lastTime = 0;
let frameDt = 0;

// --------------------------------------------------
// STARS
// --------------------------------------------------

const stars = Array.from({ length: 85 }, (_, i) => ({
  x: (i * 127 + 47) % width,
  y: (i * 83 + 17) % height,
  r: 1 + (i % 3) * 0.45
}));

// --------------------------------------------------
// KEYBOARD INPUT
// --------------------------------------------------

const isKeyDown = key => keys.has(key);

window.addEventListener("keydown", e => {
  if (
    ["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]
      .includes(e.code)
  ) {
    e.preventDefault();
  }

  if (e.code === "Space" && !e.repeat && state !== "playing") {
    startGame();
    return;
  }

  keys.add(e.code);
});

window.addEventListener("keyup", e => {
  keys.delete(e.code);
});

window.addEventListener("blur", () => {
  keys.clear();
});

// --------------------------------------------------
// GAME SETUP
// --------------------------------------------------

function resetGame() {
  player = {
    x: width / 2,
    y: height - 78,
    w: 38,
    h: 42,
    color: "#51d7ff"
  };

  bullets = [];
  enemies = [];
  particles = [];

  score = 0;
  enemyTimer = 0;
  shootTimer = 0;
  elapsed = 0;
  screenShake = 0;
  shakeTime = 0;

  keys.clear();
}

function startGame() {
  resetGame();
  state = "playing";
}

resetGame();

// --------------------------------------------------
// BULLETS & ENEMIES
// --------------------------------------------------

function spawnBullet(x, y) {
  const bullet = {
    x,
    y,
    w: 7,
    h: 18,
    color: "#ffef77"
  }

  bullets.push(bullet);
  return bullet;
}

function removeBullet(b) {
  b.dead = true;
}

function spawnEnemy() {
  const size = 30 + Math.random() * 18;
  const enemy = {
    x: 30 + Math.random() * (width - 60),
    y: -size,
    w: size,
    h: size,
    hp: 2,
    maxHp: 2,
    speed: 72 + Math.random() * 45,
    color: "#fa6d92"
  }

  enemies.push(enemy);
  return enemy
}

function removeEnemy(e) {
  e.dead = true;
}

// --------------------------------------------------
// COLLISIONS & SCORING
// --------------------------------------------------

function isColliding(a, b) {
  return (
    Math.abs(a.x - b.x) * 2 < a.w + b.w &&
    Math.abs(a.y - b.y) * 2 < a.h + b.h
  );
}

function addScore(n) {
  score += n;
}

// --------------------------------------------------
// PARTICLE EFFECTS
// --------------------------------------------------

function emitParticles({
  x,
  y,
  count = 12,
  color = "#ffb45c",
  size = 4,
  speed = 110,
  startAngle = 0,
  endAngle = Math.PI * 2,
  lifetime = 0.5
} = {}) {
  for (let i = 0; i < count; i++) {
    const angle = startAngle + Math.random() * (endAngle - startAngle);
    const v = speed * (0.3 + Math.random() * 0.7);

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: lifetime,
      maxLife: lifetime,
      size,
      color
    });
  }
}

// --------------------------------------------------
// SCREEN SHAKE
// --------------------------------------------------

function shakeScreen(intensity = 5, duration = 0.15) {
  screenShake = Math.max(screenShake, intensity);
  shakeTime = Math.max(shakeTime, duration);
}

// --------------------------------------------------
// SOUND EFFECTS
// --------------------------------------------------

let audioContext;

function playSound(kind = "shoot") {
  try {
    audioContext ??= new (
      window.AudioContext || window.webkitAudioContext
    )();

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const t = audioContext.currentTime;

    osc.type = kind === "hit" ? "sine" : (kind === "explosion" ? "sawtooth" : "square");

    osc.frequency.setValueAtTime(
      kind === "explosion" ? 160 : 600,
      t
    );

    osc.frequency.exponentialRampToValueAtTime(
      kind === "hit" ? 1 : (kind === "explosion" ? 40 : 60),
      t + 0.13
    );

    gain.gain.setValueAtTime(0.045, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain).connect(audioContext.destination);

    osc.start(t);
    osc.stop(t + 0.16);

  } catch (_) {
    // Ljud är valfritt
  }
}

// --------------------------------------------------
// GAME UPDATE
// --------------------------------------------------

function updateEngine(dt) {
  elapsed += dt;
  shootTimer = Math.max(0, shootTimer - dt);

  updatePlayer(dt);
  playerShoot(dt);
  updateBullets(dt);
  updateEnemies(dt);

  // Move enemies and check if they reach the bottom
  for (const e of enemies) {
    e.y += e.speed * dt;

    if (e.y - e.h / 2 > height) {
      state = "gameover";
    }
  }

  // Check collisions and enemy deaths
  if (state === "playing") {
    checkBulletCollisions();
    checkEnemyDeaths();
  }

  // Remove inactive bullets and enemies
  bullets = bullets.filter(
    b => !b.dead && b.y > -50 && b.y < height + 50
  );

  enemies = enemies.filter(e => !e.dead);

  // Update particles
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }

  particles = particles.filter(p => p.life > 0);

  // Update screen shake
  if (shakeTime > 0) {
    shakeTime -= dt;

    if (shakeTime <= 0) {
      screenShake = 0;
    }
  }
}

// --------------------------------------------------
// DRAW PLAYER
// --------------------------------------------------

function drawShip() {
  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.fillStyle = player.color;

  ctx.beginPath();
  ctx.moveTo(0, -player.h / 2);
  ctx.lineTo(player.w / 2, player.h / 2);
  ctx.lineTo(0, player.h / 3);
  ctx.lineTo(-player.w / 2, player.h / 2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// --------------------------------------------------
// DRAW GAME
// --------------------------------------------------

function draw() {
  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = "#090e25";
  ctx.fillRect(0, 0, width, height);

  // Stars
  for (const s of stars) {
    ctx.fillStyle = "#33466d";

    ctx.beginPath();
    ctx.arc(
      s.x,
      (s.y + elapsed * 14) % height,
      s.r,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.save();

  // Screen shake
  if (shakeTime > 0) {
    ctx.translate(
      (Math.random() - 0.5) * screenShake * 2,
      (Math.random() - 0.5) * screenShake * 2
    );
  }

  // Playing and game-over visuals
  if (state === "playing" || state === "gameover") {
    drawShip();

    // Bullets
    for (const b of bullets) {
      ctx.fillStyle = b.color;

      ctx.fillRect(
        b.x - b.w / 2,
        b.y - b.h / 2,
        b.w,
        b.h
      );
    }

    // Enemies
    for (const e of enemies) {
      ctx.fillStyle = e.color;

      ctx.fillRect(
        e.x - e.w / 2,
        e.y - e.h / 2,
        e.w,
        e.h
      );

      // Enemy eyes
      // Whites
      let size = e.w * 0.33
      ctx.fillStyle = "#eceaed";
      ctx.fillRect(e.x - size * 0.5 - size * 0.85, e.y - size * 0.5, size, size)
      ctx.fillRect(e.x - size * 0.5 + size * 0.85, e.y - size * 0.5, size, size)
      // Pupils
      let pupilSize = size * 0.5
      ctx.fillStyle = "#0f0813";
      ctx.fillRect(e.x - pupilSize * 0.5 - size * 0.85, e.y - pupilSize * 0.5, pupilSize, pupilSize)
      ctx.fillRect(e.x - pupilSize * 0.5 + size * 0.85, e.y - pupilSize * 0.5, pupilSize, pupilSize)

      // Enemy health bar
      ctx.fillStyle = "#8ef5aa";

      ctx.fillRect(
        e.x - e.w / 2,
        e.y - e.h / 2 - 9,
        e.w * Math.max(0, (e.hp / e.maxHp)),
        6
      );
    }

    // Particles
    for (const p of particles) {
      const size = p.size * Math.max(0, p.life / p.maxLife)
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;

      ctx.fillRect(
        p.x - size / 2,
        p.y - size / 2,
        size,
        size
      );

      ctx.globalAlpha = 1;
    }

    // Score
    ctx.fillStyle = "#e6f4ff";
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "left";
    ctx.fillText("SCORE: " + score, 20, 36);
  }

  ctx.restore();

  // Menu and game-over screen
  if (state === "menu" || state === "gameover") {
    // Dark overlay
    ctx.fillStyle = "rgba(5,9,25,.8)";
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = "center";

    // Title
    ctx.fillStyle =
      state === "menu" ? "#79e4ff" : "#ff789a";

    ctx.font = "bold 49px monospace";

    ctx.fillText(
      state === "menu" ? "SPACE DEFENDER" : "GAME OVER",
      width / 2,
      260
    );

    // Score and instructions
    ctx.fillStyle = "#e8efff";
    ctx.font = "bold 23px monospace";

    if (state === "gameover") {
      ctx.fillText("SCORE: " + score, width / 2, 315);
    }

    ctx.font = "20px monospace";

    ctx.fillText(
      state === "menu"
        ? "PRESS [SPACE] TO START"
        : "PRESS [SPACE] TO RETRY",
      width / 2,
      375
    );

    // Controls
    ctx.font = "15px monospace";
    ctx.fillStyle = "#aebddd";

    ctx.fillText(
      "CONTROLS:",
      width / 2,
      500
    );

    ctx.fillText(
      "ARROW LEFT / RIGHT  +  SPACE",
      width / 2,
      524
    );
  }
}

// --------------------------------------------------
// MAIN GAME LOOP
// --------------------------------------------------

function loop(t) {
  const dt = Math.min((t - lastTime) / 1000 || 0, 0.05);

  lastTime = t;
  frameDt = dt;

  if (state === "playing") {
    updateEngine(dt);
  }

  draw();
  requestAnimationFrame(loop);
}

// Start the game loop
requestAnimationFrame(loop);
