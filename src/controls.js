// Pointer lock can be denied by an embedding iframe's sandbox or browser policy.
// Failure must never send the player into an unresumable pause loop.
export class MouseControls {
  constructor(canvas, { onLook, onUnlock, onMode }) {
    this.canvas = canvas;
    this.onLook = onLook;
    this.onUnlock = onUnlock;
    this.onMode = onMode;
    this.active = false;
    this.locked = false;
    this.fallback = false;
    this.edge = 0;
    this.lastPoint = null;
    this.ignoreUntil = 0;
    this.generation = 0;
    document.addEventListener("pointerlockchange", () => {
      const locked = document.pointerLockElement === canvas;
      const wasLocked = this.locked;
      this.locked = locked;
      if (locked && !this.active) {
        document.exitPointerLock?.();
        return;
      }
      if (locked) {
        this.fallback = false;
        this.edge = 0;
        this.ignoreUntil = performance.now() + 180;
        this.onMode(false);
      } else if (wasLocked && this.active) this.onUnlock();
    });
    document.addEventListener("pointerlockerror", () => this.enableFallback());
    document.addEventListener("mousemove", (event) => {
      if (!this.active || performance.now() < this.ignoreUntil) return;
      if (this.locked) {
        // Ignore browser cursor-warp events on capture/resume.
        if (Math.abs(event.movementX) > 180 || Math.abs(event.movementY) > 180)
          return;
        this.onLook(event.movementX, event.movementY);
      } else if (this.fallback && event.target === this.canvas) {
        if (this.lastPoint)
          this.onLook(
            event.clientX - this.lastPoint.x,
            event.clientY - this.lastPoint.y,
          );
        this.lastPoint = { x: event.clientX, y: event.clientY };
        const x = (event.clientX / innerWidth) * 2 - 1;
        this.edge =
          Math.abs(x) > 0.8 ? (Math.sign(x) * (Math.abs(x) - 0.8)) / 0.2 : 0;
      } else {
        this.lastPoint = null;
        this.edge = 0;
      }
    });
    canvas.addEventListener("mouseleave", () => {
      this.edge = 0;
      this.lastPoint = null;
    });
  }
  async start() {
    const generation = ++this.generation;
    this.active = true;
    this.edge = 0;
    this.lastPoint = null;
    this.canvas.focus({ preventScroll: true });
    // Use a timeout as well as the promise/event paths for older browsers.
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      if (generation === this.generation && !this.locked) this.enableFallback();
    }, 1000);
    try {
      if (!this.canvas.requestPointerLock)
        throw new Error("Pointer lock unavailable");
      await this.canvas.requestPointerLock();
    } catch {
      if (generation === this.generation) this.enableFallback();
    }
  }
  enableFallback() {
    if (!this.active || this.locked) return;
    this.fallback = true;
    this.lastPoint = null;
    this.edge = 0;
    this.onMode(true);
  }
  stop() {
    this.active = false;
    ++this.generation;
    clearTimeout(this.timeout);
    this.edge = 0;
    this.lastPoint = null;
    if (document.pointerLockElement === this.canvas)
      document.exitPointerLock?.();
  }
  update(dt) {
    if (this.active && this.fallback && this.edge)
      this.onLook(this.edge * dt * 650, 0);
  }
  canFire(event) {
    return (
      this.active &&
      (this.locked || (this.fallback && event.target === this.canvas))
    );
  }
}
