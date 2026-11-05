# SnapQuest

**Everyday objects. Extraordinary adventures.**

SnapQuest is a local photo-to-game studio that explores how the objects around us can become game mechanics. Upload a photograph, follow its generation, and play the resulting adventure in your browser. Keep your creations in My Arcade or export a self-contained game that works offline.

The included game, **System Override**, turns a desktop into an action arena: laptops become rival terminals, cables become pursuing enemies, a speaker becomes a sonic weapon, and a remote controls the final enemy’s firewall.

## Features

- **Photo intake:** drag-and-drop or file selection for JPEG, PNG, and WebP images, with validation and explicit processing consent.
- **Generation progress:** job stages, timing information, status polling, and server-sent events.
- **Playable desktop adventure:** movement, combat, rechargeable abilities, health recovery, a multi-stage mission, and a final encounter.
- **Persistent arcade:** generated games remain available after restarting the server. Fresh installations include the illustrated System Override example.
- **Offline export:** download the game as one HTML file containing its runtime and procedural artwork.
- **Local processing:** uploaded images and session data stay in the application’s ignored data directory.
- **Multiple input methods:** keyboard, pointer, and touch controls, with pause, restart, sound, and fullscreen options.

## Technology

| Layer | Dependencies | Purpose |
| --- | --- | --- |
| Interface | React 18, React Router 6 | Studio pages, navigation, upload flow, and game controls |
| Frontend tooling | Vite 5, TypeScript 5 | Development server, type checking, and production builds |
| Styling | Tailwind CSS 3, PostCSS, Autoprefixer | Design tokens, utilities, and responsive styling |
| Local API | Fastify 5, `@fastify/multipart` | Photo intake, job processing, progress, and saved games |
| Image processing | Sharp | Image validation, normalization, and visual-region analysis |
| Game runtime | Canvas 2D, Web Audio | Procedural illustrations, fixed-step simulation, effects, and sound |
| Verification | Vitest, Testing Library, Node.js test runner, Bun | Interface, API, persistence, and complete game-playthrough tests |
| Code quality | Biome, Oxlint | Formatting, linting, and static analysis |

Exact dependency resolutions are recorded in [`pnpm-lock.yaml`](pnpm-lock.yaml). Application dependencies are declared separately in the [web](apps/web/package.json) and [server](apps/server/package.json) manifests.

## Getting started

### Prerequisites

- **Node.js 22.18 or newer**
- **pnpm 11.23.0**, matching the repository’s `packageManager` field
- A current browser with Canvas 2D support
- **Bun** is optional for running the additional submission test suite

### Install and start

```sh
git clone https://github.com/maiorikizu/snapquest.git
cd snapquest
pnpm install --frozen-lockfile
pnpm dev
```

The development launcher starts both applications:

| Application | Address |
| --- | --- |
| Studio | http://localhost:5173 |
| Local API | http://127.0.0.1:3010 |

The frontend proxies API requests to the local server. Open the studio, choose an image, allow local processing, and select **Create my game**. The upload page starts without a preloaded photograph or game preview.

To run the applications in separate terminals, execute these commands from the repository root:

```sh
# Backend
pnpm --filter @snapquest/server start
```

```sh
# Frontend
pnpm --filter @snapquest/web dev
```

### Run a production build locally

```sh
pnpm build
pnpm start
```

Open http://127.0.0.1:3010. The local server serves both the built frontend and its API. It binds to the loopback interface.

## System Override

A corrupted laptop is taking over the desktop network. Recover the data, disable its firewall, and restore the system.

| Object | Gameplay role |
| --- | --- |
| Laptops | Home terminal and shielded final enemy |
| Audio cables | Pursuing cable bugs |
| USB drives | Five required recovery-data collectibles |
| Speaker | Rechargeable sonic pulse |
| Power brick | Health-recovery station |
| Remote | Firewall switch after data recovery |
| Pens | Physical barriers around the arena |

### Controls

