# 📮 Pocket Album World

**A cozy, creative, social collecting game.**
*Create it. Unbox it. Collect it. Trade it.*

> **Status:** Phase 1 (single-player prototype) in progress.
> The binder with 3D page turning is already live: <https://hutianma.github.io/coding_with_ai_diana/>

---

## 1. Overview

Pocket Album World is a casual social game built around **user-generated content (UGC)**.
Players turn their own photos, pets, illustrations or original characters into **virtual albums**.
Other players **unbox** those albums, collect the **random photocards** inside, keep them in a binder, and **trade** cards with each other.
Each album a player makes adds to a shared game world.

**Positioning:** a lightweight social game where **players create the collectibles**. It is *not* a plain gacha simulator.
What makes it different is the combination of **UGC + Virtual Unboxing + Social Trading**.

---

## 2. Core game loop

```
 Create an album → Unbox it → Collect photocards → Explore the mall → Trade with players → Complete sets
        ↑                                                                                       │
        └───────────────────────────── rewards unlock new decorations ─────────────────────────┘
```

---

## 3. Five core features

### 🎨 Album Studio: design an album
- Upload photos and design the **cover, title, colors and fonts**.
- Design the **front and back of each photocard**.
- Add **packaging, stickers and hidden bonus items**.
- Choose a template: **CD case, envelope, gift box or blind box**.

### 📦 Virtual Unboxing: open albums with your hands
- Use gestures to **tear off the shrink-wrap**, **open the packaging**, **flip through the photobook**, and **find hidden photocards**.
- Sound, haptics, card flips and random drops make opening an album feel like a real unboxing ritual.

### 📒 My Binder: digital collection book
- Organize, drag and decorate binder pages, with **3D page turning** (already built).
- Flip cards over to see the back. **Holographic and animated effects** for special cards.
- **Set-completion rewards.**

### 🏬 Trading Mall: a virtual shopping street
- Walk through **other creators' shops** and browse their albums, display cases and collections.
- Pick up new albums and look for the photocards you're missing.

### 💌 Photocard Trading: swap cards with players
- Browse **Wishlists** and send trade requests.
- Both players drag their cards into a **virtual envelope**. Once both confirm, it's **sealed, stamped and mailed** with an animation.

---

## 4. Key game mechanics

| Mechanic | What it means |
|---|---|
| **Random drops** | Each unboxing can give a different combination of photocards. |
| **Set collecting** | Finishing a series unlocks an animated cover, decorations or a hidden card. |
| **Rarity** | Common → Holo → Animated Limited, and more. |
| **Wishlist** | Mark the cards you want, which makes it easier to find trade partners. |
| **Creator Shops** | Each player runs a custom shop for their own album series. |
| **Weekly Themes** | Players create and show off work around a shared theme. |
| **Customization** | Decorate your binder, shop and personal display space. |

---

## 5. Visual & interaction direction

| Area | Style |
|---|---|
| **Mall & shops** | *Cozy Pixel World*: pixel art or an isometric view |
| **Album Studio & Binder** | *Scrapbook UI*: journal-like, with stickers and paper textures |
| **Cards** | Polished 2D/3D card effects: flip, tilt, holo shine |
| **Unboxing** | Dragging, tearing, page-turning, light physics and sound effects |

---

## 6. Development phases

### Phase 1: Single-player prototype ← *we are here*
Upload photos, design an album, unbox it virtually, get random photocards, and keep them in a digital binder.
**The goal is to prove that unboxing is fun.**

**The first complete playable loop:**
> Upload **6 photos** → design an **album** → unbox it and get **2 random photocards** → put them in the **binder** → see which cards you **haven't collected yet**.

Expand to multiplayer trading only once this loop is fun.

### Phase 2: Collection system
Rarity, set achievements, a personal display space and rewards.

### Phase 3: Multiplayer mall
Accounts, publishing albums, the mall, Wishlists, and a trade flow where both players confirm.

### Phase 4: Social world
Custom shops, themed events, more player interaction and live content.

---

## 7. Roadmap

