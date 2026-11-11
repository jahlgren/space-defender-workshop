// ===========================================================
// SPACE DEFENDER - HÄR PROGRAMMERAR DU!
// Följ uppgift 1-7 i PDF-filen. Ändra INTE engine.js.
// x ökar åt höger. y ökar NEDÅT på skärmen.
// dt = antal sekunder sedan förra bildrutan.
// ===========================================================

// UPPGIFT 1-2: styr skeppet med piltangenterna.
function updatePlayer(dt) {
  // Skriv din kod här.
  if(isKeyDown("ArrowLeft")) {
    player.x -= 250 * dt
  }

  if(isKeyDown("ArrowRight")) {
    player.x += 250 * dt
  }

  player.x = Math.max(0, Math.min(player.x, width))

  emitParticles({
    x: player.x,
    y: player.y + player.h / 2,
    count: 1,
    color: "cyan",
    size: 10,
    speed: 200,
    lifeTime: 0.3,
    startAngle: Math.PI * 0.25,
    endAngle: Math.PI * 0.75
  })
}

// UPPGIFT 3: håll Space för att skjuta.
function playerShoot(dt) {
  // Skriv din kod här.
  if (isKeyDown("Space")) {
    if (shootTimer <= 0) {
      const bullet1 = spawnBullet(player.x - 12, player.y - player.h / 2)
      const bullet2 = spawnBullet(player.x + 12, player.y - player.h / 2)
      shootTimer = 0.1

      playSound("shoot")
    }
  }
}

// UPPGIFT 4: få skotten att röra sig uppåt.
function updateBullets(dt) {
  // Skriv din kod här.
  for(const bullet of bullets) {
    bullet.y -= 480 * dt
  }
}

// UPPGIFT 5: skapa en fiende varannan sekund.
function updateEnemies(dt) {
  // Skriv din kod här.

  const letters = "0123456789ABCDEF"

  enemyTimer += dt
  if (enemyTimer >= 0.4) {
    const enemy = spawnEnemy()
    
    let color = "#"
    for(let i = 0;i<6;i++) {
        color += letters[(Math.floor(Math.random()*16))]
    }
    enemy.color = color
    
    if (Math.random() < 0.25) {
      enemy.hp = 12
      enemy.maxHp = 12
      enemy.w *= 2
    }
    enemyTimer -= 0.4
  }
}

// UPPGIFT 6: träffar mellan skott och fiender.
function checkBulletCollisions() {
  // Skriv din kod här.

  for (const bullet of bullets) {
    for (const enemy of enemies) {
      if(!enemy.dead && isColliding(bullet, enemy)) {
        enemy.hp -= 1
        removeBullet(bullet)

        playSound("hit")

        emitParticles({
          x: bullet.x,
          y: bullet.y,
          count: 3,
          color: enemy.color,
          size: 7,
          speed: 300,
          lifeTime: 0.3,
        })

        emitParticles({
          x: bullet.x,
          y: bullet.y,
          count: 3,
          color: bullet.color,
          size: 7,
          speed: 200,
          lifeTime: 0.3,
        })
      }
    }
  }
}

// UPPGIFT 7: ta bort döda fiender och få poäng.
function checkEnemyDeaths() {
  // Skriv din kod här.

  for (const enemy of enemies) {
    if(enemy.hp <= 0 && !enemy.dead) {
      removeEnemy(enemy)
      addScore(10)
      shakeScreen(6, 0.18)
      playSound("explosion")

      emitParticles({
        x: enemy.x,
        y: enemy.y,
        count: 15,
        color: enemy.color,
        size: 20,
        speed: 300,
        lifeTime: 0.3,
      })
    }
  }
}
