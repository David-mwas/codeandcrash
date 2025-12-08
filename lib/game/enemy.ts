import type { GameManager } from "./game-manager"

export type EnemyType = "basic" | "fast" | "tank" | "boss"

interface EnemyConfig {
  radius: number
  speed: number
  health: number
  damage: number
  color: string
  scoreValue: number
  xpValue: number
}

const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  basic: {
    radius: 15,
    speed: 2,
    health: 30,
    damage: 10,
    color: "#ff0066",
    scoreValue: 100,
    xpValue: 10,
  },
  fast: {
    radius: 12,
    speed: 4,
    health: 20,
    damage: 8,
    color: "#ffaa00",
    scoreValue: 150,
    xpValue: 15,
  },
  tank: {
    radius: 25,
    speed: 1,
    health: 100,
    damage: 20,
    color: "#00ff66",
    scoreValue: 300,
    xpValue: 30,
  },
  boss: {
    radius: 40,
    speed: 1.5,
    health: 300,
    damage: 30,
    color: "#ff00ff",
    scoreValue: 1000,
    xpValue: 100,
  },
}

export class Enemy {
  x: number
  y: number
  type: EnemyType
  radius: number
  speed: number
  health: number
  maxHealth: number
  damage: number
  color: string
  scoreValue: number
  xpValue: number

  angle = 0
  wobble = 0
  hitFlash = 0

  game: GameManager

  constructor(x: number, y: number, type: EnemyType, wave: number, game: GameManager, isTutorial = false) {
    this.x = x
    this.y = y
    this.type = type
    this.game = game

    const config = ENEMY_CONFIGS[type]
    this.radius = config.radius

    let speedMultiplier: number
    let healthMultiplier: number
    let damageMultiplier: number

    if (isTutorial) {
      // Tutorial enemies are very weak
      speedMultiplier = 0.5
      healthMultiplier = 0.5
      damageMultiplier = 0.3
    } else if (wave === 1) {
      // Wave 1 is very easy
      speedMultiplier = 0.7
      healthMultiplier = 0.6
      damageMultiplier = 0.5
    } else if (wave === 2) {
      speedMultiplier = 0.8
      healthMultiplier = 0.7
      damageMultiplier = 0.6
    } else if (wave <= 5) {
      // Gradual increase from wave 3-5
      speedMultiplier = 0.85 + (wave - 3) * 0.05
      healthMultiplier = 0.8 + (wave - 3) * 0.1
      damageMultiplier = 0.7 + (wave - 3) * 0.1
    } else {
      // Normal scaling from wave 6+
      speedMultiplier = 1 + (wave - 6) * 0.03
      healthMultiplier = 1 + (wave - 6) * 0.08
      damageMultiplier = 1 + (wave - 6) * 0.05
    }

    this.speed = config.speed * speedMultiplier
    this.health = config.health * healthMultiplier
    this.maxHealth = this.health
    this.damage = config.damage * damageMultiplier
    this.color = config.color
    this.scoreValue = config.scoreValue
    this.xpValue = config.xpValue
  }

  update(player: { x: number; y: number }) {
    // Move towards player
    const dx = player.x - this.x
    const dy = player.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 0) {
      this.x += (dx / dist) * this.speed
      this.y += (dy / dist) * this.speed
    }

    this.angle = Math.atan2(dy, dx)
    this.wobble += 0.1
    this.hitFlash = Math.max(0, this.hitFlash - 1)
  }

  takeDamage(amount: number) {
    this.health -= amount
    this.hitFlash = 5
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.translate(this.x, this.y)

    // Glow
    const gradient = ctx.createRadialGradient(0, 0, this.radius, 0, 0, this.radius * 1.5)
    gradient.addColorStop(0, this.color + "40")
    gradient.addColorStop(1, this.color + "00")
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2)
    ctx.fill()

    // Body
    ctx.fillStyle = this.hitFlash > 0 ? "#ffffff" : this.color
    ctx.beginPath()

    if (this.type === "basic") {
      // Hexagon shape
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + this.wobble
        const px = Math.cos(a) * this.radius
        const py = Math.sin(a) * this.radius
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
    } else if (this.type === "fast") {
      // Triangle shape
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + this.angle
        const px = Math.cos(a) * this.radius
        const py = Math.sin(a) * this.radius
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
    } else if (this.type === "tank") {
      // Square shape
      ctx.rect(-this.radius, -this.radius, this.radius * 2, this.radius * 2)
    } else {
      // Boss - star shape
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + this.wobble * 0.5
        const r = i % 2 === 0 ? this.radius : this.radius * 0.6
        const px = Math.cos(a) * r
        const py = Math.sin(a) * r
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
    }

    ctx.fill()

    // Inner pattern
    ctx.fillStyle = "#000000"
    ctx.globalAlpha = 0.3
    ctx.beginPath()
    ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    // Eye
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(
      Math.cos(this.angle) * this.radius * 0.3,
      Math.sin(this.angle) * this.radius * 0.3,
      this.radius * 0.2,
      0,
      Math.PI * 2,
    )
    ctx.fill()

    ctx.restore()

    // Health bar for tanks and bosses
    if ((this.type === "tank" || this.type === "boss") && this.health < this.maxHealth) {
      const barWidth = this.radius * 2
      const barHeight = 4
      const healthPercent = this.health / this.maxHealth

      ctx.fillStyle = "#333333"
      ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 10, barWidth, barHeight)

      ctx.fillStyle = this.color
      ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 10, barWidth * healthPercent, barHeight)
    }
  }
}
