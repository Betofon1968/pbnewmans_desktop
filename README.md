# Logistics Dashboard

Desktop-first logistics dashboard for route planning, pallet tracking, BOL generation, invoices, and realtime sync across terminals.

## Features
- Route and store management
- Pallet and truck load tracking
- BOL print/export
- Invoices (Master and Individual)
- Reports and export tools
- Supabase realtime sync

## Tech Stack
- React (bundled with esbuild)
- Supabase (Auth, Postgres, Realtime)

## Build Bundles
Run these commands from the repository root:

```bash
npm install
npm run build
```

Notes:
- `js/dist/vendor.bundle.js` includes React, ReactDOM, and Supabase locally.
- App startup does not depend on `unpkg.com`.

## Run Locally
Cross-platform option:

```bash
npm run serve -- 5173
```

macOS/Linux option:

```bash
./start-local-server.sh 5173
```

Open [http://127.0.0.1:5173/index.html](http://127.0.0.1:5173/index.html).

## Versioning
Use the helper script to bump the release version and restamp the generated assets:

```bash
npm run bump -- patch
npm run bump -- 26.122.0
```
