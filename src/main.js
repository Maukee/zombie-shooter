import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { MouseControls } from "./controls.js";
import { Navigation } from "./navigation.js";
import { buildExpansion } from "./expansion.js";
import {
  WEAPONS,
  PERKS,
  ENEMIES,
  BOX_COST,
  enemyType,
  mysteryWeapon,
} from "./game-rules.js";

const $ = (id) => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x25343d);
scene.fog = new THREE.FogExp2(0x25343d, 0.019);
const renderer = new THREE.WebGLRenderer({
  canvas: $("game"),
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.55;
const camera = new THREE.PerspectiveCamera(
  70,
  innerWidth / innerHeight,
  0.08,
  150,
);
camera.rotation.order = "YXZ";
scene.add(camera);
const ambient = new THREE.HemisphereLight(0xbad6eb, 0x777363, 2.25);
scene.add(ambient);
const moon = new THREE.DirectionalLight(0xd1e2ef, 3.2);
moon.position.set(-15, 30, -10);
moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
Object.assign(moon.shadow.camera, {
  left: -32,
  right: 32,
  top: 32,
  bottom: -32,
  near: 1,
  far: 100,
});
moon.shadow.bias = -0.0005;
scene.add(moon);
let renderQuality = 1.5;
function mat(c, rough = 1, metal = 0) {
  return new THREE.MeshStandardMaterial({
    color: c,
    roughness: rough,
    metalness: metal,
  });
}
function texture(type) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = type === "ground" ? "#303930" : "#555c4d";
  x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 18000; i++) {
    const v = Math.random() * 70;
    x.fillStyle = `rgba(${v + 45},${v + 49},${v + 40},${Math.random() * 0.35})`;
    x.fillRect(
      Math.random() * 256,
      Math.random() * 256,
      Math.random() * 4 + 1,
      Math.random() * 3 + 1,
    );
  }
  if (type === "wall") {
    for (let y = 0; y < 256; y += 32) {
      x.fillStyle = "#262d2466";
      x.fillRect(0, y, 256, 2);
      for (let j = 0; j < 5; j++)
        x.fillRect(j * 64 + (y % 64 ? 32 : 0), y, 2, 32);
    }
  } else {
    for (let i = 0; i < 9; i++) {
      x.strokeStyle = "#151e1880";
      x.beginPath();
      let a = Math.random() * 256,
        b = Math.random() * 256;
      x.moveTo(a, b);
      for (let j = 0; j < 5; j++) {
        a += Math.random() * 40 - 20;
        b += Math.random() * 30;
        x.lineTo(a, b);
      }
      x.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(type === "ground" ? 25 : 3, type === "ground" ? 25 : 2);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const concrete = mat(0x8c9380);
concrete.map = texture("wall");
const groundmat = mat(0x7a8678, 0.8, 0.12);
groundmat.map = texture("ground");
const steel = mat(0x303b34, 0.65, 0.65),
  dark = mat(0x131c19, 0.75, 0.4),
  rust = mat(0x685446, 0.9, 0.4),
  wood = mat(0x4a4734),
  yellow = mat(0xa1974d),
  redmat = mat(0x712f24);
const colliders = [];
function box(w, h, d, m, x, y, z, solid = false) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  scene.add(o);
  if (solid) colliders.push({ x, z, w: w / 2 + 0.38, d: d / 2 + 0.38 });
  return o;
}
function cylinder(r1, r2, h, m, x, y, z) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 10), m);
  o.position.set(x, y, z);
  o.castShadow = true;
  scene.add(o);
  return o;
}
function sign(text, w, h, color = "#c7ccad", bg = "#25312a") {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = bg;
  x.fillRect(0, 0, 1024, 256);
  x.strokeStyle = color;
  x.lineWidth = 4;
  x.strokeRect(12, 12, 1000, 232);
  x.fillStyle = color;
  x.font = "bold 110px monospace";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(text, 512, 135, 940);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({
      map: t,
      roughness: 1,
      emissive: color,
      emissiveIntensity: 0.07,
    }),
  );
}
box(110, 0.3, 110, groundmat, 0, -0.17, 0);
// Containment walls and derelict architecture.
box(49, 5, 1, concrete, 0, 2.5, -25, true);
box(49, 5, 1, concrete, 0, 2.5, 25, true);
box(1, 5, 50, concrete, -25, 2.5, 0, true);
box(1, 5, 50, concrete, 25, 2.5, 0, true);
for (let i = -24; i <= 24; i += 6) {
  box(0.5, 5.7, 1.4, concrete, i, 2.8, -25);
  box(0.5, 5.7, 1.4, concrete, i, 2.8, 25);
  for (let k = 0; k < 3; k++) {
    const line = new THREE.Mesh(
      new THREE.CylinderGeometry(0.017, 0.017, 6, 4),
      rust,
    );
    line.rotation.z = Math.PI / 2;
    line.position.set(i + 3, 5.2 + k * 0.23, -25);
    scene.add(line);
  }
}
box(26, 13, 9, concrete, 5, 6.5, -30);
box(28, 0.4, 10, steel, 5, 13, -30);
for (let x = -6; x < 18; x += 3.5)
  for (let y = 5.5; y < 13; y += 3) {
    box(1.65, 2.05, 0.15, steel, x, y, -25.4);
    box(
      1.4,
      1.8,
      0.18,
      mat(Math.random() > 0.75 ? 0x5d6850 : 0x14251f),
      x,
      y,
      -25.28,
    );
    box(0.07, 2, 0.2, steel, x, y, -25.16);
    box(1.6, 0.07, 0.2, steel, x, y, -25.16);
  }

box(8, 10, 17, concrete, 29, 5, -14);
for (let y = 3; y < 10; y += 3)
  for (let z = -21; z < -5; z += 3) {
    box(0.15, 1.8, 1.5, dark, 24.9, y, z);
  }