Each milestone (M#) is one branch, built and reviewed as described in [WORKFLOW.md](WORKFLOW.md).

### Phase 1: Single-player prototype

| Milestone | Goal | Done when… | Status |
|---|---|---|---|
| **M0: Setup** | App skeleton, auto-deploy to GitHub Pages | The page is live at a public link | ✅ Done |
| **M1: Binder** | Cover, binder pages, 2×2 pockets, placeholder cards | Looks like a binder on phone and computer | ✅ Done |
| **M2: Page turn** | 3D page flip with arrows and keyboard | Pages flip smoothly at 60 fps | ✅ Done |
| **M3: Drag to flip** | The page follows your finger, snaps or springs back | Feels natural on iPhone | 🟡 Built, waiting to merge |
| **M4: Card Maker** | Upload photos, crop to photocard shape (55:85), design the card back, save on the device | Make 6 cards, reload, and they're still there | ⬜ |
| **M5: Album Studio v1** | Title, cover, colors, font, stickers, template (start with **envelope** + **CD case**), choose the 6 cards and an optional hidden card | Design an album and see it as a 3D package | ⬜ |
| **M6: Virtual Unboxing v1** | Peel the shrink-wrap, open the package, flip through the photobook, 2 random cards drop out and flip over to reveal them; sound + vibration | Opening an album feels like a ritual, not a button | ⬜ |
| **M7: Collection loop** | Unboxed cards go into the binder; a set page shows missing cards as silhouettes; duplicates counter | The whole first playable loop works end to end | ⬜ |
| **M8: Card effects** | Tap to flip a card over, tilt + glare, holo shine | Cards feel like real objects | ⬜ |
| **M9: Playtest** | 3–5 friends play the loop; tune based on what they say | We know whether unboxing is fun | ⬜ |

### Phase 2–4 (to be split into milestones later)

| Phase | Main pieces |
|---|---|
| **2: Collection** | Rarity tiers, drop rates, set-completion rewards, personal display room, DIY binder covers, more album templates (gift box, blind box), Three.js paper-curl page turn |
| **3: Multiplayer mall** | Accounts + backend, publishing albums, moderation, pixel/isometric mall, Wishlist, two-way trade flow with envelope animation, server-side drops |
| **4: Social world** | Custom creator shops, weekly themes and events, more ways to interact, live content; maybe a native iOS app |

---

## 8. Core design challenges

| Challenge | The question | Ideas |
|---|---|---|
| **Collecting motivation** | Why would players collect albums made by strangers? | Weekly themes, beautiful design tools, set-completion rewards, featured creators |
| **Scarcity vs. fairness** | Unlimited unboxing makes trades worthless; too many limits ruin the cozy feeling. | Daily free packs, limited "print runs" per album, packs earned through play; to be tuned in playtests |
| **Interaction depth** | Unboxing should be more than tapping a button. | Searching, hands-on actions, and a reveal: tear, open, flip, discover |
| **Safety & governance** | Public images raise privacy, permission, copyright and moderation issues; trades need anti-cheat. | Upload rules, reporting, review before publishing, server-side random drops and trade checks |

---

## 9. How it works (tech)

### Stack
| Part | Phase 1 (now) | Later |
|---|---|---|
| App | Plain HTML + CSS + JavaScript (ES modules), **no build step** | Same; maybe a native iOS app in Phase 4 |
| 3D cards & page turns | CSS 3D transforms | Three.js for paper curl and fancier effects |
| Storage | **IndexedDB** on the device (photos never leave the phone) | A cloud database + image storage (e.g. Supabase or Firebase, to be decided in Phase 3) |
| Random drops | On the device | **On the server**, so drops and trades can't be cheated |
| Mall | — | Pixel/isometric scene with a 2D game library (e.g. PixiJS or Phaser) |
| Hosting | GitHub Pages | Same for the app + the chosen backend |

### Page turning (built in M2–M3)
- A binder is a stack of **leaves** (sheets), each with a front and a back face, rotating around the spine with CSS `rotateY` (see `src/binder/PageFlip.js`).
- Dragging maps finger distance to turn progress. On release, the page finishes the turn if it's past halfway or flicked; otherwise it springs back.
- Only the pages near the current one are built, so big binders stay fast.
- **Reduce Motion** replaces the 3D turn with a short fade.
- The same engine will be reused to flip through the **photobook** during unboxing (M6).

### Making cards look 3D
| Level | Effect | How |
|---|---|---|
| 1. Tilt + glare | The card leans and a shine slides across it | CSS `rotateX/Y` + moving gradient, driven by the mouse or the phone's gyroscope |
| 2. Holo foil | A rainbow shimmer that shifts with the angle | Rainbow gradient with `mix-blend-mode: color-dodge` |
| 3. Pop-out layers | The subject floats in front of the background | On-device background removal → layers at different depths |
| 4. Depth map | The whole photo has real depth | An AI depth map + a WebGL shader |

Levels 1–2 are planned for M8, and 3–4 for Phase 2. Only the card in focus is animated, and Reduce Motion shows a still image.

### Unboxing (planned for M6)
- **Shrink-wrap:** drag from a corner; a clipping mask follows the finger, and the wrap peels away once it's past a threshold.
- **Opening:** the lid or flap hinges open with CSS 3D (envelope flap, CD case lid).
- **Photobook:** reuses the page-turn engine.
- **Drop & reveal:** cards slide out face-down; tap or drag to flip each one. The rarer the card, the bigger the reveal (shine, particles, sound).
- **Sound & haptics:** paper/plastic sounds; `navigator.vibrate` where supported (iPhone Safari doesn't support it, so the native app in Phase 4 would add real haptics).

---

## 10. Data model (Phase 1)

```ts
CardDesign {            // a card as the creator designed it
  id: string
  albumId: string
  front: Blob           // photo cropped to 55:85
  back: CardBack        // color, pattern, text, or a second photo
  rarity: "common" | "holo" | "animated"
  hidden?: boolean      // the album's secret card
}

CardInstance {          // one copy that a player owns (this is what gets traded)
  id: string
  designId: string
  obtainedAt: Date
  source: "unbox" | "trade" | "reward"
}

Album {
  id: string
  title: string
  template: "envelope" | "cd" | "giftbox" | "blindbox"
  cover: CoverDesign    // photo, colors, font, stickers
  cardIds: string[]     // the set, e.g. 6 cards
  cardsPerPack: number  // e.g. 2
  dropWeights?: Record<Rarity, number>
}

Binder {
  id: string
  layout: "2x2" | "3x3"
  pages: { id: string, slots: (CardInstanceId | null)[] }[]
}

CoverDesign {
  color: string
  font: string
  photo?: Blob
  stickers: { image: string, x: number, y: number, scale: number, rotation: number }[]
}
```

Phase 3 adds `Player`, `Shop`, `Wishlist` and `Trade { from, to, offered[], requested[], status }`, stored on the server.

---

## 11. Project structure

```
coding_with_ai_diana/
├── README.md               # this plan
├── WORKFLOW.md             # how each milestone is built
├── CLAUDE.md               # rules for Claude Code
├── index.html
├── .github/workflows/
│   └── deploy.yml          # publishes main to GitHub Pages
├── tests/                  # automated browser tests (open in a browser)
└── src/
    ├── main.js             # app entry
    ├── binder/             # My Binder: pages, page flip, pockets
    ├── cards/              # card drawing (Card Maker in M4)
    ├── data/               # sample data (placeholder art only)
    └── styles/
```
Planned folders: `src/studio/` (Album Studio), `src/unboxing/` (Virtual Unboxing), `src/storage/` (IndexedDB).

---

## 12. Safety, privacy & content rules

- **Phase 1–2 are private:** photos stay on the player's own device and are never uploaded.
- **Only upload what you have the right to use:** your own photos, pets, art and original characters. Photos of celebrities or other people's artwork can't be published.
- **Before anything goes public (Phase 3):** upload rules, reporting, review/moderation, and a way to remove content.
- **Fair trading:** random drops and trades are checked on the server, and both players must confirm.
- The repo only contains placeholder art: no real people's photos and no copyrighted images.

---

## 13. Getting started

No installs needed. Start a small local web server from the project folder:

```bash
python3 -m http.server 8000
```

- App: <http://localhost:8000> (add `?open` to skip the cover, or `?page=3` to open at page 3)
- Tests: open the files in `tests/` in the browser, e.g. <http://localhost:8000/tests/flip-test.html>. Every line should say PASS.

**Live version:** every merge into `main` is published automatically to GitHub Pages.

---

## Credits

Made by Diana with help from Claude Code.
