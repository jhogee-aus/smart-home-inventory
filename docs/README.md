# Smart Home Inventory Map

**Never lose track of where you put things.** A free, private, offline desktop app for Windows. Map your rooms and storage on an interactive floor plan, add your items, then search to see exactly where each one is.

**[Download for Windows](https://smart-home-inventory-mu.vercel.app/#download)** · **[Website](https://smart-home-inventory-mu.vercel.app)** · Current version: v2.0.0

![Room map view](docs/screenshots/room-map.png)

## Why I built this

I move house often, and I'm not always the tidiest person. I kept losing time hunting for things: I had storage boxes, but every time I needed something I had to open them one by one to check what was inside.

I wanted a system that could just tell me where something is. That's how this project started.

## Features

- **Home → Room → Zone → Item**: organise your inventory the way you think about your space, down to the exact shelf or drawer
- **Floor-plan view**: drag rooms into place, resize them, and click into a room to arrange its zones
- **Furniture-style zones**: cabinets, wardrobes, drawer units, tables, beds and sofas, with configurable shelf and drawer counts
- **Instant search**: type an item's name and jump straight to the room and zone where it's stored
- **Mover tool**: pack items into boxes when moving house, then unpack them into any room in your new home
- **100% local and private**: no account, no cloud; data lives in a single SQLite file on your PC
- **Automatic updates**: the app checks GitHub Releases and prompts you when a new version is ready

| Search for an item | See where it is on the map |
|---|---|
| ![Search result](docs/screenshots/search1.png) | ![Zone highlighted on the map](docs/screenshots/search2.png) |

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, React Konva |
| Data layer | Electron IPC (ipcMain / contextBridge), Node.js |
| Database | SQLite (relational schema: homes, rooms, zones, items) |
| Desktop | Electron, electron-builder (NSIS installer), electron-updater |
| Distribution | GitHub Releases, landing site on Vercel |

## Project structure

```
backend/    SQLite data layer (accessed via Electron IPC)
frontend/   React + TypeScript client (Vite)
electron/   Desktop app packaging
scripts/    Build and helper scripts
website/    Project landing page
```

## Getting started

**Prerequisites:** Node.js 22 (developed on v22.14), Windows (for building the installer)

```bash
git clone https://github.com/jhogee-aus/smart-home-inventory.git
cd smart-home-inventory

# Install dependencies
npm install
npm install --prefix frontend
npm install --prefix backend
```

**Run in development** (two terminals):

```bash
npm run dev:frontend   # terminal 1: start the Vite dev server
npm run dev:electron   # terminal 2: launch the desktop app
```

**Build the Windows installer:**

```bash
npm run build:frontend
npm run dist           # output goes to /release
```

## What I learned

- **Build for the user, not the plan.** I'd learned Agile mostly in theory. Building this myself showed me how often a planned feature doesn't actually match what users need.
- **A real example: dropping login.** My original plan was a web app with user accounts. I realised most people would rather use a small downloadable app than log in through a browser, so I packaged it as an Electron desktop app instead. That removed a whole layer of authentication and security work, and cut hosting costs too.
- **Removing complexity I didn't need.** Earlier versions ran a local Express server so the UI could talk to SQLite over HTTP. Since the app is single-user and fully offline, I replaced it with Electron IPC in v2.0.0, which removed a TCP listener, cut several dependencies and reduced the local attack surface.
- **Hierarchical data modelling.** Designing the home → room → zone → item structure in SQLite taught me to think about relationships before writing any UI.

## Roadmap

Based on my own testing of the latest version:

- [ ] Replace the fixed layout with a Figma-style canvas: pan, zoom and freely drag rooms (new rooms currently line up horizontally)
- [ ] Drag-and-drop resizing for zones
- [ ] Redesign the "add zone" flow, so new zones can be placed and styled directly instead of edited afterwards
- [ ] Add a background behind zone labels so names stay readable over furniture

## Author

**Jho Gee Ng**: [LinkedIn](https://www.linkedin.com/in/ng-jhogee-391599236/) · [GitHub](https://github.com/jhogee-aus)
