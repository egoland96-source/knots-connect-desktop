# Knots Connect Desktop

A privacy-focused desktop client for smart hybrid routing, traffic control, and secure network management.

Knots Connect Desktop is built as a desktop application with an Electron-based UI and a Go-powered routing engine. It is designed to combine privacy-aware networking, low-latency traffic decisions, and a streamlined user experience for desktop users.

## Overview

Knots Connect aims to provide:
- Flexible routing and split-tunnel behavior
- Privacy-first network handling
- Lightweight desktop experience
- Cross-platform desktop client architecture
- Modern UI built with React and Vite

This project blends a modern frontend with a native desktop shell and backend networking logic for route optimization and policy enforcement.

## Architecture

The application follows a modular architecture:

```text
+-------------------------------------------------------+
|                     Electron UI Layer                  |
|          (React + Vite + TypeScript + Tailwind)      |
+-------------------------------------------------------+
                         |
                         v
+-------------------------------------------------------+
|            Desktop Bridge / IPC Communication        |
+-------------------------------------------------------+
                         |
                         v
+-------------------------------------------------------+
|            Go Core Routing Engine / Network Layer     |
|      (Traffic handling, routing decisions, filtering) |
+-------------------------------------------------------+
```

### Frontend
- Electron
- React 18
- TypeScript
- Vite
- Tailwind CSS

### Backend / Core
- Go
- Network routing and tunnel logic
- Desktop process coordination
- Policy-driven traffic management

## Features

- Smart split routing
- Privacy-oriented network flow handling
- Local traffic decision engine
- Desktop-first user experience
- Native application packaging for Windows
- Modern responsive interface
- Routing and network policy controls

## Tech Stack

### Desktop App
- Electron
- React
- TypeScript
- Vite

### Routing / Core Logic
- Go

### Packaging / Deployment
- electron-builder
- PowerShell scripts for Windows automation

## Requirements

Before running the project, make sure you have:

- Node.js 18+
- npm or yarn
- Go 1.20+
- Windows environment for production packaging support

## Quick Start

Clone the repository:

```bash
git clone https://github.com/egoland96-source/knots-connect-desktop.git
cd knots-connect-desktop
```

Install dependencies:

```bash
npm install
```

Run in development mode:

```bash
npm run dev
```

This starts the Vite frontend and Electron app together.

## Available Scripts

```bash
npm run dev
```
Starts the app in development mode.

```bash
npm run typecheck
```
Runs TypeScript checking without emitting build artifacts.

```bash
npm run build
```
Builds the frontend bundle.

```bash
npm run build:win
```
Runs type checks, builds the frontend, and packages the Windows desktop app.

```bash
npm run pack:zip
```
Runs a packaging helper script for archive generation.

## Building for Windows

To build a Windows distribution:

```bash
npm run build:win
```

This uses Electron Builder to produce desktop installer artifacts in the release folder.

## Project Structure

```text
knots-connect-desktop/
├── electron/              # Electron main process and desktop integration
├── go-backend/            # Go-based backend logic
├── public/                # Static assets
├── scripts/               # Utility and packaging scripts
├── src/                   # React frontend source
├── build/                 # Build resources / icons / packaging assets
├── package.json           # Node project metadata and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite config
├── index.html             # HTML entry point
├── go.mod                 # Go module definition
├── .gitignore             # Git ignore rules
├── README.md              # Project overview
├── COPYRIGHT              # Repository copyright notice
└── ...
```

## Privacy and Security

Knots Connect is positioned as a privacy-focused application, with a design emphasis on:
- local traffic decisions
- user-controlled routing
- minimal collection and reduced telemetry
- secure desktop application boundaries

Please note that all privacy claims should be backed by implementation details, architecture notes, and audit evidence. If the project is intended to handle sensitive traffic or user metadata, it is strongly recommended to document:
- what data is collected
- where data is stored
- whether traffic is logged locally or remotely
- how encryption, key management, and route policy decisions are enforced

## Roadmap

Planned areas for future work may include:
- improved route policy controls
- stronger security and auditing documentation
- backend and frontend separation cleanup
- additional platform packaging support
- release verification and signing workflow
- expanded documentation and architecture notes

## Contributing

Contributions are welcome. To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run validation and build checks
5. Open a pull request with a clear summary

Suggested validation steps:
```bash
npm run typecheck
npm run build
```

## License

This repository includes a `COPYRIGHT` notice and may carry additional legal restrictions depending on the project’s distribution model. Please review the repository files carefully before using, copying, modifying, or redistributing the project.

If the project is intended to be open source, it is recommended that a clear license file such as `LICENSE` or `LICENSE.md` be added with explicit terms.

## Disclaimer

This project is under active development. Features, architecture, and capabilities may change as the product evolves.

## Contact

For questions, issues, or collaboration requests, please use the repository's GitHub Issues or discussion channels if available.

---

If you want, I can also generate:
- a more marketing-style README,
- a more technical README,
- or a shorter GitHub-ready version optimized for public visibility.
