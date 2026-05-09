# Bee Game — Plan 3: Passive World Entities

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three passive world entities (Butterfly, Spider, WebTrap) and a global Wind system that make the world feel alive and add tactical depth — butterflies pollinate autonomously, spiders spin webs that trap both bees and wasps, and wind drifts all flying entities.

**Architecture:** WindSystem is a pure-JS class (tested with Vitest). Butterfly and Spider extend `Phaser.Physics.Arcade.Sprite` (they need physics bodies for movement and world bounds). WebTrap extends `Phaser.GameObjects.Sprite` only — no physics body, position-checked via distance in `update()`. Wind is applied to all flying entities in `GameScene.update()` AFTER entities set their own velocities, so it adds a constant drift. Webs are applied AFTER wind, so trapped entities don't drift. Spiders and WebTraps don't interact with each other's web.

**Entity order in GameScene.update() matters:**
1. Entity movement (`wasp.update`, `player.update`, etc.)
2. Wind applied (adds wind velocity to all flying entities)
3. Web trapping (zeroes velocity of any entity inside a web radius)

**Tech Stack:** Phaser 3.87, Vite 5, Vitest 2, vanilla JS

**Series:** Plan 3 of 4. Builds on Plan 2. Plan 4 = meta-progression + LocalStorage.

---

## File Map

```
bee-game/
├── src/
│   ├── constants.js                   MODIFY — add BUTTERFLY, SPIDER, WEB, WIND
│   ├── scenes/
│   │   ├── BootScene.js               MODIFY — add butterfly, spider, web textures
│   │   └── GameScene.js               MODIFY — spawn passive entities, wind + web wiring
│   ├── entities/
│   │   ├── Butterfly.js               CREATE
│   │   ├── Spider.js                  CREATE
│   │   └── WebTrap.js                 CREATE
│   └── systems/
│       └── WindSystem.js              CREATE
└── tests/
    └── WindSystem.test.js             CREATE
```

---

### Task 1: Add BUTTERFLY, SPIDER, WEB, WIND constants

**Files:**
- Modify: `src/constants.js`

- [ ] **Step 1: Append four new constant blocks after the existing UPGRADE export**

```js
export const BUTTERFLY = {
  SPEED: 60,
  COUNT: 4,              // spawned at run start
  FLEE_RADIUS: 150,      // runs from player if closer than this
  DIRECTION_CHANGE: 3000, // ms between random direction changes
};

export const SPIDER = {
  SPEED: 45,
  COUNT: 3,              // spawned at run start
  WEB_PLACE_TIME: 5000,  // ms spider must dwell near a flower before placing a web
};

export const WEB = {
  RADIUS: 28,            // distance in px at which web catches an entity
  BREAK_TIME: 3000,      // ms of continuous contact before web snaps
  MIN_DISTANCE: 80,      // spiders won't place a new web closer than this to an existing one
  MAX_COUNT: 20,         // max webs on the map at once
};

export const WIND = {
  MAX_STRENGTH: 50,      // px/s maximum wind speed
  SHIFT_INTERVAL: 10000, // ms between wind direction/strength changes
  LERP_RATE: 0.004,      // per-frame lerp rate toward new wind target (~12s to fully shift)
};
```

- [ ] **Step 2: Verify build**

Run: `npx vite build --mode development 2>&1 | head -10`

Expected: no errors referencing `constants.js`.

- [ ] **Step 3: Commit**

```
git add src/constants.js
git commit -m "feat: add BUTTERFLY, SPIDER, WEB, WIND constants"
```

---

### Task 2: Add placeholder textures in BootScene

**Files:**
- Modify: `src/scenes/BootScene.js`

- [ ] **Step 1: Add three textures before `g.destroy()`**

```js
    // butterfly: small cyan wing-diamond shape
    g.clear();
    g.fillStyle(0x00dddd);
    g.fillTriangle(10, 0, 0, 16, 20, 16);
    g.fillStyle(0x00aaaa);
    g.fillTriangle(10, 20, 0, 4, 20, 4);
    g.generateTexture('butterfly', 20, 20);

    // spider: small dark grey circle with leg hints
    g.clear();
    g.fillStyle(0x222222);
    g.fillCircle(10, 10, 8);
    g.lineStyle(1, 0x444444, 1);
    g.strokeRect(2, 4, 16, 12);
    g.generateTexture('spider', 20, 20);

    // web: concentric white rings (semi-transparent)
    g.clear();
    g.lineStyle(2, 0xffffff, 0.7);
    g.strokeCircle(24, 24, 22);
    g.strokeCircle(24, 24, 14);
    g.strokeCircle(24, 24, 6);
    g.lineStyle(1, 0xffffff, 0.4);
    g.lineBetween(2, 24, 46, 24);
    g.lineBetween(24, 2, 24, 46);
    g.lineBetween(7, 7, 41, 41);
    g.lineBetween(41, 7, 7, 41);
    g.generateTexture('web', 48, 48);
```

