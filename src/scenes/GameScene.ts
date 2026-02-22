import Phaser from 'phaser';
import { getRegistry } from '../game/dataRegistry';
import { Player } from '../game/player';
import { InfiniteMap } from '../game/infiniteMap';
import { ChunkWorld } from '../game/chunkWorld';
import { resolveCircleAabb } from '../game/collision';
import { Enemy } from '../game/enemy';
import { SpawnSystem } from '../game/spawnSystem';
import { circlesOverlap } from '../game/circle';
import { difficultyT, enemyScalars } from '../game/difficulty';
import { WeaponManager } from '../game/weapons/weaponManager';
import { CoffeeWeapon } from '../game/weapons/coffeeWeapon';
import { ReceiptBlade } from '../game/weapons/receiptBlade';
import { BoxcutterBoomerang } from '../game/weapons/boxcutterBoomerang';
import { BarcodeLaser } from '../game/weapons/barcodeLaser';
import { CoinShotgun } from '../game/weapons/coinShotgun';
import { RamenSteamWave } from '../game/weapons/ramenSteamWave';
import { IceCupSlowField } from '../game/weapons/iceCupSlowField';
import { DetergentSplash } from '../game/weapons/detergentSplash';
import { StaplerBurst } from '../game/weapons/staplerBurst';
import { MopSpin } from '../game/weapons/mopSpin';
import { PriceTagBomb } from '../game/weapons/priceTagBomb';
import { ReceiptPrinterBeam } from '../game/weapons/receiptPrinterBeam';
import { CouponRain } from '../game/weapons/couponRain';
import { XpGem } from '../game/xpGem';
import { XpSystem } from '../game/xpSystem';
import { Inventory } from '../game/inventory';
import { LevelUpUI, type UpgradeOption } from '../game/levelUpUI';
import { ReplaceUI } from '../game/replaceUI';
import { SettingsUI } from '../game/settingsUI';
import { GameOverUI } from '../game/gameOverUI';
import { buildLevelUpOptions } from '../game/upgradePicker';
import { t, weaponName, passiveName } from '../game/i18n';

export class GameScene extends Phaser.Scene {
  private t0 = 0;
  private difficulty: 'easy' | 'normal' | 'hard' = 'normal';
  private hud!: Phaser.GameObjects.Text;
  private player!: Player;
  private map!: InfiniteMap;
  private world!: ChunkWorld;

  private enemies: Enemy[] = [];
  private spawnSystem!: SpawnSystem;

  private projectiles: import('../game/projectile').Projectile[] = [];
  private weaponMgr!: WeaponManager;

  private gems: import('../game/xpGem').XpGem[] = [];
  private xpSystem!: import('../game/xpSystem').XpSystem;

  private hp = 100;
  private maxHp = 100;
  private lastHitAt = -999999;
  private iFrameMs = 650;

  private aimGfx!: Phaser.GameObjects.Graphics;
  private playerHpBarGfx!: Phaser.GameObjects.Graphics;
  private xpBarGfx!: Phaser.GameObjects.Graphics;

  private inv!: Inventory;
  private mods = { damageMul: 1, moveSpeedMul: 1 };
  private runDurationSec = 1200;
  private pausedForLevelUp = false;
  private levelUpUI!: LevelUpUI;
  private replaceUI!: ReplaceUI;
  private settingsUI!: SettingsUI;
  private pausedForSettings = false;

  // pause-aware timer (freeze run time during level-up/settings/gameover)
  private pausedAtMs: number | null = null;
  private pausedTotalMs = 0;

  private gameOverUI!: GameOverUI;
  private gameOver = false;

  private kills = 0;
  private pendingNewPassiveId: string | null = null;
  private pendingNewWeaponId: string | null = null;

  private toast!: Phaser.GameObjects.Text;
  private slotsHud!: Phaser.GameObjects.Text;

  private dmgPopupBuckets = new Map<any, { sum: number; lastAt: number; text: Phaser.GameObjects.Text; tween?: Phaser.Tweens.Tween }>();

  constructor() {
    super('Game');
  }

  init(data?: any) {
    const d = data?.difficulty;
    if (d === 'easy' || d === 'normal' || d === 'hard') this.difficulty = d;
    console.log('[GameScene] init', { difficulty: this.difficulty });
  }

