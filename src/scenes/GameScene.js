import Phaser from 'phaser';
import { WORLD, BEE, HIVE, WASP, WAVE, FLOWER, TIMER, WORKER, TOWER, XP, BUTTERFLY, SPIDER, WEB, WIND, BREAKABLE, pickFlowerType } from '../constants.js';
import MetaSave from '../systems/MetaSave.js';
import Flower from '../entities/Flower.js';
import Hive from '../entities/Hive.js';
import ResourceManager from '../systems/ResourceManager.js';
import PollinationSystem from '../systems/PollinationSystem.js';
import UpgradeManager from '../systems/UpgradeManager.js';
import PlayerBee from '../entities/PlayerBee.js';
import Stinger from '../entities/Stinger.js';
import WorkerBee from '../entities/WorkerBee.js';
import WaveManager from '../systems/WaveManager.js';
import WaspHiveSystem from '../systems/WaspHiveSystem.js';
import ResinTrap from '../towers/ResinTrap.js';
import GuardPost from '../towers/GuardPost.js';
import Pickup from '../entities/Pickup.js';
import Breakable from '../entities/Breakable.js';
import HUD from '../ui/HUD.js';
import BuildMenu from '../ui/BuildMenu.js';
import LevelUpMenu from '../ui/LevelUpMenu.js';
import WindSystem from '../systems/WindSystem.js';
import Butterfly from '../entities/Butterfly.js';
import Spider from '../entities/Spider.js';
import WebTrap from '../entities/WebTrap.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  init(data) {
    this.hiveX = data.hiveX ?? 1280;
    this.hiveY = data.hiveY ?? 720;
    this._ended = false;
    this._gameTime = 0;
    this._playTime = 0;
    this.xp = 0;
    this.level = 1;
    this.reqXp = XP.BASE_REQ;
  }

  create() {
    this.add.rectangle(WORLD.WIDTH / 2, WORLD.HEIGHT / 2, WORLD.WIDTH, WORLD.HEIGHT, 0x2d5a1b);
    this.cameras.main.setBounds(0, 0, WORLD.WIDTH, WORLD.HEIGHT);
    this.physics.world.setBounds(0, 0, WORLD.WIDTH, WORLD.HEIGHT);

    this.flowers = this.physics.add.staticGroup();
    this.wasps = this.physics.add.group();
    this.stingers = this.physics.add.group();
    this.workers = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.breakables = this.physics.add.group();
    this._towerList = [];
    this.butterflies = this.physics.add.group();
    this.spiders = this.physics.add.group();
    this._webList = [];
    this.wind = new WindSystem();

    this._spawnInitialFlowers();

    this.hive = new Hive(this, this.hiveX, this.hiveY);

    this.resources = new ResourceManager({
      honeyStorage: HIVE.HONEY_STORAGE,
      sapConversionRate: HIVE.SAP_CONVERSION_RATE,
    });

    this.upgrades = new UpgradeManager();

    this.pollination = new PollinationSystem({
      spawnDelay: FLOWER.SPAWN_DELAY,
      radius: FLOWER.POLLINATION_RADIUS,
      onSpawn: ({ x, y }) => {
        const fx = Phaser.Math.Clamp(x, 40, WORLD.WIDTH - 40);
        const fy = Phaser.Math.Clamp(y, 40, WORLD.HEIGHT - 40);
        this._spawnFlower(fx, fy);
      },
    });

    this._conversionTimer = this.time.addEvent({
      delay: HIVE.SAP_CONVERSION_INTERVAL,
      callback: () => this.resources.convertSap(1),
      loop: true,
    });

    this.time.addEvent({
      delay: BREAKABLE.SPAWN_DELAY,
      callback: () => this._spawnBreakable(),
      loop: true,
    });

    this.player = new PlayerBee(
      this,
      this.hiveX,
      this.hiveY + 80,
      (x, y, range, damage, speed, backwardAngle) => {
        // Only fire if an enemy is within range (any direction)
        let hasTarget = false;
        for (const w of this.wasps.getChildren()) {
          if (w.active && Phaser.Math.Distance.Between(x, y, w.x, w.y) < range) { hasTarget = true; break; }
        }
        if (!hasTarget) {
          for (const b of this.breakables.getChildren()) {
            if (b.active && Phaser.Math.Distance.Between(x, y, b.x, b.y) < range) { hasTarget = true; break; }
          }
        }
        if (!hasTarget) {
          const wh = this.waspHiveSystem.hive;
          if (wh.hp > 0 && Phaser.Math.Distance.Between(x, y, wh.x, wh.y) < range) hasTarget = true;
        }
        if (!hasTarget) return false;

        // Spawn stinger at bee's tail, fire backward
        const spawnX = x + Math.cos(backwardAngle) * 14;
        const spawnY = y + Math.sin(backwardAngle) * 14;
        const s = new Stinger(this, spawnX, spawnY, damage, range, speed);
        this.stingers.add(s);
        s.launch(spawnX + Math.cos(backwardAngle) * range, spawnY + Math.sin(backwardAngle) * range);
        return true;
      },
    );

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    this.physics.add.overlap(this.player, this.flowers, (player, flower) => {
      const space = this.player._sapCapacity - this.resources.getSapCarried('player');
      if (space > 0 && flower.sapRemaining > 0) {
        if (flower.collectPollen()) {
          this.pollination.pollinate({ x: flower.x, y: flower.y }, this.time.now);
        }
        const taken = flower.collectSap(space);
        this.resources.addSap('player', taken, this.player._sapCapacity);
      } else if (flower.sapRemaining <= 0) {
        if (flower.collectPollen()) {
          this.pollination.pollinate({ x: flower.x, y: flower.y }, this.time.now);
        }
      }
    });

    this.physics.add.overlap(this.player, this.hive, () => {
      if (this.resources.getSapCarried('player') > 0) {
        this.resources.depositSap('player');
      }
    });

    this.physics.add.overlap(this.player, this.pickups, (player, pickup) => {
      pickup.onCollect(player, this);
    });

    this.physics.add.overlap(this.stingers, this.breakables, (stinger, breakable) => {
      stinger.destroy();
      breakable.takeDamage(stinger.damage);
    });

    this.physics.add.collider(this.wasps, this.wasps);

    this.waveManager = new WaveManager({
      firstWaveDelay: WAVE.FIRST_WAVE_DELAY,
      waveInterval: WAVE.WAVE_INTERVAL,
      baseCount: WAVE.BASE_COUNT,
      countIncrement: WAVE.COUNT_INCREMENT,
    });

    this.waspHiveSystem = new WaspHiveSystem({
      scene: this,
      playerHiveX: this.hiveX,
      playerHiveY: this.hiveY,
      onDestroyed: () => this._endGame(true, true),
    });

    // Apply meta-progression upgrades from save
    const _metaSave = MetaSave.load();
    const _u = _metaSave.upgrades;

    if (_u.BEE_SPEED_META)    this.player._speed += _u.BEE_SPEED_META * 20;
    if (_u.BEE_HP_META)       { this.player.maxHp += _u.BEE_HP_META * 2; this.player.hp = this.player.maxHp; }
    if (_u.HIVE_HP_META)      { this.hive.maxHp   += _u.HIVE_HP_META * 5; this.hive.hp  = this.hive.maxHp; }
    if (_u.HIVE_STORAGE_META) this.resources.setHoneyStorage(HIVE.HONEY_STORAGE + _u.HIVE_STORAGE_META * 50);

    if (_u.START_WORKER) {
      const _w = new WorkerBee(this, this.hiveX, this.hiveY);
      _w.init(this.hive, this.flowers);
      this.workers.add(_w);
    }
    if (_u.START_ARMOR)  this.player.armor = 1;
    if (_u.START_HONEY)  { this.resources.addPendingSap(30); this.resources.convertSap(30); }
    if (_u.START_GUARD)  {
      const _post = new GuardPost(this, this.hiveX + 80, this.hiveY);
      this._towerList.push(_post);
    }

    this.physics.add.overlap(this.stingers, this.wasps, (stinger, wasp) => {
      stinger.destroy();
      if (wasp.takeDamage(stinger.damage)) {
        this._dropPickup(wasp.x, wasp.y, 'xp');
      }
    });

    this.physics.add.overlap(this.stingers, this.waspHiveSystem.hive, (stinger, waspHive) => {
      stinger.destroy();
      if (waspHive.takeDamage(stinger.damage)) {
        this._endGame(true, true);
      }
    });

    this.physics.add.overlap(this.player, this.waspHiveSystem.hive, (player, waspHive) => {
      if (!player.isDashing) return;
      const now = this._gameTime;
      if (now - (waspHive._lastDashHit || 0) < 500) return;
      waspHive._lastDashHit = now;
      if (waspHive.takeDamage(1)) {
        this._endGame(true, true);
      }
    });

    this.physics.add.overlap(this.wasps, this.player, (a, b) => {
      const wasp = a.waspType ? a : b;
      const bee  = a.waspType ? b : a;
      if (!bee.alive) return;
      
      const now = this._gameTime;

      // Dash attack logic
      if (bee.isDashing) {
        if (now - (wasp.lastDashedHit || 0) < 500) return; // Prevent multi-hits during same dash
        wasp.lastDashedHit = now;
        if (wasp.takeDamage(1)) {
          this._dropPickup(wasp.x, wasp.y, 'xp');
        }
        return;
      }

      if (wasp.waspType !== 'hunter') return;
      if (now - wasp.lastHit < WASP.HIT_COOLDOWN) return;
      wasp.lastHit = now;

      const sap = this.resources.getSapCarried('player');
      if (sap > 0) {
        this.resources.stealSap('player', Math.max(1, WASP.SAP_STEAL - this.player.armor));
        this.waspHiveSystem.onHoneyStolen(Math.max(1, WASP.SAP_STEAL - this.player.armor));
      } else {
        if (bee.takeDamage(WASP.DAMAGE)) this._onPlayerDeath();
      }
    });

    this.physics.add.overlap(this.wasps, this.hive, (a, b) => {
      const wasp = a.waspType ? a : b;
      const hive = a.waspType ? b : a;
      if (wasp.isRetreating) return;
      
      const now = this._gameTime;
      if (now - wasp.lastHit < WASP.HIT_COOLDOWN) return;
      wasp.lastHit = now;

      if (this.resources.getHoney() > 0) {
        this.resources.stealHoney(WASP.HONEY_STEAL);
        this.waspHiveSystem.onHoneyStolen(WASP.HONEY_STEAL);
        wasp.retreat();
      } else {
        if (hive.takeDamage(WASP.DAMAGE)) this._endGame(false);
      }
    });

    this._bKey = this.input.keyboard.addKey('B');
    this._hKey = this.input.keyboard.addKey('H'); // debug add honey
    this._placing = null;
    this._ghost = null;

    this.buildMenu = new BuildMenu(this, (key) => {
      if (key === 'recruit-worker') {
        this._recruitWorker();
      } else {
        this._enterPlacementMode(key);
      }
    });

    this.levelUpMenu = new LevelUpMenu(this, (key) => {
      if (this.upgrades.purchase(key)) {
        this._applyUpgrade(key);
      }
    });

    this.hud = new HUD(this, this.resources, this.hive, this.player, this.wind);
    this._spawnPassiveEntities();
  }

  update(time, delta) {
    if (this.levelUpMenu.visible) {
      this.physics.world.pause();
      return;
    }

    this.physics.world.resume();

    const isSlowMode = this.buildMenu.visible || this._placing !== null;
    const timeScale = isSlowMode ? 0.1 : 1.0;
    this.physics.world.timeScale = 1 / timeScale;
    this.time.timeScale = timeScale; // Scales the SAP_CONVERSION timer!

    const scaledDelta = delta * timeScale;
    this._gameTime += scaledDelta;
    this._playTime += scaledDelta;

    const workerCount = this.workers.getChildren().filter(w => w.alive).length;
    if (this.hud) this.hud.update(this._playTime, this.waveManager.getWaveNumber(), workerCount, this.level, this.xp, this.reqXp);

    if (this._playTime >= TIMER.RUN_DURATION) {
      this._endGame(true);
      return;
    }

    // Wind computed first so wasps can counter it when they have no target
    this.wind.update(this._gameTime);
    const windVec = this.wind.getVector();

    this.pollination.update(this._gameTime);
    this.flowers.getChildren().forEach(f => f.update(this._gameTime));
    if (this.player.alive) this.player.update(this._gameTime, scaledDelta);

    this.wasps.getChildren().forEach(w => w.update(this._gameTime, windVec));

    this.workers.getChildren().forEach(w => {
      if (w.alive) w.update(this._gameTime, scaledDelta, this.resources);
    });

    this._towerList.forEach(tower => {
      if (tower.towerType === 'resin')  tower.update(this._gameTime, this.wasps);
      else if (tower.towerType === 'guard' && tower.active) tower.guard.update(this._gameTime, this.wasps, this.stingers);
    });

    // Butterflies
    this.butterflies.getChildren().forEach(b =>
      b.update(this._gameTime, scaledDelta, this.player, this.pollination, this.flowers)
    );

    // Spiders
    this.spiders.getChildren().forEach(s =>
      s.update(this._gameTime, scaledDelta, this.flowers, (f1, f2) => this._placeWeb(f1, f2))
    );

    // Apply wind to all flying entities (adds to velocity already set this frame)
    this._applyWind(windVec);

    // Web trapping (runs after wind so trapped entities don't drift)
    const trappableEntities = [
      ...(this.player.alive ? [this.player] : []),
      ...this.wasps.getChildren().filter(w => w.active),
      ...this.workers.getChildren().filter(w => w.alive && w.active),
    ];
    this._webList = this._webList.filter(w => {
      if (!w.active) return false;
      return !w.update(this._gameTime, trappableEntities);
    });

    this._checkWorkerHunterCollisions(this._gameTime);
    this._checkRaiderTowerCollisions(this._gameTime);

    if (Phaser.Input.Keyboard.JustDown(this._bKey)) {
      if (this.buildMenu.visible) this.buildMenu.hide();
      else this.buildMenu.show();
    }
    
    if (Phaser.Input.Keyboard.JustDown(this._hKey)) {
      this.resources.addPendingSap(100);
      this.resources.convertSap(100);
    }

    const wave = this.waveManager.update(this._playTime);
    if (wave) this.waspHiveSystem.spawnWave(wave);
    this.waspHiveSystem.update(this._gameTime);
  }

  _dropPickup(x, y, type) {
    const pickup = new Pickup(this, x, y, type);
    this.pickups.add(pickup);
  }

  _collectXp(val) {
    this.xp += val;
    if (this.xp >= this.reqXp) {
      this.xp -= this.reqXp;
      this.level++;
      this.reqXp = Math.floor(this.reqXp * XP.REQ_MULTIPLIER);
      if (this.buildMenu.visible) this.buildMenu.hide();
      this.levelUpMenu.show(this.upgrades);
    }
  }

  _spawnFlower(x, y, initialBloom = false) {
    const type = pickFlowerType(Phaser.Math.Between(1, 100));
    const f = new Flower(this, x, y, type, initialBloom);
    f.onDead = () => {
      this.time.delayedCall(FLOWER.RESPAWN_DELAY, () => {
        if (!this._ended) {
          const rx = Phaser.Math.Between(100, WORLD.WIDTH - 100);
          const ry = Phaser.Math.Between(100, WORLD.HEIGHT - 100);
          this._spawnFlower(rx, ry);
        } else {
          this.flowers.refresh();
        }
      });
    };
    this.flowers.add(f);
    this.flowers.refresh();
  }

  _spawnInitialFlowers() {
    for (let i = 0; i < FLOWER.INITIAL_COUNT; i++) {
      const x = Phaser.Math.Between(100, WORLD.WIDTH - 100);
      const y = Phaser.Math.Between(100, WORLD.HEIGHT - 100);
      this._spawnFlower(x, y, true);
    }
  }

  _spawnPassiveEntities() {
    for (let i = 0; i < BUTTERFLY.COUNT; i++) {
      const x = Phaser.Math.Between(200, WORLD.WIDTH - 200);
      const y = Phaser.Math.Between(200, WORLD.HEIGHT - 200);
      this.butterflies.add(new Butterfly(this, x, y));
    }
    for (let i = 0; i < SPIDER.COUNT; i++) {
      const x = Phaser.Math.Between(200, WORLD.WIDTH - 200);
      const y = Phaser.Math.Between(200, WORLD.HEIGHT - 200);
      this.spiders.add(new Spider(this, x, y));
    }
    // Initial breakables
    for (let i = 0; i < 3; i++) {
      this._spawnBreakable();
    }
  }

  _spawnBreakable() {
    if (this.breakables.countActive(true) >= BREAKABLE.MAX_COUNT) return;
    const x = Phaser.Math.Between(100, WORLD.WIDTH - 100);
    const y = Phaser.Math.Between(100, WORLD.HEIGHT - 100);
    const b = new Breakable(this, x, y);
    this.breakables.add(b);
  }

  _placeWeb(f1, f2) {
    const activeWebs = this._webList.filter(w => w.active);
    if (activeWebs.length >= WEB.MAX_COUNT) return;
    this._webList.push(new WebTrap(this, f1, f2));
  }

  _applyWind(windVec) {
    const applyTo = (entity) => {
      if (!entity.active || !entity.body) return;
      entity.body.velocity.x += windVec.x;
      entity.body.velocity.y += windVec.y;
    };
    if (this.player.alive) applyTo(this.player);
    this.wasps.getChildren().forEach(applyTo);
    this.workers.getChildren().forEach(w => { if (w.alive) applyTo(w); });
    this.butterflies.getChildren().forEach(applyTo);
  }

  _checkWorkerHunterCollisions(time) {
    this.wasps.getChildren().forEach(wasp => {
      if (!wasp.active || wasp.waspType !== 'hunter') return;
      this.workers.getChildren().forEach(worker => {
        if (!worker.active || !worker.alive) return;
        const dist = Phaser.Math.Distance.Between(wasp.x, wasp.y, worker.x, worker.y);
        if (dist > 20) return;
        if (time - wasp.lastHit < WASP.HIT_COOLDOWN) return;
        wasp.lastHit = time;
        if (worker._sap > 0) {
          worker._sap = Math.max(0, worker._sap - WASP.SAP_STEAL);
        } else {
          worker.takeDamage(WASP.DAMAGE);
        }
      });
    });
  }

  _checkRaiderTowerCollisions(time) {
    this.wasps.getChildren().forEach(wasp => {
      if (!wasp.active || wasp.waspType !== 'raider' || wasp.isRetreating) return;
      this._towerList.forEach(tower => {
        if (!tower.active || tower.towerType !== 'guard' || tower.hp <= 0) return;
        const dist = Phaser.Math.Distance.Between(wasp.x, wasp.y, tower.x, tower.y);
        if (dist > 32) return;
        if (time - wasp.lastHit < WASP.HIT_COOLDOWN) return;
        wasp.lastHit = time;
        tower.takeDamage(WASP.DAMAGE);
        wasp.retreat();
      });
    });
  }

  _recruitWorker() {
    if (!this.resources.spendHoney(WORKER.COST)) return;
    const w = new WorkerBee(this, this.hiveX, this.hiveY);
    w.init(this.hive, this.flowers);
    this.workers.add(w);
  }

  _enterPlacementMode(towerKey) {
    this._placing = towerKey;
    this._ghost = this.add.image(0, 0, towerKey).setAlpha(0.5).setDepth(50);
    this.input.on('pointermove', this._onPlacementMove, this);
    this.input.once('pointerdown', this._onPlacementPlace, this);
    this.input.keyboard.addKey('ESC').once('down', () => this._cancelPlacement());
  }

  _onPlacementMove(pointer) {
    if (!this._ghost) return;
    const wx = this.cameras.main.scrollX + pointer.x;
    const wy = this.cameras.main.scrollY + pointer.y;
    this._ghost.setPosition(wx, wy);
  }

  _onPlacementPlace(pointer) {
    const wx = this.cameras.main.scrollX + pointer.x;
    const wy = this.cameras.main.scrollY + pointer.y;
    this._placeTower(this._placing, wx, wy);
    this._cancelPlacement();
  }

  _cancelPlacement() {
    if (this._ghost) { this._ghost.destroy(); this._ghost = null; }
    this._placing = null;
    this.input.off('pointermove', this._onPlacementMove, this);
    this.input.off('pointerdown', this._onPlacementPlace, this);
  }

  _placeTower(key, x, y) {
    const costs = {
      'resin-trap':  TOWER.RESIN_TRAP_COST,
      'guard-post':  TOWER.GUARD_POST_COST,
    };
    if (!this.resources.spendHoney(costs[key])) return;
    let tower;
    if (key === 'resin-trap') tower = new ResinTrap(this, x, y);
    else if (key === 'guard-post') tower = new GuardPost(this, x, y);
    if (tower) this._towerList.push(tower);
  }

  _applyUpgrade(key) {
    const lvl = this.upgrades.getLevel(key);
    switch (key) {
      case 'BEE_SPEED':
        this.player._speed = BEE.SPEED + lvl * 20;
        break;
      case 'BEE_CAPACITY':
        this.player._sapCapacity = BEE.SAP_CAPACITY + lvl * 3;
        break;
      case 'BEE_STINGER_DMG':
        this.player._stingerDamage = BEE.STINGER_DAMAGE + lvl;
        break;
      case 'BEE_STINGER_RATE':
        this.player._stingerRate = Math.max(200, BEE.STINGER_RATE - lvl * 100);
        break;
      case 'BEE_STINGER_DIST':
        this.player._stingerRange = BEE.STINGER_RANGE + lvl * 40;
        break;
      case 'BEE_STINGER_SPEED':
        this.player._stingerSpeed = BEE.STINGER_SPEED + lvl * 80;
        break;
      case 'BEE_HP':
        this.player.maxHp = BEE.HP + lvl * 2;
        this.player.hp = Math.min(this.player.hp + 2, this.player.maxHp);
        break;
      case 'BEE_ARMOR':
        this.player.armor = lvl;
        break;
      case 'HIVE_STORAGE':
        this.resources.setHoneyStorage(HIVE.HONEY_STORAGE + lvl * 50);
        break;
      case 'HIVE_PRODUCTION':
        this._conversionTimer.reset({
          delay: Math.max(500, HIVE.SAP_CONVERSION_INTERVAL - lvl * 300),
          callback: () => this.resources.convertSap(1),
          loop: true,
        });
        break;
      case 'HIVE_HP':
        this.hive.maxHp = HIVE.HP + lvl * 5;
        this.hive.hp = Math.min(this.hive.hp + 5, this.hive.maxHp);
        break;
      case 'HIVE_WORKERS':
        const w = new WorkerBee(this, this.hiveX, this.hiveY);
        w.init(this.hive, this.flowers);
        this.workers.add(w);
        break;
    }
  }

  _onPlayerDeath() {
    if (this.resources.spendHoney(BEE.RESPAWN_COST)) {
      this.time.delayedCall(2000, () => {
        if (!this._ended) this.player.respawn(this.hiveX, this.hiveY);
      });
    } else {
      this._endGame(false); // can't afford respawn
    }
  }

  _endGame(won, wonByDestruction = false) {
    if (this._ended) return;
    this._ended = true;
    const score = this._calculateScore();
    const waves = this.waveManager.getWaveNumber();
    const timeSurvived = Math.floor(this._playTime / 1000);
    this.scene.start('GameOverScene', { won, score, waves, timeSurvived, wonByDestruction });
  }

  _calculateScore() {
    return Math.floor(
      this.resources.getHoney() * 10 +
      this.waveManager.getWaveNumber() * 100
    );
  }
}
