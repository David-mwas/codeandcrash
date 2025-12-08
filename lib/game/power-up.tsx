export class PowerUp {
  x: number
  y: number
  radius = 15
  life = 600 // 10 seconds at 60fps
  maxLife = 600
  angle = 0
  pulse = 0

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  update() {
    this.angle += 0.05
    this.pulse += 0.1
    this.life--
  }

  render(ctx: CanvasRenderingContext2D) {
    const alpha = Math.min(1, this.life / 60)
    const pulseScale = 1 + Math.sin(this.pulse) * 0.1

    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.globalAlpha = alpha

    // Outer glow
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2)
    gradient.addColorStop(0, "rgba(168, 85, 247, 0.5)")
    gradient.addColorStop(1, "rgba(168, 85, 247, 0)")
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(0, 0, this.radius * 2 * pulseScale, 0, Math.PI * 2)
    ctx.fill()

    // Main body
    ctx.rotate(this.angle)
    ctx.fillStyle = "#a855f7"

    // Draw code fragment shape (diamond with inner details)
    ctx.beginPath()
    ctx.moveTo(0, -this.radius * pulseScale)
    ctx.lineTo(this.radius * pulseScale, 0)
    ctx.lineTo(0, this.radius * pulseScale)
    ctx.lineTo(-this.radius * pulseScale, 0)
    ctx.closePath()
    ctx.fill()

    // Inner diamond
    ctx.fillStyle = "#e879f9"
    ctx.beginPath()
    const innerSize = this.radius * 0.5 * pulseScale
    ctx.moveTo(0, -innerSize)
    ctx.lineTo(innerSize, 0)
    ctx.lineTo(0, innerSize)
    ctx.lineTo(-innerSize, 0)
    ctx.closePath()
    ctx.fill()

    // Center dot
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(0, 0, 3, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()

    // Floating code symbols around
    ctx.fillStyle = `rgba(168, 85, 247, ${alpha * 0.7})`
    ctx.font = "10px monospace"
    const symbols = ["</>", "{}", "[]", "=>"]
    for (let i = 0; i < 4; i++) {
      const a = this.angle + (i / 4) * Math.PI * 2
      const dist = this.radius * 2.5
      const px = this.x + Math.cos(a) * dist
      const py = this.y + Math.sin(a) * dist
      ctx.fillText(symbols[i], px - 8, py + 3)
    }
  }
}