  create() {
    try {
      console.log('[GameScene] create start');
      const data = getRegistry();
      this.t0 = this.time.now;

    const stage = data.stagesById.get('store_infinite');
    const tileSize = stage?.infiniteMap?.tileSize ?? 32;

    this.map = new InfiniteMap(this, { tileSize });

    const chunkTiles = stage?.infiniteMap?.chunkTiles ?? 16;
    const decorDensity = stage?.infiniteMap?.decorDensity ?? 0.22;
    const solidObstacleChance = stage?.infiniteMap?.solidObstacleChance ?? 0.06;
    this.world = new ChunkWorld(this, { tileSize, chunkTiles, decorDensity, solidObstacleChance });

    const baseMoveSpeed = Number(data.combatRules?.player?.base?.moveSpeed ?? 160);
    this.iFrameMs = Number(data.combatRules?.player?.base?.iFrameMs ?? 650);
    this.maxHp = Number(data.combatRules?.player?.base?.maxHp ?? 100);
    this.hp = this.maxHp;

    this.player = new Player(this, { x: 0, y: 0, moveSpeed: baseMoveSpeed, radius: 12 });

    this.runDurationSec = stage?.runDurationSec ?? 1200;

    const diffCfg =
      this.difficulty === 'easy'
        ? { maxEnemies: 120, spawnsPerSecMul: 0.55, hpMul: 0.9, speedMul: 0.95, dmgMul: 0.85 }
        : this.difficulty === 'hard'
          ? { maxEnemies: 170, spawnsPerSecMul: 0.8, hpMul: 1.15, speedMul: 1.05, dmgMul: 1.15 }
          : { maxEnemies: 140, spawnsPerSecMul: 0.65, hpMul: 1.0, speedMul: 1.0, dmgMul: 1.0 };

    this.spawnSystem = new SpawnSystem(data, stage?.spawnTableId ?? 'store_night_01', {
      runDurationSec: this.runDurationSec,
      maxEnemies: diffCfg.maxEnemies,
      spawnsPerSecMul: diffCfg.spawnsPerSecMul,
    });

    this.inv = new Inventory();
    this.inv.setWeaponLevel('coffee_can_shot', 1);

    this.mods = this.inv.recomputeStats(data);

    // Weapon manager
    this.weaponMgr = new WeaponManager(
      data,
      this,
      (p) => this.projectiles.push(p),
      () =>
        this.enemies.map((e) => ({
          x: e.sprite.x,
          y: e.sprite.y,
          r: e.def.size,
          takeDamage: (dmg: number) => this.damageEnemy(e, dmg),
        })),

      {
        coffee_can_shot: (d, scene, spawnProjectile) => new CoffeeWeapon(d, scene, spawnProjectile as any),
        receipt_blade: (d, scene, _spawnProjectile, getEnemies) => new ReceiptBlade(d, scene, getEnemies),
        boxcutter_boomerang: (d, scene, spawnProjectile) => new BoxcutterBoomerang(scene, d, spawnProjectile),
        barcode_laser: (d, scene, _spawnProjectile, getEnemies) => new BarcodeLaser(d, scene, getEnemies),
        coin_shotgun: (d, scene, spawnProjectile) => new CoinShotgun(scene, d, spawnProjectile),

        ramen_steam_wave: (d, scene, _spawnProjectile, getEnemies) => new RamenSteamWave(d, scene, getEnemies),
        ice_cup_slow_field: (d, scene, _spawnProjectile, getEnemies) => new IceCupSlowField(d, scene, getEnemies as any),
        detergent_splash: (d, scene, _spawnProjectile, getEnemies) => new DetergentSplash(d, scene, getEnemies),

        stapler_burst: (d, scene, spawnProjectile) => new StaplerBurst(d, scene, spawnProjectile as any),
        mop_spin: (d, scene, _spawnProjectile, getEnemies) => new MopSpin(d, scene, getEnemies),
        price_tag_bomb: (d, scene, _spawnProjectile, getEnemies) => new PriceTagBomb(d, scene, getEnemies),
        receipt_printer_beam: (d, scene, _spawnProjectile, getEnemies) => new ReceiptPrinterBeam(d, scene, getEnemies),
        coupon_rain: (d, scene, _spawnProjectile, getEnemies) => new CouponRain(d, scene, getEnemies),
      }
    );

    this.weaponMgr.addWeapon('coffee_can_shot', 1, { ...this.mods, weaponMods: this.inv.getWeaponMods('coffee_can_shot') });

    this.xpSystem = new XpSystem(data);

    this.levelUpUI = new LevelUpUI(this, (opt) => this.applyUpgrade(opt));
    this.replaceUI = new ReplaceUI(this);
    this.settingsUI = new SettingsUI(this, {
      onResume: () => this.toggleSettings(false),
      onRestart: () => {
        this.toggleSettings(false);
        this.scene.restart({ difficulty: this.difficulty });
      },
      onQuit: () => {
        this.toggleSettings(false);
        this.scene.start('MainMenu');
      },
    });

    this.gameOverUI = new GameOverUI(this, {
      onRestart: () => {
        this.gameOverUI.hide();
        this.scene.restart({ difficulty: this.difficulty });
      },
      onQuit: () => {
        this.gameOverUI.hide();
        this.scene.start('MainMenu');
      },
    });

    // Camera follows player.
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);

    // HUD (fixed to camera)
    this.hud = this.add.text(12, 12, '', { fontSize: '14px', color: '#e8eef7' }).setScrollFactor(0).setDepth(100);

    // Slots HUD (top-right)
    this.slotsHud = this.add
      .text(this.scale.width - 12, 12, '', { fontSize: '13px', color: '#e8eef7', align: 'right' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    // Toast for upgrades
    this.toast = this.add.text(this.scale.width / 2, 52, '', { fontSize: '16px', color: '#e8eef7' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1200)
      .setAlpha(0);

    // XP bar at top
    this.xpBarGfx = this.add.graphics().setScrollFactor(0).setDepth(102);

    // Player HP bar (world space)
    // Keep below modal UIs (level-up/settings) so overlays darken properly.
    this.playerHpBarGfx = this.add.graphics().setDepth(200);

    // Aim overlay (crosshair + line)
    this.aimGfx = this.add.graphics().setScrollFactor(0).setDepth(101);

    this.scale.on('resize', () => this.map.resize());

    this.input.keyboard?.on('keydown-ESC', () => {
      // If a modal is open, close it first.
      if (this.pausedForLevelUp) {
        this.closeLevelUp();
        return;
      }

      // Explicit open/close avoids double-toggle issues.
      if (this.pausedForSettings) this.toggleSettings(false);
      else this.toggleSettings(true);
    });
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      console.error(e);
      this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.75).setOrigin(0, 0).setScrollFactor(0);
      this.add.text(24, 24, `GameScene create() failed:\n${msg}\n\nOpen DevTools console for stack trace.\n[ESC] back`, {
        fontSize: '16px',
        color: '#ffb3b3',
        wordWrap: { width: this.scale.width - 48 }
      }).setScrollFactor(0);
      this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MainMenu'));
    }
  }

  update(_time: number, deltaMs: number) {
    // If create() failed, avoid spamming follow-up exceptions.
    if (!this.hud) return;

    const pausedSim = this.pausedForLevelUp || this.pausedForSettings || this.gameOver;
    this.syncPauseClock(pausedSim);

    const dtSec = deltaMs / 1000;

    const elapsedSec = Math.floor(this.getRunElapsedMs() / 1000);

    if (!pausedSim) {
      // apply move speed modifier
      this.player.setMoveSpeed(Number(getRegistry().combatRules?.player?.base?.moveSpeed ?? 160) * this.mods.moveSpeedMul);
      this.player.update(dtSec);
    }

    // Update world chunks/obstacles (still update visuals while paused)
    this.world.update(this.cameras.main);

    // Resolve player vs solids (circle vs aabb)
    let st = this.player.getState();
    for (const s of this.world.getSolids()) {
      const res = resolveCircleAabb(st, s);
      if (res.hit) {
        this.player.setPos(res.x, res.y);
        st = this.player.getState();
      }
    }

    if (!pausedSim) {
      // Spawning
      this.spawnSystem.update(
      dtSec,
      elapsedSec,
      () => this.enemies.length,
      (def, x, y) => {
        const t = difficultyT(elapsedSec, this.runDurationSec);
        const sc0 = enemyScalars(t);

        const diffSc =
          this.difficulty === 'easy'
            ? { hpMul: 0.9, speedMul: 0.95, dmgMul: 0.85 }
            : this.difficulty === 'hard'
              ? { hpMul: 1.15, speedMul: 1.05, dmgMul: 1.15 }
              : { hpMul: 1.0, speedMul: 1.0, dmgMul: 1.0 };

        const sc = {
          hpMul: sc0.hpMul * diffSc.hpMul,
          speedMul: sc0.speedMul * diffSc.speedMul,
          dmgMul: sc0.dmgMul * diffSc.dmgMul,
        };

        this.enemies.push(new Enemy(this, def as any, x, y, sc));
      },
      { x: this.player.sprite.x, y: this.player.sprite.y },
      (x, y, r) => this.isBlockedSpawn(x, y, r)
    );
    }

    // Enemies update + despawn
    const px = this.player.sprite.x;
    const py = this.player.sprite.y;

    if (!pausedSim) {
        // Weapons update
      this.weaponMgr.update({
        dtMs: deltaMs,
        elapsedSec,
        origin: { x: px, y: py },
        aimPoint: this.getAimPoint(px, py),
      });

    // Projectiles update + hit
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(deltaMs);

      // collide vs enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        const hit = circlesOverlap({ x: p.sprite.x, y: p.sprite.y, r: p.r }, { x: e.sprite.x, y: e.sprite.y, r: e.def.size });
        if (!hit) continue;

        this.damageEnemy(e, p.damage);
        p.pierceLeft -= 1;

        if (p.pierceLeft < 0) break;
      }

      if (p.expired) {
        p.destroy();
        this.projectiles.splice(i, 1);
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      // MVP: everyone is a chaser for now.
      e.updateChase(dtSec, px, py);

      // Despawn far
      if (this.spawnSystem.shouldDespawn(e.sprite.x, e.sprite.y, { x: px, y: py })) {
        e.destroy();
        this.enemies.splice(i, 1);
        continue;
      }

      // Contact damage
      const hit = circlesOverlap(
        { x: px, y: py, r: 12 },
        { x: e.sprite.x, y: e.sprite.y, r: e.def.size }
      );
      if (hit) this.tryHitPlayer(e.contactDamage);
    }

    // XP attract + pickup + leveling
    const gained = this.xpSystem.update(getRegistry(), this.gems, { x: px, y: py }, deltaMs);
    if (gained > 0) this.openLevelUp();

    }

    this.map.update(this.cameras.main);

    if (this.aimGfx) this.drawAimLine(px, py);

    // World-space HP bar above player
    this.drawHpBar(px, py);

    // XP bar at top
    this.drawXpBar();

    const x = Math.round(px);
    const y = Math.round(py);
    const invulnLeft = Math.max(0, this.iFrameMs - (this.time.now - this.lastHitAt));

    this.hud.setText([
      `time: ${elapsedSec}s`,
      `HP: ${this.hp}/${this.maxHp} ${invulnLeft > 0 ? `(i:${Math.ceil(invulnLeft)}ms)` : ''}`,
      `LV: ${this.xpSystem.level}`,
      `pos: ${x}, ${y}`,
      `enemies: ${this.enemies.length}  proj: ${this.projectiles.length}  gems: ${this.gems.length}`,
      'WASD/Arrows move, Shift sprint',
      '[ESC] menu'
    ].join('\n'));

    // Slots HUD update
    const data = getRegistry();
    const starBar = (cur: number, max: number) => `${'★'.repeat(Math.min(max, cur))}${'☆'.repeat(Math.max(0, max - cur))}`;

    const wLines = this.inv.weapons.map(w => {
      const def: any = data.weaponsById.get(w.id);
      const max = Number(def?.maxLevel ?? 8);
      const nm = weaponName(w.id, def?.name ?? w.id);
      return `${nm}  ${starBar(w.level, max)}`;
    });

    const pLines = this.inv.passives.map(p => {
      const def: any = data.passivesById.get(p.id);
      const max = Number(def?.maxLevel ?? 5);
      const nm = passiveName(p.id, def?.name ?? p.id);
      return `${nm}  ${starBar(p.level, max)}`;
    });

    this.slotsHud.setPosition(this.scale.width - 12, 12);
    this.slotsHud.setText([
      `${t('ui.weapon')} (${this.inv.weapons.length}/6)`,
      ...wLines,
      '',
      `${t('ui.passive')} (${this.inv.passives.length}/6)`,
      ...pLines,
    ].join('\n'));
  }

