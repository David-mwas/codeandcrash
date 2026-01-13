import { Player } from "./player";
import { Enemy, type EnemyType } from "./enemy";
import type { Bullet } from "./bullet";
import { Particle } from "./particle";
import { PowerUp } from "./power-up";
import { type SaveData, getDefaultSaveData } from "./save-data";
import type { Grenade } from "./grenade";
import { soundManager } from "./sound";

type StatsUpdater = (stats: {
  health?: number;
  maxHealth?: number;
  xp?: number;
  xpToLevel?: number;
  level?: number;
  ammo?: number;
  maxAmmo?: number;
  wave?: number;
  score?: number;
  reloading?: boolean;
  totalXP?: number;
  sessionXP?: number;
  enemiesKilled?: number;
  weaponName?: string;
  combo?: number;
  grenades?: number;
  maxGrenades?: number;
  shieldActive?: boolean;
  shieldHealth?: number;
  shieldMaxHealth?: number;
  shieldCooldown?: number;
  shieldMaxCooldown?: number;
}) => void;

type UpgradeCallback = (
  upgrades: { id: string; name: string; description: string }[]
) => void;
type FeatureUnlockCallback = (feature: string) => void;
type ComboCallback = (combo: number, message: string) => void;

interface GameManagerOptions {
  onStatsUpdate: StatsUpdater;
  onUpgradeSelection: UpgradeCallback;
  onUpgradeApplied?: () => void;
  onFeatureUnlock: FeatureUnlockCallback;
  onGameOver: () => void;
  onTutorialStep?: (step: number, message: string) => void;
  onCombo?: ComboCallback;
  onShopOpen?: () => void;
  onPauseToggle?: (paused: boolean) => void;
}

export class GameManager {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  player!: Player;
  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  particles: Particle[] = [];
  powerUps: PowerUp[] = [];
  grenades: Grenade[] = [];

  wave = 1;
  score = 0;
  sessionXP = 0;
  enemiesKilled = 0;
  enemiesKilledThisSession = 0;
  enemiesToSpawn = 0;
  enemiesSpawned = 0;
  enemiesKilledThisWave = 0;
  totalEnemiesThisWave = 0;
  waveDelay = 0;
  gameTime = 0;
  isTutorial = false;
  tutorialStep = 0;
  isMobile = false;
  spawnTimers: ReturnType<typeof setTimeout>[] = [];

  combo = 0;
  comboTimer = 0;
  comboMaxTimer = 120;
  highestCombo = 0;

  keys: { [key: string]: boolean } = {};
  mouse = { x: 0, y: 0, down: false };

  running = false;
  paused = false;
  animationFrame: number | null = null;

  updateStats: StatsUpdater;
  showUpgradeMenu: UpgradeCallback;
  onGameOver: () => void;
  onFeatureUnlock: FeatureUnlockCallback;
  onPauseChange?: (paused: boolean) => void;
  onCombo?: ComboCallback;
  onTutorialStep?: (step: number, message: string) => void;
  onUpgradeApplied?: () => void;

  gridOffset = 0;

  saveData: SaveData;

  upgrades = {
    fireRate: 1,
    moveSpeed: 1,
    damage: 1,
    maxHealth: 1,
    bulletSpeed: 1,
    reloadSpeed: 1,
    pierce: 0,
    autoAim: false,
    dashCooldown: 1,
    critChance: 0,
    xpBonus: 1,
  };

  constructor(
    canvas: HTMLCanvasElement,
    saveData: SaveData,
    options: GameManagerOptions
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.saveData = saveData || getDefaultSaveData();

    // Extract callbacks from options object
    this.updateStats = options.onStatsUpdate;
    this.showUpgradeMenu = options.onUpgradeSelection;
    this.onGameOver = options.onGameOver;
    this.onFeatureUnlock = options.onFeatureUnlock;
    this.onPauseChange = options.onPauseToggle;
    this.onCombo = options.onCombo;
    this.onTutorialStep = options.onTutorialStep;
    this.onUpgradeApplied = options.onUpgradeApplied;

    // Check for mobile
    this.isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    const upgrades =
      this.saveData?.permanentUpgrades ||
      getDefaultSaveData().permanentUpgrades;

    // Apply permanent upgrades
    this.upgrades.maxHealth = 1 + (upgrades.maxHealth || 0) * 0.1;
    this.upgrades.damage = 1 + (upgrades.damage || 0) * 0.1;
    this.upgrades.moveSpeed = 1 + (upgrades.moveSpeed || 0) * 0.05;
    this.upgrades.reloadSpeed = 1 + (upgrades.reloadSpeed || 0) * 0.1;
    this.upgrades.critChance = (upgrades.critChance || 0) * 0.05;
    this.upgrades.xpBonus = 1 + (upgrades.xpBonus || 0) * 0.1;

    this.initPlayer();

    // Set initial mouse position to center for mobile
    this.mouse.x = canvas.width / 2;
    this.mouse.y = canvas.height / 2 - 100;

    this.bindEvents();
  }

