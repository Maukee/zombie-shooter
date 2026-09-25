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

| Input       | Action                                  |
| ----------- | --------------------------------------- |
| WASD        | Move                                    |
| Mouse       | Look                                    |
| Left click  | Fire; hold with the AR-7                |
| Right mouse | Aim down sights                         |
| Shift       | Sprint                                  |
| Space       | Jump                                    |
| R           | Reload                                  |
| E           | Use the west-wall green supply terminal |
| Escape      | Pause / release mouse                   |

Survive increasingly large, faster waves. Hits and eliminations earn essence; headshots deal bonus damage. Health regenerates after five seconds without damage. Each new round gives ammunition and a small heal. The terminal sells an automatic AR-7 for 500 essence, or ammunition and full healing for 150. Personal-best round is stored locally.

## Browser performance

- Static world geometry is merged into material batches.
- Shared zombie geometries and materials; maximum 28 concurrent active enemies.
- One shadow-casting directional light; other lights do not render shadow maps.
- Capped render resolution, 1024px shadow map, configurable performance mode, single-draw-call ash particles.
- Bundled fonts: no Google Fonts requests or network-dependent menu typography.
- Procedural textures and synthesized sound; no large asset downloads.
- Pausing freezes gameplay, timers, damage and spawning.

## Tests

```sh
npx playwright install chromium
npm test
```

Four browser regression tests cover:

- Real (unshimmed) pointer lock, deployment, movement, an enemy elimination, reload, pause/resume and return to the lobby.
- Rejected pointer-lock requests with functional fallback movement, aiming and shooting.
- A real sandboxed iframe without `allow-pointer-lock`, including shooting and pause/resume.
- Bundled font loading and menu bounds in a compact desktop window with remote font hosts blocked.

All four tests and the production build passed after the v0.2 fixes. To use an already installed Chromium executable instead of Playwright's downloaded browser:

```sh
CHROMIUM_PATH=/path/to/chromium npm test
```

On the development server only, `window.__gameState()` exposes a read-only state snapshot for regression assertions. It is not available in production builds.

This is an original single-arena game, not a Call of Duty remake, and uses no assets from that franchise.