  private getAimPoint(px: number, py: number): { x: number; y: number } | null {
    const pointer = this.input.activePointer;
    if (!pointer) return this.pickNearestEnemy(px, py);

    const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    // If pointer is essentially on top of player, avoid zero-length.
    const dx = wp.x - px;
    const dy = wp.y - py;
    if (dx * dx + dy * dy < 4) return this.pickNearestEnemy(px, py);

    return { x: wp.x, y: wp.y };
  }

  private drawAimLine(_px: number, _py: number) {
    const pointer = this.input.activePointer;
    if (!pointer) return;

    this.aimGfx.clear();

    // screen-space positions
    const sx = this.scale.width / 2;
    const sy = this.scale.height / 2;

    // Draw line from player (screen center) to pointer.
    this.aimGfx.lineStyle(2, 0x9ad1ff, 0.35);
    this.aimGfx.beginPath();
    this.aimGfx.moveTo(sx, sy);
    this.aimGfx.lineTo(pointer.x, pointer.y);
    this.aimGfx.strokePath();

    // Crosshair at pointer
    const r = 8;
    this.aimGfx.lineStyle(2, 0xe8eef7, 0.7);
    this.aimGfx.strokeCircle(pointer.x, pointer.y, r);
    this.aimGfx.lineStyle(2, 0x9ad1ff, 0.6);
    this.aimGfx.beginPath();
    this.aimGfx.moveTo(pointer.x - r - 4, pointer.y);
    this.aimGfx.lineTo(pointer.x + r + 4, pointer.y);
    this.aimGfx.moveTo(pointer.x, pointer.y - r - 4);
    this.aimGfx.lineTo(pointer.x, pointer.y + r + 4);
    this.aimGfx.strokePath();

    // Dot
    this.aimGfx.fillStyle(0xff4fd8, 0.9);
    this.aimGfx.fillCircle(pointer.x, pointer.y, 2);
  }

