import type { GameManager } from "./game-manager"
import { Bullet } from "./bullet"
import { Particle } from "./particle"
import { WEAPONS, type WeaponType, type WeaponConfig } from "./weapons"
import { Grenade } from "./grenade"
import { soundManager } from "./sound"

export class Player {
  x: number
  y: number
  radius = 18
  speed = 5
  health = 100
  maxHealth = 100
  ammo = 30
  maxAmmo = 30
  reloading = false
  reloadTime = 0
  reloadDuration = 60

  xp = 0
  xpToLevel = 100
  level = 1

  fireRate = 8
  fireCooldown = 0

  dashCooldown = 0
  dashDuration = 0
  dashMaxCooldown = 90
  dashSpeed = 15
  dashDirection = { x: 0, y: 0 }

  invulnerable = 0

  shieldActive = false
  shieldHealth = 0
  shieldMaxHealth = 50
  shieldCooldown = 0
  shieldMaxCooldown = 600 // 10 seconds

  grenades = 3
  maxGrenades = 5
  grenadeCooldown = 0
  grenadeMaxCooldown = 60

  currentWeapon: WeaponConfig
  weaponType: WeaponType

  game: GameManager

  constructor(x: number, y: number, game: GameManager, weaponType: WeaponType = "pistol") {
    this.x = x
    this.y = y
    this.game = game
    this.weaponType = weaponType
    this.currentWeapon = WEAPONS[weaponType]
    this.ammo = this.currentWeapon.ammo
    this.maxAmmo = this.currentWeapon.maxAmmo
    this.fireRate = this.currentWeapon.fireRate
    this.reloadDuration = this.currentWeapon.reloadTime
  }

  switchWeapon(weaponType: WeaponType) {
    this.weaponType = weaponType
    this.currentWeapon = WEAPONS[weaponType]
    this.ammo = this.currentWeapon.ammo
    this.maxAmmo = this.currentWeapon.maxAmmo
    this.fireRate = this.currentWeapon.fireRate
    this.reloadDuration = this.currentWeapon.reloadTime
    this.reloading = false
    this.reloadTime = 0
  }

  update(keys: { [key: string]: boolean }, mouse: { x: number; y: number; down: boolean }) {
    // Handle dash
    if (this.dashDuration > 0) {
      this.x += this.dashDirection.x * this.dashSpeed
      this.y += this.dashDirection.y * this.dashSpeed
      this.dashDuration--
    } else {
      // Normal movement
      let dx = 0
      let dy = 0

      if (keys["w"] || keys["arrowup"]) dy -= 1
      if (keys["s"] || keys["arrowdown"]) dy += 1
      if (keys["a"] || keys["arrowleft"]) dx -= 1
      if (keys["d"] || keys["arrowright"]) dx += 1

      // Normalize diagonal movement
      if (dx !== 0 && dy !== 0) {
        const norm = Math.sqrt(dx * dx + dy * dy)
        dx /= norm
        dy /= norm
      }

      const actualSpeed = this.speed * this.game.upgrades.moveSpeed
      this.x += dx * actualSpeed
      this.y += dy * actualSpeed

      // Dash input
      if (keys["shift"] && this.dashCooldown <= 0 && (dx !== 0 || dy !== 0)) {
        this.dashDirection = { x: dx, y: dy }
        this.dashDuration = 8
        this.dashCooldown = this.dashMaxCooldown * this.game.upgrades.dashCooldown
        this.invulnerable = 10
        soundManager.dash()
      }
    }

    // Keep player in bounds
    const margin = this.radius
    this.x = Math.max(margin, Math.min(this.game.canvas.width - margin, this.x))
    this.y = Math.max(margin, Math.min(this.game.canvas.height - margin, this.y))

    // Handle shooting
    this.fireCooldown = Math.max(0, this.fireCooldown - 1)
    this.dashCooldown = Math.max(0, this.dashCooldown - 1)
    this.invulnerable = Math.max(0, this.invulnerable - 1)
    this.grenadeCooldown = Math.max(0, this.grenadeCooldown - 1)
    this.shieldCooldown = Math.max(0, this.shieldCooldown - 1)

    if (mouse.down && this.fireCooldown <= 0 && this.ammo > 0 && !this.reloading) {
      this.shoot(mouse)
      this.fireCooldown = this.currentWeapon.fireRate / this.game.upgrades.fireRate
      this.ammo--

      if (this.ammo === 0) {
        this.reload()
      }
    }

    // Handle reloading
    if (this.reloading) {
      this.reloadTime++
      const actualReloadDuration = this.reloadDuration / this.game.upgrades.reloadSpeed
      if (this.reloadTime >= actualReloadDuration) {
        this.ammo = this.maxAmmo
        this.reloading = false
        this.reloadTime = 0
        soundManager.reload()
      }
    }

    if (this.shieldActive && this.shieldHealth <= 0) {
      this.shieldActive = false
    }
  }

