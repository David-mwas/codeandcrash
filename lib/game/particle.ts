export class Particle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  life: number
  maxLife: number
  friction = 0.95

  constructor(x: number, y: number, vx: number, vy: number, color: string, size: number) {
    this.x = x
    this.y = y
    this.vx = vx
    this.vy = vy
    this.color = color
    this.size = size
    this.life = 30 + Math.random() * 20
    this.maxLife = this.life
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.vx *= this.friction
    this.vy *= this.friction
    this.life--
  }

  render(ctx: CanvasRenderingContext2D) {
    const alpha = this.life / this.maxLife
    const currentSize = this.size * alpha

    ctx.globalAlpha = alpha
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
}