  private damageEnemy(e: Enemy, dmg: number) {
    // feedback
    e.hitFlash(90);
    this.spawnDamagePopup(e, dmg);

    e.hp -= dmg;
    if (e.hp <= 0) this.killEnemy(e);
  }

  private spawnDamagePopup(enemy: { sprite: { x: number; y: number } }, dmg: number) {
    const v = Math.max(1, Math.round(dmg));
    const now = this.time.now;

    // Aggregate rapid ticks/hits into one popup per enemy to avoid spam.
    const windowMs = 200;

    const existing = this.dmgPopupBuckets.get(enemy);
    if (existing && now - existing.lastAt <= windowMs) {
      existing.sum += v;
      existing.lastAt = now;

      // keep popup near current enemy position
      existing.text.x = enemy.sprite.x + Phaser.Math.Between(-6, 6);
      existing.text.y = enemy.sprite.y + Phaser.Math.Between(-8, 4);
      existing.text.setText(`${existing.sum}`);
      existing.text.setAlpha(1);

      // restart tween
      existing.tween?.stop();
      existing.tween = this.tweens.add({
        targets: existing.text,
        y: existing.text.y - 18,
        alpha: 0,
        duration: 520,
        ease: 'Quad.easeOut',
        onComplete: () => {
          existing.text.destroy();
          this.dmgPopupBuckets.delete(enemy);
        },
      });

      return;
    }

    // New popup
    const ox = enemy.sprite.x + Phaser.Math.Between(-6, 6);
    const oy = enemy.sprite.y + Phaser.Math.Between(-8, 4);

    const text = this.add
      .text(ox, oy, `${v}`, {
        fontSize: '12px',
        color: '#ffffff',
        stroke: '#0b0e12',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(2500);

    const tween = this.tweens.add({
      targets: text,
      y: oy - 18,
      alpha: 0,
      duration: 520,
      ease: 'Quad.easeOut',
      onComplete: () => {
        text.destroy();
        this.dmgPopupBuckets.delete(enemy);
      },
    });

    this.dmgPopupBuckets.set(enemy, { sum: v, lastAt: now, text, tween });
  }

  private openLevelUp() {
    if (this.pausedForLevelUp) return;
    if (this.pausedForSettings) return;

    this.pausedForLevelUp = true;
    this.syncPauseClock(true);

    const data = getRegistry();
    const opts = buildLevelUpOptions(data, this.inv);
    this.levelUpUI.show(opts);
  }

  private showToast(msg: string) {
    if (!this.toast) return;
    this.toast.setText(msg);
    this.toast.setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, duration: 650, delay: 600 });
  }

