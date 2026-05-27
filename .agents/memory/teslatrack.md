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
