# Boring Bogey Blueprint

Personal golf tracker and per-course caddy cards. A static site on GitHub Pages, no backend.

Live at: **https://frytyler.github.io/golf/**

## What it is

- **Dashboard** (`index.html`): every round, plus a progression chart.
- **Course cards** (`courses/*.html`): a per-course strategy card (tee/setup/wedge plan per hole, hole flyover photos) with a **live round tracker** (score, putts, penalties, per-hole notes, running summary) that saves to the browser and exports to Obsidian.
- **Installable**: add to home screen; a service worker caches the app so it survives signal dropouts on the course.

## How the data works

Everything is generated from data files, so history is versioned in git.

```
data/courses/<slug>.json   the course definition (holes, hazards, strategy, images) = the CONFIG
data/rounds/<id>.bbround.json  one committed record per round (the tracker's export)
data/rounds.json           aggregate the dashboard reads
img/<slug>/holeNN.jpg       hole flyovers, served from this repo
assets/                     shared css + renderer + tracker + charts (course-agnostic)
```

## Workflow

- **Before a round:** the course card is ready with the latest strategy and last-round scores.
- **During:** track live in the card. It saves to the browser and works offline once loaded.
- **After:** export the round (Copy for Obsidian or Save backup), the record lands in `data/rounds/`, and the dashboard progression updates on the next rebuild.

Design spec: `Boring Bogey Caddy Card — Build Spec` (in the brain vault).