  private applyUpgrade(opt: UpgradeOption) {
    const data = getRegistry();

    if (opt.kind === 'weapon_new') {
      const def = data.weaponsById.get(opt.id) as any;

      if (this.inv.weapons.length < 6 && !this.inv.hasWeapon(opt.id)) {
        this.inv.setWeaponLevel(opt.id, 1);
        this.weaponMgr.addWeapon(opt.id, 1, { ...this.mods, weaponMods: this.inv.getWeaponMods(opt.id) });
        this.showToast(`무기 획득: ${def?.name ?? opt.id}`);
        this.closeLevelUp();
        return;
      }

      // Replace flow for weapons when slots are full
      if (this.inv.weapons.length >= 6 && !this.inv.hasWeapon(opt.id)) {
        this.pendingNewWeaponId = opt.id;

        const weapons = this.inv.weapons.map(w => {
          const d: any = data.weaponsById.get(w.id);
          return { name: d?.name ?? w.id, level: w.level };
        });

        this.levelUpUI.hide();
        this.replaceUI.show(weapons, (idx) => {
          const newId = this.pendingNewWeaponId;
          if (!newId) return;

          const old = this.inv.weapons[idx];
          if (old) {
            this.weaponMgr.removeWeapon(old.id);
            this.inv.removeWeaponAt(idx);
          }

          this.inv.setWeaponLevel(newId, 1);
          this.weaponMgr.addWeapon(newId, 1, { ...this.mods, weaponMods: this.inv.getWeaponMods(newId) });

          this.pendingNewWeaponId = null;

          const newDef: any = data.weaponsById.get(newId);
          this.showToast(`무기 교체: ${newDef?.name ?? newId}`);

          this.replaceUI.hide();
          this.closeLevelUp();
        }, t('ui.replace_weapon'));

        return;
      }

      // fallback
      this.closeLevelUp();
      return;
    }

    if (opt.kind === 'weapon_upgrade') {
      const cur = this.inv.getWeaponLevel(opt.id);
      this.inv.setWeaponLevel(opt.id, cur + 1);

      const def = data.weaponsById.get(opt.id) as any;

      this.mods = this.inv.recomputeStats(data);
      this.weaponMgr.setWeaponLevel(opt.id, this.inv.getWeaponLevel(opt.id), { ...this.mods, weaponMods: this.inv.getWeaponMods(opt.id) });

      this.showToast(`무기 강화: ${def?.name ?? opt.id} Lv.${cur + 1}`);

      this.closeLevelUp();
      return;
    }

    if (opt.kind === 'passive_upgrade') {
      const def = data.passivesById.get(opt.id) as any;
      const cur = this.inv.getPassiveLevel(opt.id);
      const next = Math.min(cur + 1, Number(def?.maxLevel ?? cur + 1));
      this.inv.setPassiveLevel(opt.id, next);

      this.mods = this.inv.recomputeStats(data);
      this.weaponMgr.setWeaponLevel('coffee_can_shot', this.inv.getWeaponLevel('coffee_can_shot'), { ...this.mods, weaponMods: this.inv.getWeaponMods('coffee_can_shot') });
      this.weaponMgr.setWeaponLevel('receipt_blade', this.inv.getWeaponLevel('receipt_blade'), { ...this.mods, weaponMods: this.inv.getWeaponMods('receipt_blade') });

      this.closeLevelUp();
      return;
    }

    if (opt.kind === 'weapon_mod') {
      // Apply a single-stat perk to an owned weapon (does not increase weapon level)
      if (!this.inv.hasWeapon(opt.id) || !opt.modKey || !opt.modOp || typeof opt.modValue !== 'number') {
        this.closeLevelUp();
        return;
      }

      if (opt.modOp === 'add') this.inv.addWeaponMod(opt.id, opt.modKey, opt.modValue);
      else this.inv.mulWeaponMod(opt.id, opt.modKey, opt.modValue);

      this.weaponMgr.setWeaponLevel(opt.id, this.inv.getWeaponLevel(opt.id), { ...this.mods, weaponMods: this.inv.getWeaponMods(opt.id) });
      this.showToast(`${weaponName(opt.id, (getRegistry().weaponsById.get(opt.id) as any)?.name ?? opt.id)}: ${opt.desc}`);

      this.closeLevelUp();
      return;
    }

    if (opt.kind === 'passive_new') {
      if (this.inv.passives.length < 6) {
        this.inv.setPassiveLevel(opt.id, 1);
        this.mods = this.inv.recomputeStats(data);
        this.weaponMgr.setWeaponLevel('coffee_can_shot', this.inv.getWeaponLevel('coffee_can_shot'), { ...this.mods, weaponMods: this.inv.getWeaponMods('coffee_can_shot') });
        this.weaponMgr.setWeaponLevel('receipt_blade', this.inv.getWeaponLevel('receipt_blade'), { ...this.mods, weaponMods: this.inv.getWeaponMods('receipt_blade') });
        this.closeLevelUp();
        return;
      }

      // Replace flow (vampire survivors-style: pick card then pick slot)
      this.pendingNewPassiveId = opt.id;
      const passives = this.inv.passives.map(p => {
        const def = data.passivesById.get(p.id) as any;
        return { name: def?.name ?? p.id, level: p.level };
      });

      this.levelUpUI.hide();
      this.replaceUI.show(passives, (idx) => {
        const newId = this.pendingNewPassiveId;
        if (!newId) return;

        this.inv.removePassiveAt(idx);
        this.inv.setPassiveLevel(newId, 1);
        this.pendingNewPassiveId = null;

        this.mods = this.inv.recomputeStats(data);
        this.weaponMgr.setWeaponLevel('coffee_can_shot', this.inv.getWeaponLevel('coffee_can_shot'), { ...this.mods, weaponMods: this.inv.getWeaponMods('coffee_can_shot') });
        this.weaponMgr.setWeaponLevel('receipt_blade', this.inv.getWeaponLevel('receipt_blade'), { ...this.mods, weaponMods: this.inv.getWeaponMods('receipt_blade') });

        this.replaceUI.hide();
        this.closeLevelUp();
      }, t('ui.replace_passive'));
      return;
    }
  }

