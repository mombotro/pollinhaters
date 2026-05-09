# Flower Variety & Lifecycle Design

**Goal:** Add three flower types with distinct resource yields and a four-stage lifecycle so the field shifts over time, rewards map exploration, and creates passive pollination synergy.

**Architecture:** Type-as-data on the existing `Flower` entity. Types defined in `constants.js`. Lifecycle state machine lives entirely in `Flower.js`. `GameScene` gets a `_spawnFlower(x, y)` helper for weighted-random type selection. No new files.

---

## Flower Types

Picked by weighted random on every spawn call.

| Type | Weight | Sap | Lifespan | Tint | Effect |
|------|--------|-----|----------|------|--------|
| COMMON | 65% | 5 | 60s | default (pink) | none |
| RARE | 20% | 10 | 45s | gold (0xffd700) | none — reward for exploring |
| AROMATIC | 15% | 5 | 60s | lavender (0xcc88ff) | attracts nearby butterflies |

**Aromatic mechanic:** `Butterfly.update()` already receives the `flowers` staticGroup. When a MATURE AROMATIC flower is within `FLOWER.AROMATIC_RADIUS` (180px) and the butterfly is not fleeing the player, the butterfly overrides its wander angle to fly toward that flower. This increases pollination frequency around aromatic flowers without any explicit trigger system.

---

## Lifecycle

Each flower passes through four states. The state machine runs in `Flower.update(time)`, called from `GameScene.update()`.

| State | Duration | Sap collectible | Visual |
|-------|----------|-----------------|--------|
| YOUNG | 3s | no | 60% scale, 50% alpha |
| MATURE | until sap depleted OR lifespan expires | yes | full size, type tint |
| OLD | 5s | yes (if sap remains) | grey tint (0x888888), alpha oscillates 0.3–1.0 via sin wave |
| DEAD | — | no | `destroy()` + respawn callback fires |

**Transitions:**
- YOUNG → MATURE: after `FLOWER.YOUNG_DURATION` (3000ms)
- MATURE → OLD: when `sapRemaining <= 0` OR `time >= _matureAt + typeLifespan`
- OLD → DEAD: after `FLOWER.OLD_DURATION` (5000ms)
- DEAD → new flower: `scene.time.delayedCall(FLOWER.RESPAWN_DELAY)` → `scene._spawnFlower(randomX, randomY)`

**Guarding collection:** existing `collectSap()` and `collectPollen()` return early when `_state === 'young'`. No changes needed in `GameScene` overlap callbacks.

---

## Constants Changes

```js
// Additions to existing FLOWER constant:
YOUNG_DURATION:  3000,   // ms in YOUNG state
OLD_DURATION:    5000,   // ms warning before death
RESPAWN_DELAY:  10000,   // ms before dead flower respawns elsewhere
AROMATIC_RADIUS: 180,    // butterfly attraction radius (px)

// New constant:
export const FLOWER_TYPES = {
  COMMON:   { weight: 65, sapAmount: 5,  lifespan: 60000, tint: null },
  RARE:     { weight: 20, sapAmount: 10, lifespan: 45000, tint: 0xffd700 },
  AROMATIC: { weight: 15, sapAmount: 5,  lifespan: 60000, tint: 0xcc88ff },
};
```

---

## Architecture

### `src/entities/Flower.js`
- Constructor: `(scene, x, y, type = 'COMMON')` — reads `FLOWER_TYPES[type]` for sap/lifespan/tint
- New properties: `_type`, `_state`, `_matureAt`, `_oldAt`, `_deadAt`, `_onDead` callback
- `update(time)`: state machine transitions + visual updates per state
- `collectSap(amount)` / `collectPollen()`: guard with `if (this._state === 'young') return 0`
- On DEAD: calls `this._onDead()` (injected by GameScene at spawn time) then `this.destroy()`

### `src/entities/Butterfly.js`
- In `update()`, priority order: (1) flee player, (2) attracted to nearest MATURE AROMATIC flower within `FLOWER.AROMATIC_RADIUS`, (3) random wander
- No new parameters — already receives `flowers` group

### `src/scenes/GameScene.js`
- `_spawnFlower(x, y)`: weighted type pick — `r = Phaser.Math.Between(1, 100)`: r≤65 → COMMON, r≤85 → RARE, else AROMATIC. Constructs `new Flower(scene, x, y, type)` with `_onDead` callback that schedules respawn at `Phaser.Math.Between(100, WORLD.WIDTH-100)` / `Between(100, WORLD.HEIGHT-100)`
- Replace `new Flower(this, x, y)` calls in `_spawnInitialFlowers()` and pollination `onSpawn` with `_spawnFlower(x, y)`
- Add flower update loop in `update()`: `this.flowers.getChildren().forEach(f => f.update(this._gameTime))`
- `_spawnFlower` also calls `this.flowers.refresh()` after add (required for staticGroup physics)

### No changes to:
- `PollinationSystem.js` — still fires `onSpawn({x, y})` callback, GameScene now routes that through `_spawnFlower`
- `WorkerBee.js` — uses `flower.sapRemaining` and `flower.claimedBy`, both preserved
- `HUD.js`, towers, `WaveManager.js`

---

## Field Stability

Initial count: 20. Each death schedules one respawn after 10s. Net flower count stays near 20 at steady state. Rare/Aromatic flowers shift position over time, rewarding exploration and creating map variety each run.
