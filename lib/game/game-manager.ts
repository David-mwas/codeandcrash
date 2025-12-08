import { Player } from "./player"
import { Enemy, type EnemyType } from "./enemy"
import type { Bullet } from "./bullet"
import { Particle } from "./particle"
import { PowerUp } from "./power-up"
import type { SaveData } from "./save-data"
import type { Grenade } from "./grenade"
import { soundManager } from "./sound"

type StatsUpdater = (stats: {
  health?: number
  maxHealth?: number
  xp?: number
  xpToLevel?: number
  level?: number
  ammo?: number
  maxAmmo?: number
  wave?: number
  score?: number
  reloading?: boolean
  totalXP?: number
  sessionXP?: number
  enemiesKilled?: number
  weaponName?: string
  combo?: number
  grenades?: number
  maxGrenades?: number
  shieldActive?: boolean
  shieldHealth?: number
  shieldMaxHealth?: number
  shieldCooldown?: number
  shieldMaxCooldown?: number
}) => void

type UpgradeCallback = (upgrades: { id: string; name: string; description: string }[]) => void
type FeatureUnlockCallback = (feature: string) => void
type ComboCallback = (combo: number, message: string) => void

export class GameManager {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  player: Player
  enemies: Enemy[] = []
  bullets: Bullet[] = []
  particles: Particle[] = []
  powerUps: PowerUp[] = []
  grenades: Grenade[] = []

  wave = 1
  score = 0
  sessionXP = 0
  enemiesKilled = 0
  enemiesToSpawn = 0
  enemiesSpawned = 0
  enemiesKilledThisWave = 0
  totalEnemiesThisWave = 0
  waveDelay = 0
  gameTime = 0
  isTutorial = false
  isMobile = false
  spawnTimers: ReturnType<typeof setTimeout>[] = []

  combo = 0
  comboTimer = 0
  comboMaxTimer = 120
  highestCombo = 0

  keys: { [key: string]: boolean } = {}
  mouse = { x: 0, y: 0, down: false }

  running = false
  paused = false
  animationFrame: number | null = null

  updateStats: StatsUpdater
  showUpgradeMenu: UpgradeCallback
  onGameOver: () => void
  onFeatureUnlock: FeatureUnlockCallback
  onPauseChange?: (paused: boolean) => void
  onCombo?: ComboCallback

  gridOffset = 0

  saveData: SaveData