// Accessible interiors replace the old solid bunker/building meshes.
const expansion = buildExpansion({
  scene,
  box,
  sign,
  mat,
  concrete,
  steel,
  dark,
  wood,
  colliders,
});
const { rooms, doors, mystery, machines, upgrade } = expansion;
const compoundSign = sign("QUARANTINE  /  07", 10, 0.9, "#b8bea0", "#30372b");
compoundSign.position.set(6, 5.12, -19.42);
scene.add(compoundSign);
const warning = sign("RESTRICTED AREA", 3, 0.6, "#b5a062", "#292d23");
warning.position.set(-0.4, 2.8, -19.4);
scene.add(warning);
const num = sign("07", 2.8, 1.8, "#a6ac8c", "#4e5546");
num.position.set(12, 3.1, -19.4);
scene.add(num);
// Fences: thin instanced metal lattice.
const fenceGroup = new THREE.Group();
scene.add(fenceGroup);
for (let side of [-1, 1]) {
  const z = side === 1 ? -8 : 16;
  const x = side === 1 ? 17 : -17;
  colliders.push({ x: x + 6, z, w: 6.38, d: 0.4 });
  for (let j = 0; j <= 12; j += 3) box(0.09, 3.7, 0.09, steel, x + j, 1.85, z);
  for (let h of [0.25, 3.4]) box(12, 0.055, 0.055, steel, x + 6, h, z);
  const geo = new THREE.CylinderGeometry(0.009, 0.009, 4.5, 3);
  for (let i = 0; i < 38; i++) {
    for (let dir of [-1, 1]) {
      const m = new THREE.Mesh(geo, steel);
      m.position.set(x + i * 0.33, 1.8, z);
      m.rotation.z = dir * 0.48;
      fenceGroup.add(m);
    }
  }
}
// Containers and cover.
function container(x, z, rotation = 0) {
  const group = new THREE.Group();
  const m = mat(0x394a43, 0.8, 0.4);
  const body = new THREE.Mesh(new THREE.BoxGeometry(7, 2.7, 3), m);
  body.position.y = 1.35;
  group.add(body);
  for (let i = -3.3; i <= 3.3; i += 0.3) {
    for (const side of [-1, 1]) {
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 2.55, 0.09),
        steel,
      );
      rib.position.set(i, 1.35, side * 1.54);
      group.add(rib);
    }
  }
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  scene.add(group);
  colliders.push({ x, z, w: rotation ? 1.95 : 3.9, d: rotation ? 3.9 : 1.95 });
  group.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
}
container(-14, -6, 0.0);
container(18, 8, Math.PI / 2);
function crate(x, z, size = 1.3) {
  box(size, size, size, wood, x, size / 2, z, true);
  for (let a of [-1, 1]) {
    box(0.1, size + 0.05, size + 0.06, rust, x + a * size * 0.38, size / 2, z);
    box(size + 0.06, 0.1, size + 0.06, rust, x, size * (a * 0.36 + 0.5), z);
  }
}
crate(-8, -12);
crate(-9.6, -12);
crate(13, 14);
crate(13, 15.6);
crate(-17, 7);
for (const [x, z] of [
  [-3, -7],
  [8, 9],
  [-9, 15],
]) {
  box(3.8, 0.9, 0.9, concrete, x, 0.45, z, true);
  for (let j = 0; j < 7; j++) {
    const stripe = box(
      0.23,
      0.8,
      0.015,
      j % 2 ? dark : yellow,
      x - 1.45 + j * 0.48,
      0.47,
      z + 0.459,
    );
    stripe.rotation.z = -0.25;
  }
}
for (const [x, z] of [
  [-11, -12],
  [-12, -11],
  [14, -15],
  [15, -15],
  [-19, 8],
]) {
  cylinder(0.4, 0.43, 1.25, rust, x, 0.625, z);
  for (let y of [0.15, 0.95]) cylinder(0.435, 0.435, 0.04, steel, x, y, z);
  colliders.push({ x, z, w: 0.65, d: 0.65 });
}
// Abandoned military truck.
box(2.7, 0.8, 5.7, steel, -14, 1.05, 17, true);
box(2.65, 1.7, 2.1, mat(0x4a5341), -14, 2, 15.5);
box(2.3, 0.85, 0.04, dark, -14, 2.2, 14.43);
box(2.5, 1.7, 3.3, wood, -14, 2.1, 18.3);
for (let x of [-15.45, -12.55])
  for (let z of [15.6, 19]) {
    const w = cylinder(0.57, 0.57, 0.35, dark, x, 0.65, z);
    w.rotation.z = Math.PI / 2;
  }
// Street markings and scattered rubble.
const marking = mat(0x858567);
for (let z = -22; z < 23; z += 5) {
  box(0.12, 0.012, 2.1, marking, 1, 0.007, z);
  box(0.12, 0.012, 2.1, marking, 1.35, 0.007, z);
}
for (let i = 0; i < 85; i++) {
  const x = (Math.random() - 0.5) * 46,
    z = (Math.random() - 0.5) * 46;
  const r = box(
    0.1 + Math.random() * 0.35,
    0.06 + Math.random() * 0.12,
    0.2 + Math.random() * 0.35,
    i % 3 ? concrete : wood,
    x,
    0.04,
    z,
  );
  r.rotation.y = Math.random() * 6;
}
for (let i = 0; i < 14; i++) {
  const puddle = new THREE.Mesh(
    new THREE.CircleGeometry(0.6 + Math.random() * 2, 20),
    mat(0x24362f, 0.18, 0.55),
  );
  puddle.rotation.x = -Math.PI / 2;
  puddle.scale.y = 0.4;
  puddle.position.set(
    (Math.random() - 0.5) * 40,
    0.012,
    (Math.random() - 0.5) * 40,
  );
  scene.add(puddle);
}
function lamp(x, z) {
  cylinder(0.08, 0.13, 7, steel, x, 3.5, z);
  box(1.7, 0.1, 0.1, steel, x + 0.7, 7, z);
  const glow = mat(0xf0edc0);
  glow.emissive = new THREE.Color(0xdde8a0);
  glow.emissiveIntensity = 4;
  box(0.75, 0.07, 0.35, glow, x + 1.3, 6.9, z);
  const light = new THREE.SpotLight(0xdbe1b0, 95, 24, 0.8, 0.8, 1.4);
  light.position.set(x + 1.3, 6.8, z);
  light.target.position.set(x + 1.3, 0, z - 1);
  scene.add(light, light.target);
}
lamp(-10, -18);
lamp(17, -17);
lamp(-18, 10);
lamp(18, 19);
const redLight = new THREE.PointLight(0xe3552c, 14, 9, 1.6);
redLight.position.set(6, 4.25, -18.7);
scene.add(redLight);
const redBulb = mat(0xd8532e);
redBulb.emissive = new THREE.Color(0xe65028);
redBulb.emissiveIntensity = 3;
box(0.18, 0.22, 0.15, redBulb, 6, 4.2, -19.1);
// Supply station.
const station = new THREE.Group();
station.position.set(-21, 0, -9);
scene.add(station);
function stationPart(w, h, d, m, x, y, z) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  station.add(o);
  return o;
}
stationPart(1.5, 2.5, 0.8, steel, 0, 1.25, 0);
const screenmat = mat(0x92b449);
screenmat.emissive = new THREE.Color(0x8ebd47);
screenmat.emissiveIntensity = 0.9;
stationPart(1.2, 0.6, 0.04, screenmat, 0, 1.95, 0.42);
stationPart(1.1, 0.8, 0.05, dark, 0, 0.9, 0.42);
const supply = sign("RESUPPLY", 1.4, 0.32, "#d8ef69", "#1b2a16");
supply.position.set(-21, 2.8, -8.56);
scene.add(supply);
const sl = new THREE.PointLight(0xc2e870, 6, 5);
sl.position.set(-21, 2, -8);
scene.add(sl);
colliders.push({ x: -21, z: -9, w: 1.1, d: 0.8 });
// Distant skyline and tower.
for (let i = 0; i < 18; i++) {
  let x = (i - 9) * 7;
  const height = 8 + Math.random() * 14;
  box(6, height, 8, mat(0x253029), x, height / 2, -42 - Math.random() * 8);
}
for (const x of [18, 21]) cylinder(0.08, 0.2, 22, steel, x, 11, -32);
for (let y = 3; y < 23; y += 3) {
  box(3, 0.09, 0.09, steel, 19.5, y, -32);
  const b = box(0.055, 4.2, 0.055, steel, 19.5, y - 1.5, -32);
  b.rotation.z = 0.78;
}
box(6, 0.08, 0.08, steel, 19.5, 22, -32);
const beacon = new THREE.PointLight(0xee4524, 5, 12);
beacon.position.set(19.5, 23, -32);
scene.add(beacon);
// Soft drifting ash, one draw call.
const ashGeo = new THREE.BufferGeometry();
const ashPos = new Float32Array(600 * 3);
for (let i = 0; i < ashPos.length; i += 3) {
  ashPos[i] = (Math.random() - 0.5) * 65;
  ashPos[i + 1] = Math.random() * 16;
  ashPos[i + 2] = (Math.random() - 0.5) * 65;
}
ashGeo.setAttribute("position", new THREE.BufferAttribute(ashPos, 3));
const ash = new THREE.Points(
  ashGeo,
  new THREE.PointsMaterial({
    color: 0xaabd93,
    size: 0.035,
    transparent: true,
    opacity: 0.36,
  }),
);
scene.add(ash);
// View model.
const gun = new THREE.Group();
camera.add(gun);
gun.position.set(0.3, -0.29, -0.5);
const gunmetal = mat(0x333e3b, 0.32, 0.85),
  gunblack = mat(0x111a17, 0.7, 0.3),
  skin = mat(0x98826a),
  sleeve = mat(0x3f4935);
