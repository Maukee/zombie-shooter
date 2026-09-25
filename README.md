# Dead Frequency

An original desktop-browser, first-person zombie survival game inspired by classic wave-based shooters. Built with Three.js and Vite; no downloaded game assets, physics engine, or backend required.

## Run

```sh
npm install
npm run dev
```

Open the displayed URL in a desktop browser with WebGL support. Click **Start Survival** to begin immediately and capture your mouse. Escape releases it and pauses the simulation.

If an embedded preview blocks mouse capture, the game automatically uses preview controls: move the mouse to aim and hold it near the left/right screen edge to keep turning. WASD, firing, reloading, aiming and pause still work. Use **Open full game** for normal captured-mouse controls in a standalone tab.

```sh
npm run build        # static production files in dist/
npx vite preview --host 0.0.0.0
```

## Controls

| Input       | Action                             |
| ----------- | ---------------------------------- |
| WASD        | Move                               |
| Mouse       | Look                               |
| Left click  | Fire; hold with automatic weapons  |
| Right mouse | Aim down sights                    |
| Shift       | Sprint                             |
| Space       | Jump                               |
| R           | Reload                             |
| E           | Buy / drink / claim mystery weapon |
| Escape      | Pause / release mouse              |

Survive increasingly large, faster waves. Hits and eliminations earn essence; headshots deal bonus damage. Health regenerates after five seconds without damage. Each new round gives ammunition and a small heal. The terminal sells an automatic AR-7 for 500 essence, or ammunition and full healing for 150. Personal-best round is stored locally.

## Compound expansion (v0.3)

Press **E** near a door, machine, or box; the HUD shows its price and effect. Purchases use earned essence, not real money. Opened doors remain open for the run, and enemies can follow you inside.

| Area / item          | Cost | Effect                                                                  |
| -------------------- | ---: | ----------------------------------------------------------------------- |
| North Armory door    |  500 | Opens the furnished bunker, mystery box, Quick Hands and rifle wall-buy |
| West Infirmary door  |  750 | Opens the medical room and three drink machines                         |
| Mystery box (Armory) |  650 | Random rifle, SMG, shotgun, LMG, or rare ARC-9 energy rifle             |
| Iron Heart           |  600 | Raises maximum health to 200 and heals you                              |
| Quick Hands          |  500 | Reduces reload time by 45%                                              |
| Rush Cola            |  400 | Increases walking/sprinting speed by 25%                                |
| Second Wind          |  500 | Regeneration begins after 3 seconds instead of 5, at twice the rate     |
| Armory AR-7 wall-buy |  500 | Equips a rifle; buying again supplies ammo for 150                      |

Mystery rolls take 2.4 seconds. Press **E** again within 15 seconds to claim the result; it **replaces your current weapon** and includes ammunition. Unclaimed results expire; repeated interaction during a roll does not charge again. Each drink can be purchased once per run. Doors, drinks, weapon, and box state reset on a new run; only the personal-best round persists.

- **Walkers:** baseline infected, beginning in round 1.
- **Runners:** lower health, almost twice the speed, beginning in round 2.
- **Spitters:** green infected with dodgeable acid projectiles, beginning in round 3.
- **Brutes:** larger armored infected with high health and heavy melee damage, beginning in round 4.
- Clear a round for an essence bonus and a 14-second buying break.
- Collect glowing pickups for **max ammo** or **25 seconds of double essence**.
- The last three enemies receive a directional/distance tracker on the HUD.

### Anti-stuck behavior

Spawns are selected from validated navigation cells in the player's connected walkable area: no unchecked position jitter and no spawning inside locked rooms. A shared reverse-BFS field routes enemies around props and through unlocked doorways. Exact segment/collider tests prevent corner-cutting and melee/acid attacks through walls. If an enemy stops progressing or is found inside a collider, a watchdog relocates that same enemy to a reachable cell, without awarding a kill or changing the wave count.

## Browser performance

- Static world geometry is merged into material batches.
- Shared zombie geometries and materials; maximum 28 concurrent active enemies.
- Cached navigation topology; one shared distance field, rebuilt when a door opens.
- One shadow-casting directional light; other lights do not render shadow maps.
- Capped render resolution, 1024px shadow map, configurable performance mode, single-draw-call ash particles.
- Bundled fonts: no Google Fonts requests or network-dependent menu typography.
- Procedural textures and synthesized sound; no large asset downloads.
- Pausing freezes gameplay, timers, damage and spawning.

## Tests

```sh
npx playwright install chromium
npm test
npm run test:unit
```

Eight browser regression tests cover:

- Real (unshimmed) pointer lock, deployment, movement, an enemy elimination, reload, pause/resume and return to the lobby.
- Rejected pointer-lock requests with functional fallback movement, aiming and shooting.
- A real sandboxed iframe without `allow-pointer-lock`, including shooting and pause/resume.
- Bundled font loading and menu bounds in a compact desktop window with remote font hosts blocked.

- Door prices, walking through opened doors, duplicate-purchase protection, all four drinks and reset on a new run.
- Mystery-box rolling, claiming, expiration, weapon replacement and no double charging.
- 1,000 validated spawn samples, actual enemy routing around the truck, trapped-enemy recovery and wave completion.
- Distinct enemy health/speed and spitter projectile damage.

Five Node unit tests additionally check obstacle navigation, locked/open door connectivity, arena boundaries, thin-wall intersections, and enemy/weapon selection rules.
To use an already installed Chromium executable instead of Playwright's downloaded browser:

```sh
CHROMIUM_PATH=/path/to/chromium npm test
npm run test:unit
```

On the development server only, `window.__gameState()` exposes a read-only state snapshot for regression assertions. It is not available in production builds. Browser fixtures explicitly launched with `?test` also expose a development-only scenario harness for seeded purchases, trapped spawns and deterministic simulation stepping. Neither hook is present in production.

This is an original compound-survival game, not a Call of Duty remake, and uses no assets from that franchise.
