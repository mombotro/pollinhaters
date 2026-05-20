export const WORLD = {
  WIDTH: 3840,
  HEIGHT: 2160,
};

export const DEPTH = {
  ENVIRONMENT: 1,   // grass deco, flowers, fountains
  ENTITY:      5,   // wasps, bees, towers, pickups, breakables
  BORDER:      6,   // map border overlay
  PLAYER:      10,  // player bee
  GHOST:       50,  // placement ghost
  HUD:         100,
  UI:          200,
  OVERLAY:     300,
};

export const BEE = {
  SPEED: 200,
  HP: 5,
  SAP_CAPACITY: 10,
  STINGER_RATE: 800,         // ms between auto-fire shots
  STINGER_SPEED: 400,
  STINGER_DAMAGE: 1,
  STINGER_RANGE: 200,
  RESPAWN_COST: 20,
  DASH_SPEED_MULTIPLIER: 4,
  DASH_DURATION: 200,
  DASH_COOLDOWN: 2000,
};

export const HIVE = {
  HP: 10,
  HONEY_STORAGE: 100,
  SAP_CONVERSION_RATE: 1,    // honey per sap unit
  SAP_CONVERSION_INTERVAL: 2000, // ms between conversions (converts 1 sap at a time)
};

export const WASP = {
  HUNTER_SPEED: 150,
  RAIDER_SPEED: 120,
  HP: 1,
  SAP_STEAL: 3,
  HONEY_STEAL: 5,
  DAMAGE: 1,
  HIT_COOLDOWN: 1000,        // ms between hits from same wasp
};

export const WAVE = {
  FIRST_WAVE_DELAY: 15000,
  WAVE_INTERVAL: 30000,
  BASE_COUNT: 3,
  COUNT_INCREMENT: 2,
};

export const FLOWER = {
  POLLINATION_RADIUS: 150,
  SPAWN_DELAY: 6000,
  INITIAL_COUNT: 45,
  MAX_COUNT: 60,
  YOUNG_DURATION:  3000,   // ms in YOUNG state before sap is collectible
  OLD_DURATION:    5000,   // ms in OLD state before flower dies
  RESPAWN_DELAY:  10000,   // ms after death before a new flower spawns elsewhere
  GRASS_DURATION:  1500,   // ms grass sprite lingers after flower picked clean
  AROMATIC_RADIUS: 180,    // px — butterfly attraction radius for AROMATIC flowers
};

export const FLOWER_TYPES = {
  COMMON:   { weight: 65, sapAmount: 5,  lifespan: 60000, frame: 0 },
  RARE:     { weight: 20, sapAmount: 10, lifespan: 45000, frame: 2 },
  AROMATIC: { weight: 15, sapAmount: 5,  lifespan: 60000, frame: 1 },
};

// Pure function — testable without Phaser. roll is an integer 1–100.
export function pickFlowerType(roll) {
  if (roll <= 65) return 'COMMON';
  if (roll <= 85) return 'RARE';
  return 'AROMATIC';
}

export const TIMER = {
  RUN_DURATION: 600000,      // 10 minutes
};

export const WORKER = {
  SPEED: 120,
  SAP_CAPACITY: 8,
  HP: 3,
  COST: 30,              // honey to recruit
};

export const TOWER = {
  STINGER_TURRET_COST: 40,
  STINGER_TURRET_RANGE: 180,
  STINGER_TURRET_DAMAGE: 1,
  STINGER_TURRET_RATE: 1000,   // ms between shots
  RESIN_TRAP_COST: 25,
  RESIN_TRAP_RADIUS: 60,
  RESIN_TRAP_SLOW: 0.4,        // speed multiplier for slowed wasps
  RESIN_TRAP_DURATION: 3000,   // ms slow lasts
  RESIN_TRAP_USES: 3,          // wasps slowed before trap breaks
  GUARD_POST_COST: 50,
  GUARD_POST_HP: 3,             // hits before guard post is destroyed
  GUARD_BEE_HP: 4,
  GUARD_BEE_SPEED: 130,
  GUARD_BEE_RANGE: 120,
  GUARD_BEE_DAMAGE: 1,
  GUARD_BEE_RATE: 900,         // ms between guard bee shots
  POISON_HONEY_COST: 20,
  POISON_HONEY_USES: 3,
  POISON_HONEY_RADIUS: 200,    // attraction radius for wasps
  POISON_HONEY_DAMAGE: 5,      // honey stolen reduced per delivery
};

export const UPGRADE = {
  MAX_LEVEL: 5,
};

export const XP = {
  BASE_REQ: 10,       // XP needed for level 2
  REQ_MULTIPLIER: 1.5, // How much requirement grows per level
  WASP_KILL: 2,       // XP dropped per wasp
};
export const BUTTERFLY = {
  SPEED: 100,
  COUNT: 6,
  FLEE_RADIUS: 200,
  FLEE_WASP_RADIUS: 280,
  DIRECTION_CHANGE: 5000,
  BOOST_RADIUS: 150,
  POLLINATE_RADIUS: 70,
  FOUNTAIN_WANDER_RADIUS: 500,
};

export const NECTAR_FOUNTAIN = {
  HP: 5,
  COST: 80,
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
  MAX_STRENGTH: 5,       // px/s maximum wind speed
  SHIFT_INTERVAL: 10000, // ms between wind direction/strength changes
  LERP_RATE: 0.004,      // per-frame lerp rate toward new wind target (~12s to fully shift)
};

export const SOLDIER = {
  SPEED: 200,
  ORBIT_RADIUS: 65,
  DAMAGE: 1,
  RANGE: 160,
  FIRE_RATE: 1000,   // ms between shots
  COST: 35,          // honey to recruit
  HP: 4,
};

export const ARCHER_WASP = {
  SPEED: 100,
  HP: 2,
  ATTACK_RANGE: 220,
  MIN_RANGE: 120,
  FIRE_RATE: 1800,
  DAMAGE: 1,
  STINGER_SPEED: 280,
};

export const WASP_HIVE = {
  HP: 100,
  REGEN_INTERVAL: 10000,
  REGEN_BASE: 0.5,
  REGEN_PER_HONEY: 0.1,
};

export const BREAKABLE = {
  HP: 3,                 // health of the breakable object
  SPAWN_DELAY: 20000,    // ms between spawn attempts
  MAX_COUNT: 10,         // maximum breakables on the map
};

export const PICKUP = {
  HEAL_AMOUNT: 1,        // hp restored
  HONEY_AMOUNT: 5,       // honey restored when recovered from killed carrier
  LIFETIME: 15000,       // ms before pickup disappears
};