function gunBox(w, h, d, m, x, y, z) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  gun.add(o);
  return o;
}
gunBox(0.095, 0.11, 0.34, gunmetal, 0, 0, -0.12);
gunBox(0.075, 0.07, 0.26, gunblack, 0, -0.066, -0.13);
const grip = gunBox(0.078, 0.17, 0.11, gunblack, 0, -0.11, 0.015);
grip.rotation.x = -0.22;
gunBox(0.014, 0.025, 0.035, gunblack, 0, 0.063, -0.26);
gunBox(0.08, 0.025, 0.025, gunblack, 0, 0.065, 0.028);
gunBox(0.1, 0.105, 0.14, skin, 0.005, -0.1, 0.07);
const arm = gunBox(0.13, 0.14, 0.42, sleeve, 0.03, -0.15, 0.32);
arm.rotation.x = -0.16;
const arm2 = gunBox(0.12, 0.13, 0.35, sleeve, -0.15, -0.15, 0.28);
arm2.rotation.y = -0.5;
const muzzle = new THREE.Mesh(
  new THREE.ConeGeometry(0.07, 0.22, 5),
  new THREE.MeshBasicMaterial({
    color: 0xffde85,
    transparent: true,
    opacity: 0.9,
  }),
);
muzzle.rotation.x = -Math.PI / 2;
muzzle.position.set(0, 0, -0.38);
gun.add(muzzle);
muzzle.visible = false;
const muzzleLight = new THREE.PointLight(0xffd397, 0, 5);
muzzleLight.position.set(0, 0, -0.5);
gun.add(muzzleLight);
gun.visible = false;
// Shared zombie geometry and materials.
const zSkin = mat(0x9b9d7d),
  zRot = mat(0x566351),
  zShirt = mat(0x606655),
  zPants = mat(0x30372e),
  zBlood = mat(0x5c2920),
  eyeMat = new THREE.MeshBasicMaterial({ color: 0xffa852 });
const zGeos = {
  head: new THREE.BoxGeometry(0.32, 0.4, 0.3),
  body: new THREE.BoxGeometry(0.55, 0.68, 0.32),
  arm: new THREE.BoxGeometry(0.17, 0.64, 0.19),
  leg: new THREE.BoxGeometry(0.21, 0.68, 0.22),
  wound: new THREE.BoxGeometry(0.18, 0.3, 0.02),
  eye: new THREE.BoxGeometry(0.055, 0.03, 0.022),
};
const zombies = [];
const spitterSacMaterial = new THREE.MeshStandardMaterial({
  color: 0x93c638,
  emissive: 0x6b9321,
  emissiveIntensity: 0.7,
});
const enemyMaterials = Object.fromEntries(
  Object.entries(ENEMIES).map(([id, v]) => [id, mat(v.color)]),
);
function zombie(x, z, decor = false, type = "walker") {
  const stats = ENEMIES[type];
  const root = new THREE.Group();
  const body = new THREE.Mesh(zGeos.body, enemyMaterials[type]);
  body.position.y = 1.12;
  root.add(body);
  const head = new THREE.Mesh(zGeos.head, zSkin);
  head.position.set(0, 1.68, -0.015);
  head.rotation.z = 0.1;
  root.add(head);
  for (const e of [-1, 1]) {
    const eye = new THREE.Mesh(zGeos.eye, eyeMat);
    eye.position.set(e * 0.084, 1.72, -0.174);
    eye.userData.headshot = true;
    root.add(eye);
  }
  const legs = [],
    arms = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s * 0.15, 0.8, 0);
    const lm = new THREE.Mesh(zGeos.leg, zPants);
    lm.position.y = -0.32;
    leg.add(lm);
    root.add(leg);
    legs.push(leg);
    const a = new THREE.Group();
    a.position.set(s * 0.37, 1.39, 0);
    const am = new THREE.Mesh(zGeos.arm, s === 1 ? zRot : zSkin);
    am.position.y = -0.26;
    a.add(am);
    a.rotation.x = -0.8;
    root.add(a);
    arms.push(a);
  }
  const wound = new THREE.Mesh(zGeos.wound, zBlood);
  wound.position.set(0.1, 1.15, -0.175);
  root.add(wound);
  root.position.set(x, 0, z);
  root.scale.set(stats.scale, stats.scale, stats.scale);
  if (type === "brute") {
    const armor = new THREE.Mesh(zGeos.body, steel);
    armor.scale.set(1.14, 0.65, 1.3);
    armor.position.set(0, 1.2, -0.02);
    root.add(armor);
  }
  if (type === "spitter") {
    const sac = new THREE.Mesh(zGeos.head, spitterSacMaterial);
    sac.position.set(0, 1.22, 0.25);
    root.add(sac);
  }
  scene.add(root);
  root.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  const obj = {
    root,
    head,
    body,
    legs,
    arms,
    hp: (100 + (decor ? 0 : round * 9)) * stats.hp,
    type,
    stats,
    stuckTime: 0,
    checkTime: 0,
    lastX: x,
    lastZ: z,
    spitCooldown: 2,
    bestDistance: Infinity,
    phase: Math.random() * 6,
    attack: 0,
    decor,
    dead: false,
  };
  root.traverse((o) => (o.userData.zombie = obj));
  zombies.push(obj);
  return obj;
}
zombie(8, -12, true);
zombie(13, -8, true);
zombie(-2, -16, true);
let mode = "menu",
  round = 0,
  score = 0,
  kills = 0,
  health = 100,
  ammo = 12,
  reserve = 120,
  capacity = 12,
  upgraded = false,
  reloading = 0,
  spawnLeft = 0,
  spawnTimer = 0,
  intermission = 0,
  lastDamage = -100,
  gameTime = 0,
  shotCooldown = 0,
  recoil = 0,
  hitTimer = 0,
  announceTimer = 0,
  messageTimer = 0,
  sensitivity = 1,
  muted = false,
  mouseDown = false,
  ads = false;
let weaponId = "pistol",
  maxHealth = 100,
  navigationTimer = 0,
  recoveredEnemies = 0;
const ownedPerks = new Set();
const drops = [],
  projectiles = [];
let powerupTimer = 0,
  powerup = null;
const nav = new Navigation(blocked, colliders);
const acidGeometry = new THREE.SphereGeometry(0.15, 8, 6);
const acidMaterial = new THREE.MeshBasicMaterial({ color: 0xb2ec4e });
const dropGeometry = new THREE.OctahedronGeometry(0.28);
const dropMaterials = {
  ammo: new THREE.MeshStandardMaterial({
    color: 0x7addc8,
    emissive: 0x3fa991,
    emissiveIntensity: 1,
  }),
  double: new THREE.MeshStandardMaterial({
    color: 0xf1ca68,
    emissive: 0xbe7d34,
    emissiveIntensity: 1,
  }),
};
let best = 0;
try {
  best = +localStorage.getItem("df-best") || 0;
} catch {}
$("best-wave").textContent = best ? String(best).padStart(2, "0") : "—";
const keys = new Set();
let yaw = 0,
  pitch = 0,
  velocityY = 0,
  playerY = 1.72;
const controls = new MouseControls(renderer.domElement, {
  onLook(dx, dy) {
    if (mode !== "playing") return;
    yaw -= dx * 0.002 * sensitivity * (ads ? 0.6 : 1);
    pitch = THREE.MathUtils.clamp(
      pitch - dy * 0.002 * sensitivity * (ads ? 0.6 : 1),
      -1.35,
      1.35,
    );
  },
  onUnlock: () => pause(),
  onMode: (fallback) => $("input-status").classList.toggle("hidden", !fallback),
});
for (const link of document.querySelectorAll(".standalone"))
  link.href = location.href;
