"use client";

import type React from "react";

import { useEffect, useRef, useState, useCallback } from "react";
import { GameManager } from "@/lib/game/game-manager";
import {
  loadSaveData,
  saveSaveData,
  getDefaultSaveData,
  type SaveData,
} from "@/lib/game/save-data";
import {
  WEAPONS,
  type WeaponType,
  getTierName,
  getTierColor,
} from "@/lib/game/weapons";
import { soundManager } from "@/lib/game/sound";

type GameState =
  | "menu"
  | "playing"
  | "paused"
  | "gameover"
  | "shop"
  | "tutorial"
  | "onboarding"
  | "armory";

const PERMANENT_UPGRADES = [
  { id: "maxHealth", name: "MAX HEALTH", desc: "+20 HP", cost: 150, max: 10 },
  { id: "damage", name: "DAMAGE", desc: "+10% Damage", cost: 200, max: 10 },
  { id: "moveSpeed", name: "MOVE SPEED", desc: "+8% Speed", cost: 175, max: 8 },
  {
    id: "reloadSpeed",
    name: "RELOAD SPEED",
    desc: "+12% Faster",
    cost: 180,
    max: 8,
  },
  {
    id: "grenadeCapacity",
    name: "GRENADE CAP",
    desc: "+1 Grenade",
    cost: 200,
    max: 5,
  },
  {
    id: "shieldStrength",
    name: "SHIELD",
    desc: "+15 Shield HP",
    cost: 220,
    max: 8,
  },
  {
    id: "critChance",
    name: "CRIT CHANCE",
    desc: "+5% Crit",
    cost: 250,
    max: 10,
  },
  { id: "xpBonus", name: "XP BONUS", desc: "+10% XP", cost: 200, max: 10 },
  { id: "armor", name: "ARMOR", desc: "-5% Damage Taken", cost: 225, max: 10 },
  {
    id: "lifesteal",
    name: "LIFESTEAL",
    desc: "+2% Life on Hit",
    cost: 300,
    max: 5,
  },
  {
    id: "explosionRadius",
    name: "BLAST RADIUS",
    desc: "+15% AOE",
    cost: 250,
    max: 6,
  },
  { id: "bulletPierce", name: "PIERCE", desc: "+1 Pierce", cost: 350, max: 3 },
  {
    id: "dashDistance",
    name: "DASH RANGE",
    desc: "+15% Distance",
    cost: 200,
    max: 5,
  },
  { id: "luckyDrops", name: "LUCK", desc: "+8% Drop Rate", cost: 275, max: 8 },
];

