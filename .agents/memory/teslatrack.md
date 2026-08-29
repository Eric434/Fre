---
name: TeslaTrack architecture
description: Key decisions and non-obvious facts about the TeslaTrack shipment tracking platform.
---

## Stack
- pnpm monorepo: `artifacts/tracker` (React 19 + Vite 7 + Tailwind v4), `artifacts/api-server` (Express 5 + PostgreSQL)
- Admin password env var: `ADMIN_PASSWORD` (value: teslatrack-admin-2026)
- DB columns added via ALTER TABLE: `cargo_type TEXT DEFAULT 'road'`, `notes TEXT DEFAULT ''`, `paused BOOLEAN DEFAULT false`

## Status list (11 total — ALL_STATUSES constant)
Pending, Processing, In Transit, At Airport, At Seaport, Customs Clearance, Out for Delivery, Delivered, Delayed, On Hold, Cancelled

## Cargo types
- `road` — red car SVG marker (28×44, iconAnchor 14,22)
- `air`  — blue circle with ✈ (28×44 container, circle at top:8px)
- `sea`  — teal circle with 🚢 (same layout)
- vehicleMarkerHtml(moving, bearing, cargoType) handles all three

## Route presets
`cargoHint` field on RoutePreset auto-sets cargo_type when user picks a route preset.
11 international routes: 5 air (nyc_london_air, lax_tokyo_air, dubai_london_air, miami_paris_air, sg_london_air), 5 sea (la_shanghai_sea, rotterdam_nyc_sea, singapore_dubai_sea, miami_london_sea, dubai_la_sea), plus domestic road presets.

## Components
- `EditModal` — full edit modal for existing shipments (blue accent, all 11 statuses, route change, cargo type, paused, notes, events)
- `CreateModal` — create new shipments (red accent)
- `CargoBadge` — small pill showing cargo type with icon
- `StatusBadge` — color-coded status pill

**Why:** EditModal was added as a separate component (not reusing CreateModal) to keep the two flows visually distinct (red vs blue accent) and to allow different defaulting logic (EditModal prefills from existing pkg, CreateModal starts blank).

## Map tiles
- Prefer a keyless OpenStreetMap raster layer for the tracking map. The previously used CARTO dark tile URL can return repeated “API KEY REQUIRED” tiles in the preview.

**Why:** A map that technically initializes but displays provider error tiles makes the primary tracking experience unusable and does not need a token for this product’s current needs.

**How to apply:** If changing tile providers, preserve visible attribution and confirm both desktop and mobile tracking views have real tiles before shipping.

## Vercel deployment
- Keep standalone Vercel API runtime packages available from the workspace root, and declare the API package as ESM.

**Why:** Vercel builds the root project and can otherwise fail to resolve API dependencies or emit module-reparsing warnings even while the Replit workspace passes.

**How to apply:** When adding serverless entrypoints outside the workspace package globs, verify root dependency resolution and run an import check against the entrypoint.

## Initial page rendering
- Keep critical hero content visible during entrance motion; opacity-based entry animations can make a freshly loaded preview look like a broken blank page.

**Why:** Preview captures and slower chunk loads can happen before a delayed opacity animation completes, especially after route-level code splitting.

**How to apply:** Prefer transform-only entrance motion for the primary landing content, or provide a visible loading state that cannot be mistaken for a failed page.
