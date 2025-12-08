export class Bullet {
  x: number
  y: number
  vx: number
  vy: number
  radius = 5
  damage: number
  pierce: number
  trail: { x: number; y: number }[] = []
  color: string
  explosive: boolean
  explosionRadius: number
  isRocket: boolean

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number,
    pierce: number,
    color = "#00ffff",
    explosive = false,
    explosionRadius = 0,
  ) {
    this.x = x
    this.y = y
    this.vx = vx
    this.vy = vy
    this.damage = damage
    this.pierce = pierce
    this.color = color
    this.explosive = explosive
    this.explosionRadius = explosionRadius
    this.isRocket = explosive && explosionRadius > 0

    if (this.isRocket) {
      this.radius = 8
    }
  }

  update() {
    this.trail.push({ x: this.x, y: this.y })
    if (this.trail.length > 8) {
      this.trail.shift()
    }

    this.x += this.vx
    this.y += this.vy
  }

  render(ctx: CanvasRenderingContext2D) {
    // Draw trail
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i]
      const alpha = (i / this.trail.length) * 0.5
      const size = (i / this.trail.length) * this.radius

      ctx.fillStyle = this.color.replace(")", `, ${alpha})`).replace("rgb", "rgba").replace("#", "")
      // Convert hex to rgba for trail
      const r = Number.parseInt(this.color.slice(1, 3), 16)
      const g = Number.parseInt(this.color.slice(3, 5), 16)
      const b = Number.parseInt(this.color.slice(5, 7), 16)
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`

      ctx.beginPath()
      ctx.arc(t.x, t.y, size, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw bullet
    if (this.isRocket) {
      // Rocket appearance
      ctx.save()
      ctx.translate(this.x, this.y)
      ctx.rotate(Math.atan2(this.vy, this.vx))

      // Rocket body
      ctx.fillStyle = this.color
      ctx.beginPath()
      ctx.ellipse(0, 0, this.radius * 1.5, this.radius * 0.7, 0, 0, Math.PI * 2)
      ctx.fill()

      // Rocket flame
      ctx.fillStyle = "#ff6600"
      ctx.beginPath()
      ctx.moveTo(-this.radius * 1.5, 0)
      ctx.lineTo(-this.radius * 2.5, -this.radius * 0.5)
      ctx.lineTo(-this.radius * 2.5, this.radius * 0.5)
      ctx.closePath()
      ctx.fill()

      ctx.restore()
    } else {
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 2)
      gradient.addColorStop(0, "#ffffff")
      gradient.addColorStop(0.3, this.color)
      gradient.addColorStop(1, "rgba(0, 255, 255, 0)")

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = "#ffffff"
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
