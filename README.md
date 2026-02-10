# DevClean

A macOS utility to help developers clean up their local environments by identifying and removing unused caches, build artifacts, Docker images, and other development-related files.

## Features

- **Real filesystem scanning** - Analyzes actual disk usage across developer tools
- **8 cleanup categories**:
  - **Docker** - Images, containers, volumes, build cache
  - **Node.js/npm** - node_modules folders, npm/yarn/pnpm caches
  - **Homebrew** - Old formula versions, caches, logs
  - **Xcode** - DerivedData, Archives, Simulators, Device Support
  - **Python** - pip cache, Conda packages, virtual environments
  - **System Caches** - Browser caches, app caches (Slack, VS Code, Spotify, etc.)
  - **Logs** - User and application logs
  - **Misc Dev** - Gradle, Maven, Cargo, Go module caches
- **Space visualization** - See exactly what's taking up space
- **Safe cleanup** - Select items individually before deletion
- **macOS native look** - Designed to feel like a native Mac app

## Project Structure

```
msca/
├── prototype/           # Web-based UI prototype (React + Vite)
├── prototype-desktop/   # Native macOS app (Tauri + React)
└── README.md
```

## Prerequisites

- **Node.js** 18+ and npm
- **Rust** (for desktop app) - Install via [rustup](https://rustup.rs/)
- **Xcode Command Line Tools** (macOS) - `xcode-select --install`

## Quick Start

### Web Prototype

The web prototype uses mock data to demonstrate the UI:

```bash
cd prototype
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

### Desktop App (Recommended)

The desktop app scans your actual filesystem:

```bash
cd prototype-desktop
npm install
npm run tauri dev
```

This will:
1. Start the Vite dev server for the frontend
2. Compile the Rust backend
3. Launch the native macOS app

First build takes ~2 minutes for Rust compilation. Subsequent builds are much faster.

## Building for Distribution

To create a distributable `.app` bundle and `.dmg`:

```bash
cd prototype-desktop
npm run tauri build
```

The built app will be in `src-tauri/target/release/bundle/`:
- `macos/DevClean.app` - Application bundle
- `dmg/DevClean_0.1.0_aarch64.dmg` - Disk image for distribution

## Development

### Frontend (React)

Both projects share similar React components:

```
src/
├── components/
│   ├── Sidebar.jsx        # Navigation sidebar
│   ├── Overview.jsx       # Dashboard with totals
│   ├── CategoryView.jsx   # Category detail view
│   ├── ItemList.jsx       # Selectable item list
│   ├── SpaceBar.jsx       # Progress bar component
│   └── ConfirmModal.jsx   # Cleanup confirmation
├── data/
│   └── categories.js      # Category definitions
└── utils/
    └── formatters.js      # Size/date formatting
```

### Backend (Rust - Desktop only)

The Tauri backend provides three commands:

- `scan_system()` - Returns size totals per category
- `get_category_items(category_id)` - Returns items with paths, sizes, dates
- `cleanup_items(items)` - Deletes selected paths

Located in `prototype-desktop/src-tauri/src/lib.rs`.

### Scanned Locations

| Category | Paths |
|----------|-------|
| Docker | `~/Library/Containers/com.docker.docker` |
| Node.js | `~/.npm`, `~/.yarn`, `~/.pnpm-store`, `**/node_modules` |
| Homebrew | `~/Library/Caches/Homebrew`, `~/Library/Logs/Homebrew` |
| Xcode | `~/Library/Developer/Xcode/DerivedData`, Archives, Simulators |
| Python | `~/Library/Caches/pip`, `~/anaconda3/pkgs` |
| System | `~/Library/Caches/{Chrome,Safari,Slack,VSCode,...}` |
| Logs | `~/Library/Logs` |
| Misc | `~/.gradle`, `~/.m2`, `~/.cargo`, `~/go/pkg` |

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons
- **Desktop**: Tauri 2.x, Rust
- **Styling**: macOS-native design with SF fonts, rounded corners, translucent sidebar

## License

MIT
# swept