  private closeLevelUp() {
    this.pausedForLevelUp = false;
    this.levelUpUI.hide();
    this.replaceUI.hide();

    // Resume clock if no other modal is open
    if (!this.pausedForSettings && !this.gameOver) this.syncPauseClock(false);
  }

  private toggleSettings(force?: boolean) {
    if (this.gameOver) return;

    const next = force ?? !this.pausedForSettings;
    this.pausedForSettings = next;

    if (this.pausedForSettings) {
      this.syncPauseClock(true);
      this.settingsUI.show();
    } else {
      this.settingsUI.hide();
      // if no other modal is open, resume clock
      if (!this.pausedForLevelUp) this.syncPauseClock(false);
    }
  }

  private syncPauseClock(paused: boolean) {
    const now = this.time.now;

    if (paused) {
      if (this.pausedAtMs === null) this.pausedAtMs = now;
      return;
    }

    if (this.pausedAtMs !== null) {
      this.pausedTotalMs += now - this.pausedAtMs;
      this.pausedAtMs = null;
    }
  }

  private getRunElapsedMs() {
    const now = this.time.now;
    const activePause = this.pausedAtMs !== null ? now - this.pausedAtMs : 0;
    return Math.max(0, now - this.t0 - this.pausedTotalMs - activePause);
  }

