# Dead Frequency

An original desktop-browser, first-person zombie survival game inspired by classic wave-based shooters. Built with Three.js and Vite; no downloaded game assets, physics engine, or backend required.

## Run

```sh
npm install
npm run dev
```

Open the displayed URL in a desktop browser with WebGL support. Click **Deploy into the dark** to capture your mouse. Escape releases it and pauses the simulation.

```sh
npm run build        # static production files in dist/
npx vite preview --host 0.0.0.0
```

## Controls

| Input | Action |
| --- | --- |
| WASD | Move |
| Mouse | Look |
| Left click | Fire; hold with the AR-7 |
| Right mouse | Aim down sights |
| Shift | Sprint |
| Space | Jump |
| R | Reload |
| E | Use the west-wall green supply terminal |
| Escape | Pause / release mouse |

Survive increasingly large, faster waves. Hits and eliminations earn essence; headshots deal bonus damage. Health regenerates after five seconds without damage. Each new round gives ammunition and a small heal. The terminal sells an automatic AR-7 for 500 essence, or ammunition and full healing for 150. Personal-best round is stored locally.

## Browser performance

- Static world geometry is merged into material batches.
- Shared zombie geometries and materials; maximum 28 concurrent active enemies.
- One shadow-casting directional light; other lights do not render shadow maps.
- Capped render resolution, configurable performance mode, single-draw-call ash particles.
- Procedural textures and synthesized sound; no large asset downloads.
- Pausing freezes gameplay, timers, damage and spawning.

## Tests

```sh
npx playwright install chromium
npm test
```

The smoke test covers lobby dialogs, quality settings, deployment, firing, reloading, pause and return to the lobby. Pointer lock is shimmed only in the headless test. The production build has been validated; browser tests require installing Playwright's Chromium browser, whose download may be unavailable in restricted environments.

This is an original single-arena game, not a Call of Duty remake, and uses no assets from that franchise.
