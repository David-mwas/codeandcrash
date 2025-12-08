"use client"

import type React from "react"

import { useEffect, useRef, useState, useCallback } from "react"
import { GameManager } from "@/lib/game/game-manager"
import { loadSaveData, saveSaveData, type SaveData, getDefaultSaveData } from "@/lib/game/save-data"
import { WEAPONS, type WeaponType } from "@/lib/game/weapons"
import { soundManager } from "@/lib/game/sound"

type GameState = "menu" | "onboarding" | "tutorial" | "playing" | "paused" | "shop" | "armory" | "gameover"

interface ShopItem {
  id: string
  name: string
  description: string
  cost: number
  type: "health" | "upgrade" | "ability" | "permanent"
  available: boolean
}

export function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameManagerRef = useRef<GameManager | null>(null)
  const [gameState, setGameState] = useState<GameState>("menu")
  const [isMobile, setIsMobile] = useState(false)
  const [touchControls, setTouchControls] = useState({ dx: 0, dy: 0, shooting: false })
  const joystickRef = useRef<{ startX: number; startY: number; active: boolean }>({
    startX: 0,
    startY: 0,
    active: false,
  })

  const [stats, setStats] = useState({
    health: 100,
    maxHealth: 100,
    xp: 0,
    xpToLevel: 100,
    level: 1,
    ammo: 30,
    maxAmmo: 30,
    wave: 1,
    score: 0,
    reloading: false,
    sessionXP: 0,
    enemiesKilled: 0,
    weaponName: "BYTE BLASTER",
    combo: 0,
    grenades: 3,
    maxGrenades: 5,
    shieldActive: false,
    shieldHealth: 0,
    shieldMaxHealth: 50,
    shieldCooldown: 0,
    shieldMaxCooldown: 600,
  })
  const [upgradeOptions, setUpgradeOptions] = useState<{ id: string; name: string; description: string }[]>([])
  const [activeUpgrades, setActiveUpgrades] = useState<string[]>([])
  const [unlockedFeatures, setUnlockedFeatures] = useState<string[]>([])
  const [notification, setNotification] = useState<string | null>(null)
  const [tutorialStep, setTutorialStep] = useState(0)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [saveData, setSaveData] = useState<SaveData>(getDefaultSaveData())
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [comboMessage, setComboMessage] = useState<string | null>(null)
  const [armoryTab, setArmoryTab] = useState<"weapons" | "upgrades">("weapons")

  // Check for mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 || "ontouchstart" in window
      setIsMobile(mobile)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Load save data on mount
  useEffect(() => {
    const data = loadSaveData()
    setSaveData(data)
    if (!data.onboardingComplete) {
      setGameState("onboarding")
    }
  }, [])

  const onboardingSteps = [
    {
      title: "WELCOME, PROGRAMMER",
      description: "You are about to enter corrupted cyberspace. Your mission: survive and collect code fragments.",
    },
    {
      title: "MOVEMENT",
      description: isMobile
        ? "Use the LEFT JOYSTICK to move around the battlefield."
        : "Use WASD or Arrow Keys to move around the battlefield.",
    },
    {
      title: "COMBAT",
      description: isMobile
        ? "TAP the FIRE button to shoot. AIM with the right side of screen."
        : "Click to shoot at enemies. Your cursor is your crosshair.",
    },
    {
      title: "ABILITIES",
      description: isMobile
        ? "Use ability buttons for DASH, SHIELD, and GRENADES."
        : "SHIFT to dash, Q for shield, G or Right-Click for grenades.",
    },
    {
      title: "PROGRESSION",
      description:
        "Kill enemies to earn XP. Collect code fragments for upgrades. Visit the ARMORY to unlock powerful weapons!",
    },
  ]

  const updateStats = useCallback((newStats: Partial<typeof stats>) => {
    setStats((prev) => ({ ...prev, ...newStats }))
  }, [])

  const showUpgradeMenu = useCallback((options: { id: string; name: string; description: string }[]) => {
    setUpgradeOptions(options)
    if (gameManagerRef.current) {
      gameManagerRef.current.pause()
    }
  }, [])

  const handleGameOver = useCallback(() => {
    setGameState("gameover")

    const currentSave = loadSaveData()
    const newSave: SaveData = {
      ...currentSave,
      totalXP: currentSave.totalXP + stats.sessionXP,
      highestWave: Math.max(currentSave.highestWave, stats.wave),
      highestLevel: Math.max(currentSave.highestLevel, stats.level),
      highestScore: Math.max(currentSave.highestScore, stats.score),
      gamesPlayed: currentSave.gamesPlayed + 1,
      totalEnemiesKilled: (currentSave.totalEnemiesKilled || 0) + stats.enemiesKilled,
      totalKills: (currentSave.totalKills || 0) + stats.enemiesKilled,
      highestCombo: Math.max(currentSave.highestCombo || 0, stats.combo),
    }
    saveSaveData(newSave)
    setSaveData(newSave)
  }, [stats])

  const handleFeatureUnlock = useCallback((feature: string) => {
    setUnlockedFeatures((prev) => [...prev, feature])
    setNotification(`UNLOCKED: ${feature.toUpperCase()}`)
    setTimeout(() => setNotification(null), 3000)
  }, [])

  const handlePauseChange = useCallback((paused: boolean) => {
    setGameState(paused ? "paused" : "playing")
  }, [])

  const handleCombo = useCallback((combo: number, message: string) => {
    setComboMessage(message)
    setTimeout(() => setComboMessage(null), 2000)
  }, [])

  const startGame = useCallback(
    (tutorial = false) => {
      if (!canvasRef.current) return

      const canvas = canvasRef.current
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const currentSave = loadSaveData()
      setSaveData(currentSave)

      gameManagerRef.current = new GameManager(
        canvas,
        ctx,
        updateStats,
        showUpgradeMenu,
        handleGameOver,
        handleFeatureUnlock,
        currentSave,
        tutorial,
        handlePauseChange,
        handleCombo,
        isMobile,
      )

      setGameState(tutorial ? "tutorial" : "playing")
      setTutorialStep(0)
      setActiveUpgrades([])
      setUnlockedFeatures([])
      gameManagerRef.current.start()
    },
    [updateStats, showUpgradeMenu, handleGameOver, handleFeatureUnlock, handlePauseChange, handleCombo, isMobile],
  )

  const selectUpgrade = (upgradeId: string) => {
    if (gameManagerRef.current) {
      gameManagerRef.current.applyUpgrade(upgradeId)
      setActiveUpgrades((prev) => [...prev, upgradeId])
      soundManager.powerUp()
    }
    setUpgradeOptions([])
    if (gameManagerRef.current) {
      gameManagerRef.current.resume()
    }
    setGameState("playing")
  }

  const resumeGame = () => {
    if (gameManagerRef.current) {
      gameManagerRef.current.resume()
    }
    setGameState("playing")
  }

  const openShop = () => {
    setGameState("shop")
  }

  const openArmory = () => {
    setGameState("armory")
    setArmoryTab("weapons")
  }

  const quitToMenu = () => {
    if (gameManagerRef.current) {
      const currentSave = loadSaveData()
      const newSave: SaveData = {
        ...currentSave,
        totalXP: currentSave.totalXP + stats.sessionXP,
        highestWave: Math.max(currentSave.highestWave, stats.wave),
        totalEnemiesKilled: (currentSave.totalEnemiesKilled || 0) + stats.enemiesKilled,
        totalKills: (currentSave.totalKills || 0) + stats.enemiesKilled,
      }
      saveSaveData(newSave)
      setSaveData(newSave)
      gameManagerRef.current.destroy()
      gameManagerRef.current = null
    }
    setGameState("menu")
  }

  const completeTutorial = () => {
    const newSave = { ...saveData, tutorialComplete: true }
    saveSaveData(newSave)
    setSaveData(newSave)
    if (gameManagerRef.current) {
      gameManagerRef.current.destroy()
    }
    setGameState("menu")
  }

  const completeOnboarding = () => {
    const newSave = { ...saveData, onboardingComplete: true }
    saveSaveData(newSave)
    setSaveData(newSave)
    setGameState("menu")
  }

  const toggleSound = () => {
    const newEnabled = !soundEnabled
    setSoundEnabled(newEnabled)
    soundManager.setEnabled(newEnabled)
  }

  const buyShopItem = (itemId: string, cost: number) => {
    if (saveData.totalXP < cost) return

    const newSave = { ...saveData, totalXP: saveData.totalXP - cost }

    switch (itemId) {
      case "heal25":
        if (gameManagerRef.current) {
          gameManagerRef.current.player.health = Math.min(
            gameManagerRef.current.player.health + 25,
            gameManagerRef.current.player.maxHealth,
          )
        }
        break
      case "heal50":
        if (gameManagerRef.current) {
          gameManagerRef.current.player.health = Math.min(
            gameManagerRef.current.player.health + 50,
            gameManagerRef.current.player.maxHealth,
          )
        }
        break
      case "healFull":
        if (gameManagerRef.current) {
          gameManagerRef.current.player.health = gameManagerRef.current.player.maxHealth
        }
        break
      case "ammo":
        if (gameManagerRef.current) {
          gameManagerRef.current.player.ammo = gameManagerRef.current.player.maxAmmo
          gameManagerRef.current.player.reloading = false
        }
        break
      case "grenade":
        if (
          gameManagerRef.current &&
          gameManagerRef.current.player.grenades < gameManagerRef.current.player.maxGrenades
        ) {
          gameManagerRef.current.player.grenades = Math.min(
            gameManagerRef.current.player.grenades + 2,
            gameManagerRef.current.player.maxGrenades,
          )
        }
        break
      case "shield":
        if (gameManagerRef.current) {
          gameManagerRef.current.player.activateShield()
        }
        break
      case "maxHealth":
        if (gameManagerRef.current) {
          gameManagerRef.current.player.maxHealth += 20
          gameManagerRef.current.player.health += 20
        }
        break
    }

    saveSaveData(newSave)
    setSaveData(newSave)
    soundManager.menuClick()
  }

  const buyWeapon = (weaponId: WeaponType, cost: number, isEarlyUnlock: boolean) => {
    const actualCost = isEarlyUnlock ? cost * 2 : cost
    if (saveData.totalXP < actualCost) return
    if (saveData.unlockedWeapons.includes(weaponId)) return

    const newSave = {
      ...saveData,
      totalXP: saveData.totalXP - actualCost,
      unlockedWeapons: [...saveData.unlockedWeapons, weaponId],
    }
    saveSaveData(newSave)
    setSaveData(newSave)
    soundManager.powerUp()
  }

  const equipWeapon = (weaponId: WeaponType) => {
    if (!saveData.unlockedWeapons.includes(weaponId)) return

    const newSave = { ...saveData, equippedWeapon: weaponId }
    saveSaveData(newSave)
    setSaveData(newSave)
    soundManager.menuClick()
  }

  const buyPermanentUpgrade = (upgradeId: string, cost: number) => {
    if (saveData.totalXP < cost) return

    const newSave = {
      ...saveData,
      totalXP: saveData.totalXP - cost,
      permanentUpgrades: {
        ...saveData.permanentUpgrades,
        [upgradeId]: (saveData.permanentUpgrades[upgradeId as keyof typeof saveData.permanentUpgrades] || 0) + 1,
      },
    }
    saveSaveData(newSave)
    setSaveData(newSave)
    soundManager.powerUp()
  }

  // Touch controls for mobile
  const handleTouchStart = (e: React.TouchEvent, type: string) => {
    e.preventDefault()
    if (type === "joystick") {
      const touch = e.touches[0]
      joystickRef.current = { startX: touch.clientX, startY: touch.clientY, active: true }
    } else if (type === "shoot" && gameManagerRef.current) {
      gameManagerRef.current.mouse.down = true
    } else if (type === "grenade" && gameManagerRef.current) {
      gameManagerRef.current.player.throwGrenade(gameManagerRef.current.mouse.x, gameManagerRef.current.mouse.y)
    } else if (type === "shield" && gameManagerRef.current) {
      gameManagerRef.current.player.activateShield()
    } else if (type === "dash" && gameManagerRef.current) {
      gameManagerRef.current.keys["shift"] = true
      setTimeout(() => {
        if (gameManagerRef.current) gameManagerRef.current.keys["shift"] = false
      }, 100)
    } else if (type === "reload" && gameManagerRef.current) {
      gameManagerRef.current.player.reload()
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!joystickRef.current.active) return
    e.preventDefault()
    const touch = e.touches[0]
    const dx = touch.clientX - joystickRef.current.startX
    const dy = touch.clientY - joystickRef.current.startY
    const maxDist = 50
    const dist = Math.sqrt(dx * dx + dy * dy)
    const normalizedDx = dist > maxDist ? (dx / dist) * maxDist : dx
    const normalizedDy = dist > maxDist ? (dy / dist) * maxDist : dy

    setTouchControls((prev) => ({ ...prev, dx: normalizedDx / maxDist, dy: normalizedDy / maxDist }))

    if (gameManagerRef.current) {
      gameManagerRef.current.keys["w"] = normalizedDy < -0.3
      gameManagerRef.current.keys["s"] = normalizedDy > 0.3
      gameManagerRef.current.keys["a"] = normalizedDx < -0.3
      gameManagerRef.current.keys["d"] = normalizedDx > 0.3
    }
  }

  const handleTouchEnd = (e: React.TouchEvent, type: string) => {
    if (type === "joystick") {
      joystickRef.current.active = false
      setTouchControls((prev) => ({ ...prev, dx: 0, dy: 0 }))
      if (gameManagerRef.current) {
        gameManagerRef.current.keys["w"] = false
        gameManagerRef.current.keys["s"] = false
        gameManagerRef.current.keys["a"] = false
        gameManagerRef.current.keys["d"] = false
      }
    } else if (type === "shoot" && gameManagerRef.current) {
      gameManagerRef.current.mouse.down = false
    }
  }

  const handleAimTouch = (e: React.TouchEvent) => {
    if (!gameManagerRef.current) return
    const touch = e.touches[0]
    gameManagerRef.current.mouse.x = touch.clientX
    gameManagerRef.current.mouse.y = touch.clientY
  }

  // Resize handling
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && gameManagerRef.current) {
        canvasRef.current.width = window.innerWidth
        canvasRef.current.height = window.innerHeight
        gameManagerRef.current.resize(window.innerWidth, window.innerHeight)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    return () => {
      if (gameManagerRef.current) {
        gameManagerRef.current.destroy()
      }
    }
  }, [])

  const getCursorClass = () => {
    if (isMobile) return ""
    if (gameState === "playing" || gameState === "tutorial") {
      return "cursor-none"
    }
    return ""
  }

  const getShopItems = (): ShopItem[] => {
    return [
      { id: "heal25", name: "+25 HP", description: "Restore 25 health", cost: 30, type: "health", available: true },
      {
        id: "heal50",
        name: "+50 HP",
        description: "Restore 50 health",
        cost: 50,
        type: "health",
        available: stats.wave >= 3,
      },
      {
        id: "healFull",
        name: "FULL HP",
        description: "Restore all health",
        cost: 100,
        type: "health",
        available: stats.wave >= 5,
      },
      {
        id: "ammo",
        name: "AMMO REFILL",
        description: "Refill ammo instantly",
        cost: 25,
        type: "ability",
        available: true,
      },
      { id: "grenade", name: "+2 GRENADES", description: "Add 2 grenades", cost: 60, type: "ability", available: true },
      {
        id: "shield",
        name: "SHIELD",
        description: "Activate shield now",
        cost: 80,
        type: "ability",
        available: stats.wave >= 5,
      },
      {
        id: "maxHealth",
        name: "+20 MAX HP",
        description: "Increase max health",
        cost: 150,
        type: "upgrade",
        available: stats.wave >= 7,
      },
    ]
  }

  const permanentUpgrades = [
    { id: "maxHealth", name: "MAX HEALTH", description: "+10 max health per level", costBase: 100, max: 10 },
    { id: "damage", name: "DAMAGE", description: "+10% damage per level", costBase: 150, max: 10 },
    { id: "moveSpeed", name: "MOVE SPEED", description: "+5% speed per level", costBase: 120, max: 5 },
    { id: "reloadSpeed", name: "RELOAD SPEED", description: "+10% reload speed per level", costBase: 100, max: 5 },
    { id: "grenadeCapacity", name: "GRENADE CAPACITY", description: "+1 max grenades", costBase: 200, max: 5 },
    { id: "shieldStrength", name: "SHIELD STRENGTH", description: "+20 shield HP per level", costBase: 180, max: 5 },
    { id: "critChance", name: "CRITICAL HIT", description: "+5% crit chance per level", costBase: 250, max: 5 },
    { id: "xpBonus", name: "XP BONUS", description: "+10% XP gain per level", costBase: 200, max: 5 },
  ]

  return (
    <div className={`relative w-screen h-screen overflow-hidden bg-[#0a0a0f] ${getCursorClass()}`}>
      <canvas ref={canvasRef} className="absolute inset-0" onTouchMove={handleAimTouch} />

      {/* Sound Toggle - Always visible on menu */}
      {gameState === "menu" && (
        <button
          onClick={toggleSound}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 bg-gray-800 border border-cyan-500 px-2 py-1 sm:px-3 sm:py-2 rounded-lg font-mono text-xs sm:text-sm hover:bg-gray-700 transition-all"
        >
          {soundEnabled ? "🔊" : "🔇"}
        </button>
      )}

      {/* HUD - During gameplay - Responsive */}
      {(gameState === "playing" || gameState === "tutorial" || gameState === "shop") && (
        <>
          {/* Top HUD - Responsive */}
          <div className="absolute top-2 left-2 right-2 sm:top-4 sm:left-4 sm:right-4 flex justify-between items-start z-10 pointer-events-none">
            {/* Left - Health, Shield, XP */}
            <div className="space-y-1 sm:space-y-2">
              <div className="bg-gray-900/80 border border-cyan-500 px-2 py-1 sm:px-4 sm:py-2 rounded-lg">
                <div className="flex items-center gap-1 sm:gap-3">
                  <span className="text-cyan-400 font-mono text-xs sm:text-sm">HP</span>
                  <div className="w-16 sm:w-32 md:w-48 h-2 sm:h-4 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-200"
                      style={{ width: `${(stats.health / stats.maxHealth) * 100}%` }}
                    />
                  </div>
                  <span className="text-white font-mono text-xs sm:text-sm hidden sm:inline">
                    {stats.health}/{stats.maxHealth}
                  </span>
                </div>

                {stats.shieldActive && (
                  <div className="flex items-center gap-1 sm:gap-3 mt-1">
                    <span className="text-blue-400 font-mono text-xs">SH</span>
                    <div className="w-16 sm:w-32 md:w-48 h-1.5 sm:h-3 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-200"
                        style={{ width: `${(stats.shieldHealth / stats.shieldMaxHealth) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1 sm:gap-3 mt-1">
                  <span className="text-purple-400 font-mono text-xs">XP</span>
                  <div className="w-16 sm:w-32 md:w-48 h-1.5 sm:h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-pink-400 transition-all duration-200"
                      style={{ width: `${(stats.xp / stats.xpToLevel) * 100}%` }}
                    />
                  </div>
                  <span className="text-purple-300 font-mono text-xs">L{stats.level}</span>
                </div>
              </div>
            </div>

            {/* Center - Wave, Score, Combo */}
            <div className="text-center">
              <div className="bg-gray-900/80 border border-cyan-500 px-2 py-1 sm:px-6 sm:py-2 rounded-lg">
                <div className="text-cyan-400 font-mono text-xs sm:text-lg">WAVE {stats.wave}</div>
                <div className="text-yellow-400 font-mono text-sm sm:text-2xl">{stats.score.toLocaleString()}</div>
                {stats.combo > 1 && (
                  <div className="text-orange-400 font-mono text-xs animate-pulse">{stats.combo}x</div>
                )}
              </div>
            </div>

            {/* Right - Ammo, Grenades */}
            <div className="text-right space-y-1 sm:space-y-2">
              <div className="bg-gray-900/80 border border-cyan-500 px-2 py-1 sm:px-4 sm:py-2 rounded-lg">
                <div className="text-cyan-300 font-mono text-xs hidden sm:block">{stats.weaponName}</div>
                <div className="text-white font-mono text-sm sm:text-xl">
                  {stats.reloading ? (
                    <span className="text-yellow-400 animate-pulse text-xs sm:text-base">RELOAD</span>
                  ) : (
                    <>
                      {stats.ammo}/{stats.maxAmmo}
                    </>
                  )}
                </div>
                <div className="text-orange-400 font-mono text-xs mt-0.5 sm:mt-1">
                  <span className="hidden sm:inline">GRN:</span> {stats.grenades}/{stats.maxGrenades}
                </div>
                <div className="text-green-400 font-mono text-xs">+{stats.sessionXP}</div>
              </div>
            </div>
          </div>

          {/* Desktop Controls hint - hidden on mobile */}
          {!isMobile && (
            <div className="absolute bottom-4 left-4 z-10 pointer-events-none hidden md:block">
              <div className="bg-gray-900/60 border border-gray-700 px-3 py-2 rounded-lg">
                <div className="text-gray-400 font-mono text-xs space-y-1">
                  <div>WASD - Move | SHIFT - Dash | R - Reload</div>
                  <div>Click - Shoot | Right-Click/G - Grenade | Q - Shield</div>
                  <div>TAB - Shop | ESC - Pause</div>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Touch Controls */}
          {isMobile && (gameState === "playing" || gameState === "tutorial") && (
            <>
              {/* Left Joystick */}
              <div
                className="absolute bottom-20 left-6 w-28 h-28 rounded-full bg-gray-900/60 border-2 border-cyan-500/50 z-20 flex items-center justify-center pointer-events-auto touch-none"
                onTouchStart={(e) => handleTouchStart(e, "joystick")}
                onTouchMove={handleTouchMove}
                onTouchEnd={(e) => handleTouchEnd(e, "joystick")}
              >
                <div
                  className="w-12 h-12 rounded-full bg-cyan-500/80 border-2 border-cyan-300 transition-transform"
                  style={{ transform: `translate(${touchControls.dx * 30}px, ${touchControls.dy * 30}px)` }}
                />
              </div>

              {/* Right Side - Action Buttons */}
              <div className="absolute bottom-20 right-6 z-20 flex flex-col gap-2 pointer-events-auto">
                {/* Fire Button - Large */}
                <button
                  className="w-20 h-20 rounded-full bg-red-600/80 border-2 border-red-400 flex items-center justify-center active:bg-red-500 touch-none"
                  onTouchStart={(e) => handleTouchStart(e, "shoot")}
                  onTouchEnd={(e) => handleTouchEnd(e, "shoot")}
                >
                  <span className="text-white font-mono font-bold text-sm">FIRE</span>
                </button>

                <div className="flex gap-2">
                  {/* Grenade */}
                  <button
                    className="w-14 h-14 rounded-full bg-orange-600/80 border-2 border-orange-400 flex items-center justify-center active:bg-orange-500 touch-none"
                    onTouchStart={(e) => handleTouchStart(e, "grenade")}
                  >
                    <span className="text-white font-mono text-xs">GRN</span>
                  </button>

                  {/* Shield */}
                  <button
                    className="w-14 h-14 rounded-full bg-blue-600/80 border-2 border-blue-400 flex items-center justify-center active:bg-blue-500 touch-none"
                    onTouchStart={(e) => handleTouchStart(e, "shield")}
                  >
                    <span className="text-white font-mono text-xs">SH</span>
                  </button>
                </div>
              </div>

              {/* Top Right - Dash and Reload */}
              <div className="absolute top-20 right-2 z-20 flex gap-2 pointer-events-auto">
                <button
                  className="px-3 py-2 rounded-lg bg-purple-600/80 border border-purple-400 active:bg-purple-500 touch-none"
                  onTouchStart={(e) => handleTouchStart(e, "dash")}
                >
                  <span className="text-white font-mono text-xs">DASH</span>
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-yellow-600/80 border border-yellow-400 active:bg-yellow-500 touch-none"
                  onTouchStart={(e) => handleTouchStart(e, "reload")}
                >
                  <span className="text-white font-mono text-xs">R</span>
                </button>
              </div>

              {/* Pause Button */}
              <button
                className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-4 py-1 rounded-lg bg-gray-800/80 border border-gray-600 pointer-events-auto"
                onClick={() => gameManagerRef.current?.togglePause()}
              >
                <span className="text-white font-mono text-xs">⏸ PAUSE</span>
              </button>
            </>
          )}

          {/* Active Upgrades - Responsive */}
          {activeUpgrades.length > 0 && !isMobile && (
            <div className="absolute bottom-4 right-4 z-10 pointer-events-none hidden sm:block">
              <div className="bg-gray-900/80 border border-purple-500 px-2 py-1 sm:px-3 sm:py-2 rounded-lg">
                <div className="text-purple-400 font-mono text-xs mb-1">UPGRADES</div>
                <div className="flex flex-wrap gap-1 max-w-32 sm:max-w-48">
                  {activeUpgrades.slice(-6).map((upgrade, i) => (
                    <span
                      key={i}
                      className="bg-purple-900/50 text-purple-300 px-1 sm:px-2 py-0.5 rounded text-xs font-mono truncate"
                    >
                      {upgrade.slice(0, 8)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Combo Message Overlay */}
      {comboMessage && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="text-2xl sm:text-4xl font-bold font-mono text-orange-400 animate-pulse text-center">
            {comboMessage}
          </div>
        </div>
      )}

      {/* Tutorial prompts - Responsive */}
      {gameState === "tutorial" && (
        <div className="absolute bottom-24 sm:bottom-20 left-1/2 transform -translate-x-1/2 z-20 w-11/12 max-w-md">
          <div className="bg-gray-900/90 border-2 border-cyan-400 px-4 sm:px-8 py-3 sm:py-4 rounded-lg text-center">
            {tutorialStep === 0 && (
              <>
                <p className="text-cyan-300 font-mono text-sm sm:text-lg mb-1 sm:mb-2">STEP 1: MOVEMENT</p>
                <p className="text-gray-300 font-mono text-xs sm:text-base">
                  {isMobile ? "Use the joystick on the left" : "Use WASD to move around"}
                </p>
              </>
            )}
            {tutorialStep === 1 && (
              <>
                <p className="text-cyan-300 font-mono text-sm sm:text-lg mb-1 sm:mb-2">STEP 2: SHOOTING</p>
                <p className="text-gray-300 font-mono text-xs sm:text-base">
                  {isMobile ? "Tap FIRE button to shoot!" : "Click to shoot at enemies!"}
                </p>
              </>
            )}
            {tutorialStep === 2 && (
              <>
                <p className="text-cyan-300 font-mono text-sm sm:text-lg mb-1 sm:mb-2">STEP 3: ABILITIES</p>
                <p className="text-gray-300 font-mono text-xs sm:text-base">
                  {isMobile ? "Use DASH, SHIELD, and GRENADE buttons" : "SHIFT dash, Q shield, G grenade"}
                </p>
              </>
            )}
            {stats.enemiesKilled >= 2 && (
              <button
                onClick={completeTutorial}
                className="mt-2 sm:mt-4 bg-cyan-600 hover:bg-cyan-500 text-black font-mono px-4 sm:px-6 py-1 sm:py-2 rounded-lg transition-all text-sm sm:text-base"
              >
                COMPLETE TUTORIAL
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upgrade Selection - Responsive */}
      {upgradeOptions.length > 0 && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40 p-4">
          <div className="bg-gray-900 border-2 border-purple-500 p-4 sm:p-8 rounded-lg w-full max-w-2xl">
            <h2 className="text-xl sm:text-2xl font-bold text-purple-400 font-mono mb-4 sm:mb-6 text-center">
              CODE FRAGMENT
            </h2>
            <p className="text-gray-400 font-mono mb-4 sm:mb-6 text-center text-sm sm:text-base">Select an upgrade:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
              {upgradeOptions.map((upgrade) => (
                <button
                  key={upgrade.id}
                  onClick={() => selectUpgrade(upgrade.id)}
                  className="bg-gray-800 border-2 border-purple-500 p-3 sm:p-4 rounded-lg hover:bg-purple-900/50 hover:border-purple-400 transition-all group"
                >
                  <div className="text-purple-300 font-mono font-bold text-sm sm:text-base group-hover:text-purple-200">
                    {upgrade.name}
                  </div>
                  <div className="text-gray-400 font-mono text-xs sm:text-sm mt-1 sm:mt-2 group-hover:text-gray-300">
                    {upgrade.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pause Menu - Responsive */}
      {gameState === "paused" && upgradeOptions.length === 0 && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40 p-4">
          <div className="bg-gray-900 border-2 border-cyan-500 p-6 sm:p-8 rounded-lg text-center w-full max-w-sm">
            <h2 className="text-2xl sm:text-4xl font-bold text-cyan-400 font-mono mb-6 sm:mb-8">PAUSED</h2>
            <div className="space-y-3 sm:space-y-4">
              <button
                onClick={resumeGame}
                className="block w-full bg-cyan-600 hover:bg-cyan-500 text-black font-mono text-lg sm:text-xl px-6 sm:px-8 py-2 sm:py-3 rounded-lg transition-all"
              >
                RESUME
              </button>
              <button
                onClick={openShop}
                className="block w-full bg-yellow-600 hover:bg-yellow-500 text-black font-mono text-lg sm:text-xl px-6 sm:px-8 py-2 sm:py-3 rounded-lg transition-all"
              >
                SHOP
              </button>
              <button
                onClick={quitToMenu}
                className="block w-full bg-gray-700 hover:bg-gray-600 text-white font-mono text-lg sm:text-xl px-6 sm:px-8 py-2 sm:py-3 rounded-lg transition-all"
              >
                QUIT TO MENU
              </button>
            </div>
            <p className="text-gray-500 font-mono text-xs sm:text-sm mt-4 sm:mt-6">Progress will be saved</p>
          </div>
        </div>
      )}

      {/* Shop - Responsive */}
      {gameState === "shop" && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40 p-2 sm:p-4">
          <div className="bg-gray-900 border-2 border-yellow-500 p-4 sm:p-8 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-3xl font-bold text-yellow-400 font-mono">SHOP</h2>
              <div className="text-yellow-400 font-mono text-sm sm:text-base">XP: {saveData.totalXP}</div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
              {getShopItems().map((item) => (
                <button
                  key={item.id}
                  onClick={() => buyShopItem(item.id, item.cost)}
                  disabled={!item.available || saveData.totalXP < item.cost}
                  className={`p-2 sm:p-4 rounded-lg border-2 transition-all text-left ${
                    item.available && saveData.totalXP >= item.cost
                      ? "border-yellow-500 bg-gray-800 hover:bg-yellow-900/30"
                      : "border-gray-600 bg-gray-800/50 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="text-yellow-300 font-mono font-bold text-xs sm:text-sm">{item.name}</div>
                  <div className="text-gray-400 font-mono text-xs mt-1 hidden sm:block">{item.description}</div>
                  <div className="text-yellow-400 font-mono text-xs sm:text-sm mt-1 sm:mt-2">{item.cost} XP</div>
                </button>
              ))}
            </div>

            <button
              onClick={resumeGame}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-mono text-base sm:text-xl px-6 sm:px-8 py-2 sm:py-3 rounded-lg transition-all"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* Main Menu - Responsive */}
      {gameState === "menu" && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-[#0a0a0f] to-gray-900 flex items-center justify-center p-4">
          <div className="text-center w-full max-w-md">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-cyan-400 font-mono mb-1 sm:mb-2 tracking-wider">
              CODE & CRASH
            </h1>
            <p className="text-base sm:text-xl text-purple-400 font-mono mb-6 sm:mb-8">RPG SHOOTER</p>

            <div className="bg-gray-800/50 border border-cyan-500/30 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
              <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm font-mono">
                <div className="text-gray-400">
                  TOTAL XP: <span className="text-yellow-400">{saveData.totalXP}</span>
                </div>
                <div className="text-gray-400">
                  BEST WAVE: <span className="text-cyan-400">{saveData.highestWave}</span>
                </div>
                <div className="text-gray-400">
                  BEST SCORE: <span className="text-green-400">{(saveData.highestScore || 0).toLocaleString()}</span>
                </div>
                <div className="text-gray-400">
                  KILLS: <span className="text-red-400">{saveData.totalEnemiesKilled || 0}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <button
                onClick={() => {
                  soundManager.menuClick()
                  startGame()
                }}
                className="block w-full bg-cyan-600 hover:bg-cyan-500 text-black font-mono text-lg sm:text-xl px-6 sm:px-8 py-3 sm:py-4 rounded-lg transition-all transform hover:scale-105"
              >
                START GAME
              </button>

              {!saveData.tutorialComplete && (
                <button
                  onClick={() => {
                    soundManager.menuClick()
                    startGame(true)
                  }}
                  className="block w-full bg-purple-600 hover:bg-purple-500 text-white font-mono text-base sm:text-lg px-6 sm:px-8 py-2 sm:py-3 rounded-lg transition-all"
                >
                  TUTORIAL
                </button>
              )}

              <button
                onClick={() => {
                  soundManager.menuClick()
                  openArmory()
                }}
                className="block w-full bg-yellow-600 hover:bg-yellow-500 text-black font-mono text-base sm:text-lg px-6 sm:px-8 py-2 sm:py-3 rounded-lg transition-all"
              >
                ARMORY
              </button>
            </div>

            <p className="text-gray-500 font-mono text-xs sm:text-sm mt-6 sm:mt-8">
              A rogue programmer enters corrupted cyberspace...
            </p>
          </div>
        </div>
      )}

      {/* Onboarding - Responsive */}
      {gameState === "onboarding" && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-[#0a0a0f] to-gray-900 flex items-center justify-center p-4">
          <div className="text-center w-full max-w-lg">
            <div className="bg-gray-800/80 border-2 border-cyan-500 rounded-lg p-6 sm:p-8">
              <div className="text-cyan-400 font-mono text-xs sm:text-sm mb-3 sm:mb-4">
                {onboardingStep + 1} / {onboardingSteps.length}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-cyan-300 font-mono mb-3 sm:mb-4">
                {onboardingSteps[onboardingStep].title}
              </h2>
              <p className="text-gray-300 font-mono mb-6 sm:mb-8 text-sm sm:text-base">
                {onboardingSteps[onboardingStep].description}
              </p>

              <div className="flex justify-center gap-3 sm:gap-4">
                {onboardingStep > 0 && (
                  <button
                    onClick={() => setOnboardingStep((s) => s - 1)}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-mono px-4 sm:px-6 py-2 rounded-lg transition-all text-sm sm:text-base"
                  >
                    BACK
                  </button>
                )}
                {onboardingStep < onboardingSteps.length - 1 ? (
                  <button
                    onClick={() => setOnboardingStep((s) => s + 1)}
                    className="bg-cyan-600 hover:bg-cyan-500 text-black font-mono px-4 sm:px-6 py-2 rounded-lg transition-all text-sm sm:text-base"
                  >
                    NEXT
                  </button>
                ) : (
                  <button
                    onClick={completeOnboarding}
                    className="bg-green-600 hover:bg-green-500 text-black font-mono px-4 sm:px-6 py-2 rounded-lg transition-all text-sm sm:text-base"
                  >
                    START
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Over - Responsive */}
      {gameState === "gameover" && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-4">
          <div className="text-center w-full max-w-md">
            <h2 className="text-3xl sm:text-5xl font-bold text-red-500 font-mono mb-2 sm:mb-4">SYSTEM CRASH</h2>
            <p className="text-gray-400 font-mono mb-6 sm:mb-8 text-sm sm:text-base">Connection terminated</p>

            <div className="bg-gray-800/80 border border-red-500/30 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 text-base sm:text-lg font-mono">
                <div className="text-gray-400">
                  WAVE: <span className="text-cyan-400">{stats.wave}</span>
                </div>
                <div className="text-gray-400">
                  SCORE: <span className="text-yellow-400">{stats.score.toLocaleString()}</span>
                </div>
                <div className="text-gray-400">
                  KILLS: <span className="text-red-400">{stats.enemiesKilled}</span>
                </div>
                <div className="text-gray-400">
                  XP: <span className="text-purple-400">+{stats.sessionXP}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <button
                onClick={() => {
                  soundManager.menuClick()
                  startGame()
                }}
                className="block w-full bg-cyan-600 hover:bg-cyan-500 text-black font-mono text-lg sm:text-xl px-6 sm:px-8 py-2 sm:py-3 rounded-lg transition-all"
              >
                TRY AGAIN
              </button>
              <button
                onClick={() => {
                  soundManager.menuClick()
                  setGameState("menu")
                }}
                className="block w-full bg-gray-700 hover:bg-gray-600 text-white font-mono px-6 sm:px-8 py-2 sm:py-3 rounded-lg transition-all"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Armory - Responsive with tabs */}
      {gameState === "armory" && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-[#0a0a0f] to-gray-900 flex items-center justify-center overflow-y-auto p-2 sm:p-4">
          <div className="bg-gray-900 border-2 border-cyan-500 p-4 sm:p-6 rounded-lg w-full max-w-4xl max-h-[95vh] overflow-y-auto my-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-cyan-400 font-mono">ARMORY</h2>
              <div className="text-yellow-400 font-mono text-sm sm:text-base">CREDITS: {saveData.totalXP} XP</div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4 sm:mb-6">
              <button
                onClick={() => setArmoryTab("weapons")}
                className={`px-4 py-2 rounded-lg font-mono text-sm sm:text-base transition-all ${
                  armoryTab === "weapons" ? "bg-cyan-600 text-black" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                WEAPONS
              </button>
              <button
                onClick={() => setArmoryTab("upgrades")}
                className={`px-4 py-2 rounded-lg font-mono text-sm sm:text-base transition-all ${
                  armoryTab === "upgrades" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                UPGRADES
              </button>
            </div>

            {/* Weapons Tab */}
            {armoryTab === "weapons" && (
              <>
                {[1, 2, 3, 4].map((tier) => {
                  const tierWeapons = Object.values(WEAPONS).filter((w) => w.tier === tier)
                  if (tierWeapons.length === 0) return null
                  return (
                    <div key={tier} className="mb-6">
                      <h3 className="text-lg font-bold text-gray-400 font-mono mb-3">
                        TIER {tier}{" "}
                        {tier === 1 ? "- BASIC" : tier === 2 ? "- ADVANCED" : tier === 3 ? "- ELITE" : "- LEGENDARY"}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                        {tierWeapons.map((weapon) => {
                          const owned = saveData.unlockedWeapons.includes(weapon.id)
                          const equipped = saveData.equippedWeapon === weapon.id
                          const canAfford = saveData.totalXP >= weapon.cost
                          const canAffordEarly = saveData.totalXP >= weapon.cost * 2
                          const meetsRequirements =
                            weapon.cost === 0 ||
                            (saveData.highestWave >= weapon.unlockWave && saveData.highestLevel >= weapon.unlockLevel)

                          return (
                            <div
                              key={weapon.id}
                              className={`p-3 sm:p-4 rounded-lg border-2 ${
                                equipped
                                  ? "border-cyan-400 bg-cyan-900/30"
                                  : owned
                                    ? "border-green-500 bg-green-900/20"
                                    : "border-gray-600 bg-gray-800/50"
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div
                                  className="text-sm sm:text-base font-bold font-mono"
                                  style={{ color: weapon.color }}
                                >
                                  {weapon.name}
                                </div>
                                {equipped && (
                                  <span className="text-xs bg-cyan-500 text-black px-2 py-0.5 rounded">EQUIPPED</span>
                                )}
                              </div>
                              <div className="text-gray-400 font-mono text-xs mb-2">{weapon.description}</div>
                              <div className="text-gray-500 font-mono text-xs mb-2 grid grid-cols-2 gap-1">
                                <span>DMG: {weapon.damage}</span>
                                <span>ROF: {Math.round(60 / weapon.fireRate)}/s</span>
                                <span>MAG: {weapon.ammo}</span>
                                {weapon.explosive && <span className="text-orange-400">EXPLOSIVE</span>}
                              </div>

                              {owned ? (
                                !equipped && (
                                  <button
                                    onClick={() => equipWeapon(weapon.id)}
                                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-mono py-1 sm:py-2 rounded text-xs sm:text-sm"
                                  >
                                    EQUIP
                                  </button>
                                )
                              ) : (
                                <div className="space-y-1">
                                  {!meetsRequirements && (
                                    <div className="text-yellow-500 font-mono text-xs">
                                      Requires Wave {weapon.unlockWave} / Lvl {weapon.unlockLevel}
                                    </div>
                                  )}
                                  {meetsRequirements && canAfford ? (
                                    <button
                                      onClick={() => buyWeapon(weapon.id, weapon.cost, false)}
                                      className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-mono py-1 sm:py-2 rounded text-xs sm:text-sm"
                                    >
                                      BUY - {weapon.cost} XP
                                    </button>
                                  ) : !meetsRequirements && canAffordEarly ? (
                                    <button
                                      onClick={() => buyWeapon(weapon.id, weapon.cost, true)}
                                      className="w-full bg-orange-600 hover:bg-orange-500 text-black font-mono py-1 sm:py-2 rounded text-xs sm:text-sm"
                                    >
                                      EARLY UNLOCK - {weapon.cost * 2} XP
                                    </button>
                                  ) : (
                                    <div className="text-gray-500 font-mono text-xs text-center">
                                      {meetsRequirements
                                        ? `Need ${weapon.cost} XP`
                                        : `Need ${weapon.cost * 2} XP to early unlock`}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {/* Upgrades Tab */}
            {armoryTab === "upgrades" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {permanentUpgrades.map((upgrade) => {
                  const currentLevel =
                    saveData.permanentUpgrades[upgrade.id as keyof typeof saveData.permanentUpgrades] || 0
                  const cost = upgrade.costBase + currentLevel * 50
                  const maxed = currentLevel >= upgrade.max
                  const canAfford = saveData.totalXP >= cost

                  return (
                    <div
                      key={upgrade.id}
                      className={`p-3 sm:p-4 rounded-lg border-2 ${
                        maxed ? "border-purple-500 bg-purple-900/20" : "border-gray-600 bg-gray-800/50"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-purple-300 font-mono font-bold text-sm sm:text-base">{upgrade.name}</div>
                        <div className="text-purple-400 font-mono text-xs sm:text-sm">
                          LVL {currentLevel}/{upgrade.max}
                        </div>
                      </div>
                      <div className="text-gray-400 font-mono text-xs mb-3">{upgrade.description}</div>

                      {/* Progress bar */}
                      <div className="w-full h-2 bg-gray-700 rounded-full mb-3 overflow-hidden">
                        <div
                          className="h-full bg-purple-500 transition-all"
                          style={{ width: `${(currentLevel / upgrade.max) * 100}%` }}
                        />
                      </div>

                      {maxed ? (
                        <div className="text-purple-400 font-mono text-xs sm:text-sm text-center">MAXED</div>
                      ) : (
                        <button
                          onClick={() => buyPermanentUpgrade(upgrade.id, cost)}
                          disabled={!canAfford}
                          className={`w-full font-mono py-1 sm:py-2 rounded text-xs sm:text-sm ${
                            canAfford
                              ? "bg-purple-600 hover:bg-purple-500 text-white"
                              : "bg-gray-700 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          UPGRADE - {cost} XP
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <button
              onClick={() => {
                soundManager.menuClick()
                setGameState("menu")
              }}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-mono text-base sm:text-xl px-6 sm:px-8 py-2 sm:py-3 rounded-lg transition-all mt-4 sm:mt-6"
            >
              BACK TO MENU
            </button>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-50 animate-pulse">
          <div className="bg-purple-900/90 border-2 border-purple-400 px-4 sm:px-6 py-2 sm:py-3 rounded-lg">
            <span className="text-purple-300 font-mono text-sm sm:text-base">{notification}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default Game