  private openGameOver() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.syncPauseClock(true);

    // close other modals
    if (this.pausedForLevelUp) this.closeLevelUp();
    if (this.pausedForSettings) this.toggleSettings(false);

    const data = getRegistry();
    const starBar = (cur: number, max: number) => `${'★'.repeat(Math.min(max, cur))}${'☆'.repeat(Math.max(0, max - cur))}`;

    const weapons = this.inv.weapons.map(w => {
      const def: any = data.weaponsById.get(w.id);
      const max = Number(def?.maxLevel ?? 8);
      const nm = weaponName(w.id, def?.name ?? w.id);
      return { name: nm, stars: starBar(w.level, max) };
    });

    const passives = this.inv.passives.map(p => {
      const def: any = data.passivesById.get(p.id);
      const max = Number(def?.maxLevel ?? 5);
      const nm = passiveName(p.id, def?.name ?? p.id);
      return { name: nm, stars: starBar(p.level, max) };
    });

    const elapsedSec = Math.floor(this.getRunElapsedMs() / 1000);

    this.gameOverUI.show({
      difficulty: this.difficulty,
      elapsedSec,
      level: this.xpSystem.level,
      kills: this.kills,
      weapons,
      passives,
    });
  }

  private drawXpBar() {
    const w = Math.min(640, Math.floor(this.scale.width * 0.55));
    const h = 10;
    const x = Math.floor((this.scale.width - w) / 2);
    const y = 10;

    const pct = Phaser.Math.Clamp(this.xpSystem.xpToNext > 0 ? this.xpSystem.xp / this.xpSystem.xpToNext : 0, 0, 1);

    this.xpBarGfx.clear();

    // bg
    this.xpBarGfx.fillStyle(0x0b0e12, 0.85);
    this.xpBarGfx.fillRoundedRect(x, y, w, h, 4);
    this.xpBarGfx.lineStyle(2, 0x2f4a6a, 0.9);
    this.xpBarGfx.strokeRoundedRect(x, y, w, h, 4);

    // fill
    this.xpBarGfx.fillStyle(0x4cc8ff, 0.9);
    this.xpBarGfx.fillRoundedRect(x + 2, y + 2, Math.max(2, Math.floor((w - 4) * pct)), h - 4, 3);

    // text
    this.xpBarGfx.fillStyle(0xffffff, 0);
    const label = `LV ${this.xpSystem.level}  ${this.xpSystem.xp}/${this.xpSystem.xpToNext}`;
    // Use a tiny bitmap-less approach: reuse hud style via separate text? Keep simple: only bar.
    // If you want text, we can add another fixed text object.
    void label;
  }

  private drawHpBar(px: number, py: number) {
    const w = 44;
    const h = 6;
    const x = px - w / 2;
    const y = py - 28;

    const pct = Phaser.Math.Clamp(this.maxHp > 0 ? this.hp / this.maxHp : 0, 0, 1);

    this.playerHpBarGfx.clear();
    this.playerHpBarGfx.fillStyle(0x0b0e12, 0.85);
    this.playerHpBarGfx.fillRoundedRect(x, y, w, h, 2);
    this.playerHpBarGfx.lineStyle(1, 0x2f4a6a, 0.9);
    this.playerHpBarGfx.strokeRoundedRect(x, y, w, h, 2);

    const col = pct > 0.6 ? 0x7cff7c : pct > 0.3 ? 0xffc857 : 0xff4d6d;
    this.playerHpBarGfx.fillStyle(col, 0.95);
    this.playerHpBarGfx.fillRoundedRect(x + 1, y + 1, Math.max(1, Math.floor((w - 2) * pct)), h - 2, 2);
  }

  private pickNearestEnemy(px: number, py: number): { x: number; y: number } | null {
    let best: Enemy | null = null;
    let bestD2 = Infinity;
    for (const e of this.enemies) {
      const dx = e.sprite.x - px;
      const dy = e.sprite.y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = e;
      }
    }
    if (!best) return null;
    return { x: best.sprite.x, y: best.sprite.y };
  }

  private killEnemy(e: Enemy) {
    this.kills += 1;
    const idx = this.enemies.indexOf(e);
    if (idx >= 0) this.enemies.splice(idx, 1);

    const xpVal = Math.max(1, Number(e.def.xpValue ?? 1));
    this.gems.push(new XpGem(this, e.sprite.x, e.sprite.y, xpVal));
    e.destroy();
  }

  private tryHitPlayer(dmg: number) {
    if (dmg <= 0) return;
    const now = this.time.now;
    if (now - this.lastHitAt < this.iFrameMs) return;

    this.lastHitAt = now;
    this.hp = Math.max(0, this.hp - dmg);

    // Cheap feedback
    this.cameras.main.shake(60, 0.004);

    if (this.hp <= 0) {
      this.openGameOver();
    }
  }

  private isBlockedSpawn(x: number, y: number, r: number) {
    // avoid spawning inside solids; conservative check by expanding box
    const box = { x: x - r, y: y - r, w: r * 2, h: r * 2 };
    for (const s of this.world.getSolids()) {
      const inter = box.x < s.x + s.w && box.x + box.w > s.x && box.y < s.y + s.h && box.y + box.h > s.y;
      if (inter) return true;
    }
    return false;
  }
}

