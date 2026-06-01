# Sprout Quest

A 2D farming RPG built with React 19, Vite, and Phaser 3.  
Click or tap anywhere on the map to move the player character.

## Tech Stack

| | |
|---|---|
| Framework | React 19 + Vite |
| Game Engine | Phaser 3 |
| Routing | React Router v6 |
| Map Editor | Tiled |
| Assets | Sprout Lands (LimeZu) |

## Features

- **Tiled tilemap** — Ground, Objects, and Collision layers loaded from JSON
- **Click-to-move** — click or tap to set a destination; player walks and plays the correct directional animation
- **Arcade physics** — collision layer blocks movement automatically
- **Full-screen responsive** — scales to fill any screen (mobile, tablet, desktop) and redraws on window resize
- **Pixel-art rendering** — `pixelArt: true` + integer map scaling to prevent tile seams

## Project Structure

```
├── public/
│   ├── maps/
│   │   └── world.json          # Tiled map export
│   └── assets/
│       └── sprites/
│           ├── Characters/     # Player spritesheet
│           ├── Tilesets/       # Ground & dirt tilesets
│           └── Objects/        # Decoration tileset
├── src/
│   ├── components/
│   │   └── GameCanvas.jsx      # Phaser game + all scenes
│   ├── App.jsx                 # React Router setup
│   ├── main.jsx
│   └── index.css
├── assets/                     # Original asset source files
└── vite.config.js
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Available Scripts

```bash
npm run dev      # Start dev server
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
```

## Map Layers (Tiled)

| Layer | Purpose |
|---|---|
| `Ground` | Base terrain tiles |
| `Objects` | Decorations — trees, plants, props |
| `Collision` | Invisible wall tiles; blocks player movement |

## Player Animations

| Animation | Frames | Trigger |
|---|---|---|
| `idle` | 0 | On spawn / on arrival |
| `walk-down` | 0–3 | Moving south |
| `walk-up` | 4–7 | Moving north |
| `walk-left` | 8–11 | Moving west |
| `walk-right` | 12–15 | Moving east |

Spritesheet: `Basic_Charakter_Spritesheet.png` — 192×192 px, 4 cols × 4 rows, 48×48 px per frame.

## Adding a New Scene

1. Create a class extending `Phaser.Scene` with a unique `key`
2. Add a new `<Route>` in [src/App.jsx](src/App.jsx)
3. Create a new page component that renders `<GameCanvas scenes={[NewScene]} />`  
   *(or register additional scenes in the `scene` array inside `GameCanvas.jsx`)*

## Credits

- **Sprout Lands asset pack** — [LimeZu on itch.io](https://limezu.itch.io/sproutlands)
- **Phaser 3** — [phaser.io](https://phaser.io)