  initPlayer() {
    const upgrades =
      this.saveData?.permanentUpgrades ||
      getDefaultSaveData().permanentUpgrades;

    this.player = new Player(
      this.canvas.width / 2,
      this.canvas.height / 2,
      this,
      this.saveData?.equippedWeapon || "pistol"
    );
    this.player.maxHealth = 100 + (upgrades.maxHealth || 0) * 10;
    this.player.health = this.player.maxHealth;
    this.player.maxGrenades = 5 + (upgrades.grenadeCapacity || 0);
    this.player.grenades = Math.min(3, this.player.maxGrenades);
    this.player.shieldMaxHealth = 50 + (upgrades.shieldStrength || 0) * 20;
  }

  bindEvents() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("mousedown", this.handleMouseDown);
    window.addEventListener("mouseup", this.handleMouseUp);
    window.addEventListener("contextmenu", this.handleContextMenu);
  }

  handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === "r" && !this.player.reloading) {
      this.player.reload();
    }
    if (e.key === "Escape" && this.running) {
      this.togglePause();
    }
    if (e.key.toLowerCase() === "g" && this.running && !this.paused) {
      this.player.throwGrenade(this.mouse.x, this.mouse.y);
    }
    if (e.key.toLowerCase() === "q" && this.running && !this.paused) {
      this.player.activateShield();
    }
    if (e.key === "Tab") {
      e.preventDefault();
    }
  };

  handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false;
  };

  handleMouseMove = (e: MouseEvent) => {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
  };

  handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mouse.down = true;
    }
    if (e.button === 2 && this.running && !this.paused) {
      this.player.throwGrenade(this.mouse.x, this.mouse.y);
    }
  };

  handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mouse.down = false;
    }
  };

  handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  togglePause() {
    if (this.paused) {
      this.resume();
    } else {
      this.pause();
    }
    if (this.onPauseChange) {
      this.onPauseChange(this.paused);
    }
  }

  start() {
    if (this.running) return;

    this.running = true;
    this.paused = false;
    this.wave = 1;
    this.score = 0;
    this.sessionXP = 0;
    this.enemiesKilled = 0;
    this.enemiesKilledThisSession = 0;
    this.combo = 0;
    this.highestCombo = 0;
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.powerUps = [];
    this.grenades = [];
    this.isTutorial = false;
    this.spawnTimers.forEach((timer) => clearTimeout(timer));
    this.spawnTimers = [];

    this.initPlayer();
    this.spawnWave();
    this.gameLoop();
  }

  startTutorial() {
    this.running = true;
    this.paused = false;
    this.isTutorial = true;
    this.tutorialStep = 0;
    this.wave = 1;
    this.score = 0;
    this.sessionXP = 0;
    this.enemiesKilled = 0;
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.powerUps = [];
    this.grenades = [];
    this.spawnTimers.forEach((timer) => clearTimeout(timer));
    this.spawnTimers = [];

    this.initPlayer();

    // Start tutorial steps
    if (this.onTutorialStep) {
      this.onTutorialStep(0, "Use WASD to move around");
    }

    this.gameLoop();
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    // Keep player in bounds after resize
    if (this.player) {
      this.player.x = Math.max(
        this.player.radius,
        Math.min(width - this.player.radius, this.player.x)
      );
      this.player.y = Math.max(
        this.player.radius,
        Math.min(height - this.player.radius, this.player.y)
      );
    }
  }

  spawnWave = () => {
    this.spawnTimers.forEach((timer) => clearTimeout(timer));
    this.spawnTimers = [];

    if (this.wave > 1) {
      soundManager.waveComplete();
    }

    if (this.isTutorial) {
      this.totalEnemiesThisWave = 2;
      this.enemiesSpawned = 0;
      this.enemiesKilledThisWave = 0;

      for (let i = 0; i < 2; i++) {
        const timer = setTimeout(() => {
          if (this.running && !this.paused) {
            this.spawnEnemy();
            this.enemiesSpawned++;
          }
        }, i * 1000);
        this.spawnTimers.push(timer);
      }
      if (this.updateStats) {
        this.updateStats({ wave: this.wave });
      }
      return;
    }

    // Progressive difficulty - easier early waves
    let baseEnemies: number;
    if (this.wave === 1) {
      baseEnemies = 2;
    } else if (this.wave === 2) {
      baseEnemies = 3;
    } else if (this.wave <= 5) {
      baseEnemies = 3 + this.wave;
    } else {
      baseEnemies = 5 + Math.floor(this.wave * 1.5);
    }

    this.totalEnemiesThisWave = baseEnemies;
    this.enemiesSpawned = 0;
    this.enemiesKilledThisWave = 0;

    const spawnDelay = this.wave <= 3 ? 800 : this.wave <= 5 ? 600 : 400;

    for (let i = 0; i < baseEnemies; i++) {
      const timer = setTimeout(() => {
        if (this.running) {
          this.spawnEnemy();
          this.enemiesSpawned++;
        }
      }, i * spawnDelay);
      this.spawnTimers.push(timer);
    }

    if (this.updateStats) {
      this.updateStats({ wave: this.wave });
    }

    // Feature unlocks at wave milestones
    if (this.wave === 3) {
      this.onFeatureUnlock("Fast Enemies");
    } else if (this.wave === 5) {
      this.onFeatureUnlock("Tank Enemies");
    } else if (this.wave === 7) {
      this.onFeatureUnlock("Boss Enemies");
    }
  };

  spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;

    const margin = 50;
    switch (side) {
      case 0: // top
        x = Math.random() * this.canvas.width;
        y = -margin;
        break;
      case 1: // right
        x = this.canvas.width + margin;
        y = Math.random() * this.canvas.height;
        break;
      case 2: // bottom
        x = Math.random() * this.canvas.width;
        y = this.canvas.height + margin;
        break;
      default: // left
        x = -margin;
        y = Math.random() * this.canvas.height;
    }

    // Enemy type based on wave
    let type: EnemyType = "basic";
    if (this.wave >= 3 && Math.random() < 0.3) {
      type = "fast";
    }
    if (this.wave >= 5 && Math.random() < 0.2) {
      type = "tank";
    }
    if (this.wave >= 7 && Math.random() < 0.1) {
      type = "boss";
    }

    // For tutorial, only basic weak enemies
    if (this.isTutorial) {
      type = "basic";
    }

    const enemy = new Enemy(x, y, type, this.wave, this.isTutorial);
    this.enemies.push(enemy);
  }

  enemyKilled(enemy: Enemy) {
    soundManager.enemyDeath();
    this.enemiesKilled++;
    this.enemiesKilledThisWave++;
    this.enemiesKilledThisSession++;

    // Combo system
    this.combo++;
    this.comboTimer = this.comboMaxTimer;

    if (this.combo > this.highestCombo) {
      this.highestCombo = this.combo;
    }

    // Combo messages
    let comboMessage = "";
    if (this.combo === 5) comboMessage = "Multi Kill!";
    else if (this.combo === 10) comboMessage = "Dominating!";
    else if (this.combo === 15) comboMessage = "Rampage!";
    else if (this.combo === 20) comboMessage = "Godlike!";
    else if (this.combo === 25) comboMessage = "UNSTOPPABLE!";

    if (comboMessage && this.onCombo) {
      soundManager.combo();
      this.onCombo(this.combo, comboMessage);
    }

    // XP with combo multiplier
    const comboMultiplier = 1 + this.combo * 0.1;
    const xpGain = Math.floor(
      enemy.xpValue * comboMultiplier * this.upgrades.xpBonus
    );
    this.player.addXP(xpGain);
    this.sessionXP += xpGain;
    this.score += enemy.scoreValue * Math.floor(comboMultiplier);

    // Spawn particles
    for (let i = 0; i < 10; i++) {
      this.particles.push(new Particle(enemy.x, enemy.y, enemy.color));
    }

    // Chance to drop power-up
    const dropChance =
      0.3 + (this.saveData?.permanentUpgrades?.luckyDrops || 0) * 0.05;
    if (Math.random() < dropChance) {
      this.powerUps.push(new PowerUp(enemy.x, enemy.y));
    }

    // Check wave complete
    if (
      this.enemiesKilledThisWave >= this.totalEnemiesThisWave &&
      this.enemiesSpawned >= this.totalEnemiesThisWave
    ) {
      this.waveDelay = 180; // 3 seconds
      this.wave++;
    }
  }

  collectPowerUp(powerUp: PowerUp) {
    soundManager.powerUp();

    // Generate upgrade options
    const allUpgrades = [
      { id: "fireRate", name: "+20% Fire Rate", description: "Shoot faster" },
      { id: "moveSpeed", name: "+10% Move Speed", description: "Move quicker" },
      { id: "damage", name: "+15% Damage", description: "Hit harder" },
      {
        id: "maxHealth",
        name: "+20 Max Health",
        description: "More survivability",
      },
      {
        id: "bulletSpeed",
        name: "+15% Bullet Speed",
        description: "Faster projectiles",
      },
      {
        id: "reloadSpeed",
        name: "+20% Reload Speed",
        description: "Reload quicker",
      },
      {
        id: "pierce",
        name: "+1 Pierce",
        description: "Bullets go through enemies",
      },
      {
        id: "dashCooldown",
        name: "-15% Dash Cooldown",
        description: "Dash more often",
      },
    ];

    // Pick 3 random upgrades
    const shuffled = allUpgrades.sort(() => Math.random() - 0.5);
    const options = shuffled.slice(0, 3);

    this.pause();
    this.showUpgradeMenu(options);
  }

  applyUpgrade(upgradeId: string) {
    switch (upgradeId) {
      case "fireRate":
        this.upgrades.fireRate *= 1.2;
        break;
      case "moveSpeed":
        this.upgrades.moveSpeed *= 1.1;
        break;
      case "damage":
        this.upgrades.damage *= 1.15;
        break;
      case "maxHealth":
        this.player.maxHealth += 20;
        this.player.health = Math.min(
          this.player.health + 20,
          this.player.maxHealth
        );
        break;
      case "bulletSpeed":
        this.upgrades.bulletSpeed *= 1.15;
        break;
      case "reloadSpeed":
        this.upgrades.reloadSpeed *= 1.2;
        break;
      case "pierce":
        this.upgrades.pierce++;
        break;
      case "dashCooldown":
        this.upgrades.dashCooldown *= 0.85;
        break;
    }

    if (this.onUpgradeApplied) {
      this.onUpgradeApplied();
    }

    this.resume();
  }

  gameLoop = () => {
    if (!this.running) return;

    if (!this.paused) {
      this.update(16); // Assuming 60 FPS, 16ms per frame
      this.draw();
    }

    this.animationFrame = requestAnimationFrame(this.gameLoop);
  };

  update(deltaTime: number) {
    if (!this.running || this.paused) return;

    this.gameTime++;
    this.gridOffset = (this.gridOffset + 1) % 40;

    if (this.comboTimer > 0) {
      this.comboTimer -= deltaTime;
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }

    // Handle wave spawning delay
    if (this.waveDelay > 0) {
      this.waveDelay -= deltaTime;
      if (this.waveDelay <= 0) {
        this.spawnWave();
      }
    }

    // Update player
    this.player.update(this.keys, this.mouse);

    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.update();

      // Remove out of bounds bullets
      if (
        bullet.x < -50 ||
        bullet.x > this.canvas.width + 50 ||
        bullet.y < -50 ||
        bullet.y > this.canvas.height + 50
      ) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Check bullet-enemy collision
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        const dx = bullet.x - enemy.x;
        const dy = bullet.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < bullet.radius + enemy.radius) {
          const isCrit = Math.random() < this.upgrades.critChance;
          const actualDamage = isCrit ? bullet.damage * 2 : bullet.damage;

          enemy.takeDamage(actualDamage);

          if (isCrit) {
            for (let k = 0; k < 8; k++) {
              this.particles.push(new Particle(bullet.x, bullet.y, "#ffff00"));
            }
          }

          const lifestealAmount =
            actualDamage *
            ((this.saveData?.permanentUpgrades?.lifesteal || 0) * 0.02);
          if (lifestealAmount > 0) {
            this.player.health = Math.round(
              Math.min(
                this.player.health + lifestealAmount,
                this.player.maxHealth
              )
            );
          }

          // Explosion
          if (bullet.explosive && bullet.explosionRadius) {
            soundManager.explosion();
            const radius =
              bullet.explosionRadius *
              (1 +
                (this.saveData?.permanentUpgrades?.explosionRadius || 0) *
                  0.15);

            // Damage nearby enemies
            this.enemies.forEach((e) => {
              const edx = e.x - bullet.x;
              const edy = e.y - bullet.y;
              const edist = Math.sqrt(edx * edx + edy * edy);
              if (edist < radius) {
                e.takeDamage(bullet.damage * 0.5);
              }
            });

            // Explosion particles
            for (let k = 0; k < 20; k++) {
              const angle = (k / 20) * Math.PI * 2;
              this.particles.push(
                new Particle(
                  bullet.x + Math.cos(angle) * radius * 0.3,
                  bullet.y + Math.sin(angle) * radius * 0.3,
                  Math.cos(angle) * (3 + Math.random() * 3),
                  Math.sin(angle) * (3 + Math.random() * 3),
                  "#ff6600",
                  6
                )
              );
            }
          }

          // Regular hit particles
          for (let k = 0; k < 3; k++) {
            this.particles.push(new Particle(bullet.x, bullet.y, bullet.color));
          }

          soundManager.hit();

          bullet.pierce--;
          if (bullet.pierce <= 0) {
            this.bullets.splice(i, 1);
          }

          if (enemy.health <= 0) {
            this.enemyKilled(enemy);
            this.enemies.splice(j, 1);
          }

          break;
        }
      }
    }

    // Update enemies
    for (const enemy of this.enemies) {
      enemy.update(this.player);
    }

    // Update particles
    for (const particle of this.particles) {
      particle.update();
    }

    // Update grenades
    for (const grenade of this.grenades) {
      const shouldExplode = grenade.update(this);

      // Check if grenade exploded
      if (shouldExplode) {
        grenade.exploded = true;

        // Damage enemies in radius
        const explosionRadius =
          100 + (this.saveData?.permanentUpgrades?.explosionRadius || 0) * 20;
        for (const enemy of this.enemies) {
          const dx = enemy.x - grenade.x;
          const dy = enemy.y - grenade.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < explosionRadius) {
            const damage =
              50 * (1 - dist / explosionRadius) * this.upgrades.damage;
            enemy.takeDamage(damage, this);
          }
        }

        // Explosion particles
        for (let i = 0; i < 30; i++) {
          this.particles.push(new Particle(grenade.x, grenade.y, "#ff6600"));
        }

        soundManager.explosion();
      }
    }

    // Player-enemy collision
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.player.radius + enemy.radius - 2) {
        // Apply damage reduction from armor
        const armorReduction =
          1 - (this.saveData?.permanentUpgrades?.armor || 0) * 0.05;
        this.player.takeDamage(enemy.damage * armorReduction);

        const angle = Math.atan2(dy, dx);
        enemy.x -= Math.cos(angle) * 40;
        enemy.y -= Math.sin(angle) * 40;
      }
    }

    // Player-powerup collision
    for (const powerUp of this.powerUps) {
      if (powerUp.collected) continue;
      const dx = this.player.x - powerUp.x;
      const dy = this.player.y - powerUp.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.player.radius + powerUp.radius) {
        powerUp.collected = true;
        this.collectPowerUp(powerUp);
      }
    }

    // Clean up dead entities
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.bullets = this.bullets.filter(
      (b) =>
        !b.dead &&
        b.x > -50 &&
        b.x < this.canvas.width + 50 &&
        b.y > -50 &&
        b.y < this.canvas.height + 50
    );
    this.particles = this.particles.filter((p) => p.life > 0);
    this.powerUps = this.powerUps.filter((p) => !p.collected);
    this.grenades = this.grenades.filter((g) => !g.exploded);

    // Update stats UI
    if (this.updateStats) {
      this.updateStats({
        health: Math.round(this.player.health),
        maxHealth: this.player.maxHealth,
        xp: this.player.xp,
        xpToLevel: this.player.xpToLevel,
        level: this.player.level,
        ammo: this.player.ammo,
        maxAmmo: this.player.maxAmmo,
        wave: this.wave,
        score: this.score,
        reloading: this.player.reloading,
        sessionXP: this.sessionXP,
        enemiesKilled: this.enemiesKilled,
        weaponName: this.player.weaponName,
        combo: this.combo,
        grenades: this.player.grenades,
        maxGrenades: this.player.maxGrenades,
        shieldActive: this.player.shieldActive,
        shieldHealth: this.player.shieldHealth,
        shieldMaxHealth: this.player.shieldMaxHealth,
        shieldCooldown: this.player.shieldCooldown,
        shieldMaxCooldown: this.player.shieldMaxCooldown,
      });
    }

    // Check game over
    if (this.player.health <= 0) {
      this.gameOver();
    }

    // Tutorial progression
    if (this.isTutorial && this.onTutorialStep) {
      if (
        this.tutorialStep === 0 &&
        (this.keys["w"] || this.keys["a"] || this.keys["s"] || this.keys["d"])
      ) {
        this.tutorialStep = 1;
        this.onTutorialStep(1, "Great! Now click to shoot enemies");
        // Spawn tutorial enemies
        this.spawnWave();
      } else if (this.tutorialStep === 1 && this.enemiesKilled >= 1) {
        this.tutorialStep = 2;
        this.onTutorialStep(2, "Nice shot! Press R to reload");
      } else if (this.tutorialStep === 2 && this.player.reloading) {
        this.tutorialStep = 3;
        this.onTutorialStep(3, "Press SHIFT to dash");
      } else if (this.tutorialStep === 3 && this.player.dashing) {
        this.tutorialStep = 4;
        this.onTutorialStep(
          4,
          "Excellent! Kill the remaining enemies to complete the tutorial"
        );
      } else if (
        this.tutorialStep === 4 &&
        this.enemies.length === 0 &&
        this.enemiesKilledThisWave >= 2
      ) {
        this.tutorialStep = 5;
        this.onTutorialStep(5, "Tutorial complete! You're ready for battle!");
        setTimeout(() => {
          this.stop();
          this.onGameOver();
        }, 2000);
      }
    }
  }

  draw() {
    const ctx = this.ctx;

    // Clear canvas
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw cyber grid
    ctx.strokeStyle = "rgba(0, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (
      let x = -gridSize + (this.gridOffset % gridSize);
      x < this.canvas.width + gridSize;
      x += gridSize
    ) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height);
      ctx.stroke();
    }
    for (
      let y = -gridSize + (this.gridOffset % gridSize);
      y < this.canvas.height + gridSize;
      y += gridSize
    ) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas.width, y);
      ctx.stroke();
    }

    // Draw particles (behind everything)
    for (const particle of this.particles) {
      particle.render(ctx);
    }

    // Draw power-ups
    for (const powerUp of this.powerUps) {
      powerUp.render(ctx);
    }

    // Draw grenades
    for (const grenade of this.grenades) {
      grenade.render(ctx);
    }

    // Draw bullets
    for (const bullet of this.bullets) {
      bullet.render(ctx);
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      enemy.render(ctx);
    }

    this.player.render(ctx, this.mouse);

    // Draw crosshair (desktop only)
    if (!this.isMobile) {
      ctx.strokeStyle = "#00ffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.mouse.x, this.mouse.y, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(this.mouse.x - 15, this.mouse.y);
      ctx.lineTo(this.mouse.x - 5, this.mouse.y);
      ctx.moveTo(this.mouse.x + 5, this.mouse.y);
      ctx.lineTo(this.mouse.x + 15, this.mouse.y);
      ctx.moveTo(this.mouse.x, this.mouse.y - 15);
      ctx.lineTo(this.mouse.x, this.mouse.y - 5);
      ctx.moveTo(this.mouse.x, this.mouse.y + 5);
      ctx.lineTo(this.mouse.x, this.mouse.y + 15);
      ctx.stroke();
    }
  }

  gameOver() {
    this.running = false;
    this.spawnTimers.forEach((timer) => clearTimeout(timer));
    this.spawnTimers = [];

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    soundManager.gameOver();
    this.onGameOver();
  }

  stop() {
    this.running = false;
    this.spawnTimers.forEach((timer) => clearTimeout(timer));
    this.spawnTimers = [];

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mouseup", this.handleMouseUp);
    window.removeEventListener("contextmenu", this.handleContextMenu);
  }

  // Methods for external control
}