export function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameManagerRef = useRef<GameManager | null>(null);
  const animationFrameRef = useRef<number>();

  const [gameState, setGameState] = useState<GameState>("menu");
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);
  const [touchControls, setTouchControls] = useState({
    dx: 0,
    dy: 0,
    shooting: false,
  });
  const joystickRef = useRef<{
    startX: number;
    startY: number;
    active: boolean;
  }>({
    startX: 0,
    startY: 0,
    active: false,
  });

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
  });
  const [upgradeOptions, setUpgradeOptions] = useState<
    { id: string; name: string; description: string }[]
  >([]);
  const [activeUpgrades, setActiveUpgrades] = useState<string[]>([]);
  const [unlockedFeatures, setUnlockedFeatures] = useState<string[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [saveData, setSaveData] = useState<SaveData>(getDefaultSaveData());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [comboMessage, setComboMessage] = useState<string | null>(null);
  const [armoryTab, setArmoryTab] = useState<"weapons" | "upgrades">("weapons");

  useEffect(() => {
    const checkDevice = () => {
      const mobile = window.innerWidth < 1024 || "ontouchstart" in window;
      const landscape = window.innerWidth > window.innerHeight;
      setIsMobile(mobile);
      setIsLandscape(landscape);
    };
    checkDevice();
    window.addEventListener("resize", checkDevice);
    window.addEventListener("orientationchange", () => {
      setTimeout(checkDevice, 100);
    });
    return () => {
      window.removeEventListener("resize", checkDevice);
      window.removeEventListener("orientationchange", checkDevice);
    };
  }, []);

  // Load save data on mount
  useEffect(() => {
    const data = loadSaveData();
    setSaveData(data);
    if (!data.onboardingComplete) {
      setGameState("onboarding");
    }
  }, []);

  const getCursorClass = () => {
    if (gameState === "playing" || gameState === "tutorial") {
      return "cursor-none";
    }
    return "cursor-auto";
  };

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    soundManager.setEnabled(newState);
  };

  // Game callbacks
  const handleStatsUpdate = useCallback((newStats: Partial<typeof stats>) => {
    setStats((prev) => ({ ...prev, ...newStats }));
  }, []);

  const handleUpgradeSelection = useCallback(
    (options: { id: string; name: string; description: string }[]) => {
      setUpgradeOptions(options);
    },
    []
  );

  const handleUpgradeApplied = useCallback(() => {
    setActiveUpgrades((prev) => [...prev]);
    setUpgradeOptions([]);
  }, []);

  const handleFeatureUnlock = useCallback((feature: string) => {
    setUnlockedFeatures((prev) => [...prev, feature]);
    setNotification(`UNLOCKED: ${feature}`);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const handleGameOver = useCallback(() => {
    setGameState("gameover");
    if (gameManagerRef.current) {
      const gm = gameManagerRef.current;
      setSaveData((prev) => {
        const newData = {
          ...prev,
          totalXP: prev.totalXP + gm.sessionXP,
          highestWave: Math.max(prev.highestWave, gm.wave),
          highestLevel: Math.max(prev.highestLevel, gm.player.level),
          highestScore: Math.max(prev.highestScore, gm.score),
          gamesPlayed: prev.gamesPlayed + 1,
          totalEnemiesKilled:
            prev.totalEnemiesKilled + gm.enemiesKilledThisSession,
          totalKills: prev.totalKills + gm.enemiesKilledThisSession,
          highestCombo: Math.max(prev.highestCombo || 0, gm.highestCombo || 0),
        };
        saveSaveData(newData);
        return newData;
      });
    }
  }, []);

  const handleTutorialStep = useCallback((step: number) => {
    setTutorialStep(step);
    if (step >= 5) {
      setSaveData((prev) => {
        const newData = { ...prev, tutorialComplete: true };
        saveSaveData(newData);
        return newData;
      });
      setGameState("menu");
    }
  }, []);

  const handleCombo = useCallback((combo: number) => {
    if (combo >= 5) {
      const messages = [
        "MULTI KILL!",
        "DOMINATING!",
        "RAMPAGE!",
        "GODLIKE!",
        "UNSTOPPABLE!",
      ];
      const index = Math.min(Math.floor((combo - 5) / 5), messages.length - 1);
      setComboMessage(messages[index]);
      setTimeout(() => setComboMessage(null), 1500);
    }
  }, []);

  const handleShopOpen = useCallback(() => {
    setGameState("shop");
    if (gameManagerRef.current) {
      gameManagerRef.current.pause();
    }
  }, []);

  const handlePauseToggle = useCallback((isPaused: boolean) => {
    if (isPaused) {
      setGameState("paused");
    } else {
      setGameState("playing");
    }
  }, []);

  // Initialize game
  const initGame = useCallback(
    (isTutorial = false) => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      gameManagerRef.current = new GameManager(canvas, saveData, {
        onStatsUpdate: handleStatsUpdate,
        onUpgradeSelection: handleUpgradeSelection,
        onUpgradeApplied: handleUpgradeApplied,
        onFeatureUnlock: handleFeatureUnlock,
        onGameOver: handleGameOver,
        onTutorialStep: handleTutorialStep,
        onCombo: handleCombo,
        onShopOpen: handleShopOpen,
        onPauseToggle: handlePauseToggle,
      });

      if (isTutorial) {
        gameManagerRef.current.startTutorial();
        setGameState("tutorial");
      } else {
        gameManagerRef.current.start();
        setGameState("playing");
      }
    },
    [
      saveData,
      handleStatsUpdate,
      handleUpgradeSelection,
      handleUpgradeApplied,
      handleFeatureUnlock,
      handleGameOver,
      handleTutorialStep,
      handleCombo,
      handleShopOpen,
      handlePauseToggle,
    ]
  );

  // Touch controls for mobile
  const handleTouchStart = (e: React.TouchEvent, type: string) => {
    e.preventDefault();
    if (type === "joystick") {
      const touch = e.touches[0];
      joystickRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        active: true,
      };
    } else if (type === "shoot" && gameManagerRef.current) {
      gameManagerRef.current.mouse.down = true;
    } else if (type === "grenade" && gameManagerRef.current) {
      gameManagerRef.current.player.throwGrenade(
        gameManagerRef.current.mouse.x,
        gameManagerRef.current.mouse.y
      );
    } else if (type === "shield" && gameManagerRef.current) {
      gameManagerRef.current.player.activateShield();
    } else if (type === "dash" && gameManagerRef.current) {
      gameManagerRef.current.keys["shift"] = true;
      setTimeout(() => {
        if (gameManagerRef.current)
          gameManagerRef.current.keys["shift"] = false;
      }, 100);
    } else if (type === "reload" && gameManagerRef.current) {
      gameManagerRef.current.player.reload();
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!joystickRef.current.active) return;
    e.preventDefault();
    const touch = e.touches[0];
    const dx = touch.clientX - joystickRef.current.startX;
    const dy = touch.clientY - joystickRef.current.startY;
    const maxDist = 50;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const normalizedDx = dist > maxDist ? (dx / dist) * maxDist : dx;
    const normalizedDy = dist > maxDist ? (dy / dist) * maxDist : dy;

    setTouchControls((prev) => ({
      ...prev,
      dx: normalizedDx / maxDist,
      dy: normalizedDy / maxDist,
    }));

    if (gameManagerRef.current) {
      gameManagerRef.current.keys["w"] = normalizedDy < -0.3;
      gameManagerRef.current.keys["s"] = normalizedDy > 0.3;
      gameManagerRef.current.keys["a"] = normalizedDx < -0.3;
      gameManagerRef.current.keys["d"] = normalizedDx > 0.3;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, type: string) => {
    if (type === "joystick") {
      joystickRef.current.active = false;
      setTouchControls((prev) => ({ ...prev, dx: 0, dy: 0 }));
      if (gameManagerRef.current) {
        gameManagerRef.current.keys["w"] = false;
        gameManagerRef.current.keys["s"] = false;
        gameManagerRef.current.keys["a"] = false;
        gameManagerRef.current.keys["d"] = false;
      }
    } else if (type === "shoot" && gameManagerRef.current) {
      gameManagerRef.current.mouse.down = false;
    }
  };

  const handleAimTouch = (e: React.TouchEvent) => {
    if (!gameManagerRef.current) return;
    const touch = e.touches[0];
    gameManagerRef.current.mouse.x = touch.clientX;
    gameManagerRef.current.mouse.y = touch.clientY;
  };

  // Resize handling
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && gameManagerRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        gameManagerRef.current.resize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Select upgrade
  const selectUpgrade = (upgradeId: string) => {
    if (gameManagerRef.current) {
      gameManagerRef.current.applyUpgrade(upgradeId);
      soundManager.powerUp();
    }
  };

  // Shop purchase
  const buyShopItem = (item: string) => {
    if (!gameManagerRef.current) return;
    const gm = gameManagerRef.current;
    const costs: Record<string, number> = {
      health: 50,
      ammo: 30,
      shield: 60,
      grenade: 60,
      maxHealth: 100,
    };
    const cost = costs[item] || 0;
    if (saveData.totalXP + gm.sessionXP < cost) return;

    soundManager.menuClick();

    setSaveData((prev) => {
      let newXP = prev.totalXP;
      const sessionXP = gm.sessionXP;

      if (sessionXP >= cost) {
        gm.sessionXP -= cost;
      } else {
        const remaining = cost - sessionXP;
        gm.sessionXP = 0;
        newXP -= remaining;
      }

      const newData = { ...prev, totalXP: newXP };
      saveSaveData(newData);
      return newData;
    });

    if (item === "health")
      gm.player.health = Math.min(gm.player.health + 30, gm.player.maxHealth);
    else if (item === "ammo") gm.player.ammo = gm.player.maxAmmo;
    else if (item === "shield") gm.player.activateShield();
    else if (item === "grenade")
      gm.player.grenades = Math.min(
        gm.player.grenades + 2,
        gm.player.maxGrenades
      );
    else if (item === "maxHealth") gm.player.maxHealth += 10;

    handleStatsUpdate({
      health: gm.player.health,
      maxHealth: gm.player.maxHealth,
      xp: gm.player.xp,
      xpToLevel: gm.player.xpToLevel,
      level: gm.player.level,
      ammo: gm.player.ammo,
      maxAmmo: gm.player.maxAmmo,
      wave: gm.wave,
      score: gm.score,
      reloading: gm.player.reloading,
      sessionXP: gm.sessionXP,
      enemiesKilled: gm.enemiesKilledThisSession,
      weaponName: gm.player.currentWeapon?.name || "BYTE BLASTER",
      combo: gm.highestCombo || 0,
      grenades: gm.player.grenades,
      maxGrenades: gm.player.maxGrenades,
      shieldActive: gm.player.shieldActive,
      shieldHealth: gm.player.shieldHealth,
      shieldMaxHealth: gm.player.shieldMaxHealth,
      shieldCooldown: gm.player.shieldCooldown,
      shieldMaxCooldown: gm.player.shieldMaxCooldown,
    });
  };

  // Buy weapon
  const buyWeapon = (weaponId: WeaponType) => {
    const weapon = WEAPONS[weaponId];
    if (!weapon) return;

    const isUnlocked = saveData.unlockedWeapons.includes(weaponId);
    if (isUnlocked) {
      equipWeapon(weaponId);
      return;
    }

    const meetsRequirements =
      weapon.unlockWave <= saveData.highestWave &&
      weapon.unlockLevel <= saveData.highestLevel;
    const cost = meetsRequirements ? weapon.cost : weapon.cost * 2;

    if (saveData.totalXP < cost) return;

    soundManager.menuClick();
    setSaveData((prev) => {
      const newData = {
        ...prev,
        totalXP: prev.totalXP - cost,
        unlockedWeapons: [...prev.unlockedWeapons, weaponId],
        equippedWeapon: weaponId,
      };
      saveSaveData(newData);
      return newData;
    });
  };

  const equipWeapon = (weaponId: WeaponType) => {
    soundManager.menuClick();
    setSaveData((prev) => {
      const newData = { ...prev, equippedWeapon: weaponId };
      saveSaveData(newData);
      return newData;
    });
  };

  // Buy permanent upgrade
  const buyPermanentUpgrade = (upgradeId: string) => {
    const upgrade = PERMANENT_UPGRADES.find((u) => u.id === upgradeId);
    if (!upgrade) return;

    const currentLevel =
      saveData.permanentUpgrades[
        upgradeId as keyof typeof saveData.permanentUpgrades
      ] || 0;
    if (currentLevel >= upgrade.max) return;

    const cost = upgrade.cost * (currentLevel + 1);
    if (saveData.totalXP < cost) return;

    soundManager.menuClick();
    setSaveData((prev) => {
      const newData = {
        ...prev,
        totalXP: prev.totalXP - cost,
        permanentUpgrades: {
          ...prev.permanentUpgrades,
          [upgradeId]: currentLevel + 1,
        },
      };
      saveSaveData(newData);
      return newData;
    });
  };

  // Onboarding
  const nextOnboardingStep = () => {
    if (onboardingStep < 4) {
      setOnboardingStep(onboardingStep + 1);
    } else {
      setSaveData((prev) => {
        const newData = { ...prev, onboardingComplete: true };
        saveSaveData(newData);
        return newData;
      });
      setGameState("menu");
    }
  };

  // Quit to menu
  const quitToMenu = () => {
    if (gameManagerRef.current) {
      const gm = gameManagerRef.current;
      setSaveData((prev) => {
        const newData = {
          ...prev,
          totalXP: prev.totalXP + gm.sessionXP,
          highestWave: Math.max(prev.highestWave, gm.wave),
          highestLevel: Math.max(prev.highestLevel, gm.player.level),
          highestScore: Math.max(prev.highestScore, gm.score),
          totalEnemiesKilled:
            prev.totalEnemiesKilled + gm.enemiesKilledThisSession,
          totalKills: prev.totalKills + gm.enemiesKilledThisSession,
        };
        saveSaveData(newData);
        return newData;
      });
      gm.stop();
    }
    setActiveUpgrades([]);
    setUpgradeOptions([]);
    setGameState("menu");
  };

  const closeShop = () => {
    setGameState("playing");
    if (gameManagerRef.current) {
      gameManagerRef.current.resume();
    }
  };

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden bg-[#0a0a0f] ${getCursorClass()}`}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onTouchMove={handleAimTouch}
      />

      {/* Sound Toggle - Always visible on menu */}
      {gameState === "menu" && (
        <button
          onClick={toggleSound}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 bg-gray-800 border border-cyan-500 px-2 py-1 sm:px-3 sm:py-2 rounded-lg font-mono text-xs sm:text-sm hover:bg-gray-700 transition-all"
        >
          {soundEnabled ? "SOUND ON" : "SOUND OFF"}
        </button>
      )}

      {/* HUD - During gameplay - Responsive for both orientations */}
      {(gameState === "playing" ||
        gameState === "tutorial" ||
        gameState === "shop") && (
        <>
          <div
            className={`absolute z-10 pointer-events-none ${
              isLandscape
                ? "top-2 left-2 right-2 flex justify-between items-start"
                : "top-2 left-2 right-2 flex flex-col gap-1"
            }`}
          >
            {/* Left - Health, Shield, XP */}
            <div className={`${isLandscape ? "" : "w-full"}`}>
              <div className="bg-gray-900/90 border border-red-500 px-2 py-1 sm:px-4 sm:py-2 rounded-lg">
                <div className="text-red-400 font-mono text-xs sm:text-sm mb-1">
                  HP: {Math.round(stats.health)}/{stats.maxHealth}
                </div>
                <div className="w-32 sm:w-48 h-2 sm:h-3 bg-gray-800 rounded-full overflow-hidden border border-red-900">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all"
                    style={{
                      width: `${Math.max(
                        0,
                        (stats.health / stats.maxHealth) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Center - Wave, Score, Combo */}
            <div
              className={`${
                isLandscape ? "text-center" : "flex justify-center"
              }`}
            >
              <div className="bg-gray-900/90 border border-cyan-500 px-2 py-1 sm:px-4 sm:py-2 rounded-lg">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="text-cyan-400 font-mono text-xs sm:text-sm">
                    WAVE {stats.wave}
                  </div>
                  <div className="text-yellow-400 font-mono text-sm sm:text-lg font-bold">
                    {stats.score.toLocaleString()}
                  </div>
                  {stats.combo > 1 && (
                    <div className="text-orange-400 font-mono text-xs animate-pulse">
                      {stats.combo}x
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right - Ammo, Grenades (landscape only) */}
            {isLandscape && (
              <div className="text-right">
                <div className="bg-gray-900/90 border border-cyan-500 px-1.5 py-1 sm:px-3 sm:py-2 rounded-lg">
                  <div className="text-cyan-300 font-mono text-[10px] sm:text-xs hidden sm:block">
                    {stats.weaponName}
                  </div>
                  <div className="text-white font-mono text-sm sm:text-lg">
                    {stats.reloading ? (
                      <span className="text-yellow-400 animate-pulse text-xs">
                        RELOAD
                      </span>
                    ) : (
                      <>
                        {stats.ammo}/{stats.maxAmmo}
                      </>
                    )}
                  </div>
                  <div className="text-orange-400 font-mono text-[10px] sm:text-xs">
                    GRN: {stats.grenades}/{stats.maxGrenades}
                  </div>
                  <div className="text-green-400 font-mono text-[10px]">
                    +{stats.sessionXP} XP
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Controls hint */}
          {!isMobile && gameManagerRef.current && (
            <div className="absolute bottom-4 left-4 z-10 pointer-events-none hidden lg:block">
              <div className="bg-gray-900/60 border border-gray-700 px-3 py-2 rounded-lg">
                <div className="text-gray-400 font-mono text-xs space-y-1">
                  <div>WASD - Move | SHIFT - Dash | R - Reload</div>
                  <div>
                    Click - Shoot | Right-Click/G - Grenade | Q - Shield
                  </div>
                  <div>TAB - Shop | ESC - Pause</div>
                </div>
              </div>
            </div>
          )}

          {isMobile &&
            (gameState === "playing" || gameState === "tutorial") && (
              <>
                {/* Left Joystick - Position adapts to orientation */}
                <div
                  className={`absolute z-20 flex items-center justify-center pointer-events-auto touch-none rounded-full bg-gray-900/60 border-2 border-cyan-500/50 ${
                    isLandscape
                      ? "bottom-8 left-4 w-24 h-24 sm:w-28 sm:h-28"
                      : "bottom-28 left-4 w-20 h-20"
                  }`}
                  onTouchStart={(e) => handleTouchStart(e, "joystick")}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={(e) => handleTouchEnd(e, "joystick")}
                >
                  <div
                    className={`rounded-full bg-cyan-500/80 border-2 border-cyan-300 transition-transform ${
                      isLandscape ? "w-10 h-10 sm:w-12 sm:h-12" : "w-8 h-8"
                    }`}
                    style={{
                      transform: `translate(${touchControls.dx * 25}px, ${
                        touchControls.dy * 25
                      }px)`,
                    }}
                  />
                </div>

                {/* Right Side - Action Buttons - Layout adapts to orientation */}
                <div
                  className={`absolute z-20 pointer-events-auto ${
                    isLandscape
                      ? "bottom-8 right-4 flex flex-col gap-2"
                      : "bottom-28 right-4 flex flex-col gap-1"
                  }`}
                >
                  {/* Fire Button */}
                  <button
                    className={`rounded-full bg-red-600/80 border-2 border-red-400 flex items-center justify-center active:bg-red-500 touch-none ${
                      isLandscape ? "w-16 h-16 sm:w-20 sm:h-20" : "w-14 h-14"
                    }`}
                    onTouchStart={(e) => handleTouchStart(e, "shoot")}
                    onTouchEnd={(e) => handleTouchEnd(e, "shoot")}
                  >
                    <span
                      className={`text-white font-mono font-bold ${
                        isLandscape ? "text-xs sm:text-sm" : "text-[10px]"
                      }`}
                    >
                      FIRE
                    </span>
                  </button>

                  <div className="flex gap-1 sm:gap-2 justify-end">
                    {/* Grenade */}
                    <button
                      className={`rounded-full bg-orange-600/80 border-2 border-orange-400 flex items-center justify-center active:bg-orange-500 touch-none ${
                        isLandscape ? "w-10 h-10 sm:w-12 sm:h-12" : "w-9 h-9"
                      }`}
                      onTouchStart={(e) => handleTouchStart(e, "grenade")}
                    >
                      <span className="text-white font-mono text-[10px]">
                        G
                      </span>
                    </button>

                    {/* Shield */}
                    <button
                      className={`rounded-full bg-blue-600/80 border-2 border-blue-400 flex items-center justify-center active:bg-blue-500 touch-none ${
                        isLandscape ? "w-10 h-10 sm:w-12 sm:h-12" : "w-9 h-9"
                      }`}
                      onTouchStart={(e) => handleTouchStart(e, "shield")}
                    >
                      <span className="text-white font-mono text-[10px]">
                        S
                      </span>
                    </button>
                  </div>
                </div>

                {/* Top action buttons - Dash and Reload */}
                <div
                  className={`absolute z-20 flex gap-1 sm:gap-2 pointer-events-auto ${
                    isLandscape ? "top-16 right-2" : "top-24 right-2"
                  }`}
                >
                  <button
                    className="px-2 py-1 sm:px-3 sm:py-2 rounded-lg bg-purple-600/80 border border-purple-400 active:bg-purple-500 touch-none"
                    onTouchStart={(e) => handleTouchStart(e, "dash")}
                  >
                    <span className="text-white font-mono text-[10px] sm:text-xs">
                      DASH
                    </span>
                  </button>
                  <button
                    className="px-2 py-1 sm:px-3 sm:py-2 rounded-lg bg-yellow-600/80 border border-yellow-400 active:bg-yellow-500 touch-none"
                    onTouchStart={(e) => handleTouchStart(e, "reload")}
                  >
                    <span className="text-white font-mono text-[10px] sm:text-xs">
                      R
                    </span>
                  </button>
                </div>

                {/* Shop/Pause button for mobile */}
                <div
                  className={`absolute z-20 flex gap-1 pointer-events-auto ${
                    isLandscape
                      ? "top-2 left-1/2 -translate-x-1/2"
                      : "top-2 right-16"
                  }`}
                >
                  <button
                    className="px-2 py-1 rounded bg-gray-800/80 border border-gray-600"
                    onClick={handlePauseToggle}
                  >
                    <span className="text-white font-mono text-[10px]">II</span>
                  </button>
                </div>
              </>
            )}

          {/* Game HUD - Only show during gameplay or tutorial */}
          {(gameState === "playing" || gameState === "tutorial") && (
            <div
              className={`absolute top-0 left-0 right-0 z-20 ${
                isLandscape ? "p-2 sm:p-3" : "p-1 sm:p-2"
              } font-mono text-xs sm:text-sm`}
            >
              {/* Pause button */}
              <button
                onClick={() => {
                  if (gameManagerRef.current)
                    gameManagerRef.current.togglePause();
                }}
                className="fixed top-2 right-2 sm:top-4 sm:right-4 bg-gray-700 hover:bg-gray-600 px-2 sm:px-3 py-1 sm:py-2 rounded font-mono text-xs sm:text-sm z-50 transition-all"
                title="Press ESC to pause"
              >
                PAUSE (ESC)
              </button>
            </div>
          )}

          {/* Combo Message */}
          {comboMessage && (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
              <div className="text-orange-400 font-mono text-xl sm:text-3xl md:text-4xl font-bold animate-bounce text-center">
                {comboMessage}
              </div>
            </div>
          )}

          {/* Custom Crosshair - Desktop Only */}
          {!isMobile && gameManagerRef.current && (
            <div
              className="fixed pointer-events-none z-50"
              style={{
                left: gameManagerRef.current.mouse.x,
                top: gameManagerRef.current.mouse.y,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="w-4 h-4 sm:w-6 sm:h-6 border-2 border-cyan-400 rounded-full opacity-80" />
              <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-cyan-400 rounded-full -translate-x-1/2 -translate-y-1/2" />
            </div>
          )}
        </>
      )}

      {/* Upgrade Selection */}
      {upgradeOptions.length > 0 && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-40 p-2 sm:p-4">
          <div className="bg-gray-900 border-2 border-cyan-500 rounded-xl p-3 sm:p-6 max-w-md w-full mx-2">
            <h2 className="text-cyan-400 font-mono text-lg sm:text-2xl text-center mb-3 sm:mb-4">
              CODE FRAGMENT
            </h2>
            <p className="text-gray-400 font-mono text-xs sm:text-sm text-center mb-4">
              Select an upgrade:
            </p>
            <div className="space-y-2 sm:space-y-3 max-h-[50vh] overflow-y-auto">
              {upgradeOptions.map((upgrade) => (
                <button
                  key={upgrade.id}
                  onClick={() => selectUpgrade(upgrade.id)}
                  className="w-full bg-gray-800 border border-cyan-500/50 hover:border-cyan-400 p-2 sm:p-4 rounded-lg transition-all text-left"
                >
                  <div className="text-cyan-300 font-mono text-sm sm:text-lg">
                    {upgrade.name}
                  </div>
                  <div className="text-gray-400 font-mono text-xs sm:text-sm">
                    {upgrade.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Shop Modal */}
      {gameState === "shop" && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40 p-2 sm:p-4">
          <div className="bg-gray-900 border-2 border-cyan-500 rounded-xl p-3 sm:p-6 max-w-sm w-full mx-2 max-h-[90vh] overflow-y-auto">
            <h2 className="text-cyan-400 font-mono text-lg sm:text-2xl text-center mb-2">
              CYBER SHOP
            </h2>
            <p className="text-green-400 font-mono text-center mb-3 text-sm">
              XP: {saveData.totalXP + (gameManagerRef.current?.sessionXP || 0)}
            </p>

            <div className="space-y-2 sm:space-y-3">
              {[
                { id: "health", name: "REPAIR +30 HP", cost: 50, icon: "+" },
                { id: "ammo", name: "AMMO REFILL", cost: 30, icon: "A" },
                { id: "shield", name: "SHIELD", cost: 60, icon: "S" },
                { id: "grenade", name: "+2 GRENADES", cost: 60, icon: "G" },
                { id: "maxHealth", name: "+10 MAX HP", cost: 100, icon: "M" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => buyShopItem(item.id)}
                  disabled={
                    saveData.totalXP +
                      (gameManagerRef.current?.sessionXP || 0) <
                    item.cost
                  }
                  className="w-full bg-gray-800 border border-cyan-500/50 hover:border-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed p-2 sm:p-3 rounded-lg transition-all flex justify-between items-center"
                >
                  <span className="text-cyan-300 font-mono text-xs sm:text-sm">
                    {item.name}
                  </span>
                  <span className="text-yellow-400 font-mono text-xs sm:text-sm">
                    {item.cost} XP
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={closeShop}
              className="w-full mt-4 bg-red-600 hover:bg-red-500 px-4 py-2 sm:py-3 rounded-lg font-mono text-sm sm:text-base transition-all"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* Pause Menu */}
      {gameState === "paused" && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-gray-900 border-2 border-cyan-500 rounded-xl p-4 sm:p-8 max-w-xs sm:max-w-sm w-full mx-2 text-center">
            <h2 className="text-cyan-400 font-mono text-xl sm:text-3xl mb-4 sm:mb-6">
              PAUSED
            </h2>

            <div className="space-y-2 sm:space-y-3">
              <button
                onClick={() => {
                  setGameState("playing");
                  if (gameManagerRef.current) gameManagerRef.current.resume();
                }}
                className="w-full bg-cyan-600 hover:bg-cyan-500 px-4 py-2 sm:py-3 rounded-lg font-mono text-sm sm:text-base transition-all"
              >
                RESUME
              </button>
              <button
                onClick={() => {
                  setGameState("shop");
                  if (gameManagerRef.current) gameManagerRef.current.pause();
                }}
                className="w-full bg-green-600 hover:bg-green-500 px-4 py-2 sm:py-3 rounded-lg font-mono text-sm sm:text-base transition-all"
              >
                SHOP
              </button>
              <button
                onClick={quitToMenu}
                className="w-full bg-red-600 hover:bg-red-500 px-4 py-2 sm:py-3 rounded-lg font-mono text-sm sm:text-base transition-all"
              >
                QUIT TO MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === "gameover" && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-gray-900 border-2 border-red-500 rounded-xl p-4 sm:p-8 max-w-sm sm:max-w-md w-full mx-2 text-center max-h-[90vh] overflow-y-auto">
            <h2 className="text-red-500 font-mono text-2xl sm:text-4xl mb-4 sm:mb-6">
              SYSTEM CRASH
            </h2>

            <div className="space-y-2 mb-4 sm:mb-6 text-sm sm:text-base">
              <div className="flex justify-between text-gray-400 font-mono">
                <span>WAVE</span>
                <span className="text-cyan-400">{stats.wave}</span>
              </div>
              <div className="flex justify-between text-gray-400 font-mono">
                <span>SCORE</span>
                <span className="text-yellow-400">
                  {stats.score.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-gray-400 font-mono">
                <span>XP EARNED</span>
                <span className="text-green-400">+{stats.sessionXP}</span>
              </div>
              <div className="flex justify-between text-gray-400 font-mono">
                <span>ENEMIES</span>
                <span className="text-orange-400">{stats.enemiesKilled}</span>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <button
                onClick={() => initGame()}
                className="w-full bg-cyan-600 hover:bg-cyan-500 px-4 py-2 sm:py-3 rounded-lg font-mono text-sm sm:text-base transition-all"
              >
                TRY AGAIN
              </button>
              <button
                onClick={() => setGameState("menu")}
                className="w-full bg-gray-700 hover:bg-gray-600 px-4 py-2 sm:py-3 rounded-lg font-mono text-sm sm:text-base transition-all"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Menu - Only show when in menu state and not in other states */}
      {gameState === "menu" && (
        <div className="absolute inset-0 flex items-center justify-center z-30 p-2 sm:p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
          <div className="text-center w-full max-w-lg mx-2 max-h-[95vh] overflow-y-auto">
            <h1 className="text-2xl sm:text-4xl md:text-6xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-2">
              CODE & CRASH
            </h1>
            <p className="text-gray-400 font-mono text-xs sm:text-sm md:text-base mb-4 sm:mb-6 px-2">
              Rogue Programmer vs Corrupted Cyberspace
            </p>

            {/* Stats display */}
            <div className="bg-gray-900/80 border border-cyan-500/50 rounded-lg p-2 sm:p-4 mb-4 sm:mb-6 mx-auto max-w-xs sm:max-w-sm">
              <div className="grid grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm font-mono">
                <div className="text-left text-gray-400">XP Bank:</div>
                <div className="text-right text-green-400">
                  {saveData.totalXP.toLocaleString()}
                </div>
                <div className="text-left text-gray-400">Best Wave:</div>
                <div className="text-right text-cyan-400">
                  {saveData.highestWave}
                </div>
                <div className="text-left text-gray-400">Best Score:</div>
                <div className="text-right text-yellow-400">
                  {saveData.highestScore.toLocaleString()}
                </div>
                <div className="text-left text-gray-400">Kills:</div>
                <div className="text-right text-red-400">
                  {(saveData.totalEnemiesKilled || 0).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3 max-w-xs mx-auto">
              <button
                onClick={() => initGame()}
                className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 px-4 sm:px-6 py-3 sm:py-4 rounded-lg font-mono text-base sm:text-lg transition-all shadow-lg shadow-cyan-500/25"
              >
                START GAME
              </button>

              <button
                onClick={() => setGameState("armory")}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-mono text-sm sm:text-base transition-all"
              >
                ARMORY
              </button>

              {!saveData.tutorialComplete && (
                <button
                  onClick={() => initGame(true)}
                  className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-mono text-sm sm:text-base transition-all"
                >
                  TUTORIAL
                </button>
              )}
            </div>

            {/* Weapon indicator */}
            <div className="mt-4 text-center">
              <span className="text-gray-500 font-mono text-xs">
                EQUIPPED:{" "}
              </span>
              <span className="text-cyan-400 font-mono text-xs sm:text-sm">
                {WEAPONS[saveData.equippedWeapon]?.name || "BYTE BLASTER"}
              </span>
            </div>

            {/* Mobile hint */}
            {isMobile && (
              <p className="text-gray-500 font-mono text-[10px] sm:text-xs mt-4">
                {isLandscape
                  ? "Landscape mode active"
                  : "Rotate for better experience"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Armory - Responsive with scroll */}
      {gameState === "armory" && (
        <div className="absolute inset-0 bg-black/95 flex items-center justify-center z-40 p-2 sm:p-4">
          <div className="bg-gray-900 border-2 border-purple-500 rounded-xl p-3 sm:p-6 w-full max-w-2xl mx-2 max-h-[95vh] flex flex-col">
            <div className="flex justify-between items-center mb-3 sm:mb-4 shrink-0">
              <h2 className="text-purple-400 font-mono text-lg sm:text-2xl">
                ARMORY
              </h2>
              <div className="text-green-400 font-mono text-sm sm:text-base">
                XP: {saveData.totalXP.toLocaleString()}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-3 sm:mb-4 shrink-0">
              <button
                onClick={() => setArmoryTab("weapons")}
                className={`flex-1 py-1.5 sm:py-2 rounded-lg font-mono text-xs sm:text-sm transition-all ${
                  armoryTab === "weapons"
                    ? "bg-purple-600"
                    : "bg-gray-800 hover:bg-gray-700"
                }`}
              >
                WEAPONS
              </button>
              <button
                onClick={() => setArmoryTab("upgrades")}
                className={`flex-1 py-1.5 sm:py-2 rounded-lg font-mono text-xs sm:text-sm transition-all ${
                  armoryTab === "upgrades"
                    ? "bg-purple-600"
                    : "bg-gray-800 hover:bg-gray-700"
                }`}
              >
                UPGRADES
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {armoryTab === "weapons" && (
                <div className="space-y-3 sm:space-y-4">
                  {[1, 2, 3, 4, 5].map((tier) => {
                    const tierWeapons = Object.values(WEAPONS).filter(
                      (w) => w.tier === tier
                    );
                    if (tierWeapons.length === 0) return null;
                    return (
                      <div key={tier}>
                        <h3
                          className="font-mono text-xs sm:text-sm mb-1 sm:mb-2"
                          style={{ color: getTierColor(tier) }}
                        >
                          {getTierName(tier)} TIER
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                          {tierWeapons.map((weapon) => {
                            const isOwned = saveData.unlockedWeapons.includes(
                              weapon.id
                            );
                            const isEquipped =
                              saveData.equippedWeapon === weapon.id;
                            const meetsReqs =
                              weapon.unlockWave <= saveData.highestWave &&
                              weapon.unlockLevel <= saveData.highestLevel;
                            const cost = meetsReqs
                              ? weapon.cost
                              : weapon.cost * 2;

                            return (
                              <button
                                key={weapon.id}
                                onClick={() => buyWeapon(weapon.id)}
                                disabled={!isOwned && saveData.totalXP < cost}
                                className={`p-2 sm:p-3 rounded-lg border text-left transition-all ${
                                  isEquipped
                                    ? "border-cyan-400 bg-cyan-900/30"
                                    : isOwned
                                    ? "border-green-500/50 bg-gray-800 hover:border-green-400"
                                    : "border-gray-600 bg-gray-800/50 hover:border-gray-500 disabled:opacity-50"
                                }`}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div
                                      className="text-xs sm:text-sm font-mono truncate"
                                      style={{ color: weapon.color }}
                                    >
                                      {weapon.name}
                                    </div>
                                    <div className="text-gray-400 text-[10px] sm:text-xs truncate">
                                      {weapon.description}
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    {isEquipped ? (
                                      <span className="text-cyan-400 text-[10px] sm:text-xs">
                                        EQUIPPED
                                      </span>
                                    ) : isOwned ? (
                                      <span className="text-green-400 text-[10px] sm:text-xs">
                                        OWNED
                                      </span>
                                    ) : (
                                      <div>
                                        <span className="text-yellow-400 text-[10px] sm:text-xs">
                                          {cost} XP
                                        </span>
                                        {!meetsReqs && (
                                          <div className="text-orange-400 text-[8px] sm:text-[10px]">
                                            EARLY
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {armoryTab === "upgrades" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                  {PERMANENT_UPGRADES.map((upgrade) => {
                    const currentLevel =
                      saveData.permanentUpgrades[
                        upgrade.id as keyof typeof saveData.permanentUpgrades
                      ] || 0;
                    const cost = upgrade.cost * (currentLevel + 1);
                    const maxed = currentLevel >= upgrade.max;

                    return (
                      <button
                        key={upgrade.id}
                        onClick={() => buyPermanentUpgrade(upgrade.id)}
                        disabled={maxed || saveData.totalXP < cost}
                        className="p-2 sm:p-3 rounded-lg border border-gray-600 bg-gray-800/50 hover:border-purple-400 disabled:opacity-50 text-left transition-all"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-purple-300 text-xs sm:text-sm font-mono">
                              {upgrade.name}
                            </div>
                            <div className="text-gray-400 text-[10px] sm:text-xs">
                              {upgrade.desc}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-cyan-400 text-[10px] sm:text-xs">
                              {currentLevel}/{upgrade.max}
                            </div>
                            {!maxed && (
                              <div className="text-yellow-400 text-[10px] sm:text-xs">
                                {cost} XP
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={() => setGameState("menu")}
              className="w-full mt-3 sm:mt-4 bg-gray-700 hover:bg-gray-600 px-4 py-2 sm:py-3 rounded-lg font-mono text-sm sm:text-base transition-all shrink-0"
            >
              BACK
            </button>
          </div>
        </div>
      )}

      {/* Onboarding - Responsive */}
      {gameState === "onboarding" && (
        <div className="absolute inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border-2 border-cyan-500 rounded-xl p-4 sm:p-8 max-w-md w-full mx-4 text-center">
            {onboardingStep === 0 && (
              <>
                <h2 className="text-cyan-400 font-mono text-xl sm:text-3xl mb-4">
                  WELCOME
                </h2>
                <p className="text-gray-300 font-mono text-xs sm:text-sm mb-6">
                  You are a rogue programmer entering corrupted cyberspace. Your
                  mission: survive the viral onslaught.
                </p>
              </>
            )}
            {onboardingStep === 1 && (
              <>
                <h2 className="text-cyan-400 font-mono text-xl sm:text-3xl mb-4">
                  MOVEMENT
                </h2>
                <p className="text-gray-300 font-mono text-xs sm:text-sm mb-6">
                  {isMobile
                    ? "Use the joystick to move"
                    : "Use WASD to move. SHIFT to dash."}
                </p>
              </>
            )}
            {onboardingStep === 2 && (
              <>
                <h2 className="text-cyan-400 font-mono text-xl sm:text-3xl mb-4">
                  COMBAT
                </h2>
                <p className="text-gray-300 font-mono text-xs sm:text-sm mb-6">
                  {isMobile
                    ? "Tap FIRE button to shoot. Use grenades and shield buttons."
                    : "Click to shoot. Right-click or G for grenades. Q for shield."}
                </p>
              </>
            )}
            {onboardingStep === 3 && (
              <>
                <h2 className="text-cyan-400 font-mono text-xl sm:text-3xl mb-4">
                  UPGRADES
                </h2>
                <p className="text-gray-300 font-mono text-xs sm:text-sm mb-6">
                  Kill enemies to collect code fragments. Level up to choose
                  upgrades. Buy weapons in the Armory!
                </p>
              </>
            )}
            {onboardingStep === 4 && (
              <>
                <h2 className="text-cyan-400 font-mono text-xl sm:text-3xl mb-4">
                  READY?
                </h2>
                <p className="text-gray-300 font-mono text-xs sm:text-sm mb-6">
                  Your XP persists between games. Upgrade your weapons and
                  abilities to go further!
                </p>
              </>
            )}

            <button
              onClick={nextOnboardingStep}
              className="bg-cyan-600 hover:bg-cyan-500 px-6 py-3 rounded-lg font-mono text-sm sm:text-base transition-all"
            >
              {onboardingStep < 4 ? "NEXT" : "BEGIN"}
            </button>

            <div className="flex justify-center gap-2 mt-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i === onboardingStep ? "bg-cyan-400" : "bg-gray-600"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Overlay */}
      {gameState === "tutorial" && tutorialStep < 5 && (
        <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="bg-gray-900/90 border border-green-500 px-3 py-2 sm:px-6 sm:py-3 rounded-lg max-w-xs sm:max-w-sm text-center">
            <div className="text-green-400 font-mono text-xs sm:text-sm">
              {tutorialStep === 0 &&
                (isMobile ? "Use joystick to MOVE" : "Use WASD to MOVE")}
              {tutorialStep === 1 &&
                (isMobile ? "Tap FIRE button to SHOOT" : "Click to SHOOT")}
              {tutorialStep === 2 &&
                (isMobile ? "Tap R button to RELOAD" : "Press R to RELOAD")}
              {tutorialStep === 3 &&
                (isMobile ? "Tap DASH button" : "Press SHIFT to DASH")}
              {tutorialStep === 4 && "Kill all enemies!"}
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="bg-purple-900/90 border border-purple-400 px-4 sm:px-6 py-2 sm:py-3 rounded-lg animate-pulse">
            <div className="text-purple-300 font-mono text-xs sm:text-sm">
              {notification}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Game;
