# Laura — Offline-First Dog Grooming Salon CRM

A production-ready, fully offline progressive web app (PWA) built for a dog grooming salon. All data lives on the device — no cloud, no subscriptions, no internet required after the first load.

> **Live demo:** [laura-ten.vercel.app](https://laura-ten.vercel.app)

---

## Screenshots

| Dashboard | Calendar |
|---|---|
| ![Dashboard](screenshots/dashboard.png) | ![Calendar](screenshots/calendar.png) |

| Tag Manager | Global Search |
|---|---|
| ![Tags](screenshots/tags.png) | ![Search](screenshots/search.png) |

| Backup & Security |
|---|
| ![Backup](screenshots/backup.png) |

---

## The Problem It Solves

Small grooming salons don't need a SaaS subscription — they need a fast, reliable tool that works on whatever device they already own, even without Wi-Fi. Laura runs entirely in the browser, stores everything locally, and backs up to a USB drive with one click.

Built for a real grooming salon in Slovakia. In daily production use.

---

## Features

- **Calendar** — month, week, and day views; click any slot to book
- **Owner & dog profiles** — one owner can have multiple dogs; full contact info
- **Custom tag system** — create tags with descriptions, apply them to owners, dogs, and appointments; search by tag
- **Appointment history** — per dog, with one-click navigation back to any past appointment on the calendar
- **Before/After photo sessions** — photos organized by visit date; side-by-side comparison gallery to track grooming progress over time
- **Notes** — inline editable notes on every entity (appointment, owner, dog); auto-saved
- **Global search** — searches across owner name, phone, dog name, breed, tags, appointment date, and service type simultaneously
- **Revenue tracking** — price and tip per appointment
- **USB backup** — one-click ZIP export containing all data and photos; full restore from backup
- **Password lock** — simple PIN/password gate for the app UI
- **PWA / installable** — installs on Chrome OS, Windows, macOS, Android; works fully offline

---

## Technical Highlights

| Concern | Solution |
|---|---|
| Offline-first storage | **Dexie (IndexedDB)** — structured data + photo Blobs in a single local database |
| Photo handling | **browser-image-compression** — WebP, max 1600px, processed off-main-thread via Web Worker; thumbnails generated automatically |
| Full-text search | **FlexSearch** — in-memory document index rebuilt at boot; sub-100ms across all entities |
| Backup format | **fflate (ZIP)** — JSON metadata + raw WebP files, store-level compression (no CPU waste on already-compressed images) |
| PWA / offline shell | **vite-plugin-pwa** with Workbox app-shell precache strategy |
| Routing | **React Router v6** — deep-linkable; history entries link directly to the calendar appointment view |
| Data model | Normalized relational schema: Owner → Dog → Appointment → PhotoSession → Photo; many-to-many Tags via junction table |
| Password gate | **Web Crypto API** — PBKDF2-SHA256 (250k iterations), random salt, constant-time verify |

---

## Stack

- **React 18 + TypeScript** — component architecture
- **Vite 5** — build tool; sub-second HMR in development
- **Dexie 4** — IndexedDB ORM with live queries via `useLiveQuery`
- **Tailwind CSS + shadcn/ui** — utility-first styling + accessible component primitives
- **React Router v6** — client-side routing
- **React Day Picker** — calendar UI
- **FlexSearch** — full-text search
- **browser-image-compression** — client-side WebP conversion + resize
- **fflate** — fast ZIP compression for backup/restore
- **vite-plugin-pwa** (Workbox) — service worker, installable PWA

---

## Architecture

```text
Browser (Chrome / Chrome OS)
│
├── App shell (Service Worker cache — loads offline)
│
└── IndexedDB (via Dexie)
    ├── owners
    ├── dogs
    ├── appointments
    ├── tagDefinitions + tagApplications
    ├── photoSessions + photos (Blob storage)
    ├── notes
    └── settings (password hash, schema version)
```

All photo processing (compression, thumbnail generation, WebP conversion) runs in a Web Worker to keep the UI responsive on low-end hardware.

Backup exports as a ZIP: `data.json` (all structured data) + `photos/*.webp` (binary files at store compression level 0, since WebP is already compressed).

---

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The app works fully offline after the first page load.

```bash
npm run build    # production build
npm run preview  # preview the production build locally
npm run lint     # ESLint
```

---

## What This Demonstrates

If you're a client evaluating this repo:

- **Offline-first PWA architecture** — service worker strategy, IndexedDB data modeling, persistent storage API
- **Binary data in the browser** — photo upload pipeline, Blob storage, object URL lifecycle management, ZIP export with binary files
- **Full-text search without a server** — FlexSearch document index, multi-field search, live index updates
- **Web Crypto API** — PBKDF2 key derivation, password verification, no third-party auth library
- **Relational data modeling in IndexedDB** — normalized schema, compound indexes, many-to-many relationships
- **Production PWA** — installable, offline-capable, tested on Chrome OS

---

## License

MIT

---

*Built by [Samuel](https://github.com/SamuelVapps1) · Slovak 🇸🇰*
