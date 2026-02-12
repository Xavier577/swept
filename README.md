# Swept

A macOS utility to help developers reclaim disk space by identifying and removing unused caches, build artifacts, Docker images, and other development-related files.

## Features

- **Real filesystem scanning** - Analyzes actual disk usage across developer tools
- **8 cleanup categories**:
  - **Node.js/npm** - node_modules folders, npm/yarn/pnpm caches
  - **Xcode** - DerivedData, Archives, Simulators, Device Support
  - **Docker** - Images, containers, volumes, build cache
  - **Homebrew** - Old formula versions, caches, logs
  - **Python** - pip cache, Conda packages, virtual environments
  - **System Caches** - Browser caches, app caches
  - **Logs** - User and application logs
  - **Misc Dev** - Gradle, Maven, Cargo, Go module caches
- **Space visualization** - See exactly what's taking up space
- **Safe cleanup** - Select items individually before deletion
- **macOS native look** - Designed to feel like a native Mac app
- **Onboarding flow** - Guides users through Full Disk Access permission

## Project Structure

```
msca/
├── desktop/             # Desktop app (Tauri + React)
│   ├── src/             # React frontend
│   ├── src-tauri/       # Rust backend
│   └── package.json
├── branding/            # Logos and brand guidelines
│   ├── logos/
│   └── BRANDING.md
└── README.md
```

## Prerequisites

- **Node.js** 18+ and npm
- **Rust** - Install via [rustup](https://rustup.rs/)
- **Xcode Command Line Tools** - `xcode-select --install`

## Quick Start

```bash
cd desktop
npm install
npm run tauri dev
```

This will:
1. Start the Vite dev server for the frontend
2. Compile the Rust backend
3. Launch the native macOS app

First build takes ~2 minutes for Rust compilation. Subsequent builds are faster.

## Building for Distribution

```bash
cd desktop
npm run tauri build
```

The built app will be in `src-tauri/target/release/bundle/`:
- `macos/Swept.app` - Application bundle
- `dmg/Swept_x.x.x_aarch64.dmg` - Disk image for distribution

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS 4, Lucide Icons
- **Desktop**: Tauri 2.x, Rust
- **Styling**: macOS-native design with SF fonts, translucent sidebar

## License

MIT
