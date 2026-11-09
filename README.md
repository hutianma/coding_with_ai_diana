# 💖 Pocket Fandom

**A personal fan-merch workshop.**
Turn the photos on your phone into your own digital fan merch (photocards, badges, polaroids), keep them in a 3D binder, and make pages pretty enough to share.

> *Working title, so the name may change.*
> **Status:** Phase 1 (single-player workshop) in progress.
> The binder with 3D page turning is live: <https://hutianma.github.io/coding_with_ai_diana/>

---

## 1. Why this exists

Fans love making, collecting and showing off merch: photocard binders, ita bags, journals, decorated toploaders. Today that happens with real paper and plastic, or with photo-editing apps that weren't made for it.

Pocket Fandom is a **workshop for one person first**:

- **Make** merch from your own photos, with the details fans care about (card backs, rounded corners, holo foil, signatures).
- **Collect & organize** it in a binder that feels real, with 3D page turns and plastic sleeves.
- **Play** with it: tilt cards to make them shine, flip them over, seal them in an envelope and unbox them.
- **Share** it: export binder pages as images or short page-flip videos for Xiaohongshu, Weibo or Instagram.

### Why single-player first?
A social platform needs creators *and* fans before it's fun: the cold-start problem. A tool that's fun **on your own** doesn't need anyone else to work.
The "social" part happens on platforms fans already use: they post what they made, and their friends ask *"what app is this?"*.
If people like it, sharing features grow step by step (see [§8 Later](#8-later-from-workshop-to-community)).

---

## 2. Core loop (Phase 1)

```
 Pick photos → Make merch → Put it in the binder / ita bag / journal → Decorate → Share
      ↑                                                                        │
      └────────────────────────── "I want to make more" ───────────────────────┘
```

---

## 3. Features

### 🛠️ Merch Workshop
| Item | Details |
|---|---|
| **Photocard** | 55 × 85 mm ratio, front + back design, rounded corners, finish (matte / glossy / holo), handwritten signature or text |
| **Badge (吧唧)** | Round badge with a glossy dome and colored rim; optional **流麻 (shaker) fill**: glitter, snow, stars, hearts, sakura or fine gold dust floating in liquid. The pieces fall with real gravity (also upside down), flutter as they sink, and scatter like a snow globe when you shake the phone or drag the badge |
| **Polaroid (拍立得)** | Instant-film print with a colored frame and a handwritten caption; **合拍** layouts put two photos side by side or top & bottom |
| **Stickers** | Cut-out stickers to decorate pages and covers (later) |
| **Acrylic stand** | Cut-out figure on a clear base (later, optional) |

### 📒 Collect & organize
- **Binder** (already built): pockets, plastic sleeve shine, 3D page turning by dragging or tapping.
- **Ita bag (痛包)** display: arrange badges and cards behind a clear window.
- **Journal (手账) pages:** free layout with stickers, washi tape and text.
- **DIY binder cover:** color, material, stickers, a photo window.
- **DIY card backs:** upload your own image for the back, or decorate it with stickers and text.

### ✨ Play
- Tap a card to lift it out and **flip it over** to see the back.
- **Tilt + glare** and **holo foil** that move with the mouse or the phone's tilt.
- **Unboxing mini-game:** seal cards in an envelope or album, then peel, open and reveal them.

### 📤 Share
- Export a binder page, ita bag or journal page as an **image**.
- Export a short **page-flip video/GIF**.
- Exports never include anything you didn't choose to show.

---

## 4. Roadmap

Each milestone (M#) is one branch, built and reviewed as described in [WORKFLOW.md](WORKFLOW.md).

### Phase 1: Single-player workshop

| Milestone | Goal | Done when… | Status |
|---|---|---|---|
| **M0: Setup** | App skeleton, auto-deploy to GitHub Pages | The page is live at a public link | ✅ Done |
| **M1: Binder** | Cover, binder pages, 2×2 pockets, placeholder cards | Looks like a binder on phone and computer | ✅ Done |
| **M2: Page turn** | 3D page flip with arrows and keyboard | Pages flip smoothly at 60 fps | ✅ Done |
| **M3: Drag to flip** | The page follows your finger, snaps or springs back | Feels natural on iPhone | ✅ Done |
| **M4: Photocard Workshop** | Pick photos → crop to 55:85 → design the back → saved on the device → appears in the binder | Make 6 cards, reload, and they're still in the binder | ✅ Done |
| **M5: Card effects** | Tap to lift and flip a card, tilt + glare, holo foil | Cards feel like real objects | ✅ Done |
| **M6: More merch** | Badges with 流麻 fills, polaroids with 合拍 layouts, the My stuff shelf (+ a prettier holo foil) | Make one of each from your photos | ✅ Done |
| **M7: Decorate** | DIY binder cover, DIY card backs (your own image, stickers), a journal page or ita bag display | A page you'd be proud to show | ⬜ |
| **M8: Share** | Export images and page-flip videos | Post one to social media straight from the app | ⬜ |
| **M9: Unboxing mini-game** *(optional)* | Seal cards in an envelope/album, then unbox them | Opening feels like a ritual | ⬜ |

### How we'll know Phase 1 works
1. **Diana uses it herself for two weeks.** Does she keep coming back?
2. **Post exports on Xiaohongshu.** Do people react, and does anyone ask what app it is?
3. **3–5 friends try it** on their phones: what's fun, and what's confusing?

---

## 5. How it works (tech)

### Stack
| Part | Choice | Why |
|---|---|---|
| App | Plain HTML + CSS + JavaScript (ES modules), **no build step** | Simple, nothing to install |
| 3D effects | CSS 3D transforms | Smooth and light; Three.js only if we need paper curl later |
| Storage | **IndexedDB** on the device | Holds many images; photos never leave the phone |
| Cut-outs (stands, stickers) | On-device background removal (later milestone) | No uploads |
| Export | `<canvas>` for images; `MediaRecorder` for page-flip videos | Works in the browser |
| Hosting | GitHub Pages | Free; every merge to `main` goes live |

### Page turning (built in M2–M3)
- The binder is a stack of **leaves** (sheets), each with a front and back face, rotating around the spine with CSS `rotateY` (`src/binder/PageFlip.js`).
- Dragging maps finger distance to turn progress. On release, the page finishes turning if it's past halfway or flicked; otherwise it springs back.
- Only pages near the current one are built, so big binders stay fast.
- **Reduce Motion** replaces the 3D turn with a short fade.

### Making cards look 3D
| Level | Effect | How | When |
|---|---|---|---|
| 1. Tilt + glare | The card leans and a shine slides across it | CSS `rotateX/Y` + moving gradient, from the mouse or gyroscope | M5 |
| 2. Holo foil | A rainbow shimmer that shifts with the angle | Rainbow gradient, `mix-blend-mode: color-dodge` | M5 |
| 3. Pop-out layers | The subject floats in front of the background | On-device background removal → layers at different depths | Later |
| 4. Depth map | The whole photo has real depth | AI depth map + WebGL shader | Later |

Only the card in focus is animated, and Reduce Motion shows a still image.

---

## 6. Data model (Phase 1)

```ts
Card {
  id: string
  front: Blob             // photo cropped to 55:85, about 600px tall
  back: CardBack          // { color, pattern, text?, photo? }
  finish: "matte" | "glossy" | "holo"
  signature?: Blob        // handwritten, drawn with a finger (transparent PNG over the front)
  pen?: string            // signature ink color, remembered for editing
  source: Blob            // a smaller copy of the original photo, for re-cropping
  crop: { zoom, x, y }    // how the photo was framed
  tags: string[]          // e.g. member, album, era
  createdAt: Date
}

Badge {                   // M6, stored in "merch"
  id: string
  kind: "badge"
  image: Blob             // the round photo, saved square (600 × 600)
  source: Blob            // smaller copy of the original, for re-cropping
  crop: { zoom, x, y }
  fill: "none" | "glitter" | "snow" | "stars" | "hearts" | "sakura" | "gold"   // 流麻
  rim: string             // rim color
  seed: number            // so the floating pieces settle the same way every time
}

Polaroid {                // M6, stored in "merch"
  id: string
  kind: "polaroid"
  layout: "single" | "side" | "stack"   // side / stack = 合拍 (two photos)
  frame: string           // frame color
  image: Blob             // the photo area with every photo in its place
  photos: { source: Blob, crop: { zoom, x, y } }[]
  caption?: Blob          // handwriting on the bottom strip (transparent PNG)
  pen?: string
}

Binder {
  id: string
  name: string
  cover: CoverDesign       // M7
  layout: "2x2" | "3x3"
  pages: { id: string, slots: (CardId | null)[] }[]
}

CoverDesign {
  material: "leather" | "glitter" | "clear" | "pastel"
  color: string
  windowCardId?: string
  stickers: { image: string, x: number, y: number, scale: number, rotation: number }[]
}
```

---

## 7. Project structure

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
    ├── binder/             # binder pages, page flip, pockets
    ├── cards/              # drawing cards
    ├── data/               # sample data (placeholder art only)
    └── styles/
```
Planned folders: `src/workshop/` (making merch), `src/storage/` (IndexedDB), `src/share/` (export).

---

## 8. Later: from workshop to community

Only if Phase 1 shows people want it, and one step at a time:

| Step | Idea |
|---|---|
| **Gift links** | Seal cards in an envelope and send a link; a friend unboxes it and keeps the cards. |
| **Small circles** | Shared binders or collections for a group of friends in the same fandom. |
| **Online fan event** | Creators' booths with free limited items (无料): numbered copies ("No. 023 / 100"), creator notes, time-limited. |
| **Fan creations** | Fan artists turn their own artwork into collectible cards, with permissions they choose (collect, download, remix). |
| **Acrylic stands** | Cut the person out of a photo on the device and stand it on a clear acrylic base. |
| **Native iOS app** | Real haptics, a Photos share-sheet "Add to Pocket Fandom", depth data from Portrait photos. |

These need accounts, a backend and content moderation, so they're deliberately out of Phase 1.

---

## 9. Privacy & content rules

- **Your photos stay on your device.** Phase 1 has no accounts and no uploads.
- The app is for **personal use**. When you share exports, respect photographers', artists' and agencies' rights, as fans already do when posting their collections.
- **The repo only contains placeholder art**: no real people's photos and no copyrighted images or music.
- Anything public in later phases will need upload rules, reporting and moderation first.

---

## 10. Getting started

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
