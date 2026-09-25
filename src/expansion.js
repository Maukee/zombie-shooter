import * as THREE from "three";
import { PERKS, DOOR_COSTS } from "./game-rules.js";

// The buildings are hollow shells, not solid boxes. Doors stay outside static batching.
export function buildExpansion({
  scene,
  box,
  sign,
  mat,
  concrete,
  steel,
  dark,
  wood,
  colliders,
}) {
  const rooms = [
    {
      id: "armory",
      name: "ARMORY",
      x: 6,
      z: -21.8,
      w: 16,
      d: 5.6,
      front: -19,
      doorX: 6,
      doorWidth: 4,
      price: DOOR_COSTS.armory,
    },
    {
      id: "infirmary",
      name: "INFIRMARY",
      x: -18.5,
      z: -18.7,
      w: 11,
      d: 10.6,
      front: -13.4,
      doorX: -18.5,
      doorWidth: 3.6,
      price: DOOR_COSTS.infirmary,
    },
  ];
  const doors = [];
  for (const r of rooms) {
    const height = 4.6,
      back = r.z - r.d / 2;
    box(0.45, height, r.d, concrete, r.x - r.w / 2, height / 2, r.z, true);
    box(0.45, height, r.d, concrete, r.x + r.w / 2, height / 2, r.z, true);
    box(r.w, height, 0.45, concrete, r.x, height / 2, back, true);
    const flank = (r.w - r.doorWidth) / 2;
    for (const side of [-1, 1])
      box(
        flank,
        height,
        0.45,
        concrete,
        r.doorX + side * (r.doorWidth / 2 + flank / 2),
        height / 2,
        r.front,
        true,
      );
    box(r.doorWidth, 1.2, 0.5, concrete, r.doorX, 4, r.front);
    box(r.w + 0.5, 0.25, r.d, steel, r.x, height + 0.1, r.z);
    box(r.w - 0.6, 0.04, r.d - 0.6, mat(0x424e4b), r.x, 0.03, r.z);
    const slab = box(
      r.doorWidth,
      3.5,
      0.3,
      mat(0x7b6749, 0.6, 0.5),
      r.doorX,
      1.75,
      r.front,
    );
    slab.userData.dynamic = true;
    const collider = {
      x: r.doorX,
      z: r.front,
      w: r.doorWidth / 2 + 0.38,
      d: 0.55,
      enabled: true,
    };
    colliders.push(collider);
    const label = sign(
      `${r.name} / ${r.price}`,
      r.doorWidth + 1,
      0.65,
      "#f4c788",
      "#1c282c",
    );
    label.position.set(r.doorX, 4, r.front + 0.28);
    scene.add(label);
    const door = {
      ...r,
      mesh: slab,
      collider,
      open: false,
      x: r.doorX,
      z: r.front + 1.1,
    };
    doors.push(door);
    const light = new THREE.PointLight(
      r.id === "armory" ? 0xffd9a5 : 0xa6d9d7,
      35,
      12,
      1.5,
    );
    light.position.set(r.x, 3.6, r.z);
    scene.add(light);
    const strip = mat(0xffecd3);
    strip.emissive = new THREE.Color(0xffdba8);
    strip.emissiveIntensity = 2;
    box(2, 0.08, 0.3, strip, r.x, 4.35, r.z);
    // Interior wall stripes and door threshold stay clear for navigation.
    for (const side of [-1, 1])
      box(
        0.025,
        0.15,
        r.d - 0.8,
        mat(0xd2b371),
        r.x + side * (r.w / 2 - 0.24),
        1.3,
        r.z,
      );
    const insideSign = sign(
      r.id === "armory" ? "FIELD ARMORY" : "MEDICAL / 02",
      3,
      0.55,
      "#cddbc9",
      "#253431",
    );
    insideSign.position.set(r.x, 3.1, back + 0.26);
    scene.add(insideSign);
  }
  // Furniture hugs the walls, leaving a continuous navigable aisle.
  const mattress = mat(0x758d82),
    rails = mat(0x778180, 0.4, 0.65);
  box(1.3, 0.18, 2.6, rails, -15, 0.5, -17.4, true);
  box(1.15, 0.19, 2.4, mattress, -15, 0.7, -17.4);
  box(0.95, 0.15, 0.5, mat(0xb8b8a0), -15, 0.85, -18.2);
  for (const z of [-18.6, -16.2]) {
    box(1.3, 0.8, 0.08, rails, -15, 0.5, z);
  }
  box(0.8, 1.5, 0.7, steel, -23, 0.75, -18.5, true);
  for (let y = 0.35; y < 1.5; y += 0.35) {
    box(0.65, 0.02, 0.04, dark, -23, y, -18.13);
    box(0.2, 0.035, 0.06, rails, -23, y + 0.12, -18.09);
  }
  box(3.8, 2.4, 0.35, wood, 6, 1.2, -24, true);
  for (let y of [0.35, 1.1, 2.05]) box(3.9, 0.09, 0.6, steel, 6, y, -23.85);
  for (let x of [4.7, 5.5, 6.3, 7.1]) {
    box(0.12, 0.12, 1.2, steel, x, 1.2, -23.7).rotation.x = 1.1;
    box(0.16, 0.38, 0.15, dark, x, 1, -23.55);
  }
  const mystery = {
    x: 1,
    z: -21.5,
    room: "armory",
    state: "idle",
    timer: 0,
    result: null,
  };
  box(2.4, 0.85, 0.9, wood, 1, 0.6, -22.7, true);
  for (const x of [0.05, 1.95]) box(0.13, 0.9, 0.96, steel, x, 0.6, -22.7);
  const lid = box(2.5, 0.16, 1, mat(0x9b754b, 0.6, 0.3), 1, 1.12, -22.7);
  lid.userData.dynamic = true;
  mystery.lid = lid;
  const glow = mat(0xead581);
  glow.emissive = new THREE.Color(0xf5be56);
  glow.emissiveIntensity = 2;
  const question = sign("?  ?  ?", 2.1, 0.5, "#ffe8a2", "#303125");
  question.position.set(1, 0.7, -22.23);
  scene.add(question);
  const display = sign("MYSTERY / 650", 3, 0.55, "#ffe8a2", "#2d2820");
  display.position.set(1, 2, -22.7);
  display.userData.dynamic = true;
  scene.add(display);
  mystery.display = display;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.8, 12, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xefce71,
      transparent: true,
      opacity: 0.055,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  beam.position.set(1, 10, -22.7);
  beam.userData.dynamic = true;
  scene.add(beam);
  const machines = [];
  const positions = {
    iron: [-22, -21.7, "infirmary"],
    quick: [11, -22.7, "armory"],
    rush: [-15, -21.7, "infirmary"],
    recovery: [-22, -16, "infirmary"],
  };
  for (const [id, perk] of Object.entries(PERKS)) {
    const [x, z, room] = positions[id];
    const paint = mat(perk.color, 0.5, 0.3);
    box(1.3, 2.3, 0.75, paint, x, 1.15, z, true);
    box(1.05, 0.7, 0.06, dark, x, 1.25, z + 0.4);
    const accent = mat(perk.color);
    accent.emissive = new THREE.Color(perk.color);
    accent.emissiveIntensity = 0.8;
    box(1.05, 0.12, 0.07, accent, x, 1.76, z + 0.4);
    box(0.45, 0.14, 0.1, steel, x, 0.7, z + 0.45);
    const label = sign(perk.name, 1.25, 0.35, "#fff5dc", "#293032");
    label.position.set(x, 2.05, z + 0.4);
    scene.add(label);
    // A visible bottle silhouette in the dispensing window.
    const bottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.1, 0.35, 8),
      accent,
    );
    bottle.position.set(x, 1.22, z + 0.47);
    scene.add(bottle);
    const price = sign(
      `${perk.price} ESSENCE`,
      1.1,
      0.22,
      "#edeacb",
      "#242b25",
    );
    price.position.set(x, 0.42, z + 0.4);
    scene.add(price);
    machines.push({ id, room, x, z: z + 1.2, accent });
  }
  const upgrade = { x: 11, z: -20.5, room: "armory" };
  const wallGun = sign("AR-7 / 500", 2, 0.5, "#aec9d3", "#233038");
  wallGun.position.set(13.72, 2.3, -20.7);
  wallGun.rotation.y = -Math.PI / 2;
  scene.add(wallGun);
  return { rooms, doors, mystery, machines, upgrade };
}
