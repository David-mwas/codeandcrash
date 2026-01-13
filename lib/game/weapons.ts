export type WeaponType =
  | "pistol"
  | "dualPistol"
  | "shotgun"
  | "machineGun"
  | "rocket"
  | "laser"
  | "spread"
  | "plasma"
  | "minigun"
  | "railgun"
  | "flamethrower"
  | "burstRifle"
  | "toxicSprayer"
  | "lightningGun"
  | "vortexCannon"
  | "nullifier"
  | "apocalypse"

export interface WeaponConfig {
  id: WeaponType
  name: string
  description: string
  fireRate: number
  damage: number
  bulletSpeed: number
  ammo: number
  maxAmmo: number
  reloadTime: number
  bulletCount: number
  spread: number
  explosive: boolean
  explosionRadius: number
  cost: number
  unlockWave: number
  unlockLevel: number
  color: string
  tier: 1 | 2 | 3 | 4 | 5
}

export const WEAPONS: Record<WeaponType, WeaponConfig> = {
  pistol: {
    id: "pistol",
    name: "BYTE BLASTER",
    description: "Standard issue cyber pistol",
    fireRate: 8,
    damage: 10,
    bulletSpeed: 12,
    ammo: 30,
    maxAmmo: 30,
    reloadTime: 60,
    bulletCount: 1,
    spread: 0.1,
    explosive: false,
    explosionRadius: 0,
    cost: 0,
    unlockWave: 0,
    unlockLevel: 0,
    color: "#00ffff",
    tier: 1,
  },
  dualPistol: {
    id: "dualPistol",
    name: "DUAL BYTES",
    description: "Two pistols firing from both sides",
    fireRate: 10,
    damage: 8,
    bulletSpeed: 12,
    ammo: 40,
    maxAmmo: 40,
    reloadTime: 70,
    bulletCount: 2,
    spread: 0.3,
    explosive: false,
    explosionRadius: 0,
    cost: 200,
    unlockWave: 3,
    unlockLevel: 2,
    color: "#00ff88",
    tier: 1,
  },
  burstRifle: {
    id: "burstRifle",
    name: "TRI-BURST",
    description: "Fires 3-round bursts with high accuracy",
    fireRate: 18,
    damage: 12,
    bulletSpeed: 14,
    ammo: 36,
    maxAmmo: 36,
    reloadTime: 65,
    bulletCount: 3,
    spread: 0.08,
    explosive: false,
    explosionRadius: 0,
    cost: 280,
    unlockWave: 4,
    unlockLevel: 2,
    color: "#44ff88",
    tier: 2,
  },
  shotgun: {
    id: "shotgun",
    name: "DATA SCATTER",
    description: "Fires 5 pellets in a wide spread",
    fireRate: 25,
    damage: 8,
    bulletSpeed: 10,
    ammo: 8,
    maxAmmo: 8,
    reloadTime: 90,
    bulletCount: 5,
    spread: 0.4,
    explosive: false,
    explosionRadius: 0,
    cost: 350,
    unlockWave: 5,
    unlockLevel: 3,
    color: "#ff8800",
    tier: 2,
  },
  machineGun: {
    id: "machineGun",
    name: "STREAM PROCESSOR",
    description: "Rapid fire with high ammo capacity",
    fireRate: 4,
    damage: 6,
    bulletSpeed: 14,
    ammo: 100,
    maxAmmo: 100,
    reloadTime: 120,
    bulletCount: 1,
    spread: 0.15,
    explosive: false,
    explosionRadius: 0,
    cost: 500,
    unlockWave: 7,
    unlockLevel: 4,
    color: "#ffff00",
    tier: 2,
  },
  spread: {
    id: "spread",
    name: "BROADCAST",
    description: "Fires bullets in all directions",
    fireRate: 30,
    damage: 12,
    bulletSpeed: 10,
    ammo: 15,
    maxAmmo: 15,
    reloadTime: 85,
    bulletCount: 8,
    spread: Math.PI * 2,
    explosive: false,
    explosionRadius: 0,
    cost: 450,
    unlockWave: 6,
    unlockLevel: 4,
    color: "#00ffff",
    tier: 2,
  },
  toxicSprayer: {
    id: "toxicSprayer",
    name: "MALWARE MIST",
    description: "Sprays toxic code that damages over time",
    fireRate: 5,
    damage: 4,
    bulletSpeed: 7,
    ammo: 80,
    maxAmmo: 80,
    reloadTime: 90,
    bulletCount: 2,
    spread: 0.6,
    explosive: false,
    explosionRadius: 0,
    cost: 550,
    unlockWave: 7,
    unlockLevel: 4,
    color: "#00ff00",
    tier: 2,
  },
  plasma: {
    id: "plasma",
    name: "PLASMA CASTER",
    description: "Charged plasma shots with splash damage",
    fireRate: 20,
    damage: 25,
    bulletSpeed: 9,
    ammo: 15,
    maxAmmo: 15,
    reloadTime: 85,
    bulletCount: 1,
    spread: 0.05,
    explosive: true,
    explosionRadius: 50,
    cost: 600,
    unlockWave: 8,
    unlockLevel: 5,
    color: "#aa00ff",
    tier: 3,
  },
  laser: {
    id: "laser",
    name: "FIBER OPTIC",
    description: "Piercing laser beam, hits multiple enemies",
    fireRate: 15,
    damage: 15,
    bulletSpeed: 25,
    ammo: 20,
    maxAmmo: 20,
    reloadTime: 80,
    bulletCount: 1,
    spread: 0,
    explosive: false,
    explosionRadius: 0,
    cost: 650,
    unlockWave: 9,
    unlockLevel: 5,
    color: "#ff00ff",
    tier: 3,
  },
  lightningGun: {
    id: "lightningGun",
    name: "STATIC SHOCK",
    description: "Chain lightning jumps between enemies",
    fireRate: 12,
    damage: 18,
    bulletSpeed: 30,
    ammo: 25,
    maxAmmo: 25,
    reloadTime: 75,
    bulletCount: 1,
    spread: 0.05,
    explosive: false,
    explosionRadius: 0,
    cost: 700,
    unlockWave: 9,
    unlockLevel: 5,
    color: "#88ffff",
    tier: 3,
  },
  rocket: {
    id: "rocket",
    name: "STACK OVERFLOW",
    description: "Explosive rockets with large area damage",
    fireRate: 45,
    damage: 40,
    bulletSpeed: 8,
    ammo: 5,
    maxAmmo: 5,
    reloadTime: 100,
    bulletCount: 1,
    spread: 0,
    explosive: true,
    explosionRadius: 100,
    cost: 800,
    unlockWave: 10,
    unlockLevel: 6,
    color: "#ff0066",
    tier: 3,
  },
  flamethrower: {
    id: "flamethrower",
    name: "HEAT SINK",
    description: "Short range flame spray, burns enemies",
    fireRate: 3,
    damage: 3,
    bulletSpeed: 6,
    ammo: 150,
    maxAmmo: 150,
    reloadTime: 100,
    bulletCount: 3,
    spread: 0.5,
    explosive: false,
    explosionRadius: 0,
    cost: 900,
    unlockWave: 11,
    unlockLevel: 6,
    color: "#ff6600",
    tier: 3,
  },
  vortexCannon: {
    id: "vortexCannon",
    name: "BLACK HOLE",
    description: "Creates gravity wells that pull enemies in",
    fireRate: 50,
    damage: 35,
    bulletSpeed: 6,
    ammo: 4,
    maxAmmo: 4,
    reloadTime: 110,
    bulletCount: 1,
    spread: 0,
    explosive: true,
    explosionRadius: 120,
    cost: 950,
    unlockWave: 12,
    unlockLevel: 7,
    color: "#6600ff",
    tier: 4,
  },
  minigun: {
    id: "minigun",
    name: "THREAD RIPPER",
    description: "Extreme fire rate, massive ammo capacity",
    fireRate: 2,
    damage: 4,
    bulletSpeed: 16,
    ammo: 200,
    maxAmmo: 200,
    reloadTime: 180,
    bulletCount: 1,
    spread: 0.2,
    explosive: false,
    explosionRadius: 0,
    cost: 1000,
    unlockWave: 12,
    unlockLevel: 7,
    color: "#ff3300",
    tier: 4,
  },
  railgun: {
    id: "railgun",
    name: "QUANTUM RAIL",
    description: "Devastating piercing shot, slow but deadly",
    fireRate: 60,
    damage: 100,
    bulletSpeed: 40,
    ammo: 3,
    maxAmmo: 3,
    reloadTime: 150,
    bulletCount: 1,
    spread: 0,
    explosive: false,
    explosionRadius: 0,
    cost: 1200,
    unlockWave: 15,
    unlockLevel: 8,
    color: "#00ffaa",
    tier: 4,
  },
  nullifier: {
    id: "nullifier",
    name: "NULL POINTER",
    description: "Erases enemies from existence instantly",
    fireRate: 80,
    damage: 200,
    bulletSpeed: 50,
    ammo: 2,
    maxAmmo: 2,
    reloadTime: 200,
    bulletCount: 1,
    spread: 0,
    explosive: false,
    explosionRadius: 0,
    cost: 2000,
    unlockWave: 20,
    unlockLevel: 10,
    color: "#ffffff",
    tier: 5,
  },
  apocalypse: {
    id: "apocalypse",
    name: "SYSTEM CRASH",
    description: "Ultimate weapon - massive AOE devastation",
    fireRate: 90,
    damage: 150,
    bulletSpeed: 5,
    ammo: 3,
    maxAmmo: 3,
    reloadTime: 180,
    bulletCount: 1,
    spread: 0,
    explosive: true,
    explosionRadius: 200,
    cost: 2500,
    unlockWave: 25,
    unlockLevel: 12,
    color: "#ff0000",
    tier: 5,
  },
}

export function getWeaponsByTier(tier: number): WeaponConfig[] {
  return Object.values(WEAPONS).filter((w) => w.tier === tier)
}

export function getAvailableWeapons(wave: number, level: number, unlockedWeapons: WeaponType[]): WeaponConfig[] {
  return Object.values(WEAPONS).filter((w) => {
    if (unlockedWeapons.includes(w.id)) return true
    return w.unlockWave <= wave && w.unlockLevel <= level
  })
}

export function getTierName(tier: number): string {
  switch (tier) {
    case 1:
      return "BASIC"
    case 2:
      return "ADVANCED"
    case 3:
      return "ELITE"
    case 4:
      return "LEGENDARY"
    case 5:
      return "MYTHIC"
    default:
      return "UNKNOWN"
  }
}

export function getTierColor(tier: number): string {
  switch (tier) {
    case 1:
      return "#888888"
    case 2:
      return "#00ff00"
    case 3:
      return "#0088ff"
    case 4:
      return "#ff00ff"
    case 5:
      return "#ffaa00"
    default:
      return "#ffffff"
  }
}
