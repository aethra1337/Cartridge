# Cartridge — Brandkit v1

> The moment the needle meets the record. Tidy, quiet, orange.

## Logo

* `public/logo.svg` — main brand (header, 26px).
* `public/favicon.svg` — tab icon, simplified version of the same illustration.
* Illustration: cream "C" on a dark background, orange play triangle in its opening.
  "Drop, press, play" in a single mark. Dark box + thin border; at 16px the
  C ring + triangle remain legible.
* Minimum size 16px. Leave at least 1/4 of the logo width as clear space around it.
* Don'ts: no gradients, no rotation, no shadows, don't place it on backgrounds
  other than orange (black/white backgrounds are allowed).

## Colors

| Role | Token | Value |
|---|---|---|
| Background | `--bg-primary` | `#0a0a0a` |
| Surface | `--bg-surface` | `#1a1a1a` |
| Elevated | `--bg-elevated` | `#202020` |
| Border | `--border` | `#2d2d2d` |
| Light border | `--border-light` | `#3a3a3a` |
| Primary text | `--text-primary` | `#eceae6` |
| Secondary text | `--text-secondary` | `#a7a49c` |
| Helper/micro | `--text-muted` | `#7a7a78` |
| **Action (single accent)** | `--accent` | `#ff6b35` |
| Action hover | `--accent-hover` | `#ff8252` |
| Selection background | `--accent-subtle` | `rgba(255,107,53,0.08)` |
| Error/danger | `--error` | `#d64045` |
| Warning | `--warning` | `#d99a2b` |

Rule: **orange = action and selection.** Secondary buttons have gray borders,
no orange borders. Red is only for errors and destructive actions.

## Typography

* UI: Inter (12.5–19px). Headings 600–650 weight, `-0.01em` tightness.
* Micro-label: 11px, uppercase, `0.07em` spacing, gray.
* Numbers (BPM, year, percent): `tabular-nums`, mono (JetBrains Mono) only
  in badges and counters.

## Component language

* Corners: 5–8px. No pill buttons (except segmented control).
* Line = information: 1px lines define sections.
* Table: 34px row, sticky header, 26px cover, selected row orange at 8%.
* Sidebar fixed at 200px; `+ Playlist` visible only on hover.
* Copy is short and calm: "BPM ramp — slow to fast", "30 tracks selected".

## Voice

* Simple, confident, never shouting. "Get your music collection in order."
* Spotify attribution is required: playlist descriptions must say
  "Created with Cartridge — Organize Your Music".
