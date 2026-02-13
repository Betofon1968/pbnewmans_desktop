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
```bash
cd "/Users/betofonseca/Documents/New project/logistics-dashboard-v27.35"
npm install
npm run build
```

Notes:
- `js/dist/vendor.bundle.js` includes React, ReactDOM, and Supabase locally.
- App startup does not depend on `unpkg.com`.

## Run Locally
```bash
cd "/Users/betofonseca/Documents/New project/logistics-dashboard-v27.35"
bash start-local-server.sh 5173
# Open http://127.0.0.1:5173