  shoot(mouse: { x: number; y: number }) {
    const baseAngle = Math.atan2(mouse.y - this.y, mouse.x - this.x)
    const weapon = this.currentWeapon
    const bulletSpeed = weapon.bulletSpeed * this.game.upgrades.bulletSpeed
    const damage = weapon.damage * this.game.upgrades.damage

    soundManager.shoot(weapon.id)

    if (weapon.id === "dualPistol") {
      // Fire from both sides of the player
      const offsets = [
        { x: Math.cos(baseAngle + Math.PI / 2) * 10, y: Math.sin(baseAngle + Math.PI / 2) * 10 },
        { x: Math.cos(baseAngle - Math.PI / 2) * 10, y: Math.sin(baseAngle - Math.PI / 2) * 10 },
      ]
      offsets.forEach((offset) => {
        const spread = (Math.random() - 0.5) * weapon.spread
        const vx = Math.cos(baseAngle + spread) * bulletSpeed
        const vy = Math.sin(baseAngle + spread) * bulletSpeed
        this.game.bullets.push(
          new Bullet(
            this.x + offset.x + Math.cos(baseAngle) * 25,
            this.y + offset.y + Math.sin(baseAngle) * 25,
            vx,
            vy,
            damage,
            this.game.upgrades.pierce,
            weapon.color,
          ),
        )
      })
    } else if (weapon.id === "spread") {
      // Fire in all directions
      for (let i = 0; i < weapon.bulletCount; i++) {
        const angle = (i / weapon.bulletCount) * Math.PI * 2
        const vx = Math.cos(angle) * bulletSpeed
        const vy = Math.sin(angle) * bulletSpeed
        this.game.bullets.push(
          new Bullet(
            this.x + Math.cos(angle) * 25,
            this.y + Math.sin(angle) * 25,
            vx,
            vy,
            damage,
            this.game.upgrades.pierce,
            weapon.color,
          ),
        )
      }
    } else if (weapon.bulletCount > 1) {
      // Shotgun-style spread
      const spreadStart = -weapon.spread / 2
      const spreadStep = weapon.spread / (weapon.bulletCount - 1)
      for (let i = 0; i < weapon.bulletCount; i++) {
        const angle = baseAngle + spreadStart + spreadStep * i + (Math.random() - 0.5) * 0.1
        const vx = Math.cos(angle) * bulletSpeed
        const vy = Math.sin(angle) * bulletSpeed
        this.game.bullets.push(
          new Bullet(
            this.x + Math.cos(angle) * 25,
            this.y + Math.sin(angle) * 25,
            vx,
            vy,
            damage,
            this.game.upgrades.pierce,
            weapon.color,
          ),
        )
      }
    } else {
      // Single shot weapons (pistol, machine gun, rocket, laser)
      const spread = (Math.random() - 0.5) * weapon.spread
      const vx = Math.cos(baseAngle + spread) * bulletSpeed
      const vy = Math.sin(baseAngle + spread) * bulletSpeed

      const pierce = weapon.id === "laser" ? 5 + this.game.upgrades.pierce : this.game.upgrades.pierce

      this.game.bullets.push(
        new Bullet(
          this.x + Math.cos(baseAngle) * 25,
          this.y + Math.sin(baseAngle) * 25,
          vx,
          vy,
          damage,
          pierce,
          weapon.color,
          weapon.explosive,
          weapon.explosionRadius,
        ),
      )
    }

    // Muzzle flash particles
    for (let i = 0; i < 5; i++) {
      const pAngle = baseAngle + (Math.random() - 0.5) * 0.5
      const pSpeed = 3 + Math.random() * 3
      this.game.particles.push(
        new Particle(
          this.x + Math.cos(baseAngle) * 25,
          this.y + Math.sin(baseAngle) * 25,
          Math.cos(pAngle) * pSpeed,
          Math.sin(pAngle) * pSpeed,
          weapon.color,
          3,
        ),
      )
    }
  }