| Input | Action |
| --- | --- |
| WASD or arrow keys | Move |
| Hold Space | Fire with automatic target selection |
| Left mouse button | Fire toward the pointer |
| E | Activate the speaker pulse or interact with the nearby remote |
| Shift | Dash |
| Escape or P | Pause or resume |
| R | Restart |

Collect all five USB drives, approach the remote and press **E**, then attack the exposed Shadow Terminal. Return to the power brick when health is low.

### Standalone game

Download [`SnapQuest-System-Override.html`](deliverables/SnapQuest-System-Override.html) and open the saved file in a browser. On GitHub, use the file’s download button. The export includes its runtime and illustrated artwork, with no embedded source photograph.

Regenerate the artifact from the current source with:

```sh
pnpm deliverables
```

## Architecture

```text
Image upload
    → validation and normalization
    → visual-region analysis
    → desktop adventure configuration
    → saved game
    → browser runtime / standalone HTML export
```

The local generation path combines image-derived visual regions with the desktop adventure ruleset. Game artwork is drawn procedurally, while job metadata and uploaded images are stored separately from the application source.

### Live model integration roadmap

The next stage of the pipeline introduces live integrations with:

- **SAM 3.1** for object segmentation and scene geometry.
- **Muse Spark Open** for image-grounded game concepts, object roles, and level design.

These planned integrations extend the photo-to-game workflow toward scene-specific adventures across a wider range of images. The current local workflow remains independently reproducible through the included desktop ruleset and illustrated game.

## Repository structure

```text
snapquest/
├── apps/
│   ├── server/
│   │   ├── data/archive-game.json    # Photo-free example game configuration
│   │   └── scripts/
│   │       ├── studio.mjs           # Local API, generation, and persistence
│   │       └── studio.test.mjs      # API and persistence regression tests
│   └── web/
│       ├── src/
│       │   ├── components/         # Shared interface components
│       │   ├── lib/                # API helpers and shared game types
│       │   ├── pages/              # Upload, progress, player, and arcade
│       │   ├── runtime/            # System Override game engine and export
│       │   └── styles/             # Application styling
│       └── __tests__/              # Interface regression tests
├── deliverables/                   # Standalone illustrated game
├── scripts/
│   ├── dev.mjs                     # Development launcher
│   ├── deliverables.mjs            # Standalone artifact generation
│   └── desk-smoke.mjs              # Complete mission playthrough
├── tests/bun/                      # Additional end-to-end checks
├── tools/secret-scan.ts            # Source secret scanner
├── .github/workflows/ci.yml        # Automated verification
├── package.json                    # Workspace commands and tooling
├── pnpm-workspace.yaml             # Application workspace configuration
├── pnpm-lock.yaml                  # Locked dependency resolutions
└── LICENSE
```

## Development and verification

| Command | What it verifies |
| --- | --- |
| `pnpm typecheck` | TypeScript correctness of the web application |
| `pnpm lint` | Biome formatting and lint rules |
| `pnpm oxlint` | Additional static analysis |
| `pnpm test:studio` | Fresh-install archive, uploads, validation, consent, persistence, and API access checks |
| `pnpm test:game` | A complete winning mission, pause/resume, restart, and export syntax |
| `pnpm test` | API, game-runtime, and interface regression suites |
| `bun test` | Independent checks of the game, upload flow, and standalone artifact |
| `pnpm check` | Type checking, formatting, static analysis, and regression tests together |
| `pnpm build` | Production frontend compilation and asset generation |
| `pnpm secret-scan` | Scans source files for common credential patterns |

The GitHub Actions workflow runs the combined checks, Bun tests, and production build on pushes and pull requests.

## Data and privacy

The `.data/` directory contains local uploads and generated sessions and is excluded from version control. Source photographs, personal recording materials, and local session data are not distributed with the project. The archived example and standalone game contain procedural illustrations rather than source-photo bytes.

## License

This project is licensed under the [MIT License](LICENSE).