  upgrades = {
    fireRate: 1,
    moveSpeed: 1,
    damage: 1,
    maxHealth: 1,
    bulletSpeed: 1,
    reloadSpeed: 1,
    pierce: 0,
    autoAim: false,
    dashCooldown: 1,
    critChance: 0,
    xpBonus: 1,
  }

  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    updateStats: StatsUpdater,
    showUpgradeMenu: UpgradeCallback,
    onGameOver: () => void,
    onFeatureUnlock: FeatureUnlockCallback,
    saveData: SaveData,
    isTutorial = false,
    onPauseChange?: (paused: boolean) => void,
    onCombo?: ComboCallback,
    isMobile = false,
  ) {
    this.canvas = canvas
    this.ctx = ctx
    this.updateStats = updateStats
    this.showUpgradeMenu = showUpgradeMenu
    this.onGameOver = onGameOver
    this.onFeatureUnlock = onFeatureUnlock
    this.saveData = saveData
    this.isTutorial = isTutorial
    this.onPauseChange = onPauseChange
    this.onCombo = onCombo
    this.isMobile = isMobile

    // Apply permanent upgrades
    this.upgrades.maxHealth = 1 + saveData.permanentUpgrades.maxHealth * 0.1
    this.upgrades.damage = 1 + saveData.permanentUpgrades.damage * 0.1
    this.upgrades.moveSpeed = 1 + saveData.permanentUpgrades.moveSpeed * 0.05
    this.upgrades.reloadSpeed = 1 + saveData.permanentUpgrades.reloadSpeed * 0.1
    this.upgrades.critChance = (saveData.permanentUpgrades.critChance || 0) * 0.05
    this.upgrades.xpBonus = 1 + (saveData.permanentUpgrades.xpBonus || 0) * 0.1

    this.player = new Player(canvas.width / 2, canvas.height / 2, this, saveData.equippedWeapon)
    this.player.maxHealth = 100 + saveData.permanentUpgrades.maxHealth * 10
    this.player.health = this.player.maxHealth
    this.player.maxGrenades = 5 + (saveData.permanentUpgrades.grenadeCapacity || 0)
    this.player.grenades = Math.min(3, this.player.maxGrenades)
    this.player.shieldMaxHealth = 50 + (saveData.permanentUpgrades.shieldStrength || 0) * 20

    // Set initial mouse position to center for mobile
    this.mouse.x = canvas.width / 2
    this.mouse.y = canvas.height / 2 - 100

    this.bindEvents()
  }

  bindEvents() {
    window.addEventListener("keydown", this.handleKeyDown)
    window.addEventListener("keyup", this.handleKeyUp)
    window.addEventListener("mousemove", this.handleMouseMove)
    window.addEventListener("mousedown", this.handleMouseDown)
    window.addEventListener("mouseup", this.handleMouseUp)
    window.addEventListener("contextmenu", this.handleContextMenu)
  }

  handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = true
    if (e.key.toLowerCase() === "r" && !this.player.reloading) {
      this.player.reload()
    }
    if (e.key === "Escape" && this.running) {
      this.togglePause()
    }
    if (e.key.toLowerCase() === "g" && this.running && !this.paused) {
      this.player.throwGrenade(this.mouse.x, this.mouse.y)
    }
    if (e.key.toLowerCase() === "q" && this.running && !this.paused) {
      this.player.activateShield()
    }
    if (e.key === "Tab") {
      e.preventDefault()
    }
  }

  handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false
  }

  handleMouseMove = (e: MouseEvent) => {
    this.mouse.x = e.clientX
    this.mouse.y = e.clientY
  }

  handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mouse.down = true
    }
    if (e.button === 2 && this.running && !this.paused) {
      this.player.throwGrenade(this.mouse.x, this.mouse.y)
    }
  }

  handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mouse.down = false
    }
  }

  handleContextMenu = (e: MouseEvent) => {
    e.preventDefault()
  }

  togglePause() {
    if (this.paused) {
      this.resume()
    } else {
      this.pause()
    }
    if (this.onPauseChange) {
      this.onPauseChange(this.paused)
    }
  }

  start() {
    this.running = true
    this.paused = false
    this.wave = 1
    this.score = 0
    this.sessionXP = 0
    this.enemiesKilled = 0
    this.combo = 0
    this.comboTimer = 0
    this.highestCombo = 0
    this.enemies = []
    this.bullets = []
    this.particles = []
    this.powerUps = []
    this.grenades = []
    this.spawnTimers.forEach((timer) => clearTimeout(timer))
    this.spawnTimers = []

    this.player = new Player(this.canvas.width / 2, this.canvas.height / 2, this, this.saveData.equippedWeapon)
    this.player.maxHealth = 100 + this.saveData.permanentUpgrades.maxHealth * 10
    this.player.health = this.player.maxHealth
    this.player.maxGrenades = 5 + (this.saveData.permanentUpgrades.grenadeCapacity || 0)
    this.player.grenades = Math.min(3, this.player.maxGrenades)
    this.player.shieldMaxHealth = 50 + (this.saveData.permanentUpgrades.shieldStrength || 0) * 20

    this.spawnWave()
    this.gameLoop()
  }

  pause() {
    this.paused = true
  }

  resume() {
    this.paused = false
  }

  resize(width: number, height: number) {
    // Keep player in bounds after resize
    this.player.x = Math.max(this.player.radius, Math.min(width - this.player.radius, this.player.x))
    this.player.y = Math.max(this.player.radius, Math.min(height - this.player.radius, this.player.y))
  }

  spawnWave() {
    this.spawnTimers.forEach((timer) => clearTimeout(timer))
    this.spawnTimers = []

    if (this.wave > 1) {
      soundManager.waveComplete()
    }

    if (this.isTutorial) {
      this.totalEnemiesThisWave = 2
      this.enemiesSpawned = 0
      this.enemiesKilledThisWave = 0

      for (let i = 0; i < 2; i++) {
        const timer = setTimeout(() => {
          if (this.running && !this.paused) {
            this.spawnEnemy()
            this.enemiesSpawned++
          }
        }, i * 1000)
        this.spawnTimers.push(timer)
      }
      this.updateStats({ wave: this.wave })
      return
    }

    // Progressive difficulty - easier early waves
    let baseEnemies: number
    if (this.wave === 1) {
      baseEnemies = 2
    } else if (this.wave === 2) {
      baseEnemies = 3
    } else if (this.wave <= 5) {
      baseEnemies = 3 + this.wave
    } else {
      baseEnemies = 5 + Math.floor(this.wave * 1.5)
    }

    this.totalEnemiesThisWave = baseEnemies
    this.enemiesSpawned = 0
    this.enemiesKilledThisWave = 0

    const spawnDelay = this.wave <= 3 ? 800 : this.wave <= 5 ? 600 : 400

    for (let i = 0; i < baseEnemies; i++) {
      const timer = setTimeout(() => {
        if (this.running) {
          this.spawnEnemy()
          this.enemiesSpawned++
        }
      }, i * spawnDelay)
      this.spawnTimers.push(timer)
    }

    this.updateStats({ wave: this.wave })

    // Feature unlocks at wave milestones
    if (this.wave === 3) {
      this.onFeatureUnlock("Fast Enemies")
    } else if (this.wave === 5) {
      this.onFeatureUnlock("Tank Enemies")
    } else if (this.wave === 7) {
      this.onFeatureUnlock("Boss Enemies")
    } else if (this.wave === 10) {
      this.onFeatureUnlock("Elite Weapons")
    } else if (this.wave === 15) {
      this.onFeatureUnlock("Legendary Tier")
    }
  }

  spawnEnemy() {
    const side = Math.floor(Math.random() * 4)
    let x: number, y: number

    const margin = 50
    switch (side) {
      case 0:
        x = Math.random() * this.canvas.width
        y = -margin
        break
      case 1:
        x = this.canvas.width + margin
        y = Math.random() * this.canvas.height
        break
      case 2:
        x = Math.random() * this.canvas.width
        y = this.canvas.height + margin
        break
      default:
        x = -margin
        y = Math.random() * this.canvas.height
    }

    let type: EnemyType = "basic"

    if (this.isTutorial) {
      type = "basic"
    } else {
      const rand = Math.random()

      if (this.wave >= 7 && rand < 0.05 + (this.wave - 7) * 0.02) {
        type = "boss"
      } else if (this.wave >= 5 && rand < 0.15 + (this.wave - 5) * 0.03) {
        type = "tank"
      } else if (this.wave >= 3 && rand < 0.25 + (this.wave - 3) * 0.05) {
        type = "fast"
      }
    }

    this.enemies.push(new Enemy(x, y, type, this.wave, this, this.isTutorial))
  }

  gameLoop = () => {
    if (!this.running) return

    if (!this.paused) {
      this.update()
      this.render()
    } else {
      this.render()
      this.renderPauseOverlay()
    }

    this.animationFrame = requestAnimationFrame(this.gameLoop)
  }

  renderPauseOverlay() {
    const { ctx, canvas } = this
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  update() {
    this.gameTime++
    this.gridOffset = (this.gridOffset + 0.5) % 40

    if (this.combo > 0) {
      this.comboTimer--
      if (this.comboTimer <= 0) {
        this.combo = 0
      }
    }

    this.player.update(this.keys, this.mouse)

    this.grenades = this.grenades.filter((grenade) => {
      const shouldExplode = grenade.update(this)
      if (shouldExplode) {
        this.createExplosion(grenade.x, grenade.y, grenade.explosionRadius, grenade.damage)
        soundManager.explosion()
        return false
      }
      return true
    })

    this.enemies = this.enemies.filter((enemy) => {
      enemy.update(this.player)

      const dx = enemy.x - this.player.x
      const dy = enemy.y - this.player.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < enemy.radius + this.player.radius) {
        this.player.takeDamage(enemy.damage)
        this.createHitParticles(this.player.x, this.player.y, "#ff0000")

        if (this.player.health <= 0) {
          this.gameOver()
        }
      }

      return enemy.health > 0
    })

    this.bullets = this.bullets.filter((bullet) => {
      bullet.update()

      for (const enemy of this.enemies) {
        const dx = bullet.x - enemy.x
        const dy = bullet.y - enemy.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < bullet.radius + enemy.radius) {
          // Critical hit check
          const isCrit = Math.random() < this.upgrades.critChance
          const actualDamage = isCrit ? bullet.damage * 2 : bullet.damage

          enemy.takeDamage(actualDamage)
          this.createHitParticles(bullet.x, bullet.y, isCrit ? "#ffff00" : enemy.color)

          if (isCrit) {
            // Crit indicator
            for (let i = 0; i < 5; i++) {
              const angle = Math.random() * Math.PI * 2
              this.particles.push(
                new Particle(bullet.x, bullet.y, Math.cos(angle) * 5, Math.sin(angle) * 5, "#ffff00", 6),
              )
            }
          }

          soundManager.hit()

          if (bullet.explosive && bullet.explosionRadius > 0) {
            this.createExplosion(bullet.x, bullet.y, bullet.explosionRadius, bullet.damage * 0.5)
            soundManager.explosion()
          }

          const angle = Math.atan2(dy, dx)
          enemy.x += Math.cos(angle) * 10
          enemy.y += Math.sin(angle) * 10

          if (enemy.health <= 0) {
            this.enemyKilled(enemy)
          }

          if (bullet.pierce <= 0) {
            return false
          }
          bullet.pierce--
        }
      }

      return bullet.x > 0 && bullet.x < this.canvas.width && bullet.y > 0 && bullet.y < this.canvas.height
    })

    this.particles = this.particles.filter((particle) => {
      particle.update()
      return particle.life > 0
    })

    this.powerUps = this.powerUps.filter((powerUp) => {
      powerUp.update()

      const dx = powerUp.x - this.player.x
      const dy = powerUp.y - this.player.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < powerUp.radius + this.player.radius) {
        this.collectPowerUp(powerUp)
        return false
      }

      return powerUp.life > 0
    })

    const allSpawned = this.enemiesSpawned >= this.totalEnemiesThisWave
    const allKilled = this.enemies.length === 0 && allSpawned

    if (allKilled && this.totalEnemiesThisWave > 0) {
      this.waveDelay++
      const delayDuration = this.wave <= 3 ? 180 : 120
      if (this.waveDelay > delayDuration) {
        this.wave++
        this.waveDelay = 0
        this.spawnWave()
      }
    }

    this.updateStats({
      health: Math.ceil(this.player.health),
      maxHealth: Math.ceil(this.player.maxHealth),
      ammo: this.player.ammo,
      maxAmmo: this.player.maxAmmo,
      xp: this.player.xp,
      xpToLevel: this.player.xpToLevel,
      level: this.player.level,
      score: this.score,
      reloading: this.player.reloading,
      sessionXP: this.sessionXP,
      enemiesKilled: this.enemiesKilled,
      weaponName: this.player.currentWeapon.name,
      combo: this.combo,
      grenades: this.player.grenades,
      maxGrenades: this.player.maxGrenades,
      shieldActive: this.player.shieldActive,
      shieldHealth: this.player.shieldHealth,
      shieldMaxHealth: this.player.shieldMaxHealth,
      shieldCooldown: this.player.shieldCooldown,
      shieldMaxCooldown: this.player.shieldMaxCooldown,
    })
  }

  createExplosion(x: number, y: number, radius: number, damage: number) {
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 6
      const colors = ["#ff0066", "#ff6600", "#ffff00", "#ff3300"]
      this.particles.push(
        new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, colors[Math.floor(Math.random() * 4)], 8),
      )
    }

    for (const enemy of this.enemies) {
      const dx = enemy.x - x
      const dy = enemy.y - y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < radius) {
        const falloff = 1 - dist / radius
        enemy.takeDamage(damage * falloff)

        const angle = Math.atan2(dy, dx)
        enemy.x += Math.cos(angle) * 20 * falloff
        enemy.y += Math.sin(angle) * 20 * falloff

        if (enemy.health <= 0) {
          this.enemyKilled(enemy)
        }
      }
    }
  }

  render() {
    const { ctx, canvas } = this

    ctx.fillStyle = "#0a0a0f"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    this.drawGrid()
    this.powerUps.forEach((p) => p.render(ctx))
    this.grenades.forEach((g) => g.render(ctx))
    this.bullets.forEach((b) => b.render(ctx))
    this.enemies.forEach((e) => e.render(ctx))
    this.player.render(ctx, this.mouse)
    this.particles.forEach((p) => p.render(ctx))

    if (this.combo > 1) {
      this.renderCombo()
    }

    if (!this.paused && !this.isMobile) {
      this.drawCrosshair()
    }
  }

  renderCombo() {
    const { ctx, canvas } = this

    const comboAlpha = Math.min(1, this.comboTimer / 60)
    const scale = 1 + Math.min(0.5, this.combo * 0.05)

    ctx.save()
    ctx.translate(canvas.width / 2, 100)
    ctx.scale(scale, scale)

    ctx.shadowColor = this.getComboColor()
    ctx.shadowBlur = 20

    ctx.font = "bold 48px monospace"
    ctx.textAlign = "center"
    ctx.fillStyle = this.getComboColor()
    ctx.globalAlpha = comboAlpha
    ctx.fillText(`${this.combo}x COMBO`, 0, 0)

    const message = this.getComboMessage()
    if (message) {
      ctx.font = "bold 24px monospace"
      ctx.fillText(message, 0, 35)
    }

    ctx.restore()
  }

  getComboColor(): string {
    if (this.combo >= 20) return "#ff00ff"
    if (this.combo >= 15) return "#ff0000"
    if (this.combo >= 10) return "#ff6600"
    if (this.combo >= 5) return "#ffff00"
    return "#00ffff"
  }

  getComboMessage(): string {
    if (this.combo >= 25) return "UNSTOPPABLE!"
    if (this.combo >= 20) return "GODLIKE!"
    if (this.combo >= 15) return "RAMPAGE!"
    if (this.combo >= 10) return "DOMINATING!"
    if (this.combo >= 7) return "KILLING SPREE!"
    if (this.combo >= 5) return "MULTI KILL!"
    if (this.combo >= 3) return "COMBO!"
    return ""
  }

  drawGrid() {
    const { ctx, canvas } = this
    const gridSize = 40

    ctx.strokeStyle = "rgba(0, 255, 255, 0.1)"
    ctx.lineWidth = 1

    for (let x = -gridSize + (this.gridOffset % gridSize); x < canvas.width + gridSize; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }

    for (let y = -gridSize + (this.gridOffset % gridSize); y < canvas.height + gridSize; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    ctx.fillStyle = "rgba(0, 255, 255, 0.05)"
    for (let x = 0; x < canvas.width; x += gridSize * 2) {
      for (let y = 0; y < canvas.height; y += gridSize * 2) {
        ctx.beginPath()
        ctx.arc(x + this.gridOffset, y + this.gridOffset, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  drawCrosshair() {
    const { ctx, mouse } = this
    const size = 15

    ctx.strokeStyle = this.player.ammo > 0 ? this.player.currentWeapon.color : "#ff0000"
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.moveTo(mouse.x - size, mouse.y)
    ctx.lineTo(mouse.x - 5, mouse.y)
    ctx.moveTo(mouse.x + 5, mouse.y)
    ctx.lineTo(mouse.x + size, mouse.y)
    ctx.moveTo(mouse.x, mouse.y - size)
    ctx.lineTo(mouse.x, mouse.y - 5)
    ctx.moveTo(mouse.x, mouse.y + 5)
    ctx.lineTo(mouse.x, mouse.y + size)
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(mouse.x, mouse.y, 3, 0, Math.PI * 2)
    ctx.stroke()
  }

  createHitParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 4
      this.particles.push(
        new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color, 3 + Math.random() * 3),
      )
    }
  }

  enemyKilled(enemy: Enemy) {
    this.combo++
    this.comboTimer = this.comboMaxTimer
    if (this.combo > this.highestCombo) {
      this.highestCombo = this.combo
    }

    const comboMultiplier = 1 + Math.min(2, this.combo * 0.1)
    const xpGained = Math.floor(enemy.xpValue * comboMultiplier * this.upgrades.xpBonus)

    const scoreMultiplier = 1 + Math.min(3, this.combo * 0.15)
    this.score += Math.floor(enemy.scoreValue * scoreMultiplier)

    this.player.gainXP(xpGained)
    this.sessionXP += xpGained
    this.enemiesKilled++
    this.enemiesKilledThisWave++

    soundManager.enemyDeath()

    if (this.combo === 5 || this.combo === 10 || this.combo === 15 || this.combo === 20 || this.combo === 25) {
      soundManager.combo(this.combo)
      if (this.onCombo) {
        this.onCombo(this.combo, this.getComboMessage())
      }
    }

    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 3 + Math.random() * 5
      this.particles.push(
        new Particle(
          enemy.x,
          enemy.y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          enemy.color,
          4 + Math.random() * 4,
        ),
      )
    }

    let dropChance = 0.3
    if (this.wave <= 2) {
      dropChance = 0.5
    } else if (this.wave <= 5) {
      dropChance = 0.4
    }

    if (enemy.type === "boss") {
      dropChance = 1
    }

    if (Math.random() < dropChance) {
      this.powerUps.push(new PowerUp(enemy.x, enemy.y))
    }
  }

  collectPowerUp(powerUp: PowerUp) {
    soundManager.powerUp()

    const allUpgrades = [
      { id: "fireRate", name: "RAPID FIRE", description: "+20% Fire Rate" },
      { id: "moveSpeed", name: "OVERCLOCK", description: "+15% Move Speed" },
      { id: "damage", name: "BIT CRUSHER", description: "+25% Damage" },
      { id: "maxHealth", name: "MEMORY UPGRADE", description: "+20 Max Health" },
      { id: "bulletSpeed", name: "FAST COMPILE", description: "+30% Bullet Speed" },
      { id: "reloadSpeed", name: "QUICK SYNC", description: "+25% Reload Speed" },
      { id: "pierce", name: "PENETRATION", description: "Bullets pierce +1 enemy" },
      { id: "dashCooldown", name: "TURBO BOOST", description: "-20% Dash Cooldown" },
      { id: "heal", name: "PATCH FIX", description: "Restore 30 HP" },
      { id: "shield", name: "FIREWALL", description: "Activate shield now" },
      { id: "ammo", name: "AMMO CACHE", description: "Refill all ammo" },
      { id: "grenade", name: "EXPLOSIVE CODE", description: "+2 Grenades" },
    ]

    const options = []
    const shuffled = [...allUpgrades].sort(() => Math.random() - 0.5)
    for (let i = 0; i < 3 && i < shuffled.length; i++) {
      options.push(shuffled[i])
    }

    this.showUpgradeMenu(options)
  }

  applyUpgrade(upgradeId: string) {
    switch (upgradeId) {
      case "fireRate":
        this.upgrades.fireRate *= 1.2
        break
      case "moveSpeed":
        this.upgrades.moveSpeed *= 1.15
        break
      case "damage":
        this.upgrades.damage *= 1.25
        break
      case "maxHealth":
        this.player.maxHealth += 20
        this.player.health = Math.min(this.player.health + 20, this.player.maxHealth)
        break
      case "bulletSpeed":
        this.upgrades.bulletSpeed *= 1.3
        break
      case "reloadSpeed":
        this.upgrades.reloadSpeed *= 1.25
        break
      case "pierce":
        this.upgrades.pierce += 1
        break
      case "dashCooldown":
        this.upgrades.dashCooldown *= 0.8
        break
      case "heal":
        this.player.health = Math.min(this.player.health + 30, this.player.maxHealth)
        break
      case "shield":
        this.player.activateShield()
        break
      case "ammo":
        this.player.ammo = this.player.maxAmmo
        this.player.reloading = false
        break
      case "grenade":
        this.player.grenades = Math.min(this.player.grenades + 2, this.player.maxGrenades)
        break
    }
  }

  onLevelUp() {
    soundManager.levelUp()

    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 3 + Math.random() * 5
      this.particles.push(
        new Particle(
          this.player.x,
          this.player.y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          "#ffff00",
          5 + Math.random() * 5,
        ),
      )
    }
  }

  gameOver() {
    this.running = false
    this.spawnTimers.forEach((timer) => clearTimeout(timer))
    this.spawnTimers = []
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
    }
    soundManager.gameOver()
    this.onGameOver()
  }

  destroy() {
    this.running = false
    this.spawnTimers.forEach((timer) => clearTimeout(timer))
    this.spawnTimers = []
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
    }
    window.removeEventListener("keydown", this.handleKeyDown)
    window.removeEventListener("keyup", this.handleKeyUp)
    window.removeEventListener("mousemove", this.handleMouseMove)
    window.removeEventListener("mousedown", this.handleMouseDown)
    window.removeEventListener("mouseup", this.handleMouseUp)
    window.removeEventListener("contextmenu", this.handleContextMenu)
  }
}