- [ ] **Step 2: Run dev server and confirm no texture errors**

Run `npm run dev`, start a game, check console. Kill server.

- [ ] **Step 3: Commit**

```
git add src/scenes/BootScene.js
git commit -m "feat: add butterfly, spider, web placeholder textures"
```

---

### Task 3: WindSystem + tests

**Files:**
- Create: `src/systems/WindSystem.js`
- Create: `tests/WindSystem.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/WindSystem.test.js`:

```js
import { describe, it, expect } from 'vitest';
import WindSystem from '../src/systems/WindSystem.js';
import { WIND } from '../src/constants.js';

describe('WindSystem', () => {
  it('starts with zero vector', () => {
    const wind = new WindSystem();
    const { x, y } = wind.getVector();
    expect(x).toBe(0);
    expect(y).toBe(0);
  });

  it('stays at zero before first shift interval', () => {
    const wind = new WindSystem();
    wind.update(WIND.SHIFT_INTERVAL - 1);
    const { x, y } = wind.getVector();
    expect(x).toBe(0);
    expect(y).toBe(0);
  });

  it('getVector returns numeric x/y after running', () => {
    const wind = new WindSystem();
    for (let t = 0; t <= 60000; t += 100) wind.update(t);
    const { x, y } = wind.getVector();
    expect(typeof x).toBe('number');
    expect(typeof y).toBe('number');
    expect(isNaN(x)).toBe(false);
    expect(isNaN(y)).toBe(false);
  });

  it('vector magnitude never exceeds MAX_STRENGTH', () => {
    const wind = new WindSystem();
    for (let t = 0; t <= 120000; t += 100) wind.update(t);
    const { x, y } = wind.getVector();
    const magnitude = Math.sqrt(x * x + y * y);
    expect(magnitude).toBeLessThanOrEqual(WIND.MAX_STRENGTH + 0.001);
  });

  it('getCurrentStrength returns the internal strength', () => {
    const wind = new WindSystem();
    for (let t = 0; t <= 60000; t += 100) wind.update(t);
    const strength = wind.getCurrentStrength();
    expect(strength).toBeGreaterThanOrEqual(0);
    expect(strength).toBeLessThanOrEqual(WIND.MAX_STRENGTH + 0.001);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run tests/WindSystem.test.js`

Expected: `Cannot find module '../src/systems/WindSystem.js'`.

- [ ] **Step 3: Implement WindSystem**

Create `src/systems/WindSystem.js`:

```js
import { WIND } from '../constants.js';

export default class WindSystem {
  constructor() {
    this._angle = 0;
    this._strength = 0;
    this._targetAngle = 0;
    this._targetStrength = 0;
    this._nextShiftAt = WIND.SHIFT_INTERVAL;
  }

  update(time) {
    if (time >= this._nextShiftAt) {
      this._targetAngle = Math.random() * Math.PI * 2;
      this._targetStrength = Math.random() * WIND.MAX_STRENGTH;
      this._nextShiftAt = time + WIND.SHIFT_INTERVAL;
    }
    this._angle    += (this._targetAngle    - this._angle)    * WIND.LERP_RATE;
    this._strength += (this._targetStrength - this._strength) * WIND.LERP_RATE;
  }

  // Returns wind velocity vector in px/s. Add directly to entity body.velocity.
  getVector() {
    return {
      x: Math.cos(this._angle) * this._strength,
      y: Math.sin(this._angle) * this._strength,
    };
  }

  getCurrentStrength() {
    return this._strength;
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npx vitest run tests/WindSystem.test.js`

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```
git add src/systems/WindSystem.js tests/WindSystem.test.js
git commit -m "feat: WindSystem with lerped direction/strength shifts"
```

---

### Task 4: Butterfly entity

**Files:**
- Create: `src/entities/Butterfly.js`

- [ ] **Step 1: Create Butterfly**

Create `src/entities/Butterfly.js`:

