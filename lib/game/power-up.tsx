export class PowerUp {
  x: number
  y: number
  radius = 15
  collected = false
  bobOffset = 0
  rotation = 0

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    this.bobOffset = Math.random() * Math.PI * 2
  }

  update() {
    this.bobOffset += 0.1
    this.rotation += 0.05
  }

  render(ctx: CanvasRenderingContext2D) {
    if (this.collected) return

    const bobY = Math.sin(this.bobOffset) * 5

    ctx.save()
    ctx.translate(this.x, this.y + bobY)
    ctx.rotate(this.rotation)

    // Glow effect
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2)
    gradient.addColorStop(0, "rgba(0, 255, 136, 0.6)")
    gradient.addColorStop(0.5, "rgba(0, 255, 136, 0.2)")
    gradient.addColorStop(1, "rgba(0, 255, 136, 0)")
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(0, 0, this.radius * 2, 0, Math.PI * 2)
    ctx.fill()

    // Diamond shape
    ctx.fillStyle = "#00ff88"
    ctx.beginPath()
    ctx.moveTo(0, -this.radius)
    ctx.lineTo(this.radius * 0.7, 0)
    ctx.lineTo(0, this.radius)
    ctx.lineTo(-this.radius * 0.7, 0)
    ctx.closePath()
    ctx.fill()

    // Inner highlight
    ctx.fillStyle = "#88ffcc"
    ctx.beginPath()
    ctx.moveTo(0, -this.radius * 0.5)
    ctx.lineTo(this.radius * 0.35, 0)
    ctx.lineTo(0, this.radius * 0.5)
    ctx.lineTo(-this.radius * 0.35, 0)
    ctx.closePath()
    ctx.fill()

    // Code symbol
    ctx.fillStyle = "#003322"
    ctx.font = "bold 10px monospace"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("</>", 0, 0)

    ctx.restore()
  }
}
