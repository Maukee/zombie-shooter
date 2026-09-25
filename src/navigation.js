// Shared player/enemy clearance. A small reverse BFS is reused by every enemy.
// Unlike greedy sliding, this can route around containers and through purchased doors.
export class Navigation {
  constructor(blocked, colliders = [], min = -23, max = 23) {
    this.blocked = blocked;
    this.colliders = colliders.length ? colliders : blocked.colliders || [];
    this.min = min;
    this.size = max - min + 1;
    this.count = this.size ** 2;
    this.walkable = new Uint8Array(this.count);
    this.distance = new Int32Array(this.count);
    this.edges = Array.from({ length: this.count }, () => []);
    this.goal = -1;
    this.rebuild();
  }
  index(x, z) {
    const gx = Math.round(x) - this.min,
      gz = Math.round(z) - this.min;
    return gx < 0 || gz < 0 || gx >= this.size || gz >= this.size
      ? -1
      : gz * this.size + gx;
  }
  point(i) {
    return {
      x: (i % this.size) + this.min,
      z: Math.floor(i / this.size) + this.min,
    };
  }
  clear(x, z, tx, tz) {
    if (this.blocked(x, z) || this.blocked(tx, tz)) return false;
    // Exact slab intersection, not coarse sampling: even a thin wall or a corner
    // crossed between sample points must block movement and melee/spit attacks.
    for (const c of this.colliders) {
      if (c.enabled === false) continue;
      let enter = 0,
        exit = 1,
        intersects = true;
      for (const [start, delta, low, high] of [
        [x, tx - x, c.x - c.w, c.x + c.w],
        [z, tz - z, c.z - c.d, c.z + c.d],
      ]) {
        if (Math.abs(delta) < 1e-12) {
          if (start <= low || start >= high) {
            intersects = false;
            break;
          }
        } else {
          let a = (low - start) / delta,
            b = (high - start) / delta;
          if (a > b) [a, b] = [b, a];
          enter = Math.max(enter, a);
          exit = Math.min(exit, b);
          if (enter >= exit) {
            intersects = false;
            break;
          }
        }
      }
      if (intersects && exit > 0 && enter < 1) return false;
    }
    if (!this.colliders.length) {
      const steps = Math.ceil(Math.hypot(tx - x, tz - z) / 0.02);
      for (let i = 1; i < steps; i++)
        if (
          this.blocked(x + ((tx - x) * i) / steps, z + ((tz - z) * i) / steps)
        )
          return false;
    }
    return true;
  }

  rebuild() {
    this.goal = -1;
    this.distance.fill(-1);
    for (let i = 0; i < this.count; i++) {
      const p = this.point(i);
      this.walkable[i] = !this.blocked(p.x, p.z);
    }
    for (let i = 0; i < this.count; i++) {
      this.edges[i] = [];
      if (!this.walkable[i]) continue;
      const p = this.point(i);
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const n = this.index(p.x + dx, p.z + dz);
        if (
          n >= 0 &&
          this.walkable[n] &&
          this.clear(p.x, p.z, p.x + dx, p.z + dz)
        )
          this.edges[i].push(n);
      }
    }
  }
  nearest(x, z, reachable = false) {
    let best = -1,
      distance = Infinity;
    for (let i = 0; i < this.count; i++) {
      if (!this.walkable[i] || (reachable && this.distance[i] < 0)) continue;
      const p = this.point(i),
        d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < distance && this.clear(x, z, p.x, p.z)) {
        best = i;
        distance = d;
      }
    }
    return best;
  }
  update(x, z) {
    let goal = this.index(x, z);
    if (
      goal < 0 ||
      !this.walkable[goal] ||
      !this.clear(x, z, this.point(goal).x, this.point(goal).z)
    )
      goal = this.nearest(x, z);
    if (goal === this.goal && goal >= 0) return;
    this.goal = goal;
    this.distance.fill(-1);
    if (goal < 0) return;
    const queue = new Int32Array(this.count);
    let head = 0,
      tail = 0;
    queue[tail++] = goal;
    this.distance[goal] = 0;
    while (head < tail) {
      const i = queue[head++];
      for (const n of this.edges[i])
        if (this.distance[n] < 0) {
          this.distance[n] = this.distance[i] + 1;
          queue[tail++] = n;
        }
    }
  }
  waypoint(x, z, tx, tz) {
    if (this.clear(x, z, tx, tz)) return { x: tx, z: tz };
    let i = this.index(x, z);
    if (
      i < 0 ||
      this.distance[i] < 0 ||
      !this.clear(x, z, this.point(i).x, this.point(i).z)
    )
      i = this.nearest(x, z, true);
    if (i < 0) return null;
    let target = this.point(i);
    for (const n of this.edges[i]) {
      const p = this.point(n);
      if (
        this.distance[n] >= 0 &&
        this.distance[n] < this.distance[i] &&
        this.clear(x, z, p.x, p.z)
      ) {
        target = p;
        break;
      }
    }
    return target;
  }
  spawn(x, z, random = Math.random, minDistance = 10) {
    // Only cells in the player's connected component are eligible. No unchecked jitter.
    const candidates = [];
    let farthest = null,
      farDistance = -1;
    for (let i = 0; i < this.count; i++) {
      if (this.distance[i] < 0) continue;
      const p = this.point(i),
        d = Math.hypot(p.x - x, p.z - z);
      if (d > farDistance) {
        farDistance = d;
        farthest = p;
      }
      if (d >= minDistance && this.distance[i] >= minDistance)
        candidates.push(p);
    }
    return candidates.length
      ? candidates[
          Math.min(
            candidates.length - 1,
            Math.floor(random() * candidates.length),
          )
        ]
      : farthest;
  }
}