  throwGrenade(targetX: number, targetY: number) {
    if (this.grenades <= 0 || this.grenadeCooldown > 0) return false

    const damage = 50 * this.game.upgrades.damage
    const grenade = new Grenade(this.x, this.y, targetX, targetY, damage, 100, 90)
    this.game.grenades.push(grenade)
    this.grenades--
    this.grenadeCooldown = this.grenadeMaxCooldown

    soundManager.grenade()
    return true
  }

  activateShield() {
    if (this.shieldActive || this.shieldCooldown > 0) return false

    this.shieldActive = true
    this.shieldHealth = this.shieldMaxHealth
    this.shieldCooldown = this.shieldMaxCooldown

    soundManager.shieldActivate()

    // Shield particles
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2
      this.game.particles.push(
        new Particle(
          this.x + Math.cos(angle) * 30,
          this.y + Math.sin(angle) * 30,
          Math.cos(angle) * 2,
          Math.sin(angle) * 2,
          "#00aaff",
          5,
        ),
      )
    }

    return true
  }

  reload() {
    if (this.ammo < this.maxAmmo && !this.reloading) {
      this.reloading = true
      this.reloadTime = 0
    }
  }

  takeDamage(amount: number) {
    if (this.invulnerable > 0) return

    if (this.shieldActive && this.shieldHealth > 0) {
      const absorbed = Math.min(this.shieldHealth, amount)
      this.shieldHealth -= absorbed
      amount -= absorbed
      soundManager.shieldHit()

      if (this.shieldHealth <= 0) {
        this.shieldActive = false
      }

      if (amount <= 0) return
    }

    this.health -= amount
    this.invulnerable = 30
    soundManager.playerHit()

    if (this.health <= 0) {
      this.health = 0
    }
  }

  gainXP(amount: number) {
    this.xp += amount

    while (this.xp >= this.xpToLevel) {
      this.xp -= this.xpToLevel
      this.level++
      this.xpToLevel = Math.floor(this.xpToLevel * 1.5)
      this.game.onLevelUp()
    }
  }

  render(ctx: CanvasRenderingContext2D, mouse: { x: number; y: number }) {
    const angle = Math.atan2(mouse.y - this.y, mouse.x - this.x)

    ctx.save()
    ctx.translate(this.x, this.y)

    if (this.shieldActive) {
      const shieldOpacity = 0.3 + (this.shieldHealth / this.shieldMaxHealth) * 0.4
      const gradient = ctx.createRadialGradient(0, 0, this.radius + 5, 0, 0, this.radius + 20)
      gradient.addColorStop(0, `rgba(0, 170, 255, ${shieldOpacity})`)
      gradient.addColorStop(1, "rgba(0, 170, 255, 0)")
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(0, 0, this.radius + 20, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = `rgba(0, 200, 255, ${shieldOpacity + 0.2})`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(0, 0, this.radius + 12, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Glow effect
    const gradient = ctx.createRadialGradient(0, 0, this.radius, 0, 0, this.radius * 2)
    gradient.addColorStop(0, `${this.currentWeapon.color}4D`) // 30% opacity
    gradient.addColorStop(1, `${this.currentWeapon.color}00`)
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(0, 0, this.radius * 2, 0, Math.PI * 2)
    ctx.fill()

    // Dash trail
    if (this.dashDuration > 0) {
      ctx.fillStyle = `${this.currentWeapon.color}80`
      ctx.beginPath()
      ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // Body
    ctx.fillStyle = this.invulnerable > 0 ? "#ff6666" : this.currentWeapon.color
    ctx.beginPath()
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2)
    ctx.fill()

    // Inner circle
    ctx.fillStyle = "#001a1a"
    ctx.beginPath()
    ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2)
    ctx.fill()

    // Direction indicator / gun
    ctx.rotate(angle)
    ctx.fillStyle = this.currentWeapon.color
    ctx.fillRect(this.radius * 0.3, -4, this.radius + 10, 8)
    ctx.fillStyle = "#004444"
    ctx.fillRect(this.radius + 5, -2, 8, 4)

    if (this.currentWeapon.id === "dualPistol") {
      ctx.fillStyle = this.currentWeapon.color
      ctx.fillRect(this.radius * 0.3, -12, this.radius + 10, 6)
      ctx.fillRect(this.radius * 0.3, 6, this.radius + 10, 6)
    }

    ctx.restore()

    // Dash cooldown indicator
    if (this.dashCooldown > 0) {
      const dashProgress = 1 - this.dashCooldown / (this.dashMaxCooldown * this.game.upgrades.dashCooldown)
      ctx.strokeStyle = `${this.currentWeapon.color}80`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.radius + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * dashProgress)
      ctx.stroke()
    }
  }
}