let audio;
function sound(kind) {
  if (muted) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
    const t = audio.currentTime;
    const gain = audio.createGain();
    gain.connect(audio.destination);
    if (kind === "shot" || kind === "hit") {
      const buffer = audio.createBuffer(
        1,
        audio.sampleRate * 0.15,
        audio.sampleRate,
      );
      const a = buffer.getChannelData(0);
      for (let i = 0; i < a.length; i++)
        a[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / a.length, 3);
      const source = audio.createBufferSource();
      source.buffer = buffer;
      const filter = audio.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = kind === "shot" ? 2200 : 700;
      source.connect(filter);
      filter.connect(gain);
      gain.gain.setValueAtTime(kind === "shot" ? 0.22 : 0.3, t);
      source.start();
    } else {
      const osc = audio.createOscillator();
      osc.type = kind === "wave" ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(
        kind === "wave" ? 95 : kind === "reload" ? 350 : 180,
        t,
      );
      osc.frequency.exponentialRampToValueAtTime(
        kind === "wave" ? 45 : 80,
        t + 0.35,
      );
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      osc.start();
      osc.stop(t + 0.5);
    }
  } catch {}
}
function updateHUD() {
  $("round").textContent = String(round).padStart(2, "0");
  $("score").textContent = String(score).padStart(5, "0");
  $("kills").textContent = kills;
  $("health").textContent = Math.ceil(health);
  $("health-bar").style.width = (health / maxHealth) * 100 + "%";
  $("max-health").textContent = maxHealth;
  $("perk-strip").innerHTML = [...ownedPerks]
    .map(
      (id) =>
        `<span style="--perk:#${PERKS[id].color.toString(16)}">${PERKS[id].short}</span>`,
    )
    .join("");
  $("ammo").textContent = ammo;
  $("reserve").textContent = reserve;
  const weapon = WEAPONS[weaponId];
  $("weapon-name").innerHTML = `${weapon.name} <span>${weapon.label}</span>`;
  $("reload-label").textContent = reloading
    ? "RELOADING …"
    : `${weapon.auto ? "HOLD TO FIRE" : "SEMI-AUTO"} • ${ownedPerks.has("quick") ? "QUICK HANDS" : "STANDARD"}`;
}
function message(text) {
  $("hud-message").textContent = text;
  messageTimer = 3;
}
function announce(label, title) {
  $("announcement").innerHTML = `<small>${label}</small><b>${title}</b>`;
  $("announcement").style.opacity = 1;
  announceTimer = 3.4;
}
function clearZombies() {
  for (const z of zombies) scene.remove(z.root);
  zombies.length = 0;
}
function begin() {
  clearZombies();
  for (const d of doors) {
    d.open = false;
    d.collider.enabled = true;
    d.mesh.position.y = 1.75;
  }
  resetMystery();
  mystery.lid.rotation.x = 0;
  for (const d of [...drops, ...projectiles]) scene.remove(d.mesh);
  drops.length = 0;
  projectiles.length = 0;
  recoveredEnemies = 0;
  navigationTimer = 0;
  nav.rebuild();
  nav.update(0, 11);
  round = 0;
  score = 0;
  kills = 0;
  maxHealth = 100;
  ownedPerks.clear();
  powerup = null;
  powerupTimer = 0;
  weaponId = "pistol";
  health = 100;
  ammo = 12;
  reserve = 120;
  capacity = 12;
  upgraded = false;
  reloading = 0;
  spawnLeft = 0;
  intermission = 0;
  gameTime = 0;
  lastDamage = -100;
  shotCooldown = 0;
  playerY = 1.72;
  velocityY = 0;
  yaw = 0;
  pitch = 0;
  camera.position.set(0, 1.72, 11);
  camera.rotation.set(0, 0, 0);
  gun.visible = true;
  mode = "playing";
  $("menu").classList.add("hidden");
  $("death").classList.add("hidden");
  $("pause").classList.add("hidden");
  $("hud").classList.remove("hidden");
  keys.clear();
  mouseDown = false;
  ads = false;
  recoil = 0;
  hitTimer = 0;
  messageTimer = 0;
  muzzle.visible = false;
  muzzleLight.intensity = 0;
  $("hitmarker").style.opacity = 0;
  $("hud-message").textContent = "";
  $("interaction").textContent = "";
  $("damage").style.opacity = 0;
  startWave();
  const first = zombie(0, -5);
  first.hp = 100;
  spawnLeft--;
  updateHUD();
  lock();
}
function lock() {
  controls.start();
}
function pause() {
  if (mode !== "playing") return;
  mode = "paused";
  mouseDown = false;
  ads = false;
  keys.clear();
  controls.stop();
  $("pause").classList.remove("hidden");
}
function resume() {
  mode = "playing";
  $("pause").classList.add("hidden");
  mouseDown = false;
  ads = false;
  keys.clear();
  lock();
}
function back() {
  mode = "menu";
  controls.stop();
  mouseDown = false;
  ads = false;
  keys.clear();
  $("hud").classList.add("hidden");
  $("pause").classList.add("hidden");
  $("death").classList.add("hidden");
  $("menu").classList.remove("hidden");
  $("damage").style.opacity = 0;
  gun.visible = false;
  clearZombies();
  zombie(8, -12, true);
  zombie(13, -8, true);
  zombie(-2, -16, true);
}
function die() {
  mode = "dead";
  mouseDown = false;
  ads = false;
  controls.stop();
  if (round > best) {
    best = round;
    try {
      localStorage.setItem("df-best", best);
    } catch {}
    $("best-wave").textContent = String(best).padStart(2, "0");
  }
  $("death-stats").innerHTML =
    `<span>ROUND REACHED<b>${String(round).padStart(2, "0")}</b></span><span>ELIMINATIONS<b>${kills}</b></span><span>ESSENCE<b>${score}</b></span>`;
  $("death").classList.remove("hidden");
  $("damage").style.opacity = 0;
}
function startWave() {
  round++;
  spawnLeft = 5 + round * 3;
  spawnTimer = 0.5;
  intermission = 0;
  reserve += round > 1 ? 24 : 0;
  health = Math.min(maxHealth, health + 25);
  $("wave-state").textContent = "CONTAINMENT BREACH";
  announce(
    round === 2
      ? "RUNNERS INCOMING"
      : round === 3
        ? "ACID SPITTERS INCOMING"
        : round === 4
          ? "ARMORED BRUTES INCOMING"
          : "THEY HEARD YOU",
    `ROUND ${String(round).padStart(2, "0")}`,
  );
  sound("wave");
  updateHUD();
}
function reload() {
  if (reloading || ammo === capacity || reserve <= 0) return;
  reloading = WEAPONS[weaponId].reload * (ownedPerks.has("quick") ? 0.55 : 1);
  sound("reload");
  updateHUD();
}
const raycaster = new THREE.Raycaster();
const direction = new THREE.Vector3();
const temp = new THREE.Vector3();
const solidMeshes = [];
scene.updateMatrixWorld(true);
scene.traverse((o) => {
  if (
    o.isMesh &&
    !o.userData.zombie &&
    !o.userData.dynamic &&
    !gun.children.includes(o)
  )
    solidMeshes.push(o);
});
// Bake the static environment into material batches to minimize draw calls.
const batches = new Map();
for (const mesh of solidMeshes) {
  if (!batches.has(mesh.material)) batches.set(mesh.material, []);
  batches.get(mesh.material).push(mesh);
}
solidMeshes.length = 0;
for (const [material, meshes] of batches) {
  const geometries = meshes.map((mesh) =>
    mesh.geometry.clone().applyMatrix4(mesh.matrixWorld),
  );
  const geometry = mergeGeometries(geometries, false);
  for (const g of geometries) g.dispose();
  if (!geometry) {
    solidMeshes.push(...meshes);
    continue;
  }
  const batch = new THREE.Mesh(geometry, material);
  batch.castShadow = true;
  batch.receiveShadow = true;
  scene.add(batch);
  solidMeshes.push(batch);
  for (const mesh of meshes) {
    mesh.removeFromParent();
    mesh.geometry.dispose();
  }
}
solidMeshes.push(...doors.map((d) => d.mesh));
function shoot() {
  if (mode !== "playing" || shotCooldown > 0 || reloading) return;
  if (ammo <= 0) {
    reload();
    return;
  }
  ammo--;
  const weapon = WEAPONS[weaponId];
  shotCooldown = weapon.rate;
  recoil = weaponId === "shotgun" ? 0.15 : 0.085;
  muzzle.visible = true;
  muzzle.rotation.y = Math.random() * 6;
  muzzleLight.intensity = 5;
  sound("shot");
  camera.updateMatrixWorld();
  camera.getWorldDirection(direction);
  const targets = [];
  for (const z of zombies)
    if (!z.dead)
      z.root.traverse((o) => {
        if (o.isMesh) targets.push(o);
      });
  for (let pellet = 0; pellet < weapon.pellets; pellet++) {
    const spread = weapon.spread * (ads ? 0.45 : 1);
    const dir = direction
      .clone()
      .add(
        new THREE.Vector3(
          (Math.random() - 0.5) * spread * 2,
          (Math.random() - 0.5) * spread * 2,
          (Math.random() - 0.5) * spread * 2,
        ),
      )
      .normalize();
    raycaster.set(camera.position, dir);
    raycaster.far = weaponId === "shotgun" ? 24 : 65;
    const hits = raycaster.intersectObjects(targets, false);
    const hit = hits.find((h) => !h.object.userData.zombie.dead);
    if (!hit) continue;
    const wall = raycaster.intersectObjects(solidMeshes, false)[0];
    if (wall && wall.distance < hit.distance) continue;
    const z = hit.object.userData.zombie,
      headshot = hit.object === z.head || hit.object.userData.headshot === true;
    z.hp -= headshot ? weapon.head : weapon.damage;
    score += powerup === "double" ? 20 : 10;
    hitTimer = 0.12;
    $("hitmarker").style.opacity = 1;
    if (z.hp <= 0) eliminate(z, headshot);
  }
  updateHUD();
}
function blocked(x, z) {
  if (Math.abs(x) > 23.8 || Math.abs(z) > 23.8) return true;
  return colliders.some(
    (c) =>
      c.enabled !== false && Math.abs(x - c.x) < c.w && Math.abs(z - c.z) < c.d,
  );
}
function equip(id) {
  weaponId = id;
  const w = WEAPONS[id];
  capacity = w.capacity;
  ammo = capacity;
  reserve = w.reserve;
  upgraded = id !== "pistol";
  reloading = 0;
  shotCooldown = 0;
  for (const o of [...gun.children])
    if (o.name === "upgrade") {
      gun.remove(o);
      o.geometry.dispose();
      if (o.userData.ownMaterial) o.material.dispose();
    }
  muzzle.position.z = -0.38;
  if (id !== "pistol") {
    const paint = mat(w.color, 0.4, 0.6);
    const barrel = gunBox(
      id === "shotgun" ? 0.13 : 0.08,
      0.085,
      id === "smg" ? 0.18 : 0.4,
      paint,
      0,
      -0.01,
      -0.36,
    );
    barrel.name = "upgrade";
    barrel.userData.ownMaterial = true;
    const mag = gunBox(
      id === "lmg" ? 0.22 : 0.07,
      0.16,
      0.1,
      gunmetal,
      0,
      -0.16,
      -0.12,
    );
    mag.name = "upgrade";
    muzzle.position.z = id === "smg" ? -0.47 : -0.59;
  }
  updateHUD();
}
function eliminate(z, headshot = false) {
  if (z.dead) return;
  z.dead = true;
  z.deathTime = 0.6;
  kills++;
  score +=
    (z.stats.reward + (headshot ? 40 : 0)) * (powerup === "double" ? 2 : 1);
  if (kills % 5 === 0) {
    reserve += 24;
    message("+24 ROUNDS • AMMUNITION RECOVERED");
  }
  if (kills % 7 === 0) {
    const type = kills % 14 === 0 ? "double" : "ammo";
    const mesh = new THREE.Mesh(dropGeometry, dropMaterials[type]);
    mesh.position.copy(z.root.position);
    mesh.position.y = 0.5;
    scene.add(mesh);
    drops.push({ mesh, type, ttl: 22 });
  }
}
function inRoom(id) {
  const r = rooms.find((r) => r.id === id);
  return (
    doors.find((d) => d.id === id).open &&
    Math.abs(camera.position.x - r.x) < r.w / 2 - 0.2 &&
    camera.position.z < r.front - 0.3 &&
    camera.position.z > r.z - r.d / 2 + 0.2
  );
}
function interactions() {
  const list = [];
  for (const door of doors)
    if (!door.open)
      list.push({
        x: door.x,
        z: door.z,
        label: `OPEN ${door.name} • ${door.price} ESSENCE`,
        kind: "door",
        value: door,
      });
  for (const m of machines)
    if (inRoom(m.room)) {
      const p = PERKS[m.id];
      list.push({
        ...m,
        kind: "perk",
        value: m,
        label: ownedPerks.has(m.id)
          ? `${p.name} • ACTIVE`
          : `${p.name} • ${p.price} • ${p.description}`,
      });
    }
  if (inRoom("armory")) {
    list.push({
      ...mystery,
      kind: "box",
      label:
        mystery.state === "rolling"
          ? "MYSTERY BOX • ROLLING…"
          : mystery.state === "ready"
            ? `TAKE ${WEAPONS[mystery.result].name} • REPLACES CURRENT WEAPON`
            : `MYSTERY BOX • ${BOX_COST} ESSENCE`,
    });
    list.push({
      ...upgrade,
      kind: "rifle",
      label:
        weaponId === "rifle"
          ? "AR-7 AMMO • 150 ESSENCE"
          : "WALL WEAPON: AR-7 • 500 ESSENCE",
    });
  }
  list.push({
    x: -21,
    z: -7.7,
    kind: "supply",
    label:
      weaponId === "pistol" && score >= 500
        ? "ACQUIRE AR-7 • 500 ESSENCE"
        : "RESUPPLY + HEALTH • 150 ESSENCE",
  });
  return list
    .filter(
      (i) =>
        Math.hypot(camera.position.x - i.x, camera.position.z - i.z) < 2.5 &&
        nav.clear(camera.position.x, camera.position.z, i.x, i.z),
    )
    .sort(
      (a, b) =>
        Math.hypot(camera.position.x - a.x, camera.position.z - a.z) -
        Math.hypot(camera.position.x - b.x, camera.position.z - b.z),
    );
}
function spend(price) {
  if (score < price) {
    message(`NEED ${price - score} MORE ESSENCE`);
    return false;
  }
  score -= price;
  sound("reload");
  return true;
}
function interact() {
  const item = interactions()[0];
  if (!item) return;
  if (item.kind === "door") {
    const d = item.value;
    if (!spend(d.price)) return;
    d.open = true;
    d.collider.enabled = false;
    nav.rebuild();
    nav.update(camera.position.x, camera.position.z);
    message(`${d.name} OPEN • THE INFECTED CAN FOLLOW YOU INSIDE`);
  } else if (item.kind === "perk") {
    const id = item.value.id;
    if (ownedPerks.has(id)) {
      message("PERK ALREADY ACTIVE");
      return;
    }
    if (!spend(PERKS[id].price)) return;
    ownedPerks.add(id);
    if (id === "iron") {
      maxHealth = 200;
      health = maxHealth;
    }
    message(`${PERKS[id].name} • ${PERKS[id].description}`);
  } else if (item.kind === "box") {
    if (mystery.state === "rolling") return;
    if (mystery.state === "ready") {
      equip(mystery.result);
      message(`${WEAPONS[weaponId].name} EQUIPPED`);
      resetMystery();
    } else if (spend(BOX_COST)) {
      mystery.state = "rolling";
      mystery.timer = 2.4;
      mystery.result = mysteryWeapon(weaponId);
      setBoxDisplay("ROLLING…");
    }
  } else if (item.kind === "rifle") {
    if (weaponId === "rifle") {
      if (spend(150)) reserve += 120;
    } else if (spend(500)) {
      equip("rifle");
      message("AR-7 EQUIPPED");
    }
  } else if (item.kind === "supply") {
    if (weaponId === "pistol" && score >= 500) {
      if (spend(500)) equip("rifle");
    } else if (spend(150)) {
      reserve += 90;
      health = maxHealth;
      message("RESUPPLIED • +90 ROUNDS • FULL HEALTH");
    }
  }
  updateHUD();
}
function setBoxDisplay(text) {
  const texture = mystery.display.material.map,
    c = texture.image,
    ctx = c.getContext("2d");
  ctx.fillStyle = "#242d2c";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#ffe8a2";
  ctx.font = "bold 85px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, c.width / 2, c.height / 2, c.width - 40);
  texture.needsUpdate = true;
}
function resetMystery() {
  mystery.state = "idle";
  mystery.timer = 0;
  mystery.result = null;
  setBoxDisplay("MYSTERY / 650");
}
function recover(z) {
  const p = nav.spawn(camera.position.x, camera.position.z, Math.random, 12);
  if (!p) return false;
  z.root.position.set(p.x, 0, p.z);
  z.stuckTime = 0;
  z.checkTime = 0;
  z.lastX = p.x;
  z.lastZ = p.z;
  z.bestDistance = Infinity;
  recoveredEnemies++;
  return true;
}
function damagePlayer(amount) {
  health = Math.max(0, health - amount);
  lastDamage = gameTime;
  sound("hit");
  updateHUD();
  if (health <= 0) die();
}
function updateEnemies(dt) {
  for (let i = zombies.length - 1; i >= 0; i--) {
    const z = zombies[i];
    if (z.dead) {
      z.deathTime -= dt;
      z.root.rotation.x = -(1 - z.deathTime / 0.6) * 1.5;
      z.root.position.y -= dt * 0.5;
      if (z.deathTime <= 0) {
        scene.remove(z.root);
        zombies.splice(i, 1);
      }
      continue;
    }
    const pos = z.root.position;
    temp.subVectors(camera.position, pos);
    temp.y = 0;
    const distance = temp.length();
    z.root.rotation.y = Math.atan2(-temp.x, -temp.z);
    temp.normalize();
    const zs = Math.min(3.2, 0.8 + round * 0.14) * z.stats.speed;
    if (
      distance > 1.1 ||
      !nav.clear(pos.x, pos.z, camera.position.x, camera.position.z)
    ) {
      const waypoint = nav.waypoint(
        pos.x,
        pos.z,
        camera.position.x,
        camera.position.z,
      );
      if (waypoint) {
        const dx = waypoint.x - pos.x,
          dz = waypoint.z - pos.z,
          len = Math.hypot(dx, dz),
          step = Math.min(zs * dt, len);
        if (len > 0.001) {
          const nx = pos.x + (dx / len) * step,
            nz = pos.z + (dz / len) * step;
          if (nav.clear(pos.x, pos.z, nx, nz)) {
            pos.x = nx;
            pos.z = nz;
          }
        }
      } else z.stuckTime += dt * 3;
      z.checkTime += dt;
      if (z.checkTime >= 1) {
        const moved = Math.hypot(pos.x - z.lastX, pos.z - z.lastZ);
        z.stuckTime =
          moved < 0.12
            ? z.stuckTime + z.checkTime
            : Math.max(0, z.stuckTime - 1);
        z.lastX = pos.x;
        z.lastZ = pos.z;
        z.checkTime = 0;
      }
      if (blocked(pos.x, pos.z) || z.stuckTime > 4) recover(z);
    }
    z.spitCooldown -= dt;
    if (
      z.type === "spitter" &&
      distance < 13 &&
      distance > 2.5 &&
      z.spitCooldown <= 0 &&
      nav.clear(pos.x, pos.z, camera.position.x, camera.position.z)
    ) {
      const mesh = new THREE.Mesh(acidGeometry, acidMaterial);
      mesh.position.set(pos.x, 1.55, pos.z);
      scene.add(mesh);
      projectiles.push({
        mesh,
        velocity: camera.position
          .clone()
          .sub(mesh.position)
          .normalize()
          .multiplyScalar(7),
        ttl: 2.5,
      });
      z.spitCooldown = 3;
    }
    z.phase += dt * (2.6 + zs);
    z.legs[0].rotation.x = Math.sin(z.phase) * 0.4;
    z.legs[1].rotation.x = -Math.sin(z.phase) * 0.4;
    z.arms.forEach(
      (a, j) => (a.rotation.x = -1.05 + Math.sin(z.phase + j) * 0.15),
    );
    z.root.rotation.z = Math.sin(z.phase) * 0.035;
    z.attack -= dt;
    if (
      distance < 1.45 &&
      z.attack <= 0 &&
      nav.clear(pos.x, pos.z, camera.position.x, camera.position.z)
    ) {
      health = Math.max(0, health - z.stats.damage);
      lastDamage = gameTime;
      z.attack = 1.05;
      sound("hit");
      updateHUD();
      if (health <= 0) {
        die();
        break;
      }
    }
  }
}
function updateExpansion(dt) {
  for (const d of doors)
    d.mesh.position.y = THREE.MathUtils.lerp(
      d.mesh.position.y,
      d.open ? 5.5 : 1.75,
      Math.min(1, dt * 5),
    );
  mystery.lid.rotation.x = THREE.MathUtils.lerp(
    mystery.lid.rotation.x,
    mystery.state === "idle" ? 0 : -1.1,
    dt * 6,
  );
  if (mystery.state !== "idle") {
    mystery.timer -= dt;
    if (mystery.state === "rolling" && mystery.timer <= 0) {
      mystery.state = "ready";
      mystery.timer = 15;
      setBoxDisplay(WEAPONS[mystery.result].name);
      message(
        `MYSTERY BOX: ${WEAPONS[mystery.result].name} • E TO CLAIM WITHIN 15s`,
      );
      sound("wave");
    } else if (mystery.state === "ready" && mystery.timer <= 0) {
      resetMystery();
      message("MYSTERY WEAPON EXPIRED");
    }
  }
  if (powerupTimer > 0) {
    powerupTimer -= dt;
    if (powerupTimer <= 0) {
      powerup = null;
      updateHUD();
    }
  }
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.ttl -= dt;
    d.mesh.rotation.y += dt * 2;
    d.mesh.position.y = 0.55 + Math.sin(gameTime * 3) * 0.12;
    if (
      Math.hypot(
        camera.position.x - d.mesh.position.x,
        camera.position.z - d.mesh.position.z,
      ) < 1.2
    ) {
      if (d.type === "ammo") {
        reserve = WEAPONS[weaponId].reserve;
        ammo = capacity;
        reloading = 0;
        message("MAX AMMO");
      } else {
        powerup = "double";
        powerupTimer = 25;
        message("DOUBLE ESSENCE • 25 SECONDS");
      }
      d.ttl = 0;
      sound("reload");
      updateHUD();
    }
    if (d.ttl <= 0) {
      scene.remove(d.mesh);
      drops.splice(i, 1);
    }
  }
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.ttl -= dt;
    p.mesh.position.addScaledVector(p.velocity, dt);
    const a = p.mesh.position;
    if (blocked(a.x, a.z)) p.ttl = 0;
    if (a.distanceTo(camera.position) < 0.7 && p.ttl > 0) {
      damagePlayer(14);
      p.ttl = 0;
    }
    if (p.ttl <= 0) {
      scene.remove(p.mesh);
      projectiles.splice(i, 1);
    }
  }
  $("powerup-status").textContent = powerup
    ? `2× ESSENCE • ${Math.ceil(powerupTimer)}s`
    : "";
  $("zone-name").textContent = inRoom("armory")
    ? "ARMORY"
    : inRoom("infirmary")
      ? "INFIRMARY"
      : "THE COMPOUND";
  $("objective").textContent = !doors[0].open
    ? "NORTH: ARMORY • 500"
    : !doors[1].open
      ? "WEST: INFIRMARY • 750"
      : "E TO BUY / DRINK / CLAIM";
}
$("deploy").onclick = () => {
  for (const o of [...gun.children])
    if (o.name === "upgrade") {
      gun.remove(o);
      o.geometry.dispose();
    }
  muzzle.position.z = -0.38;
  begin();
};
$("retry").onclick = $("deploy").onclick;
$("resume").onclick = resume;
$("quit").onclick = back;
$("death-quit").onclick = back;
document.addEventListener("keydown", (e) => {
  if (mode !== "playing") return;
  if (["Space", "ArrowUp", "ArrowDown", "Tab"].includes(e.code))
    e.preventDefault();
  keys.add(e.code);
  if (e.code === "KeyR") reload();
  if (e.code === "KeyE" && !e.repeat) interact();
  if (e.code === "Space" && !e.repeat && playerY <= 1.73) velocityY = 4.8;
  if (e.code === "Escape") pause();
});
document.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
  if (mode === "playing") pause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && mode === "playing") pause();
});
document.addEventListener("mousedown", (e) => {
  if (mode !== "playing" || !controls.canFire(e)) return;
  e.preventDefault();
  renderer.domElement.focus({ preventScroll: true });
  if (e.button === 0) {
    mouseDown = true;
    shoot();
  }
  if (e.button === 2) ads = true;
});
document.addEventListener("mouseup", (e) => {
  if (e.button === 0) mouseDown = false;
  if (e.button === 2) ads = false;
});
renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());
$("controls-open").onclick = () => {
  $("modal-label").textContent = "OPERATOR BRIEFING";
  $("modal-title").textContent = "FIELD MANUAL";
  $("modal-content").innerHTML =
    `<p>Survive the compound. Eliminate the infected to earn essence. Earn round bonuses and unlock the Armory (500) or Infirmary (750). The infected can follow you through opened doors. The Armory has a 650-essence mystery box and a wall rifle. Claim mystery weapons with E within 15 seconds; they replace your current weapon. Buy four permanent-for-this-run perk drinks inside the rooms.</p>${[
      ["W A S D", "Move"],
      ["MOUSE", "Look & aim"],
      ["LEFT MOUSE", "Fire"],
      ["RIGHT MOUSE", "Aim down sights"],
      ["SHIFT / SPACE", "Sprint / jump"],
      ["R / E", "Reload / buy, drink, claim"],
      ["ESC", "Pause"],
    ]
      .map(
        ([a, b]) =>
          `<div class="control-row"><b>${a}</b><span>${b}</span></div>`,
      )
      .join(
        "",
      )}<p>Aim for the head for bonus damage. Runners arrive in round 2, acid spitters in round 3, and armored brutes in round 4. Health regenerates after 5 seconds without damage. Iron Heart increases max health; Quick Hands speeds reloads; Rush Cola boosts movement; Second Wind improves regeneration. Collect glowing pickups for max ammo or double essence. The last three enemies are tracked on the HUD. Buy the AR-7 for 500 essence; supplies cost 150. If mouse capture is blocked in a preview, move the mouse to aim and hold it near a screen edge to keep turning, or open the full game.</p>`;
  $("modal").classList.remove("hidden");
};
$("settings-open").onclick = () => {
  $("modal-label").textContent = "SYSTEM CONFIGURATION";
  $("modal-title").textContent = "SETTINGS";
  $("modal-content").innerHTML =
    `<div class="control-row"><b>Mouse sensitivity</b><input aria-label="Mouse sensitivity" id="sensitivity" type="range" min="0.3" max="2.5" step=".1" value="${sensitivity}"></div><div class="control-row"><b>Render quality</b><select id="quality" aria-label="Render quality"><option value="1" ${renderQuality === 1 ? "selected" : ""}>Performance</option><option value="1.5" ${renderQuality > 1 ? "selected" : ""}>High</option></select></div><p>Desktop browser recommended. Click Deploy to capture your mouse. Press Escape at any time to release it.</p>`;
  $("modal").classList.remove("hidden");
  $("sensitivity").oninput = (e) => (sensitivity = +e.target.value);
  $("quality").onchange = (e) => {
    renderQuality = +e.target.value;
    renderer.setPixelRatio(Math.min(devicePixelRatio, renderQuality));
    renderer.shadowMap.enabled = renderQuality > 1;
  };
};
$("modal-close").onclick = () => $("modal").classList.add("hidden");
document.querySelector(".sound-toggle").onclick = () => {
  muted = !muted;
  $("audio-label").textContent = muted ? "OFF" : "ON";
};
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  const t = now * 0.001;
  ash.position.x = Math.sin(t * 0.05) * 2;
  ash.position.y = (-t * 0.035) % 6;
  beacon.intensity = Math.sin(t * 2) > 0 ? 6 : 0.2;
  redLight.intensity = 11 + Math.sin(t * 3) * 2;
  if (mode === "menu") {
    camera.position.set(12 + Math.sin(t * 0.04) * 0.7, 3.1, 12);
    camera.lookAt(4, 2.8, -18);
    camera.fov = 61;
    camera.updateProjectionMatrix();
    for (const z of zombies) {
      z.root.rotation.y = 0.3;
      z.arms.forEach((a, i) => (a.rotation.x = -0.6 + Math.sin(t + i) * 0.09));
      z.root.position.y = Math.sin(t * 0.7 + z.phase) * 0.02;
    }
  }
  if (mode === "playing") {
    controls.update(dt);
    gameTime += dt;
    shotCooldown = Math.max(0, shotCooldown - dt);
    if (mouseDown && WEAPONS[weaponId].auto) shoot();
    updateExpansion(dt);
    navigationTimer -= dt;
    if (navigationTimer <= 0) {
      nav.update(camera.position.x, camera.position.z);
      navigationTimer = 0.25;
    }
    if (reloading) {
      reloading -= dt;
      if (reloading <= 0) {
        const amount = Math.min(capacity - ammo, reserve);
        ammo += amount;
        reserve -= amount;
        reloading = 0;
        updateHUD();
      }
    }
    if (intermission > 0) {
      intermission -= dt;
      $("wave-state").textContent =
        `NEXT WAVE IN ${Math.ceil(intermission)}s • RESUPPLY`;
      if (intermission <= 0) startWave();
    } else if (spawnLeft > 0) {
      spawnTimer -= dt;
      if (spawnTimer <= 0 && zombies.filter((z) => !z.dead).length < 28) {
        const p = nav.spawn(camera.position.x, camera.position.z);
        if (p) {
          zombie(p.x, p.z, false, enemyType(round));
          spawnLeft--;
        }
        spawnTimer = Math.max(0.45, 1.6 - round * 0.08);
      }
    } else if (!zombies.some((z) => !z.dead)) {
      intermission = 14;
      score += 150 + round * 25;
      updateHUD();
      announce("PERIMETER SECURED", "ROUND COMPLETE");
      $("wave-state").textContent = "RESUPPLY • NEXT WAVE IN 14s";
      message(`+${150 + round * 25} ROUND BONUS • BUY DOORS, WEAPONS & DRINKS`);
    }
    let dx = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0),
      dz = (keys.has("KeyS") ? 1 : 0) - (keys.has("KeyW") ? 1 : 0);
    const moving = dx || dz;
    const sprint = keys.has("ShiftLeft") && !ads;
    const speed =
      (sprint ? 6.3 : ads ? 2.5 : 4.1) * (ownedPerks.has("rush") ? 1.25 : 1);
    if (moving) {
      const len = Math.hypot(dx, dz);
      dx /= len;
      dz /= len;
      const mx = (dx * Math.cos(yaw) + dz * Math.sin(yaw)) * speed * dt,
        mz = (-dx * Math.sin(yaw) + dz * Math.cos(yaw)) * speed * dt;
      if (!blocked(camera.position.x + mx, camera.position.z))
        camera.position.x += mx;
      if (!blocked(camera.position.x, camera.position.z + mz))
        camera.position.z += mz;
    }
    velocityY -= 13 * dt;
    playerY += velocityY * dt;
    if (playerY < 1.72) {
      playerY = 1.72;
      velocityY = 0;
    }
    camera.position.y =
      playerY +
      (moving
        ? Math.sin(t * (sprint ? 14 : 10)) * 0.035
        : Math.sin(t * 1.8) * 0.008);
    camera.rotation.set(pitch + recoil * 0.3, yaw, 0);
    camera.fov = THREE.MathUtils.lerp(
      camera.fov,
      ads ? 48 : sprint ? 77 : 70,
      dt * 12,
    );
    camera.updateProjectionMatrix();
    gun.position.x = THREE.MathUtils.lerp(
      gun.position.x,
      ads ? 0 : 0.3,
      dt * 12,
    );
    gun.position.y =
      THREE.MathUtils.lerp(gun.position.y, ads ? -0.105 : -0.29, dt * 12) +
      (moving ? Math.sin(t * 10) * 0.001 : 0);
    gun.position.z = -0.5 + recoil;
    gun.rotation.x = reloading ? -Math.sin(reloading * 2) * 0.6 : recoil * 0.8;
    gun.rotation.z = reloading ? -0.35 : 0;
    recoil = Math.max(0, recoil - dt * 0.8);
    if (shotCooldown < (upgraded ? 0.08 : 0.21)) {
      muzzle.visible = false;
      muzzleLight.intensity = 0;
    }
    updateEnemies(dt);
    if (
      health > 0 &&
      health < maxHealth &&
      gameTime - lastDamage > (ownedPerks.has("recovery") ? 3 : 5)
    ) {
      health = Math.min(
        maxHealth,
        health + dt * (ownedPerks.has("recovery") ? 14 : 7),
      );
      updateHUD();
    }
    $("damage").style.opacity = Math.max(
      0,
      (1 - (gameTime - lastDamage) * 1.7) * 0.6,
    );
    const nearby = interactions()[0];
    $("interaction").textContent = nearby ? `[ E ] ${nearby.label}` : "";
    const living = zombies.filter((z) => !z.dead);
    const lastEnemy =
      spawnLeft === 0 && living.length <= 3
        ? living.sort(
            (a, b) =>
              a.root.position.distanceToSquared(camera.position) -
              b.root.position.distanceToSquared(camera.position),
          )[0]
        : null;
    if (lastEnemy) {
      const dx = lastEnemy.root.position.x - camera.position.x,
        dz = lastEnemy.root.position.z - camera.position.z;
      let angle = Math.atan2(-dx, -dz) - yaw;
      angle = Math.atan2(Math.sin(angle), Math.cos(angle));
      $("tracker").textContent =
        `${Math.abs(angle) < 0.4 ? "↑ AHEAD" : angle > 0 ? "← LEFT" : "RIGHT →"} • ${Math.ceil(Math.hypot(dx, dz))}m • ${lastEnemy.stats.name}`;
    } else $("tracker").textContent = "";
    if (hitTimer > 0) {
      hitTimer -= dt;
      if (hitTimer <= 0) $("hitmarker").style.opacity = 0;
    }
    if (announceTimer > 0) {
      announceTimer -= dt;
      if (announceTimer <= 0) $("announcement").style.opacity = 0;
    }
    if (messageTimer > 0) {
      messageTimer -= dt;
      if (messageTimer <= 0) $("hud-message").textContent = "";
    }
  }
  if (mode === "playing")
    $("enemy-count").textContent =
      `${spawnLeft + zombies.filter((z) => !z.dead).length} HOSTILES REMAINING`;
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
$("deploy").disabled = false;
$("deploy").innerHTML = "<span>START SURVIVAL</span><span>→</span>";
$("ready-label").textContent = "READY TO PLAY";
// Read-only diagnostics used by browser smoke tests.
export function getGameState() {
  return {
    mode,
    round,
    ammo,
    reserve,
    health,
    maxHealth,
    weaponId,
    perks: [...ownedPerks],
    doors: doors.map((d) => ({ id: d.id, open: d.open })),
    mystery: {
      state: mystery.state,
      result: mystery.result,
      timer: mystery.timer,
    },
    recoveredEnemies,
    enemies: zombies
      .filter((z) => !z.dead)
      .map((z) => ({
        type: z.type,
        x: z.root.position.x,
        z: z.root.position.z,
        hp: z.hp,
        blocked: blocked(z.root.position.x, z.root.position.z),
      })),
    kills,
    score,
    gameTime,
    remaining: spawnLeft + zombies.filter((z) => !z.dead).length,
    position: camera.position.toArray(),
    yaw,
    pitch,
    reloading,
    intermission,
    spawnLeft,
    projectiles: projectiles.length,
    powerup,
    powerupTimer,
    locked: controls.locked,
    fallback: controls.fallback,
    drawCalls: renderer.info.render.calls,
  };
}
if (import.meta.env.DEV) window.__gameState = getGameState;
// Explicit opt-in test harness: stripped from production by Vite.
if (import.meta.env.DEV && new URLSearchParams(location.search).has("test")) {
  window.__gameTest = {
    grant: (amount) => {
      score += amount;
      updateHUD();
    },
    teleport: (x, z) => {
      if (blocked(x, z)) throw new Error("Blocked test position");
      camera.position.set(x, 1.72, z);
      nav.update(x, z);
    },
    interact,
    clearWave: () => {
      for (const z of zombies) if (!z.dead) eliminate(z);
      spawnLeft = 0;
      intermission = 0;
    },
    spawn: (x, z, type = "walker") => {
      const zed = zombie(x, z, false, type);
      return zombies.indexOf(zed);
    },
    resetEnemies: () => {
      clearZombies();
      spawnLeft = 0;
      intermission = 999;
    },
    navigation: () => ({
      colliders: colliders.map((c) => ({ ...c })),
      reachable: Array.from(nav.distance).filter((d) => d >= 0).length,
    }),
    testSpawns: (count) => {
      nav.update(camera.position.x, camera.position.z);
      return Array.from({ length: count }, () => {
        const p = nav.spawn(camera.position.x, camera.position.z);
        return {
          ...p,
          blocked: blocked(p.x, p.z),
          reachable: nav.distance[nav.index(p.x, p.z)] >= 0,
        };
      });
    },
    setRound: (n) => {
      round = n;
      updateHUD();
    },
    damage: (amount) => damagePlayer(amount),
    tick: (dt) => {
      for (let left = dt; left > 0; left -= 0.05)
        updateExpansion(Math.min(0.05, left));
    },
    advanceEnemies: (steps, dt = 0.05) => {
      for (let i = 0; i < steps; i++) {
        gameTime += dt;
        nav.update(camera.position.x, camera.position.z);
        updateEnemies(dt);
      }
    },
  };
}
