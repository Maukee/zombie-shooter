export const WEAPONS = {
  pistol: {
    name: "M1911",
    label: "SEMI-AUTO PISTOL",
    capacity: 12,
    reserve: 120,
    damage: 48,
    head: 180,
    rate: 0.25,
    reload: 1.45,
    pellets: 1,
    spread: 0,
    auto: false,
    color: 0x6d7775,
  },
  rifle: {
    name: "AR-7",
    label: "ASSAULT RIFLE",
    capacity: 30,
    reserve: 180,
    damage: 65,
    head: 195,
    rate: 0.115,
    reload: 1.9,
    pellets: 1,
    spread: 0.004,
    auto: true,
    color: 0x66755c,
  },
  smg: {
    name: "VIPER-9",
    label: "RAPID-FIRE SMG",
    capacity: 40,
    reserve: 240,
    damage: 40,
    head: 120,
    rate: 0.075,
    reload: 1.5,
    pellets: 1,
    spread: 0.012,
    auto: true,
    color: 0x677b87,
  },
  shotgun: {
    name: "BREACH-12",
    label: "PUMP SHOTGUN",
    capacity: 8,
    reserve: 64,
    damage: 37,
    head: 75,
    rate: 0.8,
    reload: 2.3,
    pellets: 7,
    spread: 0.045,
    auto: false,
    color: 0x976847,
  },
  lmg: {
    name: "GOLIATH",
    label: "LIGHT MACHINE GUN",
    capacity: 75,
    reserve: 225,
    damage: 80,
    head: 230,
    rate: 0.15,
    reload: 3.4,
    pellets: 1,
    spread: 0.009,
    auto: true,
    color: 0x897f55,
  },
  arc: {
    name: "ARC-9",
    label: "EXPERIMENTAL ENERGY RIFLE",
    capacity: 24,
    reserve: 144,
    damage: 170,
    head: 340,
    rate: 0.24,
    reload: 2,
    pellets: 1,
    spread: 0,
    auto: true,
    color: 0x5be8e0,
  },
};
export const PERKS = {
  iron: {
    name: "IRON HEART",
    price: 600,
    color: 0xd45144,
    description: "200 max health",
    short: "200 HP",
  },
  quick: {
    name: "QUICK HANDS",
    price: 500,
    color: 0x65b785,
    description: "45% faster reloads",
    short: "FAST RELOAD",
  },
  rush: {
    name: "RUSH COLA",
    price: 400,
    color: 0xe6b94c,
    description: "25% faster movement",
    short: "SPRINT+",
  },
  recovery: {
    name: "SECOND WIND",
    price: 500,
    color: 0x68b9d9,
    description: "Regenerate sooner and twice as fast",
    short: "REGEN+",
  },
};
export const ENEMIES = {
  walker: {
    name: "WALKER",
    hp: 1,
    speed: 1,
    damage: 18,
    reward: 80,
    color: 0x606655,
    scale: 1,
  },
  runner: {
    name: "RUNNER",
    hp: 0.75,
    speed: 1.9,
    damage: 12,
    reward: 100,
    color: 0x8f493e,
    scale: 0.92,
  },
  brute: {
    name: "BRUTE",
    hp: 3.2,
    speed: 0.64,
    damage: 35,
    reward: 200,
    color: 0x485667,
    scale: 1.28,
  },
  spitter: {
    name: "SPITTER",
    hp: 1.25,
    speed: 0.85,
    damage: 14,
    reward: 150,
    color: 0x87a73d,
    scale: 1,
  },
};
export function enemyType(round, random = Math.random) {
  const n = random();
  if (round >= 4 && n < 0.14) return "brute";
  if (round >= 3 && n < 0.32) return "spitter";
  if (round >= 2 && n < 0.58) return "runner";
  return "walker";
}
export function mysteryWeapon(current, random = Math.random) {
  const pool = ["rifle", "smg", "shotgun", "lmg", "arc"].filter(
    (id) => id !== current,
  );
  const weighted = pool.flatMap((id) =>
    Array(id === "arc" ? 1 : id === "lmg" ? 2 : 4).fill(id),
  );
  return weighted[
    Math.min(weighted.length - 1, Math.floor(random() * weighted.length))
  ];
}
export const DOOR_COSTS = { armory: 500, infirmary: 750 };
export const BOX_COST = 650;
