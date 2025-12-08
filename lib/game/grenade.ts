import type { GameManager } from "./game-manager"

export class Grenade {
  x: number
  y: number
  vx: number
  vy: number
  radius = 8
  damage: number
  explosionRadius: number
  fuseTime: number
  maxFuseTime: number
  exploded = false
  bounces = 0
  maxBounces = 2
  color = "#ff6600"

  constructor(
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    damage = 50,
    explosionRadius = 100,
    fuseTime = 90,
  ) {
    this.x = x
    this.y = y
    this.damage = damage
    this.explosionRadius = explosionRadius
    this.fuseTime = fuseTime
    this.maxFuseTime = fuseTime

    // Calculate velocity towards target with arc
    const dx = targetX - x
    const dy = targetY - y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const speed = Math.min(distance / 30, 12)

    this.vx = (dx / distance) * speed
    this.vy = (dy / distance) * speed
  }

  update(game: GameManager): boolean {
    // Apply gravity/friction
    this.vx *= 0.98
    this.vy *= 0.98

    this.x += this.vx
    this.y += this.vy

    // Bounce off walls
    if (this.x < this.radius || this.x > game.canvas.width - this.radius) {
      this.vx *= -0.6
      this.x = Math.max(this.radius, Math.min(game.canvas.width - this.radius, this.x))
      this.bounces++
    }
    if (this.y < this.radius || this.y > game.canvas.height - this.radius) {
      this.vy *= -0.6
      this.y = Math.max(this.radius, Math.min(game.canvas.height - this.radius, this.y))
      this.bounces++
    }

    // Decrease fuse
    this.fuseTime--

    // Explode when fuse runs out or max bounces
    if (this.fuseTime <= 0 || this.bounces > this.maxBounces) {
      return true // Should explode
    }

    return false
  }

  render(ctx: CanvasRenderingContext2D) {
    const flashRate = Math.max(3, Math.floor(this.fuseTime / 10))
    const flashing = Math.floor(this.fuseTime / flashRate) % 2 === 0

    // Grenade body
    ctx.save()
    ctx.translate(this.x, this.y)

    // Glow
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2)
    gradient.addColorStop(0, flashing ? "rgba(255, 100, 0, 0.5)" : "rgba(255, 100, 0, 0.2)")
    gradient.addColorStop(1, "rgba(255, 100, 0, 0)")
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(0, 0, this.radius * 2, 0, Math.PI * 2)
    ctx.fill()

    // Body
    ctx.fillStyle = flashing ? "#ff3300" : this.color
    ctx.beginPath()
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2)
    ctx.fill()

    // Inner detail
    ctx.fillStyle = "#331100"
    ctx.beginPath()
    ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2)
    ctx.fill()

    // Fuse indicator
    const fuseProgress = this.fuseTime / this.maxFuseTime
    ctx.strokeStyle = "#ffff00"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, this.radius + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fuseProgress)
    ctx.stroke()

    ctx.restore()
  }
}