```js
import Phaser from 'phaser';
import { BUTTERFLY } from '../constants.js';

export default class Butterfly extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'butterfly');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this._angle = Math.random() * Math.PI * 2;
    this._nextTurn = 0;
  }

  // player: PlayerBee sprite (for flee behavior)
  // pollination: PollinationSystem instance
  // flowers: staticGroup
  update(time, delta, player, pollination, flowers) {
    // Random direction changes
    if (time > this._nextTurn) {
      this._angle = Math.random() * Math.PI * 2;
      this._nextTurn = time + BUTTERFLY.DIRECTION_CHANGE + Phaser.Math.Between(-500, 500);
    }

    // Flee player
    if (player.alive) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (dist < BUTTERFLY.FLEE_RADIUS) {
        this._angle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
        this._nextTurn = time + 1200;
      }
    }

    this.setVelocity(
      Math.cos(this._angle) * BUTTERFLY.SPEED,
      Math.sin(this._angle) * BUTTERFLY.SPEED,
    );

    // Auto-pollinate flowers in contact range
    flowers.getChildren().forEach(flower => {
      if (!flower.active || flower.pollenCollected) return;
      const d = Phaser.Math.Distance.Between(this.x, this.y, flower.x, flower.y);
      if (d < 26) {
        flower.collectPollen();
        pollination.pollinate({ x: flower.x, y: flower.y }, time);
      }
    });
  }
}
```

- [ ] **Step 2: Commit**

```
git add src/entities/Butterfly.js
git commit -m "feat: Butterfly entity — wanders, flees player, auto-pollinates flowers"
```

---

### Task 5: Spider + WebTrap entities

**Files:**
- Create: `src/entities/Spider.js`
- Create: `src/entities/WebTrap.js`

- [ ] **Step 1: Create Spider**

Create `src/entities/Spider.js`:

```js
import Phaser from 'phaser';
import { SPIDER } from '../constants.js';

export default class Spider extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'spider');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this._target = null;
    this._dwelling = false;
    this._dwellStart = 0;
  }

  // flowers: Phaser staticGroup
  // onPlaceWeb: callback (x, y) => void
  update(time, delta, flowers, onPlaceWeb) {
    if (!this._target || !this._target.active) {
      this._findTarget(flowers);
    }
    if (!this._target) {
      this.setVelocity(0, 0);
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, this._target.x, this._target.y);
    if (dist > 40) {
      this._dwelling = false;
      this.scene.physics.moveToObject(this, this._target, SPIDER.SPEED);
    } else {
      this.setVelocity(0, 0);
      if (!this._dwelling) {
        this._dwelling = true;
        this._dwellStart = time;
      } else if (time - this._dwellStart >= SPIDER.WEB_PLACE_TIME) {
        const wx = this._target.x + Phaser.Math.Between(-30, 30);
        const wy = this._target.y + Phaser.Math.Between(-30, 30);
        onPlaceWeb(wx, wy);
        this._dwelling = false;
        this._target = null;
      }
    }
  }

  _findTarget(flowers) {
    let nearest = null, nearestDist = Infinity;
    flowers.getChildren().forEach(f => {
      if (!f.active) return;
      const d = Phaser.Math.Distance.Between(this.x, this.y, f.x, f.y);
      if (d < nearestDist) { nearest = f; nearestDist = d; }
    });
    this._target = nearest;
  }
}
```

- [ ] **Step 2: Create WebTrap**

Create `src/entities/WebTrap.js`:

```js
import Phaser from 'phaser';
import { WEB } from '../constants.js';

// Plain sprite — no physics body. Uses distance checks in update().
export default class WebTrap extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'web');
    scene.add.existing(this);
    this.setAlpha(0.7);
    this._contactStart = null;
  }

  // entities: array of active Phaser.Physics.Arcade.Sprite
  // Returns true when destroyed.
  update(time, entities) {
    if (!this.active) return true;

    let anyContact = false;
    entities.forEach(entity => {
      if (!entity.active) return;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, entity.x, entity.y);
      if (dist <= WEB.RADIUS) {
        anyContact = true;
        entity.body.velocity.x = 0;
        entity.body.velocity.y = 0;
      }
    });

    if (anyContact) {
      if (this._contactStart === null) this._contactStart = time;
      else if (time - this._contactStart >= WEB.BREAK_TIME) {
        this.destroy();
        return true;
      }
    } else {
      this._contactStart = null;
    }
    return false;
  }
}
```

- [ ] **Step 3: Commit**

```
git add src/entities/Spider.js src/entities/WebTrap.js
git commit -m "feat: Spider wanders to flowers and places WebTraps; WebTrap freezes entities for BREAK_TIME"
```

---

### Task 6: Wire everything in GameScene

This is the integration task. Apply all changes to `src/scenes/GameScene.js` in order.

