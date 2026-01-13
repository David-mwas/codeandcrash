import type { WeaponType } from "./weapons"

export interface SaveData {
  totalXP: number
  highestWave: number
  highestLevel: number
  highestScore: number
  unlockedWeapons: WeaponType[]
  equippedWeapon: WeaponType
  permanentUpgrades: {
    maxHealth: number
    damage: number
    moveSpeed: number
    reloadSpeed: number
    grenadeCapacity: number
    shieldStrength: number
    critChance: number
    xpBonus: number
    armor: number
    lifesteal: number
    explosionRadius: number
    bulletPierce: number
    dashDistance: number
    luckyDrops: number
  }
  tutorialComplete: boolean
  onboardingComplete: boolean
  gamesPlayed: number
  totalEnemiesKilled: number
  totalKills: number
  totalPlayTime: number
  achievements: string[]
  highestCombo: number
}

const SAVE_KEY = "code-crash-save-data"

export function getDefaultSaveData(): SaveData {
  return {
    totalXP: 0,
    highestWave: 0,
    highestLevel: 0,
    highestScore: 0,
    unlockedWeapons: ["pistol"],
    equippedWeapon: "pistol",
    permanentUpgrades: {
      maxHealth: 0,
      damage: 0,
      moveSpeed: 0,
      reloadSpeed: 0,
      grenadeCapacity: 0,
      shieldStrength: 0,
      critChance: 0,
      xpBonus: 0,
      armor: 0,
      lifesteal: 0,
      explosionRadius: 0,
      bulletPierce: 0,
      dashDistance: 0,
      luckyDrops: 0,
    },
    tutorialComplete: false,
    onboardingComplete: false,
    gamesPlayed: 0,
    totalEnemiesKilled: 0,
    totalKills: 0,
    totalPlayTime: 0,
    achievements: [],
    highestCombo: 0,
  }
}

export function loadSaveData(): SaveData {
  if (typeof window === "undefined") return getDefaultSaveData()

  try {
    const saved = localStorage.getItem(SAVE_KEY)
    if (saved) {
      const data = JSON.parse(saved) as Partial<SaveData>
      const defaults = getDefaultSaveData()
      const merged: SaveData = {
        ...defaults,
        ...data,
        permanentUpgrades: {
          ...defaults.permanentUpgrades,
          ...(data.permanentUpgrades || {}),
        },
      }
      merged.totalKills = merged.totalKills || merged.totalEnemiesKilled || 0
      merged.totalEnemiesKilled = merged.totalEnemiesKilled || merged.totalKills || 0
      return merged
    }
  } catch (e) {
    console.error("Failed to load save data:", e)
  }
  return getDefaultSaveData()
}

export function saveSaveData(data: SaveData): void {
  if (typeof window === "undefined") return

  try {
    data.totalEnemiesKilled = data.totalKills || data.totalEnemiesKilled || 0
    data.totalKills = data.totalEnemiesKilled
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error("Failed to save data:", e)
  }
}

export function resetSaveData(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(SAVE_KEY)
}