**Files:**
- Modify: `src/scenes/GameScene.js`

- [ ] **Step 1: Add imports at the top**

After the existing import block, add:

```js
import WindSystem from '../systems/WindSystem.js';
import Butterfly from '../entities/Butterfly.js';
import Spider from '../entities/Spider.js';
import WebTrap from '../entities/WebTrap.js';
```

Also add `BUTTERFLY, SPIDER, WEB, WIND` to the constants import line:

```js
import { WORLD, BEE, HIVE, WASP, WAVE, FLOWER, TIMER, WORKER, TOWER, XP, BUTTERFLY, SPIDER, WEB, WIND } from '../constants.js';
```

- [ ] **Step 2: Add physics groups and system in create()**

After `this._towerList = [];`, add:

```js
    this.butterflies = this.physics.add.group();
    this.spiders = this.physics.add.group();
    this._webList = [];
    this.wind = new WindSystem();
```

- [ ] **Step 3: Spawn passive entities at end of create()**

After `this.hud = new HUD(...)`, add:

```js
    this._spawnPassiveEntities();
```

- [ ] **Step 4: Add the _spawnPassiveEntities() method**

Add after `_spawnInitialFlowers()`:

```js
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
  }
```

- [ ] **Step 5: Add _placeWeb() method**

Add after `_spawnPassiveEntities()`:

```js
  _placeWeb(x, y) {
    const activeWebs = this._webList.filter(w => w.active);
    if (activeWebs.length >= WEB.MAX_COUNT) return;
    const tooClose = activeWebs.some(w =>
      Phaser.Math.Distance.Between(x, y, w.x, w.y) < WEB.MIN_DISTANCE
    );
    if (tooClose) return;
    const cx = Phaser.Math.Clamp(x, 40, WORLD.WIDTH - 40);
    const cy = Phaser.Math.Clamp(y, 40, WORLD.HEIGHT - 40);
    this._webList.push(new WebTrap(this, cx, cy));
  }
```

- [ ] **Step 6: Update update() to integrate passive systems**

In `update(time, delta)`, after the existing tower update block and before `_checkWorkerHunterCollisions`, add:

```js
    // Wind system
    this.wind.update(this._gameTime);
    const windVec = this.wind.getVector();

    // Butterflies
    this.butterflies.getChildren().forEach(b =>
      b.update(this._gameTime, scaledDelta, this.player, this.pollination, this.flowers)
    );

    // Spiders
    this.spiders.getChildren().forEach(s =>
      s.update(this._gameTime, scaledDelta, this.flowers, (x, y) => this._placeWeb(x, y))
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
```

- [ ] **Step 7: Add _applyWind() method**

Add after `_placeWeb()`:

```js
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
```

- [ ] **Step 8: Run all tests to confirm nothing broke**

Run: `npx vitest run`

Expected: all 34 tests pass (29 existing + 5 new WindSystem tests).

- [ ] **Step 9: Run the dev server and test manually**

Run: `npm run dev`

**Checklist:**
1. Start a game. Confirm 4 butterflies and 3 spiders visible on map.
2. Fly near a butterfly — it should flee away from your bee.
3. Fly over an empty (not yet pollinated) flower. Then watch — butterfly should pollinate another flower nearby eventually (give it 30–60s).
4. Watch a spider: it moves slowly toward the nearest flower, sits near it for ~5 seconds, then a web appears nearby. The spider then moves toward another flower.
5. Fly into a web — your bee should be frozen (velocity = 0) for up to 3 seconds, then the web breaks and you resume.
6. Wait for wasps (wave 1 at 15 seconds). A wasp that enters a web gets frozen too.
7. Subtle wind drift: after 10–15 seconds of play, notice your bee drifting slightly off course even without input. This is the wind. Holding a direction key overcomes it easily.
8. Open build menu (B) — slow motion active. Wind effect is proportionally reduced during slow-mo.

Kill the server.

- [ ] **Step 10: Commit**

```
git add src/scenes/GameScene.js
git commit -m "feat: integrate Butterfly, Spider, WebTrap, WindSystem into GameScene"
```

---

## Known Limitations (addressed in later plans)

- Wind direction not shown in HUD — player feels it through gameplay drift only.
- Butterflies don't respawn if they walk off the map edge (world bounds prevent this but edge-hugging can slow them to a crawl — acceptable for now).
- Web break timer resets if all entities leave the web before it breaks (by design — web is preserved until something gets stuck for the full duration).
- Spiders always target the nearest flower regardless of web density — no spreading behavior.
